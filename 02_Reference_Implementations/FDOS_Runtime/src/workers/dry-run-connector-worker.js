import { canonicalJson } from "../kernel/canonical-json.js";
import {
  createDryRunWorkerResponse,
  verifyDryRunWorkerRequest
} from "./dry-run-worker-protocol.js";

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

process.stdin.on("end", () => {
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
      completedAt: new Date().toISOString()
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
});

process.stdin.resume();
