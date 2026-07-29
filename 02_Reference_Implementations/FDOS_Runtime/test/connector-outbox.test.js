import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  ActionCatalog,
  agentActor,
  AuthorizationError,
  CONNECTOR_OUTBOX_DRY_RUN_WORKFLOW as CONNECTOR_READ_WORKFLOW,
  ConflictError,
  connectorActor,
  ConnectorRegistry,
  digestObject,
  executeConnectorOutboxDryRunDemo,
  humanActor,
  IntegrityError,
  InvocationVerifier,
  LocalInvocationAuthority,
  normalizeDeliveryOutcome,
  NotFoundError,
  openAuthenticatedPilotRuntime,
  openPilotRuntime,
  PILOT_CONNECTOR_CONTRACT_DEFINITIONS,
  PILOT_CONNECTOR_INSTANCE_DEFINITIONS,
  PolicyError,
  ValidationError,
  verifyDeliveryIntent
} from "../src/index.js";
import { controlledClock } from "../test-support/helpers.js";

const owner = Object.freeze({
  type: "human",
  id: "human:outbox-owner"
});
const operations = Object.freeze({
  type: "agent",
  id: "agent:operations:primary"
});
const chief = Object.freeze({
  type: "agent",
  id: "agent:chief-of-staff:primary"
});
const marketing = Object.freeze({
  type: "agent",
  id: "agent:marketing:primary"
});
const connector = Object.freeze({
  type: "connector",
  id: "connector:reference:primary"
});

function mutableClone(value) {
  return JSON.parse(JSON.stringify(value));
}

async function outboxHarness(
  t,
  {
    time = controlledClock(),
    connectorContractDefinitions,
    connectorInstanceDefinitions
  } = {}
) {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "fdos-connector-outbox-")
  );
  const authority = LocalInvocationAuthority.create({
    clock: time.clock
  });
  const verifier = new InvocationVerifier({
    trustedKeys: [authority.trustDescriptor()],
    organizationId: authority.organizationId,
    audience: authority.audience,
    clock: time.clock
  });
  const gateways = [];
  let gateway;

  async function openGateway(overrides = {}) {
    gateway = await openAuthenticatedPilotRuntime({
      directory,
      invocationVerifier: verifier,
      clock: time.clock,
      ...(connectorContractDefinitions
        ? { connectorContractDefinitions }
        : {}),
      ...(connectorInstanceDefinitions
        ? { connectorInstanceDefinitions }
        : {}),
      ...overrides
    });
    gateways.push(gateway);
    return gateway;
  }

  function signedRequest(principal, type, payload, options = {}) {
    const command = { type, payload };
    return {
      command,
      invocation: authority.issue({
        principal,
        command,
        ...options
      })
    };
  }

  function execute(principal, type, payload, options = {}) {
    return gateway.execute(
      signedRequest(principal, type, payload, options)
    );
  }

  await openGateway();
  t.after(async () => {
    for (const candidate of gateways.reverse()) {
      await candidate.close().catch(() => {});
    }
    await rm(directory, { recursive: true, force: true });
  });
  return {
    directory,
    time,
    authority,
    verifier,
    get gateway() {
      return gateway;
    },
    openGateway,
    signedRequest,
    execute
  };
}

async function prepareDelivery(
  harness,
  {
    idempotencyKey = "reference-read-001",
    parameters = {
      repositoryId: "fdos-genesis",
      revision: "359af997a3a66a52d764b4b8d261835abd200080",
      includeCommitMetadata: true
    }
  } = {}
) {
  const claimedTask = await claimConnectorTask(harness);
  const prepared = await harness.execute(
    operations,
    "outbox.prepare",
    {
      taskId: claimedTask.taskId,
      connectorId: connector.id,
      operationId: "repository.metadata.read",
      parameters,
      idempotencyKey
    }
  );
  return {
    ...claimedTask,
    parameters,
    prepared,
    delivery: prepared.delivery
  };
}

async function claimConnectorTask(
  harness,
  objective = "Prepare one bounded reference metadata dry-run."
) {
  const started = await harness.execute(
    owner,
    "workflow.start",
    {
      workflowId: CONNECTOR_READ_WORKFLOW.id,
      version: CONNECTOR_READ_WORKFLOW.version,
      objective
    }
  );
  const intake = started.run.tasks.find(
    (candidate) => candidate.stepId === "intake"
  );
  await harness.execute(
    chief,
    "task.claim",
    { taskId: intake.id }
  );
  await harness.execute(
    chief,
    "task.complete",
    {
      taskId: intake.id,
      result: { scope: "internal dry-run only" }
    }
  );
  const current = await harness.execute(
    owner,
    "workflow.view",
    { runId: started.run.id }
  );
  const task = current.tasks.find(
    (candidate) => candidate.stepId === "reference-read"
  );
  await harness.execute(
    operations,
    "task.claim",
    { taskId: task.id }
  );
  return {
    runId: started.run.id,
    taskId: task.id
  };
}

