import assert from "node:assert/strict";
import {
  lstat,
  mkdtemp,
  rm,
  writeFile
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  AuthorizationError,
  ConflictError,
  digestObject,
  EventLog,
  executeAuthenticatedSoftwareChangeReadinessDemo,
  IntegrityError,
  InvocationVerifier,
  LocalInvocationAuthority,
  NotFoundError,
  openAuthenticatedPilotRuntime,
  openPilotRuntime,
  PolicyError,
  ValidationError,
  verifyInvocationReceipt
} from "../src/index.js";
import { controlledClock } from "../test-support/helpers.js";

const owner = Object.freeze({
  type: "human",
  id: "human:test-owner"
});
const operations = Object.freeze({
  type: "agent",
  id: "agent:operations:primary"
});
const chief = Object.freeze({
  type: "agent",
  id: "agent:chief-of-staff:primary"
});
const connector = Object.freeze({
  type: "connector",
  id: "connector:github:primary"
});

const A2_WORKFLOW = Object.freeze({
  id: "company.authenticated-reversible-write-test",
  version: "1.0.0",
  name: "Authenticated Reversible Write Test",
  purpose: "Exercise signed A2 approval semantics through the gateway.",
  ownerRoleId: "chief-of-staff",
  steps: [
    {
      id: "intake",
      title: "Prepare bounded request",
      roleId: "chief-of-staff",
      instructions: "Prepare the internal request.",
      desiredOutcome: "Bounded request.",
      dependencies: [],
      actionType: "work.intake.analyze",
      target: "internal:authenticated-a2-test",
      output: { requiredFields: ["request"] }
    },
    {
      id: "reversible-write",
      title: "Perform reversible write",
      roleId: "operations",
      instructions: "Perform only the registered reversible test write.",
      desiredOutcome: "Recorded reversible result.",
      dependencies: ["intake"],
      actionType: "connector.reversible.write",
      target: "sandbox:authenticated-test-record",
      riskClass: "A2",
      output: { requiredFields: ["confirmation"] }
    }
  ]
});

async function identityHarness(
  t,
  {
    time = controlledClock(),
    runtimeOptions = {},
    verifierOptions = {}
  } = {}
) {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "fdos-authenticated-runtime-")
  );
  const authority = LocalInvocationAuthority.create({
    clock: time.clock
  });
  const verifier = new InvocationVerifier({
    ...verifierOptions,
    trustedKeys: [authority.trustDescriptor()],
    organizationId: authority.organizationId,
    audience: authority.audience,
    clock: time.clock
  });
  const gateways = [];
  async function openGateway() {
    const gateway = await openAuthenticatedPilotRuntime({
      ...runtimeOptions,
      directory,
      invocationVerifier: verifier,
      clock: time.clock
    });
    gateways.push(gateway);
    return gateway;
  }
  const gateway = await openGateway();
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
    gateway,
    openGateway
  };
}

function signedRequest(authority, principal, command, options = {}) {
  const invocation = authority.issue({
    principal,
    command,
    ...options
  });
  return { command, invocation };
}

function executeAs(harness, principal, type, payload, options = {}) {
  return harness.gateway.execute(
    signedRequest(
      harness.authority,
      principal,
      { type, payload },
      options
    )
  );
}

async function readyAuthenticatedA2(harness) {
  const started = await executeAs(
    harness,
    owner,
    "workflow.start",
    {
      workflowId: A2_WORKFLOW.id,
      version: A2_WORKFLOW.version,
      objective: "Exercise the authenticated approval boundary."
    }
  );
  const intake = started.run.tasks.find(
    (task) => task.stepId === "intake"
  );
  await executeAs(
    harness,
    chief,
    "task.claim",
    { taskId: intake.id }
  );
  await executeAs(
    harness,
    chief,
    "task.complete",
    {
      taskId: intake.id,
      result: { request: "bounded sandbox write" }
    }
  );
  const run = await executeAs(
    harness,
    owner,
    "workflow.view",
    { runId: started.run.id }
  );
  return {
    runId: started.run.id,
    writeTask: run.tasks.find(
      (task) => task.stepId === "reversible-write"
    )
  };
}

