import { constants } from "node:fs";
import { lstat, open } from "node:fs/promises";
import path from "node:path";
import {
  canonicalJson,
  immutableJson
} from "../kernel/canonical-json.js";
import {
  IntegrityError,
  ValidationError
} from "../kernel/errors.js";
import { assertPlainObject } from "../kernel/validation.js";
import {
  createDryRunWorkerPackage,
  createWorkerPackageBinding,
  normalizeDryRunWorkerPackage
} from "../domain/worker-package-release.js";
import {
  inspectDryRunWorkerSourceBundle,
  verifyDryRunWorkerSourceGraph
} from "./dry-run-worker-artifact.js";

const MAX_SERIALIZED_PACKAGE_BYTES = 2 * 1024 * 1024;
const releaseEnvelopeKeys = Object.freeze([
  "attestation",
  "expectedTrustAnchorDigest",
  "trustedKeys"
]);

function normalizedAbsolutePath(value, field) {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > 2_000 ||
    !path.isAbsolute(value)
  ) {
    throw new ValidationError(`${field} must be an absolute path.`);
  }
  return path.resolve(value);
}

function exactKeys(value, expected, field) {
  assertPlainObject(value, field);
  const actual = Object.keys(value).sort();
  const normalizedExpected = [...expected].sort();
  if (
    actual.length !== normalizedExpected.length ||
    actual.some((key, index) => key !== normalizedExpected[index])
  ) {
    throw new ValidationError(`${field} has an unexpected shape.`);
  }
}

export function normalizeWorkerPackageReleaseEnvelope(value) {
  exactKeys(
    value,
    releaseEnvelopeKeys,
    "worker package release envelope"
  );
  if (
    !Array.isArray(value.trustedKeys) ||
    value.trustedKeys.length < 1 ||
    value.trustedKeys.length > 8
  ) {
    throw new ValidationError(
      "Worker package release envelope has invalid trust."
    );
  }
  return immutableJson({
    attestation: value.attestation,
    trustedKeys: value.trustedKeys,
    expectedTrustAnchorDigest:
      value.expectedTrustAnchorDigest
  });
}

export function serializeWorkerPackageReleaseEnvelope(value) {
  return canonicalJson(
    normalizeWorkerPackageReleaseEnvelope(value)
  );
}

export async function buildDryRunWorkerPackage(options) {
  const bundle = await inspectDryRunWorkerSourceBundle(options);
  return createDryRunWorkerPackage({
    artifact: bundle.artifact,
    modules: bundle.modules
  });
}

export function serializeDryRunWorkerPackage(value) {
  return `${canonicalJson(
    normalizeDryRunWorkerPackage(value)
  )}\n`;
}

async function verifyPackageDirectory(packagePath) {
  const directoryPath = path.dirname(packagePath);
  let metadata;
  try {
    metadata = await lstat(directoryPath);
  } catch (error) {
    throw new IntegrityError(
      "Worker package directory is unavailable.",
      {
        errorType: error?.name || "Error"
      }
    );
  }
  if (
    metadata.isSymbolicLink() ||
    !metadata.isDirectory() ||
    (metadata.mode & 0o022) !== 0 ||
    (typeof process.getuid === "function" &&
      metadata.uid !== process.getuid())
  ) {
    throw new IntegrityError(
      "Worker package directory is not trusted."
    );
  }
}

export async function readDryRunWorkerPackageFile(packagePath) {
  const normalizedPath = normalizedAbsolutePath(
    packagePath,
    "worker package path"
  );
  await verifyPackageDirectory(normalizedPath);
  let handle;
  let metadata;
  let metadataAfterRead;
  let content;
  try {
    handle = await open(
      normalizedPath,
      constants.O_RDONLY |
        (constants.O_NOFOLLOW || 0)
    );
    metadata = await handle.stat();
    content = await handle.readFile();
    metadataAfterRead = await handle.stat();
  } catch (error) {
    throw new IntegrityError(
      "Worker package file is unavailable.",
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
    metadata.size > MAX_SERIALIZED_PACKAGE_BYTES ||
    (metadata.mode & 0o022) !== 0 ||
    content.length !== metadata.size ||
    metadataAfterRead.dev !== metadata.dev ||
    metadataAfterRead.ino !== metadata.ino ||
    metadataAfterRead.size !== metadata.size ||
    metadataAfterRead.mtimeMs !== metadata.mtimeMs ||
    metadataAfterRead.ctimeMs !== metadata.ctimeMs ||
    metadataAfterRead.mode !== metadata.mode ||
    (typeof process.getuid === "function" &&
      metadata.uid !== process.getuid())
  ) {
    throw new IntegrityError(
      "Worker package file failed trust checks."
    );
  }
  let serialized;
  try {
    serialized = new TextDecoder("utf-8", {
      fatal: true
    }).decode(content);
  } catch {
    throw new IntegrityError(
      "Worker package file is not valid UTF-8."
    );
  }
  const payload = serialized.endsWith("\n")
    ? serialized.slice(0, -1)
    : serialized;
  if (
    payload.length < 1 ||
    payload.includes("\n") ||
    payload.includes("\r")
  ) {
    throw new IntegrityError(
      "Worker package file is not one canonical JSON record."
    );
  }
  let parsed;
  try {
    parsed = JSON.parse(payload);
  } catch {
    throw new IntegrityError(
      "Worker package file is not valid JSON."
    );
  }
  if (canonicalJson(parsed) !== payload) {
    throw new IntegrityError(
      "Worker package file is not canonical JSON."
    );
  }
  const workerPackage = normalizeDryRunWorkerPackage(
    parsed,
    IntegrityError
  );
  verifyDryRunWorkerSourceGraph(
    new Map(
      workerPackage.modules.map((module) => [
        module.path,
        module.source
      ])
    )
  );
  return workerPackage;
}

export async function inspectDryRunWorkerPackageRelease({
  packagePath,
  attestation,
  trustedKeys,
  expectedTrustAnchorDigest
}) {
  const normalizedPath = normalizedAbsolutePath(
    packagePath,
    "worker package path"
  );
  const releaseEnvelope =
    normalizeWorkerPackageReleaseEnvelope({
      attestation,
      trustedKeys,
      expectedTrustAnchorDigest
    });
  const workerPackage =
    await readDryRunWorkerPackageFile(normalizedPath);
  const binding = createWorkerPackageBinding({
    workerPackage,
    ...releaseEnvelope
  });
  return {
    packagePath: normalizedPath,
    workerPackage,
    binding,
    releaseEnvelope
  };
}
