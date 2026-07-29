import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  lstat,
  readFile,
  realpath,
  stat
} from "node:fs/promises";
import path from "node:path";
import {
  digestObject,
  immutableJson
} from "../kernel/canonical-json.js";
import {
  IntegrityError,
  PolicyError,
  ValidationError
} from "../kernel/errors.js";
import {
  assertPlainObject,
  requiredString
} from "../kernel/validation.js";
import {
  DOCKER_OCI_PROVIDER,
  normalizeOciWorkloadPolicy,
  PILOT_OCI_WORKER_COMMAND,
  PILOT_OCI_WORKER_ENVIRONMENT_NAMES
} from "../domain/oci-workload-policy.js";

const SCHEMA_VERSION = "1.0";
const RUNTIME_KIND = "fdos-local-docker-runtime-observation";
const IMAGE_KIND = "fdos-local-oci-image-observation";
const TEMPLATE_KIND = "fdos-docker-oci-launch-template";
const PREFLIGHT_KIND = "fdos-local-oci-workload-preflight";
const MINIMUM_DOCKER_API_VERSION = "1.49";
const MAX_EXECUTABLE_BYTES = 64 * 1024 * 1024;
const MAX_COMMAND_STDOUT_BYTES = 512 * 1024;
const MAX_COMMAND_STDERR_BYTES = 16 * 1024;
const DEFAULT_TIMEOUT_MS = 3_000;
const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/;
const VERSION_PATTERN = /^[0-9]+(?:\.[0-9]+){1,3}(?:[-+][0-9A-Za-z.-]+)?$/;
const LAUNCHER_KEYS = Object.freeze([
  "digest",
  "gid",
  "mode",
  "requestedPath",
  "resolvedPath",
  "rootOwned",
  "size",
  "symlinkResolved",
  "uid"
]);
const RUNTIME_KEYS = Object.freeze([
  "apiVersion",
  "architecture",
  "cgroupVersion",
  "clientVersion",
  "digest",
  "endpoint",
  "externallyAttested",
  "kind",
  "launcher",
  "operatingSystem",
  "provider",
  "rootless",
  "schemaVersion",
  "seccompProfile",
  "serverVersion"
]);
const IMAGE_KEYS = Object.freeze([
  "commandDigest",
  "declaredVolumes",
  "digest",
  "externallyAttested",
  "exposedPorts",
  "imageId",
  "imageEnvironmentDigest",
  "imageEnvironmentSanitized",
  "kind",
  "layerCount",
  "manifestDigest",
  "manifestDigestMatched",
  "platform",
  "policyDigest",
  "provider",
  "reference",
  "rootfsDigest",
  "schemaVersion",
  "user",
  "workingDirectory"
]);
const TEMPLATE_KEYS = Object.freeze([
  "arguments",
  "digest",
  "environmentNames",
  "executable",
  "imageObservationDigest",
  "kind",
  "parentEnvironmentForwarded",
  "policyDigest",
  "runtimeObservationDigest",
  "schemaVersion",
  "shell",
  "stderrPolicy",
  "stdinProtocol",
  "stdoutProtocol"
]);
const PREFLIGHT_KEYS = Object.freeze([
  "checks",
  "digest",
  "executionAuthorized",
  "executionObserved",
  "image",
  "kind",
  "policy",
  "productionReady",
  "provider",
  "runtime",
  "schemaVersion",
  "template",
  "workloadIdentityExternallyAttested"
]);
const CHECK_KEYS = Object.freeze([
  "capabilitiesDropped",
  "daemonAvailable",
  "digestPinnedImage",
  "hostDevicesAbsent",
  "hostMountsAbsent",
  "imageConfigMatched",
  "networkDisabled",
  "noNewPrivileges",
  "nonRootUser",
  "readOnlyRootFilesystem",
  "resourceLimitsBound",
  "seccompEnabled"
]);
const COMMAND_RESULT_KEYS = Object.freeze([
  "code",
  "signal",
  "stderr",
  "stdout"
]);
const ALLOWED_IMAGE_ENVIRONMENT_NAMES = new Set([
  "LANG",
  "LC_ALL",
  "PATH",
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
  options = {},
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
  ErrorType = IntegrityError
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

function normalizedAbsolutePath(
  value,
  field,
  ErrorType = ValidationError
) {
  const normalized = normalizedString(
    value,
    field,
    { max: 2_000 },
    ErrorType
  );
  if (
    !path.isAbsolute(normalized) ||
    path.normalize(normalized) !== normalized
  ) {
    throw new ErrorType(`${field} must be normalized and absolute.`);
  }
  return normalized;
}

function normalizedEndpoint(
  value,
  ErrorType = ValidationError
) {
  const endpoint = normalizedString(
    value,
    "Docker runtime endpoint",
    { max: 2_048 },
    ErrorType
  );
  if (!endpoint.startsWith("unix://")) {
    throw new ErrorType(
      "Docker runtime endpoint must use a local Unix socket."
    );
  }
  const socketPath = endpoint.slice("unix://".length);
  if (
    !path.isAbsolute(socketPath) ||
    path.normalize(socketPath) !== socketPath ||
    socketPath === "/" ||
    /[%?#]/.test(socketPath) ||
    socketPath.includes("\n") ||
    socketPath.includes("\r") ||
    socketPath.includes("\0")
  ) {
    throw new ErrorType(
      "Docker runtime Unix socket path is invalid."
    );
  }
  return endpoint;
}

function sha256Buffer(value) {
  return `sha256:${createHash("sha256")
    .update(value)
    .digest("hex")}`;
}

function validCommandResult(value) {
  exactKeys(
    value,
    COMMAND_RESULT_KEYS,
    "Docker command result",
    PolicyError
  );
  if (
    !(value.code === null || Number.isSafeInteger(value.code)) ||
    !(value.signal === null || typeof value.signal === "string") ||
    typeof value.stdout !== "string" ||
    typeof value.stderr !== "string" ||
    Buffer.byteLength(value.stdout, "utf8") >
      MAX_COMMAND_STDOUT_BYTES ||
    Buffer.byteLength(value.stderr, "utf8") >
      MAX_COMMAND_STDERR_BYTES
  ) {
    throw new PolicyError(
      "Docker command returned an invalid bounded result."
    );
  }
  return value;
}

function defaultCommandRunner({
  executable,
  arguments: argumentList,
  timeoutMs
}) {
  return new Promise((resolve, reject) => {
    let child;
    try {
      child = spawn(executable, argumentList, {
        cwd: "/",
        env: {
          LANG: "C",
          LC_ALL: "C",
          TZ: "UTC"
        },
        shell: false,
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true
      });
    } catch (error) {
      reject(error);
      return;
    }
    let stdout = "";
    let stderr = "";
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let exceeded = false;
    let timedOut = false;
    let spawnError = null;

    const terminate = () => {
      if (child.exitCode === null && child.signalCode === null) {
        child.kill("SIGKILL");
      }
    };
    const timer = setTimeout(() => {
      timedOut = true;
      terminate();
    }, timeoutMs);

    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdoutBytes += Buffer.byteLength(chunk, "utf8");
      if (stdoutBytes > MAX_COMMAND_STDOUT_BYTES) {
        exceeded = true;
        terminate();
        return;
      }
      stdout += chunk;
    });
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      stderrBytes += Buffer.byteLength(chunk, "utf8");
      if (stderrBytes > MAX_COMMAND_STDERR_BYTES) {
        exceeded = true;
        terminate();
        return;
      }
      stderr += chunk;
    });
    child.on("error", (error) => {
      spawnError = error;
    });
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      if (timedOut) {
        reject(new PolicyError("Docker command timed out."));
        return;
      }
      if (exceeded) {
        reject(
          new PolicyError("Docker command exceeded output limits.")
        );
        return;
      }
      if (spawnError) {
        reject(spawnError);
        return;
      }
      resolve({
        code,
        signal,
        stdout,
        stderr
      });
    });
  });
}