test("connector contracts are immutable and deny network, effects, high risk and secret fields", () => {
  const actionCatalog = new ActionCatalog();
  const registry = new ConnectorRegistry({
    actionCatalog,
    contractDefinitions: PILOT_CONNECTOR_CONTRACT_DEFINITIONS,
    instanceDefinitions: PILOT_CONNECTOR_INSTANCE_DEFINITIONS
  });
  const [contract] = registry.listContracts();
  const [instance] = registry.listInstances();
  assert.equal(contract.executionMode, "dry_run");
  assert.equal(contract.networkAccess, false);
  assert.equal(contract.externalEffects, false);
  assert.match(contract.digest, /^sha256:[0-9a-f]{64}$/);
  assert.equal(instance.contractDigest, contract.digest);
  assert.equal(
    registry.resolveOperation(
      instance.id,
      "repository.metadata.read"
    ).operation.capability,
    "connector:read:reference"
  );

  const networked = mutableClone(
    PILOT_CONNECTOR_CONTRACT_DEFINITIONS[0]
  );
  networked.networkAccess = true;
  assert.throws(
    () =>
      new ConnectorRegistry({
        actionCatalog,
        contractDefinitions: [networked],
        instanceDefinitions: []
      }),
    PolicyError
  );

  const effectful = mutableClone(
    PILOT_CONNECTOR_CONTRACT_DEFINITIONS[0]
  );
  effectful.externalEffects = true;
  assert.throws(
    () =>
      new ConnectorRegistry({
        actionCatalog,
        contractDefinitions: [effectful],
        instanceDefinitions: []
      }),
    PolicyError
  );

  const highRisk = mutableClone(
    PILOT_CONNECTOR_CONTRACT_DEFINITIONS[0]
  );
  highRisk.operations[0].riskClass = "A2";
  assert.throws(
    () =>
      new ConnectorRegistry({
        actionCatalog,
        contractDefinitions: [highRisk],
        instanceDefinitions: []
      }),
    ValidationError
  );

  const secretField = mutableClone(
    PILOT_CONNECTOR_CONTRACT_DEFINITIONS[0]
  );
  secretField.operations[0].parameterFields.push({
    name: "accessToken",
    type: "string",
    required: false,
    maxLength: 200
  });
  assert.throws(
    () =>
      new ConnectorRegistry({
        actionCatalog,
        contractDefinitions: [secretField],
        instanceDefinitions: []
      }),
    PolicyError
  );

  const malformedFields = mutableClone(
    PILOT_CONNECTOR_CONTRACT_DEFINITIONS[0]
  );
  malformedFields.operations[0].parameterFields = {};
  assert.throws(
    () =>
      new ConnectorRegistry({
        actionCatalog,
        contractDefinitions: [malformedFields],
        instanceDefinitions: []
      }),
    ValidationError
  );
});

