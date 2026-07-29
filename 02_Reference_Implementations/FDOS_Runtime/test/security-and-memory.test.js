import assert from "node:assert/strict";
import test from "node:test";
import {
  AuthorizationError,
  IntegrityError,
  PolicyError,
  verifyEvidenceBundle
} from "../src/index.js";
import {
  completePilot,
  createPilotHarness,
  findStep,
  startPilot
} from "../test-support/helpers.js";

test("department role cannot read another department task", async (t) => {
  const { runtime, owner, marketing } = await createPilotHarness(t);
  const started = await startPilot(runtime, owner);
  const operationsTask = findStep(started.run, "operations-readiness");
  assert.throws(
    () => runtime.getTask(operationsTask.id, marketing),
    AuthorizationError
  );
  const marketingView = runtime.viewRun(started.run.id, marketing);
  const redacted = findStep(marketingView, "operations-readiness");
  assert.equal(Object.hasOwn(redacted, "instructions"), false);
  assert.equal(marketingView.inputRedacted, true);
});

test("workflow dependencies explicitly expose upstream result to downstream owner", async (t) => {
  const { runtime, owner, chief } = await createPilotHarness(t);
  const started = await startPilot(runtime, owner);
  const intake = findStep(started.run, "executive-intake");
  await runtime.claimTask(intake.id, chief);
  await runtime.completeTask(intake.id, chief, {
    scope: ["bounded"],
    successCriteria: ["traceable"],
    constraints: ["internal only"]
  });
  const operationsTask = findStep(
    runtime.viewRun(started.run.id, owner),
    "operations-readiness"
  );
  const context = runtime.getTaskContext(operationsTask.id, {
    type: "agent",
    id: "agent:operations:primary"
  });
  assert.equal(context.dependencyResults.length, 1);
  assert.deepEqual(context.dependencyResults[0].result.scope, ["bounded"]);
});

test("memory remains invisible until human review", async (t) => {
  const { runtime, owner, operations } = await createPilotHarness(t);
  const candidate = await runtime.proposeMemory({
    actor: operations,
    scope: "department:operations",
    title: "Candidate",
    content: "A candidate is not organizational truth.",
    sourceReferences: ["test:evidence"]
  });
  assert.equal(
    runtime.readMemory({
      actor: operations,
      scope: "department:operations"
    }).length,
    0
  );
  await runtime.reviewMemory({
    candidateId: candidate.id,
    actor: owner,
    decision: "accepted",
    reason: "Accepted inside the bounded test context."
  });
  assert.equal(
    runtime.readMemory({
      actor: operations,
      scope: "department:operations"
    }).length,
    1
  );
});

test("department memory is isolated and restricted data is rejected", async (t) => {
  const { runtime, operations, marketing } = await createPilotHarness(t);
  await assert.rejects(
    () =>
      runtime.proposeMemory({
        actor: marketing,
        scope: "department:operations",
        title: "Cross-scope",
        content: "Should not be accepted."
      }),
    AuthorizationError
  );
  await assert.rejects(
    () =>
      runtime.proposeMemory({
        actor: operations,
        scope: "department:operations",
        title: "Restricted",
        content: "Restricted test content.",
        sensitivity: "restricted"
      }),
    PolicyError
  );
});

test("confidential memory cannot be promoted into company-wide scope", async (t) => {
  const { runtime, chief } = await createPilotHarness(t);
  await assert.rejects(
    () =>
      runtime.proposeMemory({
        actor: chief,
        scope: "company",
        title: "Confidential company item",
        content: "Must use a department scope.",
        sensitivity: "confidential"
      }),
    PolicyError
  );
});

test("rejected memory never becomes readable long-term memory", async (t) => {
  const { runtime, owner, operations } = await createPilotHarness(t);
  const candidate = await runtime.proposeMemory({
    actor: operations,
    scope: "department:operations",
    title: "Rejected candidate",
    content: "This should not enter accepted memory."
  });
  await runtime.reviewMemory({
    candidateId: candidate.id,
    actor: owner,
    decision: "rejected",
    reason: "Insufficient evidence."
  });
  assert.deepEqual(
    runtime.readMemory({
      actor: operations,
      scope: "department:operations"
    }),
    []
  );
});

test("only Human Governance may review memory candidates", async (t) => {
  const { runtime, operations } = await createPilotHarness(t);
  const candidate = await runtime.proposeMemory({
    actor: operations,
    scope: "department:operations",
    title: "Candidate",
    content: "Needs human review."
  });
  await assert.rejects(
    () =>
      runtime.reviewMemory({
        candidateId: candidate.id,
        actor: operations,
        decision: "accepted",
        reason: "Self approval."
      }),
    AuthorizationError
  );
});

test("non-audit roles cannot read raw audit events", async (t) => {
  const { runtime, owner, marketing } = await createPilotHarness(t);
  await startPilot(runtime, owner);
  assert.throws(() => runtime.auditTrail(marketing), AuthorizationError);
});

test("evidence bundle detects post-export mutation", async (t) => {
  const harness = await createPilotHarness(t);
  const started = await startPilot(harness.runtime, harness.owner);
  await completePilot(harness.runtime, harness, started.run.id);
  const evidence = harness.runtime.exportEvidenceBundle(
    started.run.id,
    harness.owner
  );
  const tampered = JSON.parse(JSON.stringify(evidence));
  tampered.run.status = "failed";
  assert.throws(() => verifyEvidenceBundle(tampered), IntegrityError);
});

test("workflow containing A3 publication is blocked before execution", async (t) => {
  const { runtime, owner } = await createPilotHarness(t);
  runtime.registerWorkflow({
    id: "company.blocked-publication",
    version: "1.0.0",
    name: "Blocked Publication",
    purpose: "Prove that material external actions cannot start.",
    ownerRoleId: "chief-of-staff",
    steps: [
      {
        id: "prepare",
        title: "Prepare",
        roleId: "chief-of-staff",
        instructions: "Prepare internal context.",
        desiredOutcome: "Internal context.",
        dependencies: [],
        actionType: "work.intake.analyze",
        target: "internal:context",
        output: { requiredFields: ["context"] }
      },
      {
        id: "publish",
        title: "Publish",
        roleId: "marketing",
        instructions: "Attempt publication.",
        desiredOutcome: "External publication.",
        dependencies: ["prepare"],
        actionType: "content.publish",
        target: "external:website",
        output: { requiredFields: ["publication"] }
      }
    ]
  }, owner);
  await assert.rejects(
    () =>
      runtime.startWorkflow({
        actor: owner,
        workflowId: "company.blocked-publication",
        version: "1.0.0",
        objective: "This must remain blocked."
      }),
    PolicyError
  );
});