function apiVersionAtLeast(actual, minimum) {
  const normalizedActual = actual.split(".").map(Number);
  const normalizedMinimum = minimum.split(".").map(Number);
  if (
    normalizedActual.length !== 2 ||
    normalizedMinimum.length !== 2 ||
    normalizedActual.some((part) => !Number.isSafeInteger(part)) ||
    normalizedMinimum.some((part) => !Number.isSafeInteger(part))
  ) {
    return false;
  }
  if (normalizedActual[0] !== normalizedMinimum[0]) {
    return normalizedActual[0] > normalizedMinimum[0];
  }
  return normalizedActual[1] >= normalizedMinimum[1];
}

function normalizedArchitecture(value, ErrorType = PolicyError) {
  const architecture = normalizedString(
    value,
    "Docker runtime architecture",
    { max: 32 },
    ErrorType
  );
  if (architecture === "amd64" || architecture === "x86_64") {
    return "amd64";
  }
  if (architecture === "arm64" || architecture === "aarch64") {
    return "arm64";
  }
  throw new ErrorType("Docker runtime architecture is unsupported.");
}

function normalizedStringArray(
  value,
  field,
  {
    maximum = 256,
    pattern,
    ErrorType = PolicyError
  } = {}
) {
  if (
    !Array.isArray(value) ||
    value.length > maximum
  ) {
    throw new ErrorType(`${field} is invalid.`);
  }
  return value.map((entry, index) =>
    normalizedString(
      entry,
      `${field}[${index}]`,
      {
        max: 4_000,
        ...(pattern ? { pattern } : {})
      },
      ErrorType
    )
  );
}