test("connector registry denies malformed, duplicate, inactive and out-of-contract use", () => {
  const actionCatalog = new ActionCatalog();
  assert.throws(
    () => new ConnectorRegistry({ actionCatalog: null }),
    ValidationError
  );
  assert.throws(
    () =>
      new ConnectorRegistry({
        actionCatalog,
        contractDefinitions: {},
        instanceDefinitions: []
      }),
    ValidationError
  );
  assert.throws(
    () =>
      new ConnectorRegistry({
        actionCatalog,
        contractDefinitions: [
          ...PILOT_CONNECTOR_CONTRACT_DEFINITIONS,
          ...PILOT_CONNECTOR_CONTRACT_DEFINITIONS
        ],
        instanceDefinitions: []
      }),
    ConflictError
  );
  assert.throws(
    () =>
      new ConnectorRegistry({
        actionCatalog,
        contractDefinitions: PILOT_CONNECTOR_CONTRACT_DEFINITIONS,
        instanceDefinitions: [
          ...PILOT_CONNECTOR_INSTANCE_DEFINITIONS,
          ...PILOT_CONNECTOR_INSTANCE_DEFINITIONS
        ]
      }),
    ConflictError
  );

  const registry = new ConnectorRegistry({
    actionCatalog,
    contractDefinitions: PILOT_CONNECTOR_CONTRACT_DEFINITIONS,
    instanceDefinitions: PILOT_CONNECTOR_INSTANCE_DEFINITIONS
  });
  assert.throws(
    () => registry.getContract("missing-contract", "1.0.0"),
    NotFoundError
  );
  assert.throws(
    () => registry.getInstance("connector:reference:missing"),
    NotFoundError
  );
  assert.throws(
    () =>
      registry.resolveOperation(
        connector.id,
        "operation.not-contracted"
      ),
    AuthorizationError
  );
  const operation = registry.resolveOperation(
    connector.id,
    "repository.metadata.read"
  ).operation;
  assert.throws(
    () =>
      registry.normalizeParameters(operation, {
        repositoryId: "fdos-genesis"
      }),
    ValidationError
  );
  assert.throws(
    () =>
      registry.normalizeParameters(operation, {
        repositoryId: "fdos-genesis",
        revision: "main",
        includeCommitMetadata: "yes"
      }),
    ValidationError
  );

  const suspended = mutableClone(
    PILOT_CONNECTOR_INSTANCE_DEFINITIONS
  );
  suspended[0].status = "suspended";
  const suspendedRegistry = new ConnectorRegistry({
    actionCatalog,
    contractDefinitions: PILOT_CONNECTOR_CONTRACT_DEFINITIONS,
    instanceDefinitions: suspended
  });
  assert.throws(
    () => suspendedRegistry.resolveActor(connector),
    AuthorizationError
  );
  assert.throws(
    () =>
      suspendedRegistry.resolveOperation(
        connector.id,
        "repository.metadata.read"
      ),
    AuthorizationError
  );

  const missingContractInstance = mutableClone(
    PILOT_CONNECTOR_INSTANCE_DEFINITIONS[0]
  );
  missingContractInstance.contractId = "missing-contract";
  assert.throws(
    () =>
      new ConnectorRegistry({
        actionCatalog,
        contractDefinitions: PILOT_CONNECTOR_CONTRACT_DEFINITIONS,
        instanceDefinitions: [missingContractInstance]
      }),
    NotFoundError
  );
});

test("delivery preparation binds task, contract, parameters and idempotency in one transaction", async (t) => {
  const harness = await outboxHarness(t);
  const result = await prepareDelivery(harness);
  const { delivery } = result;
  assert.equal(result.prepared.created, true);
  assert.equal(delivery.status, "prepared");
  assert.equal(delivery.intent.task.id, result.taskId);
  assert.equal(delivery.intent.connector.id, connector.id);
  assert.equal(delivery.intent.connector.executionMode, "dry_run");
  assert.equal(delivery.intent.connector.networkAccess, false);
  assert.equal(delivery.intent.connector.externalEffects, false);
  assert.equal(delivery.intent.operation.riskClass, "A1");
  assert.equal(delivery.intent.target, "reference:repository-metadata");
  assert.deepEqual(delivery.intent.parameters, result.parameters);
  assert.equal(verifyDeliveryIntent(delivery.intent), true);
  assert.equal(harness.gateway.status().outbox.prepared, 1);
  assert.equal(harness.gateway.status().connectorNetworkAccessEnabled, false);
  assert.equal(harness.gateway.status().connectorExternalEffectsEnabled, false);

  const listed = await harness.execute(
    operations,
    "outbox.list",
    { status: "prepared" }
  );
  assert.deepEqual(listed.map((entry) => entry.id), [delivery.id]);
  const fetched = await harness.execute(
    operations,
    "outbox.get",
    { deliveryId: delivery.id }
  );
  assert.equal(fetched.intent.digest, delivery.intent.digest);

  harness.time.advance(1_000);
  const duplicate = await harness.execute(
    operations,
    "outbox.prepare",
    {
      taskId: result.taskId,
      connectorId: connector.id,
      operationId: "repository.metadata.read",
      parameters: result.parameters,
      idempotencyKey: "reference-read-001"
    }
  );
  assert.equal(duplicate.created, false);
  assert.equal(duplicate.delivery.id, delivery.id);
  assert.equal(harness.gateway.status().outbox.total, 1);

  await assert.rejects(
    () =>
      harness.execute(
        operations,
        "outbox.prepare",
        {
          taskId: result.taskId,
          connectorId: connector.id,
          operationId: "repository.metadata.read",
          parameters: {
            ...result.parameters,
            revision: "different-revision"
          },
          idempotencyKey: "reference-read-001"
        }
      ),
    ConflictError
  );
  assert.equal(harness.gateway.status().outbox.total, 1);
  await assert.rejects(
    () =>
      harness.execute(
        operations,
        "outbox.prepare",
        {
          taskId: result.taskId,
          connectorId: connector.id,
          operationId: "repository.metadata.read",
          parameters: result.parameters,
          idempotencyKey: "second-key-same-task"
        }
      ),
    ConflictError
  );
  assert.equal(harness.gateway.status().outbox.total, 1);

  const audit = await harness.execute(owner, "audit.read", {});
  const prepared = audit.find(
    (event) =>
      event.type === "connector.delivery.prepared" &&
      event.subject === delivery.id
  );
  const accepted = audit.find(
    (event) =>
      event.type === "identity.invocation.accepted" &&
      event.actor.invocationId === prepared.actor.invocationId
  );
  assert.equal(prepared.transactionId, accepted.transactionId);
  assert.equal(prepared.actor.correlationId, accepted.actor.correlationId);
});

