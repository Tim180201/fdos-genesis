import { createHash } from "node:crypto";
import { lstat, readFile } from "node:fs/promises";
import {
  digestObject,
  immutableJson
} from "../kernel/canonical-json.js";
import {
  IntegrityError,
  PolicyError,
  ValidationError
} from "../kernel/errors.js";
import { requiredString } from "../kernel/validation.js";
import {
  DARWIN_NETWORK_ISOLATION_PROVIDER
} from "../domain/network-isolation-contract.js";

const SANDBOX_EXECUTABLE = "/usr/bin/sandbox-exec";
const SANDBOX_PROFILE =
  "(version 1)(allow default)(deny network*)(deny file-write*)";
const PROVIDER_ID = DARWIN_NETWORK_ISOLATION_PROVIDER;
const MAX_LAUNCHER_BYTES = 512 * 1024;

function sha256Buffer(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function acceptedExecutablePath(value, field) {
  const normalized = requiredString(value, field, {
    max: 2_000
  });
  if (!normalized.startsWith("/")) {
    throw new ValidationError(`${field} must be absolute.`);
  }
  return normalized;
}

export class DarwinSandboxExecNetworkWriteDeny {
  status() {
    return immutableJson({
      kind: "fdos-darwin-network-sandbox-provider",
      provider: PROVIDER_ID,
      platform: "darwin",
      networkIsolationRequired: true,
      networkIsolationEnforced: false,
      filesystemWriteIsolationRequired: true,
      filesystemWriteIsolationEnforced: false,
      enforcementState: "not_attested",
      deprecatedPlatformInterface: true,
      productionReady: false
    });
  }

  async inspect() {
    if (process.platform !== "darwin") {
      throw new PolicyError(
        "Darwin network sandbox is unavailable on this platform."
      );
    }
    let metadata;
    let content;
    try {
      metadata = await lstat(SANDBOX_EXECUTABLE);
      content = await readFile(SANDBOX_EXECUTABLE);
    } catch (error) {
      throw new IntegrityError(
        "Darwin network sandbox launcher is unavailable.",
        {
          errorType: error?.name || "Error"
        }
      );
    }
    if (
      metadata.isSymbolicLink() ||
      !metadata.isFile() ||
      metadata.size < 1 ||
      metadata.size > MAX_LAUNCHER_BYTES ||
      metadata.uid !== 0 ||
      (metadata.mode & 0o022) !== 0 ||
      content.length !== metadata.size
    ) {
      throw new IntegrityError(
        "Darwin network sandbox launcher failed trust checks."
      );
    }
    const launcher = {
      path: SANDBOX_EXECUTABLE,
      digest: sha256Buffer(content),
      size: metadata.size,
      uid: metadata.uid,
      gid: metadata.gid,
      mode: metadata.mode & 0o777
    };
    const profileDigest = digestObject({
      provider: PROVIDER_ID,
      profile: SANDBOX_PROFILE
    });
    const policy = {
      schemaVersion: "1.0",
      kind: "fdos-network-isolation-policy",
      provider: PROVIDER_ID,
      platform: "darwin",
      launcher,
      profileDigest,
      networkAccess: false,
      filesystemWriteAccess: false,
      deprecatedPlatformInterface: true
    };
    return immutableJson({
      ...policy,
      policyDigest: digestObject(policy)
    });
  }

  async prepareLaunch({
    nodeExecutable,
    workerFile,
    nodeOptions = [],
    workerArguments = []
  }) {
    const normalizedNode = acceptedExecutablePath(
      nodeExecutable,
      "sandbox Node executable"
    );
    const normalizedWorker = acceptedExecutablePath(
      workerFile,
      "sandbox worker file"
    );
    if (
      !Array.isArray(nodeOptions) ||
      nodeOptions.some(
        (option) => option !== "--experimental-vm-modules"
      ) ||
      new Set(nodeOptions).size !== nodeOptions.length ||
      !Array.isArray(workerArguments) ||
      workerArguments.length > 2
    ) {
      throw new ValidationError(
        "Sandbox worker launch arguments are invalid."
      );
    }
    const normalizedWorkerArguments = workerArguments.map(
      (argument, index) =>
        acceptedExecutablePath(
          argument,
          `sandbox worker argument ${index}`
        )
    );
    const policy = await this.inspect();
    return immutableJson({
      executable: SANDBOX_EXECUTABLE,
      arguments: [
        "-p",
        SANDBOX_PROFILE,
        normalizedNode,
        "--no-warnings",
        ...nodeOptions,
        normalizedWorker,
        ...normalizedWorkerArguments
      ],
      isolation: {
        required: true,
        provider: PROVIDER_ID,
        policyDigest: policy.policyDigest
      },
      policy
    });
  }
}

export const DARWIN_NETWORK_SANDBOX_PROVIDER = PROVIDER_ID;
