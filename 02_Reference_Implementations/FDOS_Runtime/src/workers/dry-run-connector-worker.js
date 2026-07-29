import { canonicalJson } from "../kernel/canonical-json.js";
import { open } from "node:fs/promises";
import { connect, createServer } from "node:net";
import {
  createDryRunWorkerResponse,
  verifyDryRunWorkerRequest
} from "./dry-run-worker-protocol.js";
import {
  DARWIN_NETWORK_ISOLATION_PROVIDER,
  NO_NETWORK_ISOLATION_PROVIDER
} from "../domain/network-isolation-contract.js";

const MAX_INPUT_BYTES = 64 * 1024;
const FAULT_MODES = new Set([
  "none",
  "crash-before-response",
  "hang",
  "response-then-crash"
]);
let input = "";
let inputBytes = 0;
let stopped = false;
const NETWORK_DENIAL_CODES = new Set(["EACCES", "EPERM"]);
const NETWORK_PROBE_TIMEOUT_MS = 500;

function stop(code, reasonCode) {
  if (stopped) return;
  stopped = true;
  if (reasonCode) {
    process.stderr.write(`${reasonCode}\n`);
  }
  process.exit(code);
}

process.on("uncaughtException", () => {
  stop(70, "WORKER_UNEXPECTED_FAILURE");
});

process.on("unhandledRejection", () => {
  stop(70, "WORKER_UNEXPECTED_FAILURE");
});

process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  if (stopped) return;
  inputBytes += Buffer.byteLength(chunk, "utf8");
  if (inputBytes > MAX_INPUT_BYTES) {
    stop(65, "WORKER_INPUT_TOO_LARGE");
    return;
  }
  input += chunk;
});

function probeListenDenied() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try {
        server.close();
      } catch {}
      server.unref();
      reject(new Error("Network listen probe timed out."));
    }, NETWORK_PROBE_TIMEOUT_MS);
    server.once("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (NETWORK_DENIAL_CODES.has(error?.code)) {
        resolve();
        return;
      }
      reject(new Error("Network listen probe was not denied."));
    });
    server.once("listening", () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      server.close(() => {
        reject(new Error("Network listen unexpectedly succeeded."));
      });
    });
    server.listen({
      host: "127.0.0.1",
      port: 0,
      exclusive: true
    });
  });
}

function probeConnectDenied() {
  return new Promise((resolve, reject) => {
    const socket = connect({
      host: "127.0.0.1",
      port: 9
    });
    let settled = false;
    let timer;
    const finish = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.destroy();
      if (error) reject(error);
      else resolve();
    };
    timer = setTimeout(() => {
      finish(new Error("Network connect probe timed out."));
    }, NETWORK_PROBE_TIMEOUT_MS);
    socket.once("error", (error) => {
      if (NETWORK_DENIAL_CODES.has(error?.code)) {
        finish();
        return;
      }
      finish(new Error("Network connect probe was not denied."));
    });
    socket.once("connect", () => {
      finish(new Error("Network connect unexpectedly succeeded."));
    });
  });
}

async function probeFilesystemWriteDenied() {
  try {
    const handle = await open("/dev/null", "w");
    await handle.close();
  } catch (error) {
    if (NETWORK_DENIAL_CODES.has(error?.code)) return;
    throw new Error(
      "Filesystem write-open probe was not denied predictably."
    );
  }
  throw new Error("Filesystem write-open unexpectedly succeeded.");
}

async function isolationAttestation(request) {
  const binding = request.execution.networkIsolation;
  const environmentProvider =
    process.env.FDOS_NETWORK_ISOLATION_PROVIDER || "";
  const environmentPolicyDigest =
    process.env.FDOS_NETWORK_ISOLATION_POLICY_DIGEST || "";
  if (
    environmentProvider !== binding.provider ||
    environmentPolicyDigest !== binding.policyDigest
  ) {
    throw new Error("Worker isolation environment differs from request.");
  }
  if (!binding.required) {
    if (binding.provider !== NO_NETWORK_ISOLATION_PROVIDER) {
      throw new Error("Worker process-only isolation is inconsistent.");
    }
    return {
      enforced: false,
      filesystemWriteEnforced: false,
      filesystemWriteProbe: "not_run",
      provider: binding.provider,
      policyDigest: binding.policyDigest,
      probe: "not_run"
    };
  }
  if (binding.provider !== DARWIN_NETWORK_ISOLATION_PROVIDER) {
    throw new Error("Worker network-isolation provider is unsupported.");
  }
  await probeListenDenied();
  await probeConnectDenied();
  await probeFilesystemWriteDenied();
  return {
    enforced: true,
    filesystemWriteEnforced: true,
    filesystemWriteProbe: "dev_null_write_open_denied",
    provider: binding.provider,
    policyDigest: binding.policyDigest,
    probe: "socket_listen_and_connect_denied"
  };
}

async function handleInput() {
  if (stopped) return;
  const faultMode =
    process.env.FDOS_DRY_RUN_WORKER_FAULT || "none";
  if (!FAULT_MODES.has(faultMode)) {
    stop(64, "WORKER_FAULT_MODE_INVALID");
    return;
  }
  try {
    const source = input.trim();
    if (!source || source.includes("\n") || source.includes("\r")) {
      stop(65, "WORKER_INPUT_SHAPE_INVALID");
      return;
    }
    const request = JSON.parse(source);
    if (canonicalJson(request) !== source) {
      stop(65, "WORKER_INPUT_NOT_CANONICAL");
      return;
    }
    const now = new Date().toISOString();
    verifyDryRunWorkerRequest(request, { now });
    const networkIsolationAttestation =
      await isolationAttestation(request);

    if (faultMode === "crash-before-response") {
      stop(71, "WORKER_INJECTED_CRASH");
      return;
    }
    if (faultMode === "hang") {
      setInterval(() => {}, 1_000);
      return;
    }

    const response = createDryRunWorkerResponse({
      request,
      completedAt: new Date().toISOString(),
      networkIsolationAttestation
    });
    process.stdout.write(`${canonicalJson(response)}\n`, () => {
      if (faultMode === "response-then-crash") {
        stop(72, "WORKER_INJECTED_POST_RESPONSE_CRASH");
        return;
      }
      stop(0);
    });
  } catch {
    stop(65, "WORKER_INPUT_REJECTED");
  }
}

process.stdin.on("end", () => {
  handleInput().catch(() => {
    stop(70, "WORKER_UNEXPECTED_FAILURE");
  });
});

process.stdin.resume();