test("signed invocation binds principal, organization, operation and command", async (t) => {
  const harness = await identityHarness(t);
  const command = { type: "task.list-ready", payload: {} };
  const request = signedRequest(
    harness.authority,
    operations,
    command
  );
  const tasks = await harness.gateway.execute(request);
  assert.deepEqual(tasks, []);
  assert.equal(harness.gateway.status().acceptedInvocations, 1);
  assert.equal(
    harness.gateway.status().authenticatedInvocationVerifierConfigured,
    true
  );

  const receipt = harness.verifier.verify(request.invocation, { command });
  assert.equal(verifyInvocationReceipt(receipt), true);
  assert.equal(receipt.principal.id, operations.id);
  assert.equal(receipt.organizationId, "org:fdos-pilot");
  assert.equal(receipt.operation, "task.list-ready");

  const auditCommand = { type: "audit.read", payload: {} };
  const audit = await harness.gateway.execute(
    signedRequest(harness.authority, owner, auditCommand)
  );
  const accepted = audit.find(
    (event) =>
      event.type === "identity.invocation.accepted" &&
      event.actor.invocationId === receipt.invocationId
  );
  assert.equal(accepted.actor.roleId, "operations");
  assert.doesNotMatch(
    JSON.stringify(audit),
    /BEGIN (?:PUBLIC|PRIVATE) KEY|signature/
  );
});

test("tampered signatures, commands and envelope shapes fail closed", () => {
  const time = controlledClock();
  const authority = LocalInvocationAuthority.create({ clock: time.clock });
  const verifier = new InvocationVerifier({
    trustedKeys: [authority.trustDescriptor()],
    clock: time.clock
  });
  const command = { type: "task.list-ready", payload: {} };
  const invocation = authority.issue({ principal: operations, command });

  const tamperedClaims = {
    ...invocation,
    claims: {
      ...invocation.claims,
      operation: "memory.list-candidates"
    }
  };
  assert.throws(
    () => verifier.verify(tamperedClaims, { command }),
    IntegrityError
  );

  const changedCommand = {
    type: "task.get",
    payload: { taskId: "task_changed_000001" }
  };
  assert.throws(
    () => verifier.verify(invocation, { command: changedCommand }),
    AuthorizationError
  );

  assert.throws(
    () =>
      verifier.verify(
        { ...invocation, unexpected: "denied" },
        { command }
      ),
    IntegrityError
  );
});

test("expired and not-yet-active invocations are denied", () => {
  const time = controlledClock();
  const authority = LocalInvocationAuthority.create({ clock: time.clock });
  const verifier = new InvocationVerifier({
    trustedKeys: [authority.trustDescriptor()],
    clock: time.clock
  });
  const command = { type: "task.list-ready", payload: {} };

  const future = authority.issue({
    principal: operations,
    command,
    ttlMs: 5_000,
    notBeforeDelayMs: 1_000
  });
  assert.throws(
    () => verifier.verify(future, { command }),
    AuthorizationError
  );

  const expiring = authority.issue({
    principal: operations,
    command,
    ttlMs: 1_000
  });
  time.advance(1_000);
  assert.throws(
    () => verifier.verify(expiring, { command }),
    AuthorizationError
  );
});

test("bounded clock skew is preserved in the receipt and survives restart", async (t) => {
  const harness = await identityHarness(t, {
    verifierOptions: { clockSkewMs: 1_000 }
  });
  const command = { type: "task.list-ready", payload: {} };
  const request = signedRequest(
    harness.authority,
    operations,
    command,
    { notBeforeDelayMs: 1_000 }
  );
  await harness.gateway.execute(request);
  const receipt = harness.verifier.verify(request.invocation, { command });
  assert.equal(receipt.verificationClockSkewMs, 1_000);
  assert.equal(receipt.verifiedAt, harness.time.value().toISOString());
  assert.equal(verifyInvocationReceipt(receipt), true);

  await harness.gateway.close();
  const reopened = await harness.openGateway();
  assert.equal(reopened.status().acceptedInvocations, 1);
  await assert.rejects(
    () => reopened.execute(request),
    ConflictError
  );
});

