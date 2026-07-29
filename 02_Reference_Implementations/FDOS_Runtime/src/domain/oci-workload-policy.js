import {
  digestObject,
  immutableJson
} from "../kernel/canonical-json.js";
import {
  IntegrityError,
  ValidationError
} from "../kernel/errors.js";
import {
  assertPlainObject,
  requiredString
} from "../kernel/validation.js";

export const OCI_WORKLOAD_POLICY_SCHEMA_VERSION = "1.0";
export const OCI_WORKLOAD_POLICY_KIND =
  "fdos-oci-workload-policy";
export const DOCKER_OCI_PROVIDER =
  "docker-engine-local-oci-v1";

const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/;
const IMAGE_PATH_SEGMENT_PATTERN =
  /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;
const IMAGE_REGISTRY_LABEL_PATTERN =
  /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const SUPPORTED_PLATFORMS = new Set([
  "linux/amd64",
  "linux/arm64"
]);
const POLICY_KEYS = Object.freeze([
  "digest",
  "image",
  "kind",
  "process",
  "provider",
  "resources",
  "schemaVersion",
  "security"
]);
const IMAGE_KEYS = Object.freeze([
  "manifestDigest",
  "platform",
  "reference"
]);
const PROCESS_KEYS = Object.freeze([
  "command",
  "environmentNames",
  "user",
  "workingDirectory"
]);
const SECURITY_KEYS = Object.freeze([
  "capabilitiesDrop",
  "filesystemMode",
  "hostDevices",
  "hostMounts",
  "ipcMode",
  "networkMode",
  "noNewPrivileges",
  "privileged",
  "seccompProfile"
]);
const RESOURCE_KEYS = Object.freeze([
  "cpuQuotaMillis",
  "memoryBytes",
  "memorySwapBytes",
  "openFiles",
  "pidsLimit",
  "tmpfs"
]);
const OPEN_FILE_KEYS = Object.freeze([
  "hard",
  "soft"
]);
const TMPFS_KEYS = Object.freeze([
  "noExec",
  "noSuid",
  "nodev",
  "sizeBytes",
  "target"
]);

export const PILOT_OCI_WORKER_COMMAND = Object.freeze([
  "/usr/local/bin/node",
  "--no-warnings",
  "--experimental-vm-modules",
  "/opt/fdos/runtime/src/workers/dry-run-worker-bootstrap.js",
  "/opt/fdos/package/connector-dry-run-v2.fdos-package.json"
]);

export const PILOT_OCI_WORKER_ENVIRONMENT_NAMES =
  Object.freeze([
    "FDOS_DRY_RUN_WORKER_FAULT",
    "FDOS_NETWORK_ISOLATION_POLICY_DIGEST",
    "FDOS_NETWORK_ISOLATION_PROVIDER",
    "FDOS_WORKER_PACKAGE_RELEASE",
    "FDOS_WORKLOAD_SESSION_CHALLENGE",
    "FDOS_WORKLOAD_SESSION_FAULT",
    "LANG",
    "LC_ALL",
    "TZ"
  ]);

function exactKeys(
  value,
  expected,
  field,
  ErrorType = ValidationError
) {
  try {
    assertPlainObject(value, field);
  } catch {
    throw new ErrorType(`${field} has an unexpected shape.`);
  }
  const actual = Object.keys(value).sort();
  const normalizedExpected = [...expected].sort();
  if (
    actual.length !== normalizedExpected.length ||
    actual.some(
      (key, index) => key !== normalizedExpected[index]
    )
  ) {
    throw new ErrorType(`${field} has an unexpected shape.`);
  }
}

function normalizedString(
  value,
  field,
  options,
  ErrorType = ValidationError
) {
  try {
    const normalized = requiredString(value, field, options);
    if (normalized !== value) {
      throw new ValidationError(`${field} is not exact.`);
    }
    return normalized;
  } catch {
    throw new ErrorType(`${field} is invalid.`);
  }
}

function normalizedDigest(
  value,
  field,
  ErrorType = ValidationError
) {
  return normalizedString(
    value,
    field,
    {
      max: 71,
      pattern: DIGEST_PATTERN
    },
    ErrorType
  );
}

function normalizedInteger(
  value,
  field,
  minimum,
  maximum,
  ErrorType = ValidationError
) {
  if (
    !Number.isSafeInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    throw new ErrorType(`${field} is invalid.`);
  }
  return value;
}

