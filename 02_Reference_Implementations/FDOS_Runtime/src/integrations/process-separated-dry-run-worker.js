import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import {
  canonicalJson,
  digestObject,
  immutableJson
} from "../kernel/canonical-json.js";
import {
  ConflictError,
  IntegrityError,
  ValidationError
} from "../kernel/errors.js";
import { createId } from "../kernel/ids.js";
import { isoDate } from "../kernel/validation.js";
import {
  DARWIN_NETWORK_ISOLATION_PROVIDER,
  NO_NETWORK_ISOLATION_PROVIDER,
  processOnlyNetworkIsolationBinding
} from "../domain/network-isolation-contract.js";
import {
  DarwinSandboxExecNetworkWriteDeny
} from "./darwin-sandbox-exec-network-write-deny.js";
import {
  inspectDryRunWorkerPackageRelease,
  normalizeWorkerPackageReleaseEnvelope,
  serializeWorkerPackageReleaseEnvelope
} from "./dry-run-worker-package.js";
import {
  PILOT_DRY_RUN_WORKER_PACKAGE_RELEASE
} from "../pilot/dry-run-worker-package-release.js";
import {
  createDryRunWorkerRequest,
  verifyDryRunWorkerResponse
} from "../workers/dry-run-worker-protocol.js";
import {
  verifyAuthenticatedWorkerResponse,
  WORKLOAD_SESSION_MODE
} from "../domain/workload-session-contract.js";

const WORKER_BOOTSTRAP_FILE = fileURLToPath(
  new URL("../workers/dry-run-worker-bootstrap.js", import.meta.url)
);
const MAX_REQUEST_BYTES = 64 * 1024;
const MAX_STDOUT_BYTES = 32 * 1024;
const MAX_STDERR_BYTES = 4 * 1024;
const FAULT_MODES = Object.freeze([
  "none",
  "crash-before-response",
  "hang",
  "response-then-crash",
  "sandbox-bypass",
  "bootstrap-release-mismatch",
  "package-binding-mismatch",
  "session-challenge-mismatch",
  "session-observation-mismatch",
  "response-signature-mismatch"
]);
const NETWORK_ISOLATION_MODES = Object.freeze([
  "process-only",
  "darwin-sandbox-exec-required"
]);

function validClockValue(clock) {
  const now = clock();
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
    throw new ValidationError("Process worker clock returned an invalid date.");
  }
  return now;
}

function boundedInteger(value, field, minimum, maximum) {
  if (
    !Number.isSafeInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    throw new ValidationError(
      `${field} must be between ${minimum} and ${maximum}.`
    );
  }
  return value;
}

function workerFailure(reasonCode, requestDigest, diagnostic = {}) {
  return new ConflictError("Process-separated dry-run worker did not produce an accepted result.", {
    reasonCode,
    requestDigest,
    diagnosticDigest: digestObject(diagnostic)
  });
}

function createSessionChallenge() {
  return randomBytes(32).toString("base64url");
}

function changedSessionChallenge(challenge) {
  return (
    `${challenge.startsWith("A") ? "B" : "A"}` +
    challenge.slice(1)
  );
}

export class ProcessSeparatedDryRunWorker {
  #clock;
  #idFactory;
  #timeoutMs;
  #faultMode;
  #networkIsolation;
  #workerPackageRelease;
  #workerPackageTrustProvisioning;