test("wrong organization, unknown key and excessive TTL are denied", () => {
  const time = controlledClock();
  const authority = LocalInvocationAuthority.create({ clock: time.clock });
  const command = { type: "task.list-ready", payload: {} };
  const invocation = authority.issue({ principal: operations, command });

  const wrongOrganization = new InvocationVerifier({
    trustedKeys: [authority.trustDescriptor()],
    organizationId: "org:another-company",
    clock: time.clock
  });
  assert.throws(
    () => wrongOrganization.verify(invocation, { command }),
    AuthorizationError
  );

  const wrongAudience = new InvocationVerifier({
    trustedKeys: [authority.trustDescriptor()],
    audience: "another-runtime",
    clock: time.clock
  });
  assert.throws(
    () => wrongAudience.verify(invocation, { command }),
    AuthorizationError
  );

  const otherAuthority = LocalInvocationAuthority.create({
    clock: time.clock
  });
  const unknownKey = new InvocationVerifier({
    trustedKeys: [otherAuthority.trustDescriptor()],
    clock: time.clock
  });
  assert.throws(
    () => unknownKey.verify(invocation, { command }),
    AuthorizationError
  );

  const shortWindowVerifier = new InvocationVerifier({
    trustedKeys: [authority.trustDescriptor()],
    clock: time.clock,
    maxTtlMs: 60_000
  });
  assert.throws(
    () => shortWindowVerifier.verify(invocation, { command }),
    AuthorizationError
  );
});

test("trust store supports explicit Ed25519 key rotation", () => {
  const time = controlledClock();
  const first = LocalInvocationAuthority.create({ clock: time.clock });
  const second = LocalInvocationAuthority.create({
    clock: time.clock,
    issuerId: "issuer:fdos-rotated"
  });
  const verifier = new InvocationVerifier({
    trustedKeys: [first.trustDescriptor(), second.trustDescriptor()],
    clock: time.clock
  });
  const command = { type: "task.list-ready", payload: {} };
  assert.doesNotThrow(() =>
    verifier.verify(
      first.issue({ principal: operations, command }),
      { command }
    )
  );
  assert.doesNotThrow(() =>
    verifier.verify(
      second.issue({ principal: operations, command }),
      { command }
    )
  );
});

test("invocation replay is rejected sequentially and concurrently", async (t) => {
  const sequential = await identityHarness(t);
  const command = { type: "task.list-ready", payload: {} };
  const request = signedRequest(
    sequential.authority,
    operations,
    command
  );
  await sequential.gateway.execute(request);
  await assert.rejects(
    () => sequential.gateway.execute(request),
    ConflictError
  );
  assert.equal(sequential.gateway.status().acceptedInvocations, 1);

  const concurrent = await identityHarness(t);
  const concurrentRequest = signedRequest(
    concurrent.authority,
    operations,
    command
  );
  const results = await Promise.allSettled([
    concurrent.gateway.execute(concurrentRequest),
    concurrent.gateway.execute(concurrentRequest)
  ]);
  assert.equal(
    results.filter((result) => result.status === "fulfilled").length,
    1
  );
  assert.equal(
    results.filter((result) => result.status === "rejected").length,
    1
  );
  assert.ok(
    results.find((result) => result.status === "rejected").reason
      instanceof ConflictError
  );
});

test("replay protection survives runtime restart", async (t) => {
  const harness = await identityHarness(t);
  const command = { type: "task.list-ready", payload: {} };
  const request = signedRequest(
    harness.authority,
    operations,
    command
  );
  await harness.gateway.execute(request);
  await harness.gateway.close();

  const reopened = await harness.openGateway();
  await assert.rejects(
    () => reopened.execute(request),
    ConflictError
  );
  assert.equal(reopened.status().acceptedInvocations, 1);
});

