import { spawn } from "node:child_process";
import { lstat } from "node:fs/promises";
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
  createDryRunWorkerRequest,
  verifyDryRunWorkerResponse
} from "../workers/dry-run-worker-protocol.js";

const WORKER_FILE = fileURLToPath(
  new URL("../workers/dry-run-connector-worker.js", import.meta.url)
);
const MAX_WORKER_FILE_BYTES = 128 * 1024;
const MAX_REQUEST_BYTES = 64 * 1024;
const MAX_STDOUT_BYTES = 16 * 1024;
const MAX_STDERR_BYTES = 4 * 1024;
const FAULT_MODES = Object.freeze([
  "none",
  "crash-before-response",
  "hang",
  "response-then-crash"
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

export class ProcessSeparatedDryRunWorker {
  #clock;
  #idFactory;
  #timeoutMs;
  #faultMode;

  constructor({
    clock = () => new Date(),
    idFactory = createId,
    timeoutMs = 2_000,
    faultMode = "none"
  } = {}) {
    if (typeof clock !== "function" || typeof idFactory !== "function") {
      throw new ValidationError(
        "Process worker requires clock and ID factory functions."
      );
    }
    if (!FAULT_MODES.includes(faultMode)) {
      throw new ValidationError("Process worker fault mode is invalid.");
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
  }

  status() {
    return immutableJson({
      kind: "fdos-process-separated-dry-run-worker",
      processSeparated: true,
      shell: false,
      networkAccess: false,
      externalEffects: false,
      networkIsolationEnforced: false,
      parentEnvironmentForwarded: false,
      timeoutMs: this.#timeoutMs,
      faultInjectionEnabled: this.#faultMode !== "none"
    });
  }

  async #assertWorkerFile() {
    let file;
    try {
      file = await lstat(WORKER_FILE);
    } catch (error) {
      throw new IntegrityError(
        "Process worker entry point is unavailable.",
        {
          errorType: error?.name || "Error"
        }
      );
    }
    if (
      file.isSymbolicLink() ||
      !file.isFile() ||
      file.size < 1 ||
      file.size > MAX_WORKER_FILE_BYTES
    ) {
      throw new IntegrityError(
        "Process worker entry point is not an accepted regular file."
      );
    }
  }

  async execute({ delivery } = {}) {
    await this.#assertWorkerFile();
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
    const request = createDryRunWorkerRequest({
      delivery,
      requestId: this.#idFactory("workerrequest"),
      issuedAt: now.toISOString(),
      expiresAt
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
          process.execPath,
          ["--no-warnings", WORKER_FILE],
          {
            cwd: fileURLToPath(new URL("../workers/", import.meta.url)),
            env: {
              FDOS_DRY_RUN_WORKER_FAULT: this.#faultMode,
              LANG: "C",
              LC_ALL: "C",
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
        let response;
        try {
          response = JSON.parse(source);
          if (canonicalJson(response) !== source) {
            throw new IntegrityError(
              "Process worker response is not canonical JSON."
            );
          }
          verifyDryRunWorkerResponse(response, request);
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
            completedAt: response.completedAt,
            outcome: response.outcome,
            workerBoundary: response.workerBoundary
          })
        );
      });
    });
  }
}