function arraysEqual(left, right) {
  return (
    Array.isArray(left) &&
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function normalizeLauncherObservation(
  value,
  ErrorType = IntegrityError
) {
  exactKeys(
    value,
    LAUNCHER_KEYS,
    "Docker launcher observation",
    ErrorType
  );
  const launcher = {
    requestedPath: normalizedAbsolutePath(
      value.requestedPath,
      "Docker launcher requested path",
      ErrorType
    ),
    resolvedPath: normalizedAbsolutePath(
      value.resolvedPath,
      "Docker launcher resolved path",
      ErrorType
    ),
    digest: normalizedDigest(
      value.digest,
      "Docker launcher digest",
      ErrorType
    ),
    size: value.size,
    uid: value.uid,
    gid: value.gid,
    mode: value.mode,
    symlinkResolved: value.symlinkResolved,
    rootOwned: value.rootOwned
  };
  if (
    !Number.isSafeInteger(launcher.size) ||
    launcher.size < 1 ||
    launcher.size > MAX_EXECUTABLE_BYTES ||
    !Number.isSafeInteger(launcher.uid) ||
    launcher.uid < 0 ||
    !Number.isSafeInteger(launcher.gid) ||
    launcher.gid < 0 ||
    !Number.isSafeInteger(launcher.mode) ||
    launcher.mode < 0 ||
    launcher.mode > 0o777 ||
    (launcher.mode & 0o022) !== 0 ||
    (launcher.mode & 0o111) === 0 ||
    typeof launcher.symlinkResolved !== "boolean" ||
    launcher.rootOwned !== (launcher.uid === 0)
  ) {
    throw new ErrorType(
      "Docker launcher observation is inconsistent."
    );
  }
  return launcher;
}

function normalizeRuntimeObservation(
  value,
  ErrorType = IntegrityError
) {
  exactKeys(
    value,
    RUNTIME_KEYS,
    "Docker runtime observation",
    ErrorType
  );
  if (
    value.schemaVersion !== SCHEMA_VERSION ||
    value.kind !== RUNTIME_KIND ||
    value.provider !== DOCKER_OCI_PROVIDER ||
    value.operatingSystem !== "linux" ||
    value.cgroupVersion !== "2" ||
    value.seccompProfile !== "builtin" ||
    typeof value.rootless !== "boolean" ||
    value.externallyAttested !== false
  ) {
    throw new ErrorType(
      "Docker runtime observation is unsupported."
    );
  }
  const unsigned = {
    schemaVersion: SCHEMA_VERSION,
    kind: RUNTIME_KIND,
    provider: DOCKER_OCI_PROVIDER,
    endpoint: normalizedEndpoint(
      value.endpoint,
      ErrorType
    ),
    launcher: normalizeLauncherObservation(
      value.launcher,
      ErrorType
    ),
    clientVersion: normalizedString(
      value.clientVersion,
      "Docker client version",
      {
        max: 64,
        pattern: VERSION_PATTERN
      },
      ErrorType
    ),
    serverVersion: normalizedString(
      value.serverVersion,
      "Docker server version",
      {
        max: 64,
        pattern: VERSION_PATTERN
      },
      ErrorType
    ),
    apiVersion: normalizedString(
      value.apiVersion,
      "Docker API version",
      {
        max: 16,
        pattern: /^[0-9]+\.[0-9]+$/
      },
      ErrorType
    ),
    operatingSystem: "linux",
    architecture: normalizedArchitecture(
      value.architecture,
      ErrorType
    ),
    cgroupVersion: "2",
    seccompProfile: "builtin",
    rootless: value.rootless,
    externallyAttested: false
  };
  if (
    !apiVersionAtLeast(
      unsigned.apiVersion,
      MINIMUM_DOCKER_API_VERSION
    )
  ) {
    throw new ErrorType("Docker API version is unsupported.");
  }
  const digest = normalizedDigest(
    value.digest,
    "Docker runtime observation digest",
    ErrorType
  );
  if (digestObject(unsigned) !== digest) {
    throw new ErrorType(
      "Docker runtime observation digest mismatch."
    );
  }
  return immutableJson({
    ...unsigned,
    digest
  });
}

function normalizeImageObservation(
  value,
  ErrorType = IntegrityError
) {
  exactKeys(
    value,
    IMAGE_KEYS,
    "OCI image observation",
    ErrorType
  );
  if (
    value.schemaVersion !== SCHEMA_VERSION ||
    value.kind !== IMAGE_KIND ||
    value.provider !== DOCKER_OCI_PROVIDER ||
    value.manifestDigestMatched !== true ||
    value.imageEnvironmentSanitized !== true ||
    value.declaredVolumes !== false ||
    value.exposedPorts !== false ||
    value.externallyAttested !== false
  ) {
    throw new ErrorType(
      "OCI image observation is unsupported."
    );
  }
  const unsigned = {
    schemaVersion: SCHEMA_VERSION,
    kind: IMAGE_KIND,
    provider: DOCKER_OCI_PROVIDER,
    policyDigest: normalizedDigest(
      value.policyDigest,
      "OCI image policy digest",
      ErrorType
    ),
    reference: normalizedString(
      value.reference,
      "OCI image observed reference",
      { max: 320 },
      ErrorType
    ),
    manifestDigest: normalizedDigest(
      value.manifestDigest,
      "OCI image observed manifest digest",
      ErrorType
    ),
    manifestDigestMatched: true,
    imageId: normalizedDigest(
      value.imageId,
      "OCI image ID",
      ErrorType
    ),
    platform: normalizedString(
      value.platform,
      "OCI image observed platform",
      {
        max: 32,
        pattern: /^linux\/(?:amd64|arm64)$/
      },
      ErrorType
    ),
    user: normalizedString(
      value.user,
      "OCI image observed user",
      {
        max: 32,
        pattern: /^[1-9][0-9]{0,4}:[1-9][0-9]{0,4}$/
      },
      ErrorType
    ),
    workingDirectory: normalizedAbsolutePath(
      value.workingDirectory,
      "OCI image working directory",
      ErrorType
    ),
    commandDigest: normalizedDigest(
      value.commandDigest,
      "OCI image command digest",
      ErrorType
    ),
    imageEnvironmentDigest: normalizedDigest(
      value.imageEnvironmentDigest,
      "OCI image environment digest",
      ErrorType
    ),
    imageEnvironmentSanitized: true,
    rootfsDigest: normalizedDigest(
      value.rootfsDigest,
      "OCI image rootfs digest",
      ErrorType
    ),
    layerCount: value.layerCount,
    declaredVolumes: false,
    exposedPorts: false,
    externallyAttested: false
  };
  if (
    !Number.isSafeInteger(unsigned.layerCount) ||
    unsigned.layerCount < 1 ||
    unsigned.layerCount > 256
  ) {
    throw new ErrorType("OCI image layer count is invalid.");
  }
  const digest = normalizedDigest(
    value.digest,
    "OCI image observation digest",
    ErrorType
  );
  if (digestObject(unsigned) !== digest) {
    throw new ErrorType("OCI image observation digest mismatch.");
  }
  return immutableJson({
    ...unsigned,
    digest
  });
}

function normalizeLaunchTemplate(
  value,
  ErrorType = IntegrityError
) {
  exactKeys(
    value,
    TEMPLATE_KEYS,
    "Docker OCI launch template",
    ErrorType
  );
  if (
    value.schemaVersion !== SCHEMA_VERSION ||
    value.kind !== TEMPLATE_KIND ||
    value.shell !== false ||
    value.parentEnvironmentForwarded !== false ||
    value.stdinProtocol !== "one-canonical-json-line" ||
    value.stdoutProtocol !== "one-canonical-json-line" ||
    value.stderrPolicy !== "must-be-empty"
  ) {
    throw new ErrorType(
      "Docker OCI launch template is unsupported."
    );
  }
  const argumentsList = normalizedStringArray(
    value.arguments,
    "Docker launch arguments",
    {
      maximum: 64,
      ErrorType
    }
  );
  const environmentNames = normalizedStringArray(
    value.environmentNames,
    "Docker launch environment names",
    {
      maximum: 16,
      pattern: /^[A-Z][A-Z0-9_]{1,79}$/,
      ErrorType
    }
  );
  if (
    argumentsList.length < 2 ||
    !arraysEqual(
      environmentNames,
      PILOT_OCI_WORKER_ENVIRONMENT_NAMES
    )
  ) {
    throw new ErrorType(
      "Docker OCI launch template is incomplete."
    );
  }
  const unsigned = {
    schemaVersion: SCHEMA_VERSION,
    kind: TEMPLATE_KIND,
    policyDigest: normalizedDigest(
      value.policyDigest,
      "Docker launch policy digest",
      ErrorType
    ),
    runtimeObservationDigest: normalizedDigest(
      value.runtimeObservationDigest,
      "Docker launch runtime digest",
      ErrorType
    ),
    imageObservationDigest: normalizedDigest(
      value.imageObservationDigest,
      "Docker launch image digest",
      ErrorType
    ),
    executable: normalizedAbsolutePath(
      value.executable,
      "Docker launch executable",
      ErrorType
    ),
    arguments: argumentsList,
    environmentNames,
    shell: false,
    parentEnvironmentForwarded: false,
    stdinProtocol: "one-canonical-json-line",
    stdoutProtocol: "one-canonical-json-line",
    stderrPolicy: "must-be-empty"
  };
  const digest = normalizedDigest(
    value.digest,
    "Docker launch template digest",
    ErrorType
  );
  if (digestObject(unsigned) !== digest) {
    throw new ErrorType(
      "Docker OCI launch template digest mismatch."
    );
  }
  return immutableJson({
    ...unsigned,
    digest
  });
}

function normalizePreflight(
  value,
  ErrorType = IntegrityError
) {
  exactKeys(
    value,
    PREFLIGHT_KEYS,
    "OCI workload preflight",
    ErrorType
  );
  exactKeys(
    value.checks,
    CHECK_KEYS,
    "OCI workload preflight checks",
    ErrorType
  );
  if (
    value.schemaVersion !== SCHEMA_VERSION ||
    value.kind !== PREFLIGHT_KIND ||
    value.provider !== DOCKER_OCI_PROVIDER ||
    CHECK_KEYS.some((key) => value.checks[key] !== true) ||
    value.executionAuthorized !== false ||
    value.executionObserved !== false ||
    value.workloadIdentityExternallyAttested !== false ||
    value.productionReady !== false
  ) {
    throw new ErrorType(
      "OCI workload preflight makes an unsupported claim."
    );
  }
  const policy = normalizeOciWorkloadPolicy(
    value.policy,
    ErrorType
  );
  const runtime = normalizeRuntimeObservation(
    value.runtime,
    ErrorType
  );
  const image = normalizeImageObservation(
    value.image,
    ErrorType
  );
  const template = normalizeLaunchTemplate(
    value.template,
    ErrorType
  );
  const expectedTemplateUnsigned =
    createLaunchTemplateUnsigned({
      policy,
      runtime,
      image
    });
  const unsigned = {
    schemaVersion: SCHEMA_VERSION,
    kind: PREFLIGHT_KIND,
    provider: DOCKER_OCI_PROVIDER,
    policy,
    runtime,
    image,
    template,
    checks: Object.fromEntries(
      CHECK_KEYS.map((key) => [key, true])
    ),
    executionAuthorized: false,
    executionObserved: false,
    workloadIdentityExternallyAttested: false,
    productionReady: false
  };
  if (
    unsigned.image.policyDigest !== unsigned.policy.digest ||
    unsigned.image.reference !==
      unsigned.policy.image.reference ||
    unsigned.image.manifestDigest !==
      unsigned.policy.image.manifestDigest ||
    unsigned.image.platform !==
      unsigned.policy.image.platform ||
    unsigned.image.user !== unsigned.policy.process.user ||
    unsigned.image.workingDirectory !==
      unsigned.policy.process.workingDirectory ||
    unsigned.image.commandDigest !==
      digestObject({
        command: unsigned.policy.process.command
      }) ||
    unsigned.runtime.architecture !==
      unsigned.policy.image.platform.split("/")[1] ||
    unsigned.image.policyDigest !==
      unsigned.template.policyDigest ||
    unsigned.runtime.digest !==
      unsigned.template.runtimeObservationDigest ||
    unsigned.image.digest !==
      unsigned.template.imageObservationDigest ||
    digestObject(expectedTemplateUnsigned) !==
      unsigned.template.digest
  ) {
    throw new ErrorType(
      "OCI workload preflight bindings are inconsistent."
    );
  }
  const digest = normalizedDigest(
    value.digest,
    "OCI workload preflight digest",
    ErrorType
  );
  if (digestObject(unsigned) !== digest) {
    throw new ErrorType("OCI workload preflight digest mismatch.");
  }
  return immutableJson({
    ...unsigned,
    digest
  });
}

function imageConfigArray(value, field) {
  if (value === null || value === undefined) return [];
  return normalizedStringArray(value, field, {
    maximum: 16,
    ErrorType: PolicyError
  });
}

function emptyOptionalObject(value) {
  return (
    value === null ||
    value === undefined ||
    (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.keys(value).length === 0
    )
  );
}

function createLaunchTemplateUnsigned({
  policy,
  runtime,
  image
}) {
  const resources = policy.resources;
  const tmpfs = resources.tmpfs;
  return {
    schemaVersion: SCHEMA_VERSION,
    kind: TEMPLATE_KIND,
    policyDigest: policy.digest,
    runtimeObservationDigest: runtime.digest,
    imageObservationDigest: image.digest,
    executable: runtime.launcher.resolvedPath,
    arguments: [
      "--host",
      runtime.endpoint,
      "run",
      "--rm",
      "--interactive",
      "--pull=never",
      `--platform=${policy.image.platform}`,
      "--network=none",
      "--read-only",
      `--user=${policy.process.user}`,
      `--workdir=${policy.process.workingDirectory}`,
      "--cap-drop=ALL",
      "--security-opt=no-new-privileges=true",
      "--security-opt=seccomp=builtin",
      "--ipc=private",
      "--no-healthcheck",
      `--pids-limit=${resources.pidsLimit}`,
      `--memory=${resources.memoryBytes}`,
      `--memory-swap=${resources.memorySwapBytes}`,
      "--memory-swappiness=0",
      `--cpus=${resources.cpuQuotaMillis / 1_000}`,
      `--ulimit=nofile=${resources.openFiles.soft}:${resources.openFiles.hard}`,
      "--ulimit=core=0:0",
      `--tmpfs=${tmpfs.target}:rw,noexec,nosuid,nodev,size=${tmpfs.sizeBytes}`,
      "--log-driver=none",
      "--stop-timeout=1",
      policy.image.reference
    ],
    environmentNames: [
      ...PILOT_OCI_WORKER_ENVIRONMENT_NAMES
    ],
    shell: false,
    parentEnvironmentForwarded: false,
    stdinProtocol: "one-canonical-json-line",
    stdoutProtocol: "one-canonical-json-line",
    stderrPolicy: "must-be-empty"
  };
}

export class DockerOciWorkloadProvider {
  #commandRunner;
  #endpoint;
  #executable;
  #timeoutMs;

  constructor({
    executable,
    endpoint,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    commandRunner = defaultCommandRunner
  } = {}) {
    this.#executable = normalizedAbsolutePath(
      executable,
      "Docker executable"
    );
    this.#endpoint = normalizedEndpoint(endpoint);
    if (
      !Number.isSafeInteger(timeoutMs) ||
      timeoutMs < 250 ||
      timeoutMs > 10_000
    ) {
      throw new ValidationError(
        "Docker provider timeout is invalid."
      );
    }
    if (typeof commandRunner !== "function") {
      throw new ValidationError(
        "Docker provider command runner is invalid."
      );
    }
    this.#timeoutMs = timeoutMs;
    this.#commandRunner = commandRunner;
  }

  status() {
    return immutableJson({
      kind: "fdos-local-docker-oci-provider",
      provider: DOCKER_OCI_PROVIDER,
      executable: this.#executable,
      endpoint: this.#endpoint,
      digestPinnedImageRequired: true,
      readOnlyRootFilesystemRequired: true,
      networkDisabledRequired: true,
      nonRootUserRequired: true,
      resourceLimitsRequired: true,
      enforcementState: "not_inspected",
      executionAuthorized: false,
      productionReady: false
    });
  }

  async inspectLauncher() {
    let requestedMetadata;
    let resolvedPath;
    let resolvedMetadata;
    try {
      requestedMetadata = await lstat(this.#executable);
      resolvedPath = await realpath(this.#executable);
      resolvedMetadata = await stat(resolvedPath);
    } catch (error) {
      throw new IntegrityError(
        "Docker launcher is unavailable.",
        {
          diagnosticDigest: digestObject({
            errorType: error?.name || "Error"
          })
        }
      );
    }
    if (
      (
        !requestedMetadata.isFile() &&
        !requestedMetadata.isSymbolicLink()
      ) ||
      !resolvedMetadata.isFile() ||
      resolvedMetadata.size < 1 ||
      resolvedMetadata.size > MAX_EXECUTABLE_BYTES ||
      (resolvedMetadata.mode & 0o022) !== 0 ||
      (resolvedMetadata.mode & 0o111) === 0
    ) {
      throw new IntegrityError(
        "Docker launcher failed local trust checks."
      );
    }
    let content;
    try {
      content = await readFile(resolvedPath);
    } catch (error) {
      throw new IntegrityError(
        "Docker launcher could not be inspected.",
        {
          diagnosticDigest: digestObject({
            errorType: error?.name || "Error"
          })
        }
      );
    }
    if (content.length !== resolvedMetadata.size) {
      throw new IntegrityError(
        "Docker launcher changed during local inspection."
      );
    }
    return immutableJson({
      requestedPath: this.#executable,
      resolvedPath,
      digest: sha256Buffer(content),
      size: resolvedMetadata.size,
      uid: resolvedMetadata.uid,
      gid: resolvedMetadata.gid,
      mode: resolvedMetadata.mode & 0o777,
      symlinkResolved: requestedMetadata.isSymbolicLink(),
      rootOwned: resolvedMetadata.uid === 0
    });
  }

  async #runJson(
    operation,
    argumentsList,
    executable = this.#executable
  ) {
    let rawResult;
    try {
      rawResult = await this.#commandRunner({
        executable,
        arguments: argumentsList,
        timeoutMs: this.#timeoutMs
      });
    } catch (error) {
      throw new PolicyError(
        "Docker OCI runtime command failed closed.",
        {
          operation,
          diagnosticDigest: digestObject({
            errorType: error?.name || "Error",
            errorCode: error?.code || null
          })
        }
      );
    }
    const result = validCommandResult(rawResult);
    if (
      result.code !== 0 ||
      result.signal !== null ||
      result.stderr.length !== 0
    ) {
      throw new PolicyError(
        "Docker OCI runtime command was not accepted.",
        {
          operation,
          diagnosticDigest: digestObject({
            code: result.code,
            signal: result.signal,
            stderrDigest: digestObject({
              stderr: result.stderr
            })
          })
        }
      );
    }
    try {
      return JSON.parse(result.stdout);
    } catch {
      throw new IntegrityError(
        "Docker OCI runtime returned malformed JSON.",
        {
          operation,
          stdoutDigest: digestObject({
            stdout: result.stdout
          })
        }
      );
    }
  }

  async inspectRuntime() {
    const launcher = await this.inspectLauncher();
    const version = await this.#runJson(
      "runtime-version",
      [
        "--host",
        this.#endpoint,
        "version",
        "--format=json"
      ],
      launcher.resolvedPath
    );
    const info = await this.#runJson(
      "runtime-info",
      [
        "--host",
        this.#endpoint,
        "info",
        "--format=json"
      ],
      launcher.resolvedPath
    );
    const clientVersion = normalizedString(
      version?.Client?.Version,
      "Docker client version",
      {
        max: 64,
        pattern: VERSION_PATTERN
      },
      PolicyError
    );
    const serverVersion = normalizedString(
      version?.Server?.Version,
      "Docker server version",
      {
        max: 64,
        pattern: VERSION_PATTERN
      },
      PolicyError
    );
    const apiVersion = normalizedString(
      version?.Server?.ApiVersion,
      "Docker server API version",
      {
        max: 16,
        pattern: /^[0-9]+\.[0-9]+$/
      },
      PolicyError
    );
    const securityOptions = normalizedStringArray(
      info?.SecurityOptions,
      "Docker security options",
      {
        maximum: 64,
        ErrorType: PolicyError
      }
    );
    const seccomp = securityOptions.find(
      (option) => option === "name=seccomp,profile=builtin"
    );
    const operatingSystem = normalizedString(
      info?.OSType,
      "Docker operating-system type",
      { max: 32 },
      PolicyError
    );
    const cgroupVersion = normalizedString(
      info?.CgroupVersion,
      "Docker cgroup version",
      { max: 8 },
      PolicyError
    );
    if (
      !apiVersionAtLeast(
        apiVersion,
        MINIMUM_DOCKER_API_VERSION
      ) ||
      operatingSystem !== "linux" ||
      cgroupVersion !== "2" ||
      !seccomp
    ) {
      throw new PolicyError(
        "Docker runtime lacks the required OCI controls."
      );
    }
    const unsigned = {
      schemaVersion: SCHEMA_VERSION,
      kind: RUNTIME_KIND,
      provider: DOCKER_OCI_PROVIDER,
      endpoint: this.#endpoint,
      launcher,
      clientVersion,
      serverVersion,
      apiVersion,
      operatingSystem: "linux",
      architecture: normalizedArchitecture(
        info?.Architecture
      ),
      cgroupVersion: "2",
      seccompProfile: "builtin",
      rootless: securityOptions.includes("name=rootless"),
      externallyAttested: false
    };
    return normalizeRuntimeObservation({
      ...unsigned,
      digest: digestObject(unsigned)
    });
  }

  async inspectImage({ policy, runtime }) {
    const normalizedPolicy = normalizeOciWorkloadPolicy(
      policy,
      IntegrityError
    );
    const normalizedRuntime = normalizeRuntimeObservation(
      runtime,
      IntegrityError
    );
    const rawResult = await this.#runJson(
      "image-inspect",
      [
        "--host",
        this.#endpoint,
        "image",
        "inspect",
        `--platform=${normalizedPolicy.image.platform}`,
        "--format=json",
        normalizedPolicy.image.reference
      ],
      normalizedRuntime.launcher.resolvedPath
    );
    const rawImage =
      Array.isArray(rawResult) && rawResult.length === 1
        ? rawResult[0]
        : rawResult;
    if (
      !rawImage ||
      typeof rawImage !== "object" ||
      Array.isArray(rawImage)
    ) {
      throw new IntegrityError(
        "Docker image inspection has an unexpected shape."
      );
    }
    const repoDigests = normalizedStringArray(
      rawImage.RepoDigests,
      "Docker image repository digests",
      {
        maximum: 64,
        ErrorType: PolicyError
      }
    );
    const architecture = normalizedArchitecture(
      rawImage.Architecture
    );
    const platform =
      `${normalizedString(
        rawImage.Os,
        "Docker image operating system",
        { max: 32 },
        PolicyError
      )}/${architecture}`;
    const entrypoint = imageConfigArray(
      rawImage.Config?.Entrypoint,
      "Docker image entrypoint"
    );
    const command = imageConfigArray(
      rawImage.Config?.Cmd,
      "Docker image command"
    );
    const completeCommand = [
      ...entrypoint,
      ...command
    ];
    const imageEnvironment = normalizedStringArray(
      rawImage.Config?.Env ?? [],
      "Docker image environment",
      {
        maximum: 32,
        ErrorType: PolicyError
      }
    );
    const imageEnvironmentNames =
      imageEnvironment.map((entry) => {
        const separator = entry.indexOf("=");
        if (separator < 1) {
          throw new PolicyError(
            "Docker image environment is invalid."
          );
        }
        return entry.slice(0, separator);
      });
    if (
      new Set(imageEnvironmentNames).size !==
        imageEnvironmentNames.length ||
      imageEnvironmentNames.some(
        (name) =>
          !ALLOWED_IMAGE_ENVIRONMENT_NAMES.has(name)
      )
    ) {
      throw new PolicyError(
        "Docker image environment exceeds the closed allowlist."
      );
    }
    const layers = normalizedStringArray(
      rawImage.RootFS?.Layers,
      "Docker image rootfs layers",
      {
        maximum: 256,
        pattern: DIGEST_PATTERN,
        ErrorType: PolicyError
      }
    );
    const imageId = normalizedDigest(
      rawImage.Id,
      "Docker image ID",
      PolicyError
    );
    const imageUser = normalizedString(
      rawImage.Config?.User,
      "Docker image user",
      {
        max: 32,
        pattern: /^[1-9][0-9]{0,4}:[1-9][0-9]{0,4}$/
      },
      PolicyError
    );
    const workingDirectory = normalizedAbsolutePath(
      rawImage.Config?.WorkingDir,
      "Docker image working directory",
      PolicyError
    );
    if (
      !repoDigests.includes(
        normalizedPolicy.image.reference
      ) ||
      platform !== normalizedPolicy.image.platform ||
      rawImage.RootFS?.Type !== "layers" ||
      layers.length < 1 ||
      imageUser !== normalizedPolicy.process.user ||
      workingDirectory !==
        normalizedPolicy.process.workingDirectory ||
      completeCommand.length !==
        PILOT_OCI_WORKER_COMMAND.length ||
      completeCommand.some(
        (entry, index) =>
          entry !== PILOT_OCI_WORKER_COMMAND[index]
      ) ||
      !emptyOptionalObject(rawImage.Config?.Volumes) ||
      !emptyOptionalObject(rawImage.Config?.ExposedPorts)
    ) {
      throw new PolicyError(
        "Docker image does not match the closed OCI workload policy."
      );
    }
    const unsigned = {
      schemaVersion: SCHEMA_VERSION,
      kind: IMAGE_KIND,
      provider: DOCKER_OCI_PROVIDER,
      policyDigest: normalizedPolicy.digest,
      reference: normalizedPolicy.image.reference,
      manifestDigest:
        normalizedPolicy.image.manifestDigest,
      manifestDigestMatched: true,
      imageId,
      platform,
      user: imageUser,
      workingDirectory,
      commandDigest: digestObject({
        command: completeCommand
      }),
      imageEnvironmentDigest: digestObject({
        environment: [...imageEnvironment].sort()
      }),
      imageEnvironmentSanitized: true,
      rootfsDigest: digestObject({
        type: "layers",
        layers
      }),
      layerCount: layers.length,
      declaredVolumes: false,
      exposedPorts: false,
      externallyAttested: false
    };
    const observation = normalizeImageObservation({
      ...unsigned,
      digest: digestObject(unsigned)
    });
    if (
      normalizedRuntime.architecture !== architecture
    ) {
      throw new PolicyError(
        "Docker runtime and image architecture differ."
      );
    }
    return observation;
  }

  createLaunchTemplate({ policy, runtime, image }) {
    const normalizedPolicy = normalizeOciWorkloadPolicy(
      policy,
      IntegrityError
    );
    const normalizedRuntime = normalizeRuntimeObservation(
      runtime,
      IntegrityError
    );
    const normalizedImage = normalizeImageObservation(
      image,
      IntegrityError
    );
    if (
      normalizedImage.policyDigest !==
        normalizedPolicy.digest ||
      normalizedImage.reference !==
        normalizedPolicy.image.reference ||
      normalizedImage.manifestDigest !==
        normalizedPolicy.image.manifestDigest ||
      normalizedImage.platform !==
        normalizedPolicy.image.platform ||
      normalizedImage.user !==
        normalizedPolicy.process.user ||
      normalizedImage.workingDirectory !==
        normalizedPolicy.process.workingDirectory ||
      normalizedImage.commandDigest !==
        digestObject({
          command: normalizedPolicy.process.command
        }) ||
      normalizedRuntime.architecture !==
        normalizedPolicy.image.platform.split("/")[1]
    ) {
      throw new IntegrityError(
        "Docker launch inputs are not mutually bound."
      );
    }
    const unsigned = createLaunchTemplateUnsigned({
      policy: normalizedPolicy,
      runtime: normalizedRuntime,
      image: normalizedImage
    });
    return normalizeLaunchTemplate({
      ...unsigned,
      digest: digestObject(unsigned)
    });
  }

  async preflight(policy) {
    const normalizedPolicy = normalizeOciWorkloadPolicy(
      policy,
      IntegrityError
    );
    const runtime = await this.inspectRuntime();
    const image = await this.inspectImage({
      policy: normalizedPolicy,
      runtime
    });
    const template = this.createLaunchTemplate({
      policy: normalizedPolicy,
      runtime,
      image
    });
    const unsigned = {
      schemaVersion: SCHEMA_VERSION,
      kind: PREFLIGHT_KIND,
      provider: DOCKER_OCI_PROVIDER,
      policy: normalizedPolicy,
      runtime,
      image,
      template,
      checks: Object.fromEntries(
        CHECK_KEYS.map((key) => [key, true])
      ),
      executionAuthorized: false,
      executionObserved: false,
      workloadIdentityExternallyAttested: false,
      productionReady: false
    };
    return normalizePreflight({
      ...unsigned,
      digest: digestObject(unsigned)
    });
  }
}

export function verifyOciWorkloadPreflight(value) {
  normalizePreflight(value, IntegrityError);
  return true;
}

export const DOCKER_OCI_MINIMUM_API_VERSION =
  MINIMUM_DOCKER_API_VERSION;