test("business failure consumes an authenticated invocation safely", async (t) => {
  const harness = await identityHarness(t);
  const command = {
    type: "task.get",
    payload: { taskId: "task_missing_000001" }
  };
  const request = signedRequest(
    harness.authority,
    owner,
    command
  );
  await assert.rejects(
    () => harness.gateway.execute(request),
    NotFoundError
  );
  await assert.rejects(
    () => harness.gateway.execute(request),
    ConflictError
  );
  assert.equal(harness.gateway.status().acceptedInvocations, 1);
  assert.equal(harness.gateway.status().persistence.transactionCount, 1);

  const audit = await executeAs(
    harness,
    owner,
    "audit.read",
    {}
  );
  const accepted = audit.find(
    (event) =>
      event.type === "identity.invocation.accepted" &&
      event.actor.invocationId === request.invocation.claims.invocationId
  );
  const failed = audit.find(
    (event) =>
      event.type === "identity.invocation.execution-failed" &&
      event.actor.invocationId === request.invocation.claims.invocationId
  );
  assert.equal(failed.transactionId, accepted.transactionId);
  assert.equal(failed.payload.errorCode, "NOT_FOUND");
  assert.equal(
    audit.some(
      (event) =>
        event.actor.invocationId ===
          request.invocation.claims.invocationId &&
        event.type.startsWith("task.")
    ),
    false
  );
});

test("unexpected command failure rolls back acceptance and internal effects", async (t) => {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "fdos-fatal-command-")
  );
  const time = controlledClock();
  const authority = LocalInvocationAuthority.create({
    clock: time.clock
  });
  const verifier = new InvocationVerifier({
    trustedKeys: [authority.trustDescriptor()],
    clock: time.clock
  });
  const runtime = await openPilotRuntime({
    directory,
    persistence: "sqlite",
    invocationVerifier: verifier,
    clock: time.clock
  });
  t.after(async () => {
    await runtime.close().catch(() => {});
    await rm(directory, { recursive: true, force: true });
  });
  const command = {
    type: "workflow.start",
    payload: {
      workflowId: "company.software-change-readiness",
      version: "1.0.0-experimental",
      objective: "Prove fatal rollback semantics."
    }
  };
  const invocation = authority.issue({
    principal: owner,
    command
  });
  const executeWorkflow = (failAfterEffects) =>
    runtime.executeAuthenticatedCommand({
      invocation,
      command,
      executor: async (actor) => {
        const started = await runtime.startWorkflow({
          ...command.payload,
          actor
        });
        if (failAfterEffects) {
          throw new Error("Controlled unexpected failure.");
        }
        return started;
      }
    });

  await assert.rejects(
    () => executeWorkflow(true),
    /Controlled unexpected failure/
  );
  assert.equal(runtime.status().acceptedInvocations, 0);
  assert.equal(runtime.status().runs.total, 0);
  assert.equal(runtime.status().audit.eventCount, 0);
  assert.equal(runtime.status().persistence.transactionCount, 0);

  const completed = await executeWorkflow(false);
  assert.equal(completed.run.status, "active");
  assert.equal(runtime.status().acceptedInvocations, 1);
  assert.equal(runtime.status().runs.total, 1);
  assert.equal(runtime.status().persistence.transactionCount, 1);
});

test("authenticated runtime never migrates JSONL and rejects dual non-empty stores", async (t) => {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "fdos-legacy-store-")
  );
  t.after(() => rm(directory, { recursive: true, force: true }));
  const legacy = await EventLog.open({ directory });
  await legacy.append({
    type: "test.legacy",
    actor: { type: "system", id: "legacy-test-system" },
    subject: "subject_000001",
    payload: { format: "jsonl" }
  });
  await legacy.close();

  const authority = LocalInvocationAuthority.create();
  const verifier = new InvocationVerifier({
    trustedKeys: [authority.trustDescriptor()]
  });
  await assert.rejects(
    () =>
      openAuthenticatedPilotRuntime({
        directory,
        invocationVerifier: verifier
      }),
    ConflictError
  );
  await assert.rejects(
    () => lstat(path.join(directory, "events.sqlite")),
    (error) => error.code === "ENOENT"
  );

  await writeFile(
    path.join(directory, "events.sqlite"),
    "independent-non-empty-format",
    { mode: 0o600 }
  );
  await assert.rejects(
    () =>
      openPilotRuntime({
        directory,
        persistence: "auto"
      }),
    ConflictError
  );
});