test("contracted connector task cannot bypass or outlive its exact delivery", async (t) => {
  const harness = await outboxHarness(t);
  const claimedTask = await claimConnectorTask(
    harness,
    "Test task and delivery lifecycle binding."
  );
  await assert.rejects(
    () =>
      harness.execute(
        operations,
        "task.complete",
        {
          taskId: claimedTask.taskId,
          result: { deliveryStatus: "invented" }
        }
      ),
    PolicyError
  );
  const prepared = await harness.execute(
    operations,
    "outbox.prepare",
    {
      taskId: claimedTask.taskId,
      connectorId: connector.id,
      operationId: "repository.metadata.read",
      parameters: {
        repositoryId: "fdos-genesis",
        revision: "lifecycle-test"
      },
      idempotencyKey: "lifecycle-test"
    }
  );
  await assert.rejects(
    () =>
      harness.execute(
        operations,
        "task.complete",
        {
          taskId: claimedTask.taskId,
          result: { deliveryStatus: "prepared" }
        }
      ),
    PolicyError
  );
  await assert.rejects(
    () =>
      harness.execute(
        owner,
        "task.cancel",
        {
          taskId: claimedTask.taskId,
          reason: "Active delivery must be closed first."
        }
    ),
    PolicyError
  );
  await harness.execute(
    operations,
    "task.fail",
    {
      taskId: claimedTask.taskId,
      reason: "Exercise task retry while delivery remains unresolved.",
      retryable: true
    }
  );
  await assert.rejects(
    () =>
      harness.execute(
        owner,
        "task.retry",
        { taskId: claimedTask.taskId }
      ),
    PolicyError
  );
  await harness.execute(
    owner,
    "outbox.cancel",
    {
      deliveryId: prepared.delivery.id,
      reason: "Close the delivery before cancelling its task."
    }
  );
  const retriedTask = await harness.execute(
    owner,
    "task.retry",
    { taskId: claimedTask.taskId }
  );
  assert.equal(retriedTask.status, "ready");
  const cancelledTask = await harness.execute(
    owner,
    "task.cancel",
    {
      taskId: claimedTask.taskId,
      reason: "Delivery is now durably cancelled."
    }
  );
  assert.equal(cancelledTask.status, "cancelled");
  await assert.rejects(
    () =>
      harness.execute(
        connector,
        "outbox.claim",
        {
          deliveryId: prepared.delivery.id,
          leaseSeconds: 30
        }
      ),
    ConflictError
  );
});

test("outbox parameters and raw lower-level calls fail closed", async (t) => {
  const harness = await outboxHarness(t);
  const claimedTask = await claimConnectorTask(
    harness,
    "Test outbox parameter controls."
  );
  await assert.rejects(
    () =>
      harness.execute(
        operations,
        "outbox.prepare",
        {
          taskId: claimedTask.taskId,
          connectorId: connector.id,
          operationId: "repository.metadata.read",
          parameters: {
            repositoryId: "fdos-genesis",
            revision: "main",
            accessToken: "must-never-enter-the-outbox"
          },
          idempotencyKey: "unexpected-field"
        }
      ),
    ValidationError
  );
  assert.equal(harness.gateway.status().outbox.total, 0);
  await assert.rejects(
    () =>
      harness.execute(
        operations,
        "outbox.list",
        { status: "" }
      ),
    ValidationError
  );

  const directory = await mkdtemp(
    path.join(os.tmpdir(), "fdos-raw-outbox-denial-")
  );
  const runtime = await openPilotRuntime({
    directory,
    persistence: "sqlite"
  });
  t.after(async () => {
    await runtime.close().catch(() => {});
    await rm(directory, { recursive: true, force: true });
  });
  const rawStart = await runtime.startWorkflow({
    actor: humanActor("human:raw-owner"),
    workflowId: CONNECTOR_READ_WORKFLOW.id,
    version: CONNECTOR_READ_WORKFLOW.version,
    objective: "Prove the outbox cannot use the lower-level runtime."
  });
  const rawIntake = rawStart.run.tasks.find(
    (task) => task.stepId === "intake"
  );
  await runtime.claimTask(
    rawIntake.id,
    agentActor("agent:chief-of-staff:primary")
  );
  await runtime.completeTask(
    rawIntake.id,
    agentActor("agent:chief-of-staff:primary"),
    { scope: "raw-path denial" }
  );
  const rawRun = runtime.viewRun(
    rawStart.run.id,
    humanActor("human:raw-owner")
  );
  const rawTask = rawRun.tasks.find(
    (task) => task.stepId === "reference-read"
  );
  await runtime.claimTask(
    rawTask.id,
    agentActor("agent:operations:primary")
  );
  await assert.rejects(
    () =>
      runtime.prepareDelivery({
        actor: {
          ...agentActor("agent:operations:primary"),
          invocationId: "invocation_forged_000001",
          correlationId: "correlation_forged_000001"
        },
        taskId: rawTask.id,
        connectorId: connector.id,
        operationId: "repository.metadata.read",
        parameters: {
          repositoryId: "fdos-genesis",
          revision: "main"
        },
        idempotencyKey: "raw-runtime-denied"
      }),
    PolicyError
  );
  assert.equal(runtime.status().outbox.total, 0);
});

