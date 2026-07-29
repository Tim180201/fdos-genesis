import { builtinModules } from "node:module";
import vm from "node:vm";
import { immutableJson } from "../kernel/canonical-json.js";
import { IntegrityError } from "../kernel/errors.js";
import {
  normalizeWorkloadSessionChallenge
} from "../domain/workload-session-contract.js";
import {
  inspectDryRunWorkerPackageRelease,
  normalizeWorkerPackageReleaseEnvelope,
  serializeWorkerPackageReleaseEnvelope
} from "../integrations/dry-run-worker-package.js";
import {
  createEphemeralWorkloadSessionAuthority
} from "./ephemeral-workload-session.js";

const RELEASE_ENVIRONMENT_KEY =
  "FDOS_WORKER_PACKAGE_RELEASE";
const SESSION_CHALLENGE_ENVIRONMENT_KEY =
  "FDOS_WORKLOAD_SESSION_CHALLENGE";
const SESSION_FAULT_ENVIRONMENT_KEY =
  "FDOS_WORKLOAD_SESSION_FAULT";
const MAX_RELEASE_ENVELOPE_BYTES = 32 * 1024;
const PACKAGE_URL_PREFIX = "fdos-worker-package:///";
const ALLOWED_BUILTINS = new Set([
  "node:crypto",
  "node:fs/promises",
  "node:net"
]);
const KNOWN_BUILTINS = new Set(
  builtinModules.map((name) =>
    name.startsWith("node:") ? name : `node:${name}`
  )
);

function packageUrl(modulePath) {
  return `${PACKAGE_URL_PREFIX}${modulePath}`;
}

function releaseEnvelopeFromEnvironment() {
  const encoded = process.env[RELEASE_ENVIRONMENT_KEY];
  delete process.env[RELEASE_ENVIRONMENT_KEY];
  if (
    typeof encoded !== "string" ||
    encoded.length < 1 ||
    encoded.length > MAX_RELEASE_ENVELOPE_BYTES ||
    !/^[a-zA-Z0-9_-]+$/.test(encoded)
  ) {
    throw new IntegrityError(
      "Worker package release envelope is unavailable."
    );
  }
  let serialized;
  try {
    const bytes = Buffer.from(encoded, "base64url");
    if (bytes.toString("base64url") !== encoded) {
      throw new Error("Noncanonical base64url.");
    }
    serialized = new TextDecoder("utf-8", {
      fatal: true
    }).decode(bytes);
  } catch {
    throw new IntegrityError(
      "Worker package release envelope is invalid."
    );
  }
  let parsed;
  try {
    parsed = JSON.parse(serialized);
  } catch {
    throw new IntegrityError(
      "Worker package release envelope is not JSON."
    );
  }
  const normalized =
    normalizeWorkerPackageReleaseEnvelope(parsed);
  if (
    serializeWorkerPackageReleaseEnvelope(normalized) !==
    serialized
  ) {
    throw new IntegrityError(
      "Worker package release envelope is not canonical."
    );
  }
  return normalized;
}

function workloadSessionConfigurationFromEnvironment() {
  const challenge =
    process.env[SESSION_CHALLENGE_ENVIRONMENT_KEY];
  const faultMode =
    process.env[SESSION_FAULT_ENVIRONMENT_KEY] || "none";
  delete process.env[SESSION_CHALLENGE_ENVIRONMENT_KEY];
  delete process.env[SESSION_FAULT_ENVIRONMENT_KEY];
  if (
    faultMode !== "none" &&
    faultMode !== "signature-mismatch"
  ) {
    throw new IntegrityError(
      "Worker workload session configuration is invalid."
    );
  }
  return {
    challenge: normalizeWorkloadSessionChallenge(
      challenge,
      IntegrityError
    ),
    faultMode
  };
}