test("auto persistence reopens an existing SQLite store without format migration", async (t) => {
  const harness = await identityHarness(t);
  await executeAs(
    harness,
    operations,
    "task.list-ready",
    {}
  );
  await harness.gateway.close();

  const reopened = await openPilotRuntime({
    directory: harness.directory,
    persistence: "auto",
    clock: harness.time.clock
  });
  t.after(() => reopened.close().catch(() => {}));
  assert.equal(reopened.status().persistence.kind, "sqlite");
  assert.equal(reopened.status().acceptedInvocations, 1);
  assert.equal(reopened.status().persistence.transactionCount, 1);
  await reopened.close();
});

test("connector identity and caller-supplied role claims are denied", async (t) => {
  const harness = await identityHarness(t);
  const command = { type: "task.list-ready", payload: {} };
  const connectorRequest = signedRequest(
    harness.authority,
    connector,
    command
  );
  await assert.rejects(
    () => harness.gateway.execute(connectorRequest),
    AuthorizationError
  );
  assert.equal(harness.gateway.status().acceptedInvocations, 0);

  assert.throws(
    () =>
      harness.authority.issue({
        principal: {
          ...operations,
          roleId: "chief-of-staff"
        },
        command
      }),
    ValidationError
  );
});

test("gateway rejects command smuggling and unexpected request fields", async (t) => {
  const harness = await identityHarness(t);
  const smuggledCommand = {
    type: "task.list-ready",
    payload: { actor: owner }
  };
  assert.throws(
    () =>
      harness.authority.issue({
        principal: operations,
        command: smuggledCommand
      }),
    ValidationError
  );

  const command = { type: "task.list-ready", payload: {} };
  const request = signedRequest(
    harness.authority,
    operations,
    command
  );
  assert.throws(
    () => harness.gateway.execute({ ...request, extra: true }),
    ValidationError
  );
});

test("verified receipt rejects digest-valid unexpected metadata", () => {
  const time = controlledClock();
  const authority = LocalInvocationAuthority.create({ clock: time.clock });
  const verifier = new InvocationVerifier({
    trustedKeys: [authority.trustDescriptor()],
    clock: time.clock
  });
  const command = { type: "task.list-ready", payload: {} };
  const receipt = verifier.verify(
    authority.issue({ principal: operations, command }),
    { command }
  );
  const expandedUnsigned = {
    ...receipt,
    unexpectedContent: "must not enter durable identity metadata"
  };
  delete expandedUnsigned.receiptDigest;
  const expanded = {
    ...expandedUnsigned,
    receiptDigest: digestObject(expandedUnsigned)
  };
  assert.throws(
    () => verifyInvocationReceipt(expanded),
    IntegrityError
  );
});

test("authenticated lifecycle commands preserve human retry and cancellation control", async (t) => {
  const harness = await identityHarness(t);
  const started = await executeAs(
    harness,
    owner,
    "workflow.start",
    {
      workflowId: "company.software-change-readiness",
      version: "1.0.0-experimental",
      objective: "Exercise authenticated failure controls."
    }
  );
  const intake = started.run.tasks.find(
    (task) => task.stepId === "executive-intake"
  );

  await executeAs(
    harness,
    chief,
    "task.claim",
    { taskId: intake.id }
  );
  const failed = await executeAs(
    harness,
    chief,
    "task.fail",
    {
      taskId: intake.id,
      reason: "Controlled authenticated failure.",
      retryable: true
    }
  );
  assert.equal(failed.status, "failed");

  const retried = await executeAs(
    harness,
    owner,
    "task.retry",
    { taskId: intake.id }
  );
  assert.equal(retried.status, "ready");
  assert.equal(retried.attempt, 2);

  const cancelled = await executeAs(
    harness,
    owner,
    "task.cancel",
    {
      taskId: intake.id,
      reason: "End the bounded lifecycle exercise."
    }
  );
  assert.equal(cancelled.status, "cancelled");

  const readBack = await executeAs(
    harness,
    owner,
    "task.get",
    { taskId: intake.id }
  );
  assert.equal(readBack.status, "cancelled");
});