test("registered connector can claim only its delivery and record only content-minimized simulation evidence", async (t) => {
  const secondConnector = {
    ...PILOT_CONNECTOR_INSTANCE_DEFINITIONS[0],
    id: "connector:reference:secondary",
    name: "Secondary Reference Metadata Dry-Run Connector"
  };
  const harness = await outboxHarness(t, {
    connectorInstanceDefinitions: [
      ...PILOT_CONNECTOR_INSTANCE_DEFINITIONS,
      secondConnector
    ]
  });
  const { delivery } = await prepareDelivery(harness);

  await assert.rejects(
    () =>
      harness.execute(
        connectorActor(secondConnector.id),
        "outbox.claim",
        {
          deliveryId: delivery.id,
          leaseSeconds: 30
        }
      ),
    AuthorizationError
  );
  assert.equal(harness.gateway.status().outbox.prepared, 1);

  const acceptedBeforeUnknown =
    harness.gateway.status().acceptedInvocations;
  await assert.rejects(
    () =>
      harness.execute(
        {
          type: "connector",
          id: "connector:reference:unknown"
        },
        "outbox.claim",
        {
          deliveryId: delivery.id,
          leaseSeconds: 30
        }
      ),
    AuthorizationError
  );
  assert.equal(
    harness.gateway.status().acceptedInvocations,
    acceptedBeforeUnknown
  );

  const claimed = await harness.execute(
    connector,
    "outbox.claim",
    {
      deliveryId: delivery.id,
      leaseSeconds: 30
    }
  );
  assert.equal(claimed.status, "claimed");
  assert.equal(claimed.claim.connectorId, connector.id);
  assert.equal(claimed.attempt, 1);

  await assert.rejects(
    () =>
      harness.execute(
        connector,
        "outbox.record-outcome",
        {
          deliveryId: delivery.id,
          claimId: claimed.claim.id,
          outcome: "simulated",
          evidence: {
            externalEffect: "none",
            resultDigest: digestObject({ result: "bounded" }),
            rawResponse: "must-not-be-stored"
          }
        }
      ),
    ValidationError
  );
  assert.equal(harness.gateway.status().outbox.claimed, 1);

  const completed = await harness.execute(
    connector,
    "outbox.record-outcome",
    {
      deliveryId: delivery.id,
      claimId: claimed.claim.id,
      outcome: "simulated",
      evidence: {
        externalEffect: "none",
        resultDigest: digestObject({ result: "bounded" })
      }
    }
  );
  assert.equal(completed.status, "simulated");
  assert.equal(completed.lastOutcome.type, "simulated");
  assert.equal(completed.lastOutcome.evidence.externalEffect, "none");
  assert.equal(completed.claim, null);
  assert.equal(harness.gateway.status().outbox.simulated, 1);

  const acceptedBeforeRead =
    harness.gateway.status().acceptedInvocations;
  await assert.rejects(
    () =>
      harness.execute(
        connector,
        "outbox.get",
        { deliveryId: delivery.id }
      ),
    AuthorizationError
  );
  assert.equal(
    harness.gateway.status().acceptedInvocations,
    acceptedBeforeRead
  );
});