function createPackageLoader(workerPackage) {
  const sources = new Map(
    workerPackage.modules.map((module) => [
      packageUrl(module.path),
      module.source
    ])
  );
  const modules = new Map();

  function sourceModule(identifier) {
    if (modules.has(identifier)) return modules.get(identifier);
    const source = sources.get(identifier);
    if (source === undefined) {
      throw new IntegrityError(
        "Worker package requested an unavailable module."
      );
    }
    const module = new vm.SourceTextModule(source, {
      identifier,
      initializeImportMeta(meta) {
        meta.url = identifier;
      },
      importModuleDynamically() {
        throw new IntegrityError(
          "Worker package dynamic imports are disabled."
        );
      }
    });
    modules.set(identifier, module);
    return module;
  }

  async function builtinModule(identifier) {
    if (
      !ALLOWED_BUILTINS.has(identifier) ||
      !KNOWN_BUILTINS.has(identifier)
    ) {
      throw new IntegrityError(
        "Worker package requested an unapproved built-in module."
      );
    }
    if (modules.has(identifier)) return modules.get(identifier);
    const namespace = await import(identifier);
    const exportNames = Object.keys(namespace);
    const module = new vm.SyntheticModule(
      exportNames,
      function initializeExports() {
        for (const name of exportNames) {
          this.setExport(name, namespace[name]);
        }
      },
      { identifier }
    );
    modules.set(identifier, module);
    return module;
  }

  async function linker(specifier, referencingModule) {
    if (specifier.startsWith("node:")) {
      return builtinModule(specifier);
    }
    if (
      !specifier.startsWith(".") ||
      specifier.includes("?") ||
      specifier.includes("#")
    ) {
      throw new IntegrityError(
        "Worker package import specifier is unsupported."
      );
    }
    const identifier = new URL(
      specifier,
      referencingModule.identifier
    ).href;
    if (!identifier.startsWith(PACKAGE_URL_PREFIX)) {
      throw new IntegrityError(
        "Worker package import escapes its package."
      );
    }
    return sourceModule(identifier);
  }

  return {
    async evaluateEntrypoint() {
      const entrypoint = sourceModule(
        packageUrl(workerPackage.artifact.entrypoint)
      );
      await entrypoint.link(linker);
      await entrypoint.evaluate();
    }
  };
}

async function main() {
  const argumentsList = process.argv.slice(2);
  if (argumentsList.length !== 1) {
    throw new IntegrityError(
      "Worker package bootstrap requires one package path."
    );
  }
  const releaseEnvelope = releaseEnvelopeFromEnvironment();
  const workloadSessionConfiguration =
    workloadSessionConfigurationFromEnvironment();
  const release = await inspectDryRunWorkerPackageRelease({
    packagePath: argumentsList[0],
    ...releaseEnvelope
  });
  const observation = immutableJson({
    ...release.binding,
    packageDigestMatched: true,
    releaseSignatureVerifiedByBootstrap: true,
    evaluatedFromVerifiedMemory: true
  });
  Object.defineProperty(
    globalThis,
    "__FDOS_VERIFIED_WORKER_PACKAGE__",
    {
      value: observation,
      configurable: false,
      enumerable: false,
      writable: false
    }
  );
  const workloadSessionAuthority =
    createEphemeralWorkloadSessionAuthority({
      challenge:
        workloadSessionConfiguration.challenge,
      workerPackage: release.binding,
      faultMode:
        workloadSessionConfiguration.faultMode
    });
  Object.defineProperty(
    globalThis,
    "__FDOS_WORKLOAD_SESSION__",
    {
      value:
        workloadSessionAuthority.workloadSession,
      configurable: false,
      enumerable: false,
      writable: false
    }
  );
  Object.defineProperty(
    globalThis,
    "__FDOS_SIGN_WORKER_RESPONSE__",
    {
      value: Object.freeze((response) =>
        workloadSessionAuthority.signResponse(
          response
        )
      ),
      configurable: false,
      enumerable: false,
      writable: false
    }
  );
  const loader = createPackageLoader(release.workerPackage);
  await loader.evaluateEntrypoint();
}

main().catch(() => {
  process.stderr.write("WORKER_PACKAGE_BOOTSTRAP_REJECTED\n");
  process.exit(78);
});