  constructor({
    clock = () => new Date(),
    idFactory = createId,
    timeoutMs = 2_000,
    faultMode = "none",
    networkIsolation = "process-only",
    workerPackageRelease
  } = {}) {
    if (typeof clock !== "function" || typeof idFactory !== "function") {
      throw new ValidationError(
        "Process worker requires clock and ID factory functions."
      );
    }
    if (!FAULT_MODES.includes(faultMode)) {
      throw new ValidationError("Process worker fault mode is invalid.");
    }
    if (!NETWORK_ISOLATION_MODES.includes(networkIsolation)) {
      throw new ValidationError(
        "Process worker network-isolation mode is invalid."
      );
    }
    if (
      faultMode === "sandbox-bypass" &&
      networkIsolation !== "darwin-sandbox-exec-required"
    ) {
      throw new ValidationError(
        "Sandbox-bypass fault requires the Darwin sandbox."
      );
    }
    this.#clock = clock;
    this.#idFactory = idFactory;
    this.#timeoutMs = boundedInteger(
      timeoutMs,
      "Process worker timeout",
      50,
      5_000
    );
    this.#faultMode = faultMode;
    this.#networkIsolation = networkIsolation;
    const usingPilotRelease =
      workerPackageRelease === undefined;
    const configuredRelease = usingPilotRelease
      ? PILOT_DRY_RUN_WORKER_PACKAGE_RELEASE
      : workerPackageRelease;
    if (
      !configuredRelease ||
      typeof configuredRelease !== "object" ||
      typeof configuredRelease.packagePath !== "string"
    ) {
      throw new ValidationError(
        "Process worker package release configuration is invalid."
      );
    }
    this.#workerPackageRelease = {
      packagePath: configuredRelease.packagePath,
      ...normalizeWorkerPackageReleaseEnvelope({
        attestation: configuredRelease.attestation,
        trustedKeys: configuredRelease.trustedKeys,
        expectedTrustAnchorDigest:
          configuredRelease.expectedTrustAnchorDigest
      })
    };
    this.#workerPackageTrustProvisioning =
      usingPilotRelease
        ? "repository-pilot-fixture"
        : "caller-provided";
  }

  status() {
    return immutableJson({
      kind: "fdos-process-separated-dry-run-worker",
      processSeparated: true,
      shell: false,
      networkAccess: false,
      externalEffects: false,
      networkIsolationEnforced: false,
      networkIsolationRequired:
        this.#networkIsolation ===
        "darwin-sandbox-exec-required",
      networkIsolationProvider:
        this.#networkIsolation ===
        "darwin-sandbox-exec-required"
          ? DARWIN_NETWORK_ISOLATION_PROVIDER
          : NO_NETWORK_ISOLATION_PROVIDER,
      filesystemWriteIsolationEnforced: false,
      filesystemWriteIsolationRequired:
        this.#networkIsolation ===
        "darwin-sandbox-exec-required",
      parentEnvironmentForwarded: false,
      workerPackagePreflightRequired: true,
      workerPackageBootstrapVerificationRequired: true,
      workerPackageInMemoryEvaluationRequired: true,
      workerPackageReleaseTrustConfigured: true,
      workerPackageTrustProvisioning:
        this.#workerPackageTrustProvisioning,
      externalReleaseKeyCustodyAttested: false,
      workloadSessionResponseAuthenticationRequired: true,
      workloadSessionMode: WORKLOAD_SESSION_MODE,
      workloadSessionPrivateKeyExported: false,
      independentWorkloadAttestationConfigured: false,
      timeoutMs: this.#timeoutMs,
      faultInjectionEnabled: this.#faultMode !== "none"
    });
  }

  async #prepareLaunch(packagePath) {
    const direct = {
      executable: process.execPath,
      arguments: [
        "--no-warnings",
        "--experimental-vm-modules",
        WORKER_BOOTSTRAP_FILE,
        packagePath
      ],
      isolation: processOnlyNetworkIsolationBinding()
    };
    if (this.#networkIsolation === "process-only") {
      return direct;
    }
    const sandbox = new DarwinSandboxExecNetworkWriteDeny();
    const sandboxed = await sandbox.prepareLaunch({
      nodeExecutable: process.execPath,
      nodeOptions: ["--experimental-vm-modules"],
      workerFile: WORKER_BOOTSTRAP_FILE,
      workerArguments: [packagePath]
    });
    if (this.#faultMode === "sandbox-bypass") {
      return {
        ...direct,
        isolation: sandboxed.isolation
      };
    }
    return sandboxed;
  }

  async #prepareWorkerPackage() {
    return inspectDryRunWorkerPackageRelease(
      this.#workerPackageRelease
    );
  }

  async execute({ delivery } = {}) {
    const verifiedPackage = await this.#prepareWorkerPackage();
    const launch = await this.#prepareLaunch(
      verifiedPackage.packagePath
    );
    const now = validClockValue(this.#clock);
    const claimExpiresAt = isoDate(
      delivery?.claim?.expiresAt,
      "process worker claim expiry"
    );
    const claimExpiryMs = Date.parse(claimExpiresAt);
    if (claimExpiryMs <= now.getTime()) {
      throw new ConflictError(
        "Process worker cannot start after the connector claim expired."
      );
    }
    const desiredExpiryMs =
      now.getTime() + Math.max(this.#timeoutMs * 2, 1_000);
    const expiresAt = new Date(
      Math.min(desiredExpiryMs, claimExpiryMs)
    ).toISOString();
    const launchSessionChallenge =
      createSessionChallenge();
    const requestSessionChallenge =
      this.#faultMode ===
      "session-challenge-mismatch"
        ? changedSessionChallenge(
            launchSessionChallenge
          )
        : launchSessionChallenge;
    const request = createDryRunWorkerRequest({
      delivery,
      requestId: this.#idFactory("workerrequest"),
      issuedAt: now.toISOString(),
      expiresAt,
      networkIsolation: launch.isolation,
      workloadSessionChallenge:
        requestSessionChallenge,
      workerPackage:
        this.#faultMode === "package-binding-mismatch"
          ? {
              ...verifiedPackage.binding,
              packageDigest: digestObject({
                expectedPackageDigest:
                  verifiedPackage.binding.packageDigest,
                fault: "package-binding-mismatch"
              })
            }
          : verifiedPackage.binding
    });
    const serializedRequest = canonicalJson(request);
    if (
      Buffer.byteLength(serializedRequest, "utf8") > MAX_REQUEST_BYTES
    ) {
      throw new ValidationError(
        "Process worker request exceeds the 64 KiB limit."
      );
    }

    return new Promise((resolve, reject) => {
      let child;
      try {
        child = spawn(
          launch.executable,
          launch.arguments,
          {
            cwd: fileURLToPath(new URL("../workers/", import.meta.url)),
            env: {
              FDOS_DRY_RUN_WORKER_FAULT:
                this.#faultMode === "sandbox-bypass" ||
                this.#faultMode ===
                  "bootstrap-release-mismatch" ||
                this.#faultMode ===
                  "package-binding-mismatch" ||
                this.#faultMode ===
                  "session-challenge-mismatch" ||
                this.#faultMode ===
                  "response-signature-mismatch"
                  ? "none"
                  : this.#faultMode,
              FDOS_WORKER_PACKAGE_RELEASE: Buffer.from(
                serializeWorkerPackageReleaseEnvelope(
                  this.#faultMode ===
                    "bootstrap-release-mismatch"
                    ? {
                        ...verifiedPackage.releaseEnvelope,
                        expectedTrustAnchorDigest:
                          digestObject({
                            expectedTrustAnchorDigest:
                              verifiedPackage.binding
                                .trustAnchorDigest,
                            fault:
                              "bootstrap-release-mismatch"
                          })
                      }
                    : verifiedPackage.releaseEnvelope
                ),
                "utf8"
              ).toString("base64url"),
              FDOS_NETWORK_ISOLATION_PROVIDER:
                launch.isolation.provider,
              FDOS_NETWORK_ISOLATION_POLICY_DIGEST:
                launch.isolation.policyDigest,
              FDOS_WORKLOAD_SESSION_CHALLENGE:
                launchSessionChallenge,
              FDOS_WORKLOAD_SESSION_FAULT:
                this.#faultMode ===
                  "response-signature-mismatch"
                  ? "signature-mismatch"
                  : "none",
              LANG: "C",
              LC_ALL: "C",
              ...(launch.isolation.required
                ? { NODE_V8_COVERAGE: "" }
                : {}),
              TZ: "UTC"
            },
            shell: false,
            stdio: ["pipe", "pipe", "pipe"],
            windowsHide: true
          }
        );
      } catch (error) {
        reject(
          workerFailure("WORKER_SPAWN_FAILED", request.digest, {
            errorName: error?.name || "Error"
          })
        );
        return;
      }

      let stdout = "";
      let stderr = "";
      let stdoutBytes = 0;
      let stderrBytes = 0;
      let timedOut = false;
      let outputExceeded = false;
      let spawnErrorName = null;

      const terminate = () => {
        if (child.exitCode === null && child.signalCode === null) {
          child.kill("SIGKILL");
        }
      };
      const timer = setTimeout(() => {
        timedOut = true;
        terminate();
      }, this.#timeoutMs);

      child.stdout.setEncoding("utf8");
      child.stdout.on("data", (chunk) => {
        stdoutBytes += Buffer.byteLength(chunk, "utf8");
        if (stdoutBytes > MAX_STDOUT_BYTES) {
          outputExceeded = true;
          terminate();
          return;
        }
        stdout += chunk;
      });

      child.stderr.setEncoding("utf8");
      child.stderr.on("data", (chunk) => {
        stderrBytes += Buffer.byteLength(chunk, "utf8");
        if (stderrBytes > MAX_STDERR_BYTES) {
          outputExceeded = true;
          terminate();
          return;
        }
        stderr += chunk;
      });

      child.on("error", (error) => {
        spawnErrorName = error?.name || "Error";
      });

      child.stdin.on("error", () => {});
      child.stdin.end(`${serializedRequest}\n`);

      child.on("close", (code, signal) => {
        clearTimeout(timer);
        if (timedOut) {
          reject(
            workerFailure("WORKER_TIMEOUT", request.digest, {
              signal: signal || "SIGKILL"
            })
          );
          return;
        }
        if (outputExceeded) {
          reject(
            workerFailure("WORKER_OUTPUT_LIMIT", request.digest, {
              stdoutBytes,
              stderrBytes
            })
          );
          return;
        }
        if (spawnErrorName) {
          reject(
            workerFailure("WORKER_SPAWN_FAILED", request.digest, {
              errorName: spawnErrorName
            })
          );
          return;
        }
        if (code !== 0 || signal || stderr.length > 0) {
          reject(
            workerFailure("WORKER_EXIT_UNTRUSTED", request.digest, {
              code,
              signal,
              stderrDigest: digestObject({ stderr })
            })
          );
          return;
        }

        const source = stdout.trim();
        if (
          !source ||
          source.includes("\n") ||
          source.includes("\r")
        ) {
          reject(
            workerFailure("WORKER_RESPONSE_SHAPE", request.digest, {
              stdoutDigest: digestObject({ stdout })
            })
          );
          return;
        }
        let authenticatedResponse;
        let response;
        let workloadSession;
        try {
          authenticatedResponse = JSON.parse(source);
          if (
            canonicalJson(authenticatedResponse) !== source
          ) {
            throw new IntegrityError(
              "Process worker response is not canonical JSON."
            );
          }
          workloadSession =
            verifyAuthenticatedWorkerResponse(
              authenticatedResponse,
              {
                expectedChallenge:
                  request.execution
                    .workloadSessionChallenge,
                expectedWorkerPackage:
                  request.execution.workerPackage
              }
            );
          response = authenticatedResponse.response;
          verifyDryRunWorkerResponse(response, request);
          const responseSession =
            response.workerBoundary.workloadSession;
          if (
            responseSession.keyId !==
              workloadSession.keyId ||
            responseSession.sessionDigest !==
              workloadSession.sessionDigest ||
            responseSession.challengeDigest !==
              workloadSession.challengeDigest ||
            responseSession.packageBindingDigest !==
              workloadSession.packageBindingDigest
          ) {
            throw new IntegrityError(
              "Worker response session differs from its authenticated envelope."
            );
          }
        } catch (error) {
          reject(
            new IntegrityError(
              "Process worker response failed exact verification.",
              {
                requestDigest: request.digest,
                responseDigest: digestObject({ stdout }),
                errorType: error?.name || "Error"
              }
            )
          );
          return;
        }

        resolve(
          immutableJson({
            kind: "fdos-process-worker-result",
            requestId: request.requestId,
            deliveryId: request.deliveryId,
            claimId: request.claimId,
            connectorId: request.connectorId,
            requestDigest: request.digest,
            responseDigest: response.digest,
            responseEnvelopeDigest:
              authenticatedResponse.digest,
            completedAt: response.completedAt,
            outcome: response.outcome,
            workerBoundary: response.workerBoundary,
            workloadSession
          })
        );
      });
    });
  }
}