test("concurrent connector claims serialize and exactly one fencing claim wins", async (t) => {
  const harness = await outboxHarness(t);
  const { delivery } = await prepareDelivery(harness);
  const first = harness.signedRequest(
    connector,
    "outbox.claim",
    {
      deliveryId: delivery.id,
      leaseSeconds: 30
    }
  );
  const second = harness.signedRequest(
    connector,
    "outbox.claim",
    {
      deliveryId: delivery.id,
      leaseSeconds: 30
    }
  );
  const outcomes = await Promise.allSettled([
    harness.gateway.execute(first),
    harness.gateway.execute(second)
  ]);
  assert.equal(
    outcomes.filter((outcome) => outcome.status === "fulfilled").length,
    1
  );
  assert.equal(
    outcomes.filter(
      (outcome) =>
        outcome.status === "rejected" &&
        outcome.reason instanceof ConflictError
    ).length,
    1
  );
  const current = await harness.execute(
    owner,
    "outbox.get",
    { deliveryId: delivery.id }
  );
  assert.equal(current.status, "claimed");
  assert.equal(current.attempt, 1);
  const audit = await harness.execute(owner, "audit.read", {});
  assert.equal(
    audit.filter(
      (event) => event.type === "connector.delivery.claimed"
    ).length,
    1
  );
});

test("failed delivery retries require Human Governance and obey the attempt budget", async (t) => {
  const harness = await outboxHarness(t);
  const { delivery } = await prepareDelivery(harness);
  const firstClaim = await harness.execute(
    connector,
    "outbox.claim",
    {
      deliveryId: delivery.id,
      leaseSeconds: 30
    }
  );
  const failed = await harness.execute(
    connector,
    "outbox.record-outcome",
    {
      deliveryId: delivery.id,
      claimId: firstClaim.claim.id,
      outcome: "failed",
      evidence: {
        externalEffect: "none",
        errorCode: "DRY_RUN_TEMPORARY_FAILURE",
        messageDigest: digestObject({ message: "temporary" }),
        retryable: true
      }
    }
  );
  assert.equal(failed.status, "failed");
  assert.equal(failed.retryable, true);

  await assert.rejects(
    () =>
      harness.execute(
        operations,
        "outbox.retry",
        {
          deliveryId: delivery.id,
          reason: "Agent must not authorize its own retry."
        }
      ),
    AuthorizationError
  );
  const retried = await harness.execute(
    owner,
    "outbox.retry",
    {
      deliveryId: delivery.id,
      reason: "Human-authorized final dry-run attempt."
    }
  );
  assert.equal(retried.status, "prepared");

  const secondClaim = await harness.execute(
    connector,
    "outbox.claim",
    {
      deliveryId: delivery.id,
      leaseSeconds: 30
    }
  );
  assert.equal(secondClaim.attempt, 2);
  await harness.execute(
    connector,
    "outbox.record-outcome",
    {
      deliveryId: delivery.id,
      claimId: secondClaim.claim.id,
      outcome: "failed",
      evidence: {
        externalEffect: "none",
        errorCode: "DRY_RUN_FINAL_FAILURE",
        messageDigest: digestObject({ message: "final" }),
        retryable: true
      }
    }
  );
  await assert.rejects(
    () =>
      harness.execute(
        owner,
        "outbox.retry",
        {
          deliveryId: delivery.id,
          reason: "Attempt budget must block this retry."
        }
      ),
    PolicyError
  );
  const cancelled = await harness.execute(
    owner,
    "outbox.cancel",
    {
      deliveryId: delivery.id,
      reason: "Close the exhausted dry-run delivery."
    }
  );
  assert.equal(cancelled.status, "cancelled");
});

