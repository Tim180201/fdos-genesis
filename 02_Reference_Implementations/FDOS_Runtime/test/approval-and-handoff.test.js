import assert from "node:assert/strict";
import test from "node:test";
import {
  AuthorizationError,
  PolicyError
} from "../src/index.js";
import {
  controlledClock,
  createPilotHarness,
  findStep,
  pilotResults,
  startPilot
} from "../test-support/helpers.js";

const A2_WORKFLOW = Object.freeze({
  id: "company.reversible-write-test",
  version: "1.0.0",
  name: "Reversible Write Test",
  purpose: "Exercise exact A2 approval semantics.",
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
      target: "internal:a2-test",
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
      target: "sandbox:test-record",
      riskClass: "A2",
      output: { requiredFields: ["confirmation"] }
    }
  ]
});

async function readyA2Task(harness) {
  harness.runtime.registerWorkflow(A2_WORKFLOW, harness.owner);
  const started = await harness.runtime.startWorkflow({
    actor: harness.owner,
    workflowId: A2_WORKFLOW.id,
    version: A2_WORKFLOW.version,
    objective: "Test one bounded reversible action."
  });
  const intake = findStep(started.run, "intake");
  await harness.runtime.claimTask(intake.id, harness.chief);
  await harness.runtime.completeTask(intake.id, harness.chief, {
    request: "bounded sandbox write"
  });
  return {
    runId: started.run.id,
    task: findStep(
      harness.runtime.viewRun(started.run.id, harness.owner),
      "reversible-write"
    )
  };
}

test("A2 task requires exact human approval and consumes it once", async (t) => {
  const harness = await createPilotHarness(t);
  const { task } = await readyA2Task(harness);
  await assert.rejects(
    () => harness.runtime.claimTask(task.id, harness.operations),
    PolicyError
  );
  const approval = await harness.runtime.requestApproval({
    taskId: task.id,
    actor: harness.operations,
    reason: "Execute one sandbox-only reversible write."
  });
  await harness.runtime.decideApproval({
    approvalId: approval.id,
    actor: harness.owner,
    decision: "granted"
  });
  await harness.runtime.claimTask(task.id, harness.operations);
  assert.equal(
    harness.runtime.listApprovals(harness.owner, task.id)[0].status,
    "consumed"
  );
});

test("consumed approval cannot authorize a retry", async (t) => {
  const harness = await createPilotHarness(t);
  const { task } = await readyA2Task(harness);
  const approval = await harness.runtime.requestApproval({
    taskId: task.id,
    actor: harness.operations,
    reason: "First attempt."
  });
  await harness.runtime.decideApproval({
    approvalId: approval.id,
    actor: harness.owner,
    decision: "granted"
  });
  await harness.runtime.claimTask(task.id, harness.operations);
  await harness.runtime.failTask(task.id, harness.operations, {
    reason: "Controlled test failure.",
    retryable: true
  });
  await harness.runtime.retryTask(task.id, harness.owner);
  await assert.rejects(
    () => harness.runtime.claimTask(task.id, harness.operations),
    PolicyError
  );
  const newApproval = await harness.runtime.requestApproval({
    taskId: task.id,
    actor: harness.operations,
    reason: "Second attempt requires a new decision."
  });
  assert.notEqual(newApproval.id, approval.id);
  assert.equal(newApproval.taskAttempt, 2);
});

test("expired approval fails closed", async (t) => {
  const time = controlledClock();
  const harness = await createPilotHarness(t, { clock: time.clock });
  const { task } = await readyA2Task(harness);
  const approval = await harness.runtime.requestApproval({
    taskId: task.id,
    actor: harness.operations,
    reason: "Short-lived sandbox authorization.",
    ttlMinutes: 1
  });
  await harness.runtime.decideApproval({
    approvalId: approval.id,
    actor: harness.owner,
    decision: "granted"
  });
  time.advance(61_000);
  await assert.rejects(
    () => harness.runtime.claimTask(task.id, harness.operations),
    PolicyError
  );
});

test("agent instance cannot grant its own approval", async (t) => {
  const harness = await createPilotHarness(t);
  const { task } = await readyA2Task(harness);
  const approval = await harness.runtime.requestApproval({
    taskId: task.id,
    actor: harness.operations,
    reason: "Must be decided by a human."
  });
  await assert.rejects(
    () =>
      harness.runtime.decideApproval({
        approvalId: approval.id,
        actor: harness.operations,
        decision: "granted"
      }),
    AuthorizationError
  );
});

test("approval denial cancels the bounded run", async (t) => {
  const harness = await createPilotHarness(t);
  const { runId, task } = await readyA2Task(harness);
  const approval = await harness.runtime.requestApproval({
    taskId: task.id,
    actor: harness.operations,
    reason: "Request subject to denial."
  });
  await harness.runtime.decideApproval({
    approvalId: approval.id,
    actor: harness.owner,
    decision: "denied",
    reason: "The sandbox action is not required."
  });
  assert.equal(harness.runtime.viewRun(runId, harness.owner).status, "cancelled");
});

test("handoff suspends parent and returns explicit specialist result", async (t) => {
  const harness = await createPilotHarness(t);
  const started = await startPilot(harness.runtime, harness.owner);
  const intake = findStep(started.run, "executive-intake");
  await harness.runtime.claimTask(intake.id, harness.chief);
  const child = await harness.runtime.handoffTask({
    taskId: intake.id,
    actor: harness.chief,
    targetRoleId: "operations",
    title: "Validate one intake constraint",
    context: "Check whether the stated no-external-action boundary is explicit.",
    desiredOutcome: "A boolean validation with rationale.",
    requiredOutputFields: ["valid", "rationale"]
  });
  assert.equal(harness.runtime.getTask(intake.id, harness.chief).status, "waiting_handoff");
  await harness.runtime.claimTask(child.id, harness.operations);
  await harness.runtime.completeTask(child.id, harness.operations, {
    valid: true,
    rationale: "The boundary is explicit."
  });
  const parent = harness.runtime.getTask(intake.id, harness.chief);
  assert.equal(parent.status, "ready");
  const context = harness.runtime.getTaskContext(intake.id, harness.chief);
  assert.equal(context.handoffResults[0].result.valid, true);
  await harness.runtime.claimTask(intake.id, harness.chief);
  await harness.runtime.completeTask(
    intake.id,
    harness.chief,
    pilotResults.intake
  );
});

test("handoff depth is bounded by the workflow definition", async (t) => {
  const harness = await createPilotHarness(t);
  const started = await startPilot(harness.runtime, harness.owner);
  const intake = findStep(started.run, "executive-intake");
  await harness.runtime.claimTask(intake.id, harness.chief);
  const first = await harness.runtime.handoffTask({
    taskId: intake.id,
    actor: harness.chief,
    targetRoleId: "operations",
    title: "First handoff",
    context: "Depth one.",
    desiredOutcome: "Analysis."
  });
  await harness.runtime.claimTask(first.id, harness.operations);
  const second = await harness.runtime.handoffTask({
    taskId: first.id,
    actor: harness.operations,
    targetRoleId: "marketing",
    title: "Second handoff",
    context: "Depth two.",
    desiredOutcome: "Analysis."
  });
  await harness.runtime.claimTask(second.id, harness.marketing);
  await assert.rejects(
    () =>
      harness.runtime.handoffTask({
        taskId: second.id,
        actor: harness.marketing,
        targetRoleId: "operations",
        title: "Third handoff",
        context: "Depth three must fail.",
        desiredOutcome: "Denied."
      }),
    PolicyError
  );
});
