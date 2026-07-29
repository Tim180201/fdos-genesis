import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { lstat, open } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createDryRunWorkerArtifact,
  DRY_RUN_WORKER_ARTIFACT_FILES,
  DRY_RUN_WORKER_ENTRYPOINT
} from "../domain/worker-artifact-attestation.js";
import {
  IntegrityError,
  ValidationError
} from "../kernel/errors.js";

const DEFAULT_RUNTIME_ROOT = fileURLToPath(
  new URL("../../", import.meta.url)
);
const MAX_TOTAL_BYTES = 1024 * 1024;
const STATIC_SPECIFIER_PATTERN =
  /(?:\bfrom\s+|\bimport\s*)["']([^"']+)["']/g;
const DYNAMIC_IMPORT_PATTERN = /\bimport\s*\(/;
const REQUIRE_PATTERN = /\brequire\s*\(/;
const DYNAMIC_CODE_PATTERN =
  /\b(?:eval|Function)\s*\(/;
const SLASH = "/";

const EXPECTED_IMPORT_SPECIFIERS = Object.freeze({
  "src/domain/action-catalog.js": [
    "../kernel/canonical-json.js",
    "../kernel/errors.js",
    "../kernel/validation.js"
  ],
  "src/domain/action-intent.js": [
    "../kernel/canonical-json.js",
    "../kernel/errors.js",
    "../kernel/validation.js",
    "./action-catalog.js"
  ],
  "src/domain/delivery-intent.js": [
    "../kernel/canonical-json.js",
    "../kernel/errors.js",
    "../kernel/ids.js",
    "../kernel/validation.js",
    "./action-catalog.js",
    "./action-intent.js"
  ],
  "src/domain/network-isolation-contract.js": [
    "../kernel/canonical-json.js",
    "../kernel/errors.js",
    "../kernel/validation.js"
  ],
  "src/domain/worker-artifact-attestation.js": [
    "../kernel/canonical-json.js",
    "../kernel/errors.js",
    "../kernel/validation.js",
    "node:crypto"
  ],
  "src/integrations/dry-run-worker-artifact.js": [
    "../domain/worker-artifact-attestation.js",
    "../kernel/errors.js",
    "node:crypto",
    "node:fs",
    "node:fs/promises",
    "node:path",
    "node:url"
  ],
  "src/kernel/canonical-json.js": [
    "./errors.js",
    "node:crypto"
  ],
  "src/kernel/errors.js": [],
  "src/kernel/ids.js": [
    "./errors.js",
    "node:crypto"
  ],
  "src/kernel/validation.js": [
    "./errors.js"
  ],
  "src/workers/dry-run-connector-worker.js": [
    "../domain/network-isolation-contract.js",
    "../integrations/dry-run-worker-artifact.js",
    "../kernel/canonical-json.js",
    "./dry-run-worker-protocol.js",
    "node:fs/promises",
    "node:net"
  ],
  "src/workers/dry-run-worker-protocol.js": [
    "../domain/delivery-intent.js",
    "../domain/network-isolation-contract.js",
    "../domain/worker-artifact-attestation.js",
    "../kernel/canonical-json.js",
    "../kernel/errors.js",
    "../kernel/ids.js",
    "../kernel/validation.js"
  ]
});
const DRY_RUN_WORKER_ARTIFACT_DIRECTORIES = Object.freeze(
  [
    ...new Set(
      DRY_RUN_WORKER_ARTIFACT_FILES.flatMap((filePath) => {
        const directories = [];
        let current = path.posix.dirname(filePath);
        while (current !== ".") {
          directories.push(current);
          current = path.posix.dirname(current);
        }
        return directories;
      })
    )
  ].sort()
);

function sha256Buffer(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function normalizedRoot(value) {
  if (
    typeof value !== "string" ||
    !value ||
    value.length > 2_000 ||
    !path.isAbsolute(value)
  ) {
    throw new ValidationError(
      "Worker artifact root must be an absolute path."
    );
  }
  return path.resolve(value);
}

function resolvedArtifactPath(rootDirectory, relativePath) {
  const resolved = path.resolve(rootDirectory, relativePath);
  if (!resolved.startsWith(`${rootDirectory}${path.sep}`)) {
    throw new IntegrityError(
      "Worker artifact file escapes its runtime root."
    );
  }
  return resolved;
}

async function verifyTrustedDirectory(
  absolutePath,
  field
) {
  let metadata;
  try {
    metadata = await lstat(absolutePath);
  } catch (error) {
    throw new IntegrityError(
      `Worker artifact ${field} is unavailable.`,
      {
        errorType: error?.name || "Error"
      }
    );
  }
  if (
    metadata.isSymbolicLink() ||
    !metadata.isDirectory() ||
    (metadata.mode & 0o022) !== 0
  ) {
    throw new IntegrityError(
      `Worker artifact ${field} is not a trusted directory.`
    );
  }
}

function relativeImports(source, importer) {
  if (
    source.includes(SLASH + SLASH) ||
    source.includes(SLASH + "*") ||
    DYNAMIC_IMPORT_PATTERN.test(source) ||
    REQUIRE_PATTERN.test(source) ||
    DYNAMIC_CODE_PATTERN.test(source)
  ) {
    throw new IntegrityError(
      `Worker artifact uses dynamic loading: ${importer}.`
    );
  }
  const specifiers = [];
  for (const match of source.matchAll(STATIC_SPECIFIER_PATTERN)) {
    specifiers.push(match[1]);
  }
  const actual = [...new Set(specifiers)].sort();
  const expected = [
    ...(EXPECTED_IMPORT_SPECIFIERS[importer] || [])
  ].sort();
  if (
    actual.length !== specifiers.length ||
    actual.length !== expected.length ||
    actual.some(
      (specifier, index) => specifier !== expected[index]
    )
  ) {
    throw new IntegrityError(
      `Worker artifact imports differ from fixed policy: ${importer}.`
    );
  }

  const dependencies = [];
  for (const specifier of actual) {
    if (specifier.startsWith("node:")) continue;
    if (!specifier.startsWith(".")) {
      throw new IntegrityError(
        `Worker artifact uses an unapproved package import: ${importer}.`
      );
    }
    if (
      specifier.includes("?") ||
      specifier.includes("#") ||
      !specifier.endsWith(".js")
    ) {
      throw new IntegrityError(
        `Worker artifact import is not a fixed JavaScript file: ${importer}.`
      );
    }
    const dependency = path.posix.normalize(
      path.posix.join(path.posix.dirname(importer), specifier)
    );
    if (
      !dependency.startsWith("src/") ||
      dependency.split("/").includes("..")
    ) {
      throw new IntegrityError(
        `Worker artifact import escapes its source root: ${importer}.`
      );
    }
    dependencies.push(dependency);
  }
  return [...new Set(dependencies)].sort();
}

function verifyClosedImportGraph(sources) {
  const approved = new Set(DRY_RUN_WORKER_ARTIFACT_FILES);
  const edges = new Map();
  for (const [filePath, source] of sources) {
    const dependencies = relativeImports(source, filePath);
    for (const dependency of dependencies) {
      if (!approved.has(dependency)) {
        throw new IntegrityError(
          `Worker artifact imports an unapproved source: ${filePath}.`
        );
      }
    }
    edges.set(filePath, dependencies);
  }

  const reachable = new Set();
  const pending = [DRY_RUN_WORKER_ENTRYPOINT];
  while (pending.length > 0) {
    const current = pending.pop();
    if (reachable.has(current)) continue;
    reachable.add(current);
    for (const dependency of edges.get(current) || []) {
      pending.push(dependency);
    }
  }
  if (
    reachable.size !== approved.size ||
    [...approved].some((filePath) => !reachable.has(filePath))
  ) {
    throw new IntegrityError(
      "Worker artifact policy contains unreachable source files."
    );
  }
}

export class DryRunWorkerArtifactInspector {
  #rootDirectory;

  constructor({ rootDirectory = DEFAULT_RUNTIME_ROOT } = {}) {
    this.#rootDirectory = normalizedRoot(rootDirectory);
  }

  async inspect() {
    await verifyTrustedDirectory(
      this.#rootDirectory,
      "runtime root"
    );
    for (const relativePath of DRY_RUN_WORKER_ARTIFACT_DIRECTORIES) {
      await verifyTrustedDirectory(
        resolvedArtifactPath(
          this.#rootDirectory,
          relativePath
        ),
        `source directory ${relativePath}`
      );
    }

    const files = [];
    const sources = new Map();
    let totalBytes = 0;
    for (const relativePath of DRY_RUN_WORKER_ARTIFACT_FILES) {
      const absolutePath = resolvedArtifactPath(
        this.#rootDirectory,
        relativePath
      );
      let metadata;
      let metadataAfterRead;
      let content;
      let handle;
      try {
        handle = await open(
          absolutePath,
          constants.O_RDONLY |
            (constants.O_NOFOLLOW || 0)
        );
        metadata = await handle.stat();
        content = await handle.readFile();
        metadataAfterRead = await handle.stat();
      } catch (error) {
        throw new IntegrityError(
          `Worker artifact source is unavailable: ${relativePath}.`,
          {
            errorType: error?.name || "Error"
          }
        );
      } finally {
        await handle?.close().catch(() => {});
      }
      if (
        !metadata.isFile() ||
        metadata.size < 1 ||
        metadata.size > 256 * 1024 ||
        (metadata.mode & 0o022) !== 0 ||
        content.length !== metadata.size ||
        metadataAfterRead.dev !== metadata.dev ||
        metadataAfterRead.ino !== metadata.ino ||
        metadataAfterRead.size !== metadata.size ||
        metadataAfterRead.mtimeMs !== metadata.mtimeMs ||
        metadataAfterRead.ctimeMs !== metadata.ctimeMs ||
        metadataAfterRead.mode !== metadata.mode
      ) {
        throw new IntegrityError(
          `Worker artifact source failed trust checks: ${relativePath}.`
        );
      }
      totalBytes += content.length;
      if (totalBytes > MAX_TOTAL_BYTES) {
        throw new IntegrityError(
          "Worker artifact exceeds its total byte limit."
        );
      }
      let source;
      try {
        source = new TextDecoder("utf-8", {
          fatal: true
        }).decode(content);
      } catch {
        throw new IntegrityError(
          `Worker artifact source is not valid UTF-8: ${relativePath}.`
        );
      }
      files.push({
        path: relativePath,
        size: content.length,
        digest: sha256Buffer(content)
      });
      sources.set(relativePath, source);
    }
    verifyClosedImportGraph(sources);
    return createDryRunWorkerArtifact({ files });
  }
}

export function inspectDryRunWorkerArtifact(options) {
  return new DryRunWorkerArtifactInspector(options).inspect();
}