test("expired claim becomes uncertain and cannot retry before explicit human resolution", async (t) => {
  const harness = await outboxHarness(t);
  const { delivery } = await prepareDelivery(harness);
  const claimed = await harness.execute(
    connector,
    "outbox.claim",
    {
      deliveryId: delivery.id,
      leaseSeconds: 5
    }
  );
  harness.time.advance(5_000);
  await assert.rejects(
    () =>
      harness.execute(
        connector,
        "outbox.record-outcome",
        {
          deliveryId: delivery.id,
          claimId: claimed.claim.id,
          outcome: "simulated",
          evidence: {
            externalEffect: "none",
            resultDigest: digestObject({ late: true })
          }
        }
      ),
    ConflictError
  );
  const uncertain = await harness.execute(
    owner,
    "outbox.get",
    { deliveryId: delivery.id }
  );
  assert.equal(uncertain.status, "uncertain");
  assert.equal(uncertain.claim, null);
  assert.equal(
    uncertain.lastOutcome.evidence.reasonCode,
    "OUTCOME_AFTER_LEASE"
  );

  await assert.rejects(
    () =>
      harness.execute(
        connector,
        "outbox.claim",
        {
          deliveryId: delivery.id,
          leaseSeconds: 30
        }
      ),
    ConflictError
  );
  await assert.rejects(
    () =>
      harness.execute(
        chief,
        "outbox.resolve-uncertain",
        {
          deliveryId: delivery.id,
          decision: "failed",
          reason: "Agents cannot resolve uncertainty.",
          evidenceDigest: digestObject({ review: "agent" }),
          retryable: true
        }
      ),
    AuthorizationError
  );

  const resolved = await harness.execute(
    owner,
    "outbox.resolve-uncertain",
    {
      deliveryId: delivery.id,
      decision: "failed",
      reason:
        "Human review confirms no simulation result and authorizes one retry.",
      evidenceDigest: digestObject({ review: "human-confirmed-failure" }),
      retryable: true
    }
  );
  assert.equal(resolved.status, "failed");
  assert.equal(resolved.retryable, true);
  const retried = await harness.execute(
    owner,
    "outbox.retry",
    {
      deliveryId: delivery.id,
      reason: "Retry only after explicit uncertainty resolution."
    }
  );
  assert.equal(retried.status, "prepared");

  const audit = await harness.execute(owner, "audit.read", {});
  const expiry = audit.find(
    (event) =>
      event.type === "connector.delivery.claim-expired" &&
      event.subject === delivery.id
  );
  const failedInvocation = audit.find(
    (event) =>
      event.type === "identity.invocation.execution-failed" &&
      event.actor.invocationId === expiry.actor.invocationId
  );
  assert.equal(expiry.transactionId, failedInvocation.transactionId);
});

test("Human Governance can reconcile an abandoned expired claim without a live worker", async (t) => {
  const harness = await outboxHarness(t);
  const { delivery } = await prepareDelivery(harness);
  await harness.execute(
    connector,
    "outbox.claim",
    {
      deliveryId: delivery.id,
      leaseSeconds: 5
    }
  );
  await assert.rejects(
    () =>
      harness.execute(
        owner,
        "outbox.reconcile-expired",
        { deliveryId: delivery.id }
      ),
    ConflictError
  );
  harness.time.advance(5_000);
  const reconciled = await harness.execute(
    owner,
    "outbox.reconcile-expired",
    { deliveryId: delivery.id }
  );
  assert.equal(reconciled.status, "uncertain");
  assert.equal(
    reconciled.lastOutcome.evidence.reasonCode,
    "CLAIM_LEASE_RECONCILED"
  );
  const resolved = await harness.execute(
    owner,
    "outbox.resolve-uncertain",
    {
      deliveryId: delivery.id,
      decision: "cancelled",
      reason: "No live worker evidence exists; close the dry-run.",
      evidenceDigest: digestObject({
        inspection: "expired claim with no worker acknowledgement"
      })
    }
  );
  assert.equal(resolved.status, "cancelled");
});

test("connector-reported uncertainty may be closed only with exact human evidence", async (t) => {
  const harness = await outboxHarness(t);
  const { delivery } = await prepareDelivery(harness);
  const claimed = await harness.execute(
    connector,
    "outbox.claim",
    {
      deliveryId: delivery.id,
      leaseSeconds: 30
    }
  );
  const uncertain = await harness.execute(
    connector,
    "outbox.record-outcome",
    {
      deliveryId: delivery.id,
      claimId: claimed.claim.id,
      outcome: "uncertain",
      evidence: {
        externalEffect: "none",
        reasonCode: "DRY_RUN_ACK_UNKNOWN",
        evidenceDigest: digestObject({ workerState: "unknown" })
      }
    }
  );
  assert.equal(uncertain.status, "uncertain");

  await assert.rejects(
    () =>
      harness.execute(
        owner,
        "outbox.resolve-uncertain",
        {
          deliveryId: delivery.id,
          decision: "confirmed_simulated",
          reason: "Missing exact result digest.",
          evidenceDigest: digestObject({ inspection: true })
        }
      ),
    ValidationError
  );
  const resultDigest = digestObject({ inspectedResult: "complete" });
  const resolved = await harness.execute(
    owner,
    "outbox.resolve-uncertain",
    {
      deliveryId: delivery.id,
      decision: "confirmed_simulated",
      reason: "Human inspected the bounded worker evidence.",
      evidenceDigest: digestObject({
        inspection: "local-dry-run-log"
      }),
      resultDigest
    }
  );
  assert.equal(resolved.status, "simulated");
  assert.equal(resolved.resolution.resultDigest, resultDigest);
  assert.equal(resolved.completedAt, resolved.resolution.resolvedAt);

  await harness.gateway.close();
  await harness.openGateway();
  const rehydrated = await harness.execute(
    owner,
    "outbox.get",
    { deliveryId: delivery.id }
  );
  assert.equal(rehydrated.status, "simulated");
  assert.equal(rehydrated.resolution.resultDigest, resultDigest);
});

