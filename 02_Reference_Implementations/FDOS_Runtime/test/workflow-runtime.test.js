import assert from "node:assert/strict";
import test from "node:test";
import {
  AuthorizationError,
  ConflictError,
  openPilotRuntime,
  ValidationError,
  verifyEvidenceBundle
} from "../src/index.js";
import {
  completePilot,
  createPilotHarness,
  findStep,
  pilotResults,
  startPilot
} from "../test-support/helpers.js";

test("pilot releases tasks only when declared dependencies complete", async (t) => {
  const harness = await createPilotHarness(t);
  const { runtime, owner, chief, operations, marketing } = harness;
  const started = await startPilot(runtime, owner);
  let run = started.run;
  assert.equal(findStep(run, "executive-intake").status, "ready");
  assert.equal(findStep(run, "operations-readiness").status, "blocked");
  assert.equal(findStep(run, "marketing-draft").status, "blocked");
  assert.equal(findStep(run, "executive-synthesis").status, "blocked");

  const intake = findStep(run, "executive-intake");
  await runtime.claimTask(intake.id, chief);
  await runtime.completeTask(intake.id, chief, pilotResults.intake);
  run = runtime.viewRun(run.id, owner);
  assert.equal(findStep(run, "operations-readiness").status, "ready");
  assert.equal(findStep(run, "marketing-draft").status, "ready");
  assert.equal(findStep(run, "executive-synthesis").status, "blocked");

  const operationsTask = findStep(run, "operations-readiness");
  await runtime.claimTask(operationsTask.id, operations);
  await runtime.completeTask(
    operationsTask.id,
    operations,
    pilotResults.operations
  );
  run = runtime.viewRun(run.id, owner);
  assert.equal(findStep(run, "executive-synthesis").status, "blocked");

  const marketingTask = findStep(run, "marketing-draft");
  await runtime.claimTask(marketingTask.id, marketing);
  await runtime.completeTask(
    marketingTask.id,
    marketing,
    pilotResults.marketing
  );
  run = runtime.viewRun(run.id, owner);
  assert.equal(findStep(run, "executive-synthesis").status, "ready");
});

test("pilot completes with a verifiable content-minimized evidence bundle", async (t) => {
  const harness = await createPilotHarness(t);
  const started = await startPilot(harness.runtime, harness.owner);
  const completed = await completePilot(
    harness.runtime,
    harness,
    started.run.id
  );
  assert.equal(completed.status, "completed");
  assert.ok(completed.evidenceDigest.startsWith("sha256:"));
  const evidence = harness.runtime.exportEvidenceBundle(
    completed.id,
    harness.owner
  );
  assert.equal(verifyEvidenceBundle(evidence), true);
  assert.equal(evidence.tasks.length, 4);
  assert.equal(evidence.audit.verified, true);
  assert.equal(JSON.stringify(evidence).includes("Internal draft only."), false);
});

test("task output contract rejects incomplete results", async (t) => {
  const { runtime, owner, chief } = await createPilotHarness(t);
  const started = await startPilot(runtime, owner);
  const intake = findStep(started.run, "executive-intake");
  await runtime.claimTask(intake.id, chief);
  await assert.rejects(
    () => runtime.completeTask(intake.id, chief, { scope: [] }),
    ValidationError
  );
  assert.equal(runtime.getTask(intake.id, chief).status, "in_progress");
});

test("workflow start is idempotent only for the same request", async (t) => {
  const { runtime, owner } = await createPilotHarness(t);
  const first = await startPilot(runtime, owner, {
    idempotencyKey: "same-request"
  });
  const second = await startPilot(runtime, owner, {
    idempotencyKey: "same-request"
  });
  assert.equal(first.created, true);
  assert.equal(second.created, false);
  assert.equal(second.run.id, first.run.id);
  await assert.rejects(
    () =>
      startPilot(runtime, owner, {
        idempotencyKey: "same-request",
        objective: "A different objective."
      }),
    ConflictError
  );
});