function arraysEqual(left, right) {
  return (
    Array.isArray(left) &&
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function validImageRegistry(value) {
  const separator = value.lastIndexOf(":");
  const host =
    separator === -1 ? value : value.slice(0, separator);
  const port =
    separator === -1 ? null : value.slice(separator + 1);
  if (
    host.length < 1 ||
    host.length > 253 ||
    (
      host !== "localhost" &&
      !host.includes(".")
    ) ||
    (
      port !== null &&
      (
        !/^[1-9][0-9]{0,4}$/.test(port) ||
        Number(port) > 65_535
      )
    )
  ) {
    return false;
  }
  return host
    .split(".")
    .every((label) =>
      IMAGE_REGISTRY_LABEL_PATTERN.test(label)
    );
}

function normalizeImageReference(
  value,
  manifestDigest,
  ErrorType = ValidationError
) {
  const reference = normalizedString(
    value,
    "OCI image reference",
    { max: 320 },
    ErrorType
  );
  const parts = reference.split("@");
  if (
    parts.length !== 2 ||
    parts[1] !== manifestDigest ||
    !DIGEST_PATTERN.test(parts[1])
  ) {
    throw new ErrorType(
      "OCI image reference must bind the exact manifest digest."
    );
  }
  const repositoryParts = parts[0].split("/");
  const registry = repositoryParts.shift();
  if (
    repositoryParts.length < 1 ||
    !validImageRegistry(registry) ||
    repositoryParts.some(
      (segment) => !IMAGE_PATH_SEGMENT_PATTERN.test(segment)
    )
  ) {
    throw new ErrorType("OCI image repository is invalid.");
  }
  return reference;
}

function normalizeImage(
  value,
  ErrorType = ValidationError
) {
  exactKeys(value, IMAGE_KEYS, "OCI workload image", ErrorType);
  const manifestDigest = normalizedDigest(
    value.manifestDigest,
    "OCI image manifest digest",
    ErrorType
  );
  const platform = normalizedString(
    value.platform,
    "OCI image platform",
    { max: 32 },
    ErrorType
  );
  if (!SUPPORTED_PLATFORMS.has(platform)) {
    throw new ErrorType("OCI image platform is unsupported.");
  }
  return {
    reference: normalizeImageReference(
      value.reference,
      manifestDigest,
      ErrorType
    ),
    manifestDigest,
    platform
  };
}

function normalizeProcess(
  value,
  ErrorType = ValidationError
) {
  exactKeys(
    value,
    PROCESS_KEYS,
    "OCI workload process",
    ErrorType
  );
  if (
    !arraysEqual(value.command, PILOT_OCI_WORKER_COMMAND) ||
    !arraysEqual(
      value.environmentNames,
      PILOT_OCI_WORKER_ENVIRONMENT_NAMES
    ) ||
    value.user !== "65532:65532" ||
    value.workingDirectory !== "/opt/fdos/worker"
  ) {
    throw new ErrorType(
      "OCI workload process differs from the closed pilot entrypoint."
    );
  }
  return {
    command: [...PILOT_OCI_WORKER_COMMAND],
    environmentNames: [
      ...PILOT_OCI_WORKER_ENVIRONMENT_NAMES
    ],
    user: "65532:65532",
    workingDirectory: "/opt/fdos/worker"
  };
}

function normalizeSecurity(
  value,
  ErrorType = ValidationError
) {
  exactKeys(
    value,
    SECURITY_KEYS,
    "OCI workload security policy",
    ErrorType
  );
  if (
    !arraysEqual(value.capabilitiesDrop, ["ALL"]) ||
    value.filesystemMode !== "read-only-root" ||
    !Array.isArray(value.hostDevices) ||
    value.hostDevices.length !== 0 ||
    !Array.isArray(value.hostMounts) ||
    value.hostMounts.length !== 0 ||
    value.ipcMode !== "private" ||
    value.networkMode !== "none" ||
    value.noNewPrivileges !== true ||
    value.privileged !== false ||
    value.seccompProfile !== "builtin"
  ) {
    throw new ErrorType(
      "OCI workload security policy is not fail-closed."
    );
  }
  return {
    privileged: false,
    noNewPrivileges: true,
    capabilitiesDrop: ["ALL"],
    seccompProfile: "builtin",
    networkMode: "none",
    ipcMode: "private",
    filesystemMode: "read-only-root",
    hostMounts: [],
    hostDevices: []
  };
}

function normalizeResources(
  value,
  ErrorType = ValidationError
) {
  exactKeys(
    value,
    RESOURCE_KEYS,
    "OCI workload resources",
    ErrorType
  );
  exactKeys(
    value.openFiles,
    OPEN_FILE_KEYS,
    "OCI workload open-file limit",
    ErrorType
  );
  exactKeys(
    value.tmpfs,
    TMPFS_KEYS,
    "OCI workload tmpfs",
    ErrorType
  );
  const cpuQuotaMillis = normalizedInteger(
    value.cpuQuotaMillis,
    "OCI workload CPU quota",
    100,
    2_000,
    ErrorType
  );
  const memoryBytes = normalizedInteger(
    value.memoryBytes,
    "OCI workload memory limit",
    64 * 1024 * 1024,
    512 * 1024 * 1024,
    ErrorType
  );
  const memorySwapBytes = normalizedInteger(
    value.memorySwapBytes,
    "OCI workload memory-swap limit",
    64 * 1024 * 1024,
    512 * 1024 * 1024,
    ErrorType
  );
  const pidsLimit = normalizedInteger(
    value.pidsLimit,
    "OCI workload PID limit",
    8,
    128,
    ErrorType
  );
  const openFilesSoft = normalizedInteger(
    value.openFiles.soft,
    "OCI workload open-file soft limit",
    64,
    4_096,
    ErrorType
  );
  const openFilesHard = normalizedInteger(
    value.openFiles.hard,
    "OCI workload open-file hard limit",
    64,
    4_096,
    ErrorType
  );
  const tmpfsSizeBytes = normalizedInteger(
    value.tmpfs.sizeBytes,
    "OCI workload tmpfs size",
    1024 * 1024,
    64 * 1024 * 1024,
    ErrorType
  );
  if (
    memoryBytes % (1024 * 1024) !== 0 ||
    memorySwapBytes !== memoryBytes ||
    openFilesSoft !== openFilesHard ||
    value.tmpfs.target !== "/tmp" ||
    value.tmpfs.noExec !== true ||
    value.tmpfs.noSuid !== true ||
    value.tmpfs.nodev !== true
  ) {
    throw new ErrorType(
      "OCI workload resource policy is inconsistent."
    );
  }
  return {
    cpuQuotaMillis,
    memoryBytes,
    memorySwapBytes,
    pidsLimit,
    openFiles: {
      soft: openFilesSoft,
      hard: openFilesHard
    },
    tmpfs: {
      target: "/tmp",
      sizeBytes: tmpfsSizeBytes,
      noExec: true,
      noSuid: true,
      nodev: true
    }
  };
}

export function normalizeOciWorkloadPolicy(
  value,
  ErrorType = ValidationError
) {
  exactKeys(
    value,
    POLICY_KEYS,
    "OCI workload policy",
    ErrorType
  );
  if (
    value.schemaVersion !==
      OCI_WORKLOAD_POLICY_SCHEMA_VERSION ||
    value.kind !== OCI_WORKLOAD_POLICY_KIND ||
    value.provider !== DOCKER_OCI_PROVIDER
  ) {
    throw new ErrorType("OCI workload policy is unsupported.");
  }
  const unsigned = {
    schemaVersion: OCI_WORKLOAD_POLICY_SCHEMA_VERSION,
    kind: OCI_WORKLOAD_POLICY_KIND,
    provider: DOCKER_OCI_PROVIDER,
    image: normalizeImage(value.image, ErrorType),
    process: normalizeProcess(value.process, ErrorType),
    security: normalizeSecurity(value.security, ErrorType),
    resources: normalizeResources(
      value.resources,
      ErrorType
    )
  };
  const digest = normalizedDigest(
    value.digest,
    "OCI workload policy digest",
    ErrorType
  );
  if (digestObject(unsigned) !== digest) {
    throw new ErrorType("OCI workload policy digest mismatch.");
  }
  return immutableJson({
    ...unsigned,
    digest
  });
}

export function createOciWorkloadPolicy({
  imageReference,
  manifestDigest,
  platform,
  cpuQuotaMillis = 500,
  memoryBytes = 128 * 1024 * 1024,
  pidsLimit = 32,
  openFiles = 512,
  tmpfsSizeBytes = 16 * 1024 * 1024
}) {
  const unsigned = {
    schemaVersion: OCI_WORKLOAD_POLICY_SCHEMA_VERSION,
    kind: OCI_WORKLOAD_POLICY_KIND,
    provider: DOCKER_OCI_PROVIDER,
    image: {
      reference: imageReference,
      manifestDigest,
      platform
    },
    process: {
      command: [...PILOT_OCI_WORKER_COMMAND],
      environmentNames: [
        ...PILOT_OCI_WORKER_ENVIRONMENT_NAMES
      ],
      user: "65532:65532",
      workingDirectory: "/opt/fdos/worker"
    },
    security: {
      privileged: false,
      noNewPrivileges: true,
      capabilitiesDrop: ["ALL"],
      seccompProfile: "builtin",
      networkMode: "none",
      ipcMode: "private",
      filesystemMode: "read-only-root",
      hostMounts: [],
      hostDevices: []
    },
    resources: {
      cpuQuotaMillis,
      memoryBytes,
      memorySwapBytes: memoryBytes,
      pidsLimit,
      openFiles: {
        soft: openFiles,
        hard: openFiles
      },
      tmpfs: {
        target: "/tmp",
        sizeBytes: tmpfsSizeBytes,
        noExec: true,
        noSuid: true,
        nodev: true
      }
    }
  };
  return normalizeOciWorkloadPolicy({
    ...unsigned,
    digest: digestObject(unsigned)
  });
}

export function verifyOciWorkloadPolicy(value) {
  normalizeOciWorkloadPolicy(value, IntegrityError);
  return true;
}
