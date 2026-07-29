export const DRY_RUN_WORKER_ARTIFACT_ID =
  "worker:connector-dry-run";
export const DRY_RUN_WORKER_ARTIFACT_VERSION =
  "3.0.0-experimental";
export const DRY_RUN_WORKER_ENTRYPOINT =
  "src/workers/dry-run-connector-worker.js";
export const DRY_RUN_WORKER_ARTIFACT_FILES = Object.freeze([
  "src/domain/action-catalog.js",
  "src/domain/action-intent.js",
  "src/domain/delivery-intent.js",
  "src/domain/network-isolation-contract.js",
  "src/domain/worker-identity.js",
  "src/domain/worker-package-contract.js",
  "src/domain/workload-session-contract.js",
  "src/kernel/canonical-json.js",
  "src/kernel/errors.js",
  "src/kernel/ids.js",
  "src/kernel/validation.js",
  "src/workers/dry-run-connector-worker.js",
  "src/workers/dry-run-worker-protocol.js"
]);

export const DRY_RUN_WORKER_PACKAGE_ID =
  "worker-package:connector-dry-run";
export const DRY_RUN_WORKER_PACKAGE_VERSION =
  "2.0.0-experimental";