test("authenticated handoff returns specialist context to the parent", async (t) => {
  const harness = await identityHarness(t);
  const started = await executeAs(
    harness,
    owner,
    "workflow.start",
    {
      workflowId: "company.software-change-readiness",
      version: "1.0.0-experimental",
      objective: "Exercise one authenticated specialist handoff."
    }
  );
  const intake = started.run.tasks.find(
    (task) => task.stepId === "executive-intake"
  );
  await executeAs(
    harness,
    chief,
    "task.claim",
    { taskId: intake.id }
  );
  const child = await executeAs(
    harness,
    chief,
    "task.handoff",
    {
      taskId: intake.id,
      targetRoleId: "operations",
      title: "Validate the authenticated boundary",
      context: "Confirm that no connector execution is authorized.",
      desiredOutcome: "A boolean validation with rationale.",
      requiredOutputFields: ["valid", "rationale"]
    }
  );
  assert.equal(child.parentTaskId, intake.id);

  await executeAs(
    harness,
    operations,
    "task.claim",
    { taskId: child.id }
  );
  await executeAs(
    harness,
    operations,
    "task.complete",
    {
      taskId: child.id,
      result: {
        valid: true,
        rationale: "The pilot has no connector execution path."
      }
    }
  );

  const parent = await executeAs(
    harness,
    chief,
    "task.get",
    { taskId: intake.id }
  );
  assert.equal(parent.status, "ready");
  const context = await executeAs(
    harness,
    chief,
    "task.context",
    { taskId: intake.id }
  );
  assert.equal(context.handoffResults[0].result.valid, true);
});

test("authenticated A2 approval is exact, human-decided and consumed once", async (t) => {
  const harness = await identityHarness(t, {
    runtimeOptions: {
      workflowDefinitions: [A2_WORKFLOW]
    }
  });
  const { writeTask } = await readyAuthenticatedA2(harness);

  const approval = await executeAs(
    harness,
    operations,
    "approval.request",
    {
      taskId: writeTask.id,
      reason: "Authorize exactly one sandbox-only claim."
    }
  );
  await executeAs(
    harness,
    owner,
    "approval.decide",
    {
      approvalId: approval.id,
      decision: "granted"
    }
  );
  await executeAs(
    harness,
    operations,
    "task.claim",
    { taskId: writeTask.id }
  );
  const approvals = await executeAs(
    harness,
    owner,
    "approval.list",
    { taskId: writeTask.id }
  );
  assert.equal(approvals.length, 1);
  assert.equal(approvals[0].status, "consumed");
  assert.equal(approvals[0].taskAttempt, 1);
});