test("concurrent claims serialize so exactly one succeeds", async (t) => {
  const { runtime, owner, chief } = await createPilotHarness(t);
  const started = await startPilot(runtime, owner);
  const intake = findStep(started.run, "executive-intake");
  const results = await Promise.allSettled([
    runtime.claimTask(intake.id, chief),
    runtime.claimTask(intake.id, chief)
  ]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(results.filter((result) => result.status === "rejected").length, 1);
});

test("an agent cannot claim a task owned by another role", async (t) => {
  const { runtime, owner, marketing } = await createPilotHarness(t);
  const started = await startPilot(runtime, owner);
  const intake = findStep(started.run, "executive-intake");
  await assert.rejects(
    () => runtime.claimTask(intake.id, marketing),
    AuthorizationError
  );
  assert.equal(runtime.getTask(intake.id, owner).status, "ready");
});

test("failed run blocks unrelated ready work until Human Governance acts", async (t) => {
  const { runtime, owner, chief, operations, marketing } =
    await createPilotHarness(t);
  const started = await startPilot(runtime, owner);
  const intake = findStep(started.run, "executive-intake");
  await runtime.claimTask(intake.id, chief);
  await runtime.completeTask(intake.id, chief, pilotResults.intake);
  let run = runtime.viewRun(started.run.id, owner);
  const operationsTask = findStep(run, "operations-readiness");
  const marketingTask = findStep(run, "marketing-draft");
  await runtime.claimTask(operationsTask.id, operations);
  await runtime.failTask(operationsTask.id, operations, {
    reason: "Operational evidence is incomplete."
  });
  await assert.rejects(
    () => runtime.claimTask(marketingTask.id, marketing),
    ConflictError
  );
  run = runtime.viewRun(started.run.id, owner);
  assert.equal(run.status, "failed");
});

test("only Human Governance may register a runtime workflow", async (t) => {
  const { runtime, marketing } = await createPilotHarness(t);
  assert.throws(
    () =>
      runtime.registerWorkflow(
        {
          id: "company.unauthorized-registration",
          version: "1.0.0",
          name: "Unauthorized Registration",
          purpose: "This configuration change must be denied.",
          ownerRoleId: "chief-of-staff",
          steps: []
        },
        marketing
      ),
    AuthorizationError
  );
});

test("failed task requires human retry and respects retry budget", async (t) => {
  const { runtime, owner, chief } = await createPilotHarness(t);
  const started = await startPilot(runtime, owner);
  const intake = findStep(started.run, "executive-intake");
  await runtime.claimTask(intake.id, chief);
  await runtime.failTask(intake.id, chief, {
    reason: "Test failure.",
    retryable: true
  });
  assert.equal(runtime.viewRun(started.run.id, owner).status, "failed");
  const retried = await runtime.retryTask(intake.id, owner);
  assert.equal(retried.status, "ready");
  assert.equal(retried.attempt, 2);
  await runtime.claimTask(intake.id, chief);
  await runtime.failTask(intake.id, chief, {
    reason: "Second test failure.",
    retryable: true
  });
  await assert.rejects(() => runtime.retryTask(intake.id, owner));
});

test("runtime rehydrates completed state from verified events", async (t) => {
  const harness = await createPilotHarness(t);
  const started = await startPilot(harness.runtime, harness.owner);
  await completePilot(harness.runtime, harness, started.run.id);
  const headHash = harness.runtime.verifyIntegrity().headHash;
  await harness.runtime.close();
  const reopened = await openPilotRuntime({ directory: harness.directory });
  const run = reopened.viewRun(started.run.id, harness.owner);
  assert.equal(run.status, "completed");
  assert.equal(run.tasks.every((task) => task.status === "completed"), true);
  assert.equal(reopened.verifyIntegrity().headHash, headHash);
  await reopened.close();
});