test("outbox and idempotency survive restart while stale contract bindings block claims", async (t) => {
  const harness = await outboxHarness(t);
  const result = await prepareDelivery(harness);
  await harness.gateway.close();

  await harness.openGateway();
  const duplicate = await harness.execute(
    operations,
    "outbox.prepare",
    {
      taskId: result.taskId,
      connectorId: connector.id,
      operationId: "repository.metadata.read",
      parameters: result.parameters,
      idempotencyKey: "reference-read-001"
    }
  );
  assert.equal(duplicate.created, false);
  assert.equal(duplicate.delivery.id, result.delivery.id);
  await harness.gateway.close();

  const changedContracts = mutableClone(
    PILOT_CONNECTOR_CONTRACT_DEFINITIONS
  );
  changedContracts[0].description =
    "Changed contract content must not authorize an old delivery intent.";
  await harness.openGateway({
    connectorContractDefinitions: changedContracts
  });
  const listed = await harness.execute(
    owner,
    "outbox.list",
    { status: "prepared" }
  );
  assert.equal(listed.length, 1);
  assert.equal(listed[0].id, result.delivery.id);
  assert.equal(
    listed[0].intent.connector.contractDigest,
    result.delivery.intent.connector.contractDigest
  );

  await assert.rejects(
    () =>
      harness.execute(
        connector,
        "outbox.claim",
        {
          deliveryId: result.delivery.id,
          leaseSeconds: 30
        }
      ),
    PolicyError
  );
  assert.equal(harness.gateway.status().outbox.prepared, 1);

  await assert.rejects(
    () =>
      harness.execute(
        operations,
        "outbox.prepare",
        {
          taskId: result.taskId,
          connectorId: connector.id,
          operationId: "repository.metadata.read",
          parameters: result.parameters,
          idempotencyKey: "reference-read-001"
        }
      ),
    ConflictError
  );
});

test("delivery intent and outcome tampering are independently rejected", async (t) => {
  const harness = await outboxHarness(t);
  const { delivery } = await prepareDelivery(harness);
  const changedParameters = mutableClone(delivery.intent);
  changedParameters.parameters.revision = "tampered";
  assert.throws(
    () => verifyDeliveryIntent(changedParameters),
    IntegrityError
  );

  const changedBinding = mutableClone(delivery.intent);
  changedBinding.connector.externalEffects = true;
  const unsigned = { ...changedBinding };
  delete unsigned.digest;
  changedBinding.digest = digestObject(unsigned);
  assert.throws(
    () => verifyDeliveryIntent(changedBinding),
    IntegrityError
  );

  assert.throws(
    () =>
      normalizeDeliveryOutcome("simulated", {
        externalEffect: "performed",
        resultDigest: digestObject({ unsafe: true })
      }),
    PolicyError
  );
  assert.throws(
    () =>
      normalizeDeliveryOutcome("failed", {
        externalEffect: "none",
        errorCode: "FAILED",
        messageDigest: digestObject({ message: "bounded" }),
        retryable: true,
        rawError: "must not enter evidence"
      }),
    ValidationError
  );
});

test("authenticated outbox demo completes with no network or external effect", async (t) => {
  const harness = await outboxHarness(t);
  const result = await executeConnectorOutboxDryRunDemo({
    gateway: harness.gateway,
    authority: harness.authority
  });
  assert.equal(result.run.status, "completed");
  assert.equal(result.delivery.status, "simulated");
  assert.equal(result.delivery.lastOutcome.evidence.externalEffect, "none");
  assert.equal(result.evidence.deliveries.length, 1);
  assert.equal(
    result.evidence.deliveries[0].intentDigest,
    result.delivery.intent.digest
  );
  assert.equal(
    result.evidence.eventReferences.some(
      (event) =>
        event.type === "connector.delivery.outcome-recorded" &&
        event.subject === result.delivery.id
    ),
    true
  );
  assert.doesNotMatch(
    JSON.stringify(result.evidence),
    /repositoryId|bound-local-demo/
  );
  assert.equal(result.status.acceptedInvocations, 12);
  assert.equal(result.status.persistence.committedTransactionCount, 12);
  assert.equal(result.status.audit.eventCount, 22);
  assert.equal(result.status.externalActionsEnabled, false);
  assert.equal(result.status.connectorNetworkAccessEnabled, false);
  assert.equal(result.status.connectorExternalEffectsEnabled, false);
});
