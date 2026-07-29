import {
  ProcessSeparatedDryRunWorker
} from "../integrations/process-separated-dry-run-worker.js";
import { createId } from "../kernel/ids.js";
import {
  CONNECTOR_OUTBOX_DRY_RUN_WORKFLOW
} from "./connector-contracts.js";

const principals = Object.freeze({
  owner: Object.freeze({
    type: "human",
    id: "human:demo-owner"
  }),
  chief: Object.freeze({
    type: "agent",
    id: "agent:chief-of-staff:primary"
  }),
  operations: Object.freeze({
    type: "agent",
    id: "agent:operations:primary"
  }),
  connector: Object.freeze({
    type: "connector",
    id: "connector:reference:primary"
  })
});

function taskByStep(run, stepId) {
  const task = run.tasks.find((candidate) => candidate.stepId === stepId);
  if (!task) {
    throw new Error(`Connector dry-run task not found: ${stepId}.`);
  }
  return task;
}

async function invoke(
  gateway,
  authority,
  principal,
  correlationId,
  type,
  payload
) {
  const command = { type, payload };
  return gateway.execute({
    command,
    invocation: authority.issue({
      principal,
      command,
      correlationId
    })
  });
}

export async function executeConnectorOutboxDryRunDemo({
  gateway,
  authority,
  worker = new ProcessSeparatedDryRunWorker()
}) {
  const correlationId = createId("correlation");
  const started = await invoke(
    gateway,
    authority,
    principals.owner,
    correlationId,
    "workflow.start",
    {
      workflowId: CONNECTOR_OUTBOX_DRY_RUN_WORKFLOW.id,
      version: CONNECTOR_OUTBOX_DRY_RUN_WORKFLOW.version,
      objective:
        "Exercise the authenticated connector contract and durable outbox without network access.",
      idempotencyKey: "fdos-connector-outbox-dry-run-v1"
    }
  );
  const intake = taskByStep(started.run, "intake");
  await invoke(
    gateway,
    authority,
    principals.chief,
    correlationId,
    "task.claim",
    { taskId: intake.id }
  );
  await invoke(
    gateway,
    authority,
    principals.chief,
    correlationId,
    "task.complete",
    {
      taskId: intake.id,
      result: {
        scope:
          "Internal contract and outbox simulation; no network or external effect."
      }
    }
  );

  const connectorTask = taskByStep(started.run, "reference-read");
  await invoke(
    gateway,
    authority,
    principals.operations,
    correlationId,
    "task.claim",
    { taskId: connectorTask.id }
  );
  const prepared = await invoke(
    gateway,
    authority,
    principals.operations,
    correlationId,
    "outbox.prepare",
    {
      taskId: connectorTask.id,
      connectorId: principals.connector.id,
      operationId: "repository.metadata.read",
      parameters: {
        repositoryId: "fdos-genesis",
        revision: "bound-local-demo",
        includeCommitMetadata: true
      },
      idempotencyKey: "fdos-reference-metadata-demo-v1"
    }
  );
  const claimed = await invoke(
    gateway,
    authority,
    principals.connector,
    correlationId,
    "outbox.claim",
    {
      deliveryId: prepared.delivery.id,
      leaseSeconds: 30
    }
  );
  const workerResult = await worker.execute({
    delivery: claimed
  });
  const simulated = await invoke(
    gateway,
    authority,
    principals.connector,
    correlationId,
    "outbox.record-worker-outcome",
    {
      deliveryId: prepared.delivery.id,
      claimId: claimed.claim.id,
      outcome: workerResult.outcome.type,
      evidence: workerResult.outcome.evidence,
      workerReceipt: workerResult.workerReceipt
    }
  );
  await invoke(
    gateway,
    authority,
    principals.operations,
    correlationId,
    "task.complete",
    {
      taskId: connectorTask.id,
      result: {
        deliveryStatus: simulated.status
      }
    }
  );
  const run = await invoke(
    gateway,
    authority,
    principals.owner,
    correlationId,
    "workflow.view",
    { runId: started.run.id }
  );
  const evidence = await invoke(
    gateway,
    authority,
    principals.owner,
    correlationId,
    "evidence.export",
    { runId: started.run.id }
  );
  const delivery = await invoke(
    gateway,
    authority,
    principals.owner,
    correlationId,
    "outbox.get",
    { deliveryId: prepared.delivery.id }
  );
  const audit = await invoke(
    gateway,
    authority,
    principals.owner,
    correlationId,
    "audit.read",
    {}
  );
  return {
    correlationId,
    run,
    evidence,
    delivery,
    worker: workerResult,
    audit,
    status: gateway.status()
  };
}