test("expired A2 decision commits expiry and failure in one invocation transaction", async (t) => {
  const harness = await identityHarness(t, {
    runtimeOptions: {
      workflowDefinitions: [A2_WORKFLOW]
    }
  });
  const { writeTask } = await readyAuthenticatedA2(harness);
  const approval = await executeAs(
    harness,
    operations,
    "approval.request",
    {
      taskId: writeTask.id,
      reason: "Authorize one time-limited sandbox claim.",
      ttlMinutes: 1
    }
  );
  harness.time.advance(61_000);
  const decision = signedRequest(
    harness.authority,
    owner,
    {
      type: "approval.decide",
      payload: {
        approvalId: approval.id,
        decision: "granted"
      }
    }
  );
  await assert.rejects(
    () => harness.gateway.execute(decision),
    PolicyError
  );

  const approvals = await executeAs(
    harness,
    owner,
    "approval.list",
    { taskId: writeTask.id }
  );
  assert.equal(approvals[0].status, "expired");

  const audit = await executeAs(
    harness,
    owner,
    "audit.read",
    {}
  );
  const invocationId = decision.invocation.claims.invocationId;
  const accepted = audit.find(
    (event) =>
      event.type === "identity.invocation.accepted" &&
      event.actor.invocationId === invocationId
  );
  const expired = audit.find(
    (event) =>
      event.type === "approval.expired" &&
      event.actor.invocationId === invocationId
  );
  const failed = audit.find(
    (event) =>
      event.type === "identity.invocation.execution-failed" &&
      event.actor.invocationId === invocationId
  );
  assert.ok(accepted);
  assert.ok(expired);
  assert.ok(failed);
  assert.equal(expired.transactionId, accepted.transactionId);
  assert.equal(failed.transactionId, accepted.transactionId);
  assert.equal(failed.payload.errorCode, "POLICY_DENIED");
  assert.equal(
    audit.some(
      (event) =>
        event.type === "approval.granted" &&
        event.actor.invocationId === invocationId
    ),
    false
  );
});

test("authenticated three-role pilot completes with traceable invocations", async (t) => {
  const harness = await identityHarness(t);
  const result = await executeAuthenticatedSoftwareChangeReadinessDemo({
    gateway: harness.gateway,
    authority: harness.authority
  });
  assert.equal(result.run.status, "completed");
  assert.equal(result.run.tasks.length, 4);
  assert.equal(result.status.acceptedInvocations, 14);
  assert.equal(result.status.audit.eventCount, 29);
  assert.equal(result.status.externalActionsEnabled, false);
  assert.deepEqual(result.status.persistence, {
    kind: "sqlite",
    schemaVersion: "1.0",
    transactional: true,
    transactionCount: 14,
    committedTransactionCount: 14,
    transactionActive: false,
    recoveryRequired: false
  });
  assert.ok(
    result.evidence.eventReferences.every(
      (event) => event.transactionId
    )
  );
  const completedTask = result.evidence.eventReferences.find(
    (event) => event.type === "task.completed" &&
      event.subject === result.run.tasks.find(
        (task) => task.stepId === "executive-synthesis"
      ).id
  );
  const completedRun = result.evidence.eventReferences.find(
    (event) => event.type === "workflow.run.completed"
  );
  assert.equal(
    completedTask.transactionId,
    completedRun.transactionId
  );
  assert.ok(
    result.evidence.eventReferences.some(
      (event) =>
        event.type === "task.completed" &&
        event.invocationId &&
        event.correlationId === result.correlationId
    )
  );
  assert.ok(
    result.evidence.eventReferences.some(
      (event) =>
        event.type === "workflow.run.completed" &&
        event.invocationId &&
        event.correlationId === result.correlationId
    )
  );
  assert.doesNotMatch(
    JSON.stringify(result),
    /BEGIN PUBLIC KEY|signature/
  );

  const audit = await executeAs(
    harness,
    owner,
    "audit.read",
    {}
  );
  const acceptedByInvocation = new Map(
    audit
      .filter(
        (event) => event.type === "identity.invocation.accepted"
      )
      .map((event) => [event.actor.invocationId, event])
  );
  for (const event of audit.filter(
    (candidate) =>
      candidate.type !== "identity.invocation.accepted" &&
      candidate.actor.invocationId
  )) {
    const accepted = acceptedByInvocation.get(
      event.actor.invocationId
    );
    assert.ok(
      accepted,
      `${event.type} must reference an accepted invocation`
    );
    assert.ok(event.transactionId);
    assert.equal(event.transactionId, accepted.transactionId);
    assert.equal(
      event.actor.correlationId,
      accepted.actor.correlationId
    );
  }
});
