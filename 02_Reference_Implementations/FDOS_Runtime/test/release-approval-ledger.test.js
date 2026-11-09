import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  AuthorizationError,
  ConflictError,
  createReleaseApproval,
  createReleaseAuthorization,
  createReleaseBaseline,
  createReleaseCandidate,
  createReleaseDomainEvent,
  createReleaseStatus,
  createWorkOrder,
  createWorkOrderApproval,
  deterministicIdFactory,
  digestObject,
  evaluateReleaseEligibility,
  IntegrityError,
  PolicyError,
  ReleaseEvidenceCoordinator,
  SqliteEventStore,
  transitionReleaseStatus,
  verifyReleaseApproval,
  verifyReleaseAuthorization,
  verifyReleaseAuthorizationBinding,
  verifyWorkOrderApproval
} from "../src/index.js";
import {
  buildReleaseEvidenceFixture,
  releaseCandidateInput,
  releaseTestActors,
  releaseTestTimes
} from "../test-support/release-evidence-fixtures.js";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function workOrderInput(workOrder, overrides = {}) {
  return {
    workspaceId: workOrder.workspaceId,
    workOrderId: workOrder.workOrderId,
    changeRevisionDigest: workOrder.changeRevisionDigest,
    decisionRevisionDigests: workOrder.decisionRevisionDigests,
    assignedRoleId: workOrder.assignedRoleId,
    implementationScope: workOrder.implementationScope,
    nonGoals: workOrder.nonGoals,
    allowedRepositories: workOrder.allowedRepositories,
    allowedPathPrefixes: workOrder.allowedPathPrefixes,
    allowedTools: workOrder.allowedTools,
    expectedOutputs: workOrder.expectedOutputs,
    acceptanceCriterionIds: workOrder.acceptanceCriterionIds,
    testPlan: workOrder.testPlan,
    dependencyWorkOrderDigests: workOrder.dependencyWorkOrderDigests,
    contextProjectionDigest: workOrder.contextProjectionDigest,
    budget: workOrder.budget,
    proposedAt: workOrder.proposedAt,
    proposedBy: workOrder.proposedBy,
    ...overrides
  };
}

function eligibleEvaluation(fixture) {
  return evaluateReleaseEligibility({
    candidate: fixture.candidate,
    changeRevision: fixture.change,
    decisionRevisions: [fixture.decision],
    workOrder: fixture.workOrder,
    policy: fixture.policy,
    evidence: [fixture.evidence],
    evaluatedAt: releaseTestTimes.evaluation
  });
}

function readyStatus(candidateDigest) {
  const statuses = [
    createReleaseStatus({
      candidateDigest,
      transitionedAt: releaseTestTimes.candidate,
      transitionedBy: releaseTestActors.system
    })
  ];
  const transitions = [
    ["evidence", "observed"],
    ["evidence", "verified"],
    ["implementation", "active"],
    ["implementation", "completed"],
    ["review", "pending"],
    ["review", "accepted"],
    ["approval", "pending"],
    ["approval", "valid"],
    ["release", "eligible"]
  ];
  for (const [index, [axis, to]] of transitions.entries()) {
    const timestamp = new Date(
      Date.parse(releaseTestTimes.evaluation) + index + 1
    ).toISOString();
    statuses.push(
      transitionReleaseStatus(statuses.at(-1), {
        axis,
        to,
        transitionedAt: timestamp,
        transitionedBy: releaseTestActors.system
      })
    );
  }
  return statuses;
}

function releaseApproval(fixture, evaluation, overrides = {}) {
  return createReleaseApproval({
    approvalId: "approval:release-alpha",
    baseline: evaluation.baseline,
    policy: fixture.policy,
    approvedBy: releaseTestActors.owner,
    issuedAt: "2026-11-09T10:00:00.100Z",
    expiresAt: releaseTestTimes.expiry,
    ...overrides
  });
}

function authorizationInput(
  fixture,
  evaluation,
  approval,
  previousStatus,
  overrides = {}
) {
  return {
    authorizationId: "authorization:release-alpha",
    consumptionId: "consumption:release-alpha",
    evaluation,
    candidate: fixture.candidate,
    changeRevision: fixture.change,
    decisionRevisions: [fixture.decision],
    workOrder: fixture.workOrder,
    evidence: [fixture.evidence],
    policy: fixture.policy,
    approval,
    previousStatus,
    authorizedBy: releaseTestActors.system,
    authorizedAt: "2026-11-09T10:01:00.000Z",
    ...overrides
  };
}

test("work-order approval rejects every changed authority-bearing field", () => {
  const fixture = buildReleaseEvidenceFixture();
  const approval = createWorkOrderApproval({
    approvalId: "approval:work-order-alpha",
    workOrder: fixture.workOrder,
    policy: fixture.policy,
    approvedBy: releaseTestActors.owner,
    issuedAt: releaseTestTimes.evaluation,
    expiresAt: releaseTestTimes.expiry
  });
  assert.equal(
    verifyWorkOrderApproval({
      approval,
      workOrder: fixture.workOrder,
      policy: fixture.policy,
      at: "2026-11-09T10:30:00.000Z"
    }),
    true
  );

  const mutations = [
    ["scope", { implementationScope: ["Widened implementation scope."] }],
    ["role", { assignedRoleId: "reviewer" }],
    ["context", { contextProjectionDigest: digestObject({ context: 2 }) }],
    ["tools", { allowedTools: ["tool:unadmitted"] }],
    [
      "budget",
      {
        budget: {
          ...fixture.workOrder.budget,
          maxCostMinorUnits:
            fixture.workOrder.budget.maxCostMinorUnits + 1
        }
      }
    ],
    ["paths", { allowedPathPrefixes: ["03_Projects"] }],
    ["outputs", { expectedOutputs: ["Different output"] }]
  ];
  for (const [label, mutation] of mutations) {
    const changed = createWorkOrder(
      workOrderInput(fixture.workOrder, mutation)
    );
    assert.throws(
      () =>
        verifyWorkOrderApproval({
          approval,
          workOrder: changed,
          policy: fixture.policy,
          at: "2026-11-09T10:30:00.000Z"
        }),
      PolicyError,
      label
    );
  }
  const tamperedPolicy = clone(fixture.policy);
  tamperedPolicy.description = "Tampered authority policy";
  assert.throws(
    () =>
      verifyWorkOrderApproval({
        approval,
        workOrder: fixture.workOrder,
        policy: tamperedPolicy,
        at: "2026-11-09T10:30:00.000Z"
      }),
    IntegrityError
  );
  assert.throws(
    () =>
      createWorkOrderApproval({
        approvalId: "approval:work-order-unknown-authority",
        workOrder: fixture.workOrder,
        policy: fixture.policy,
        approvedBy: {
          type: "human",
          id: "human:unknown-authority"
        },
        issuedAt: releaseTestTimes.evaluation,
        expiresAt: releaseTestTimes.expiry
      }),
    AuthorizationError
  );
});

test("release approval binds baseline, action, policy, findings and expiry", () => {
  const fixture = buildReleaseEvidenceFixture();
  const evaluation = eligibleEvaluation(fixture);
  const approval = releaseApproval(fixture, evaluation);
  assert.equal(
    verifyReleaseApproval({
      approval,
      baseline: evaluation.baseline,
      policy: fixture.policy,
      at: "2026-11-09T10:30:00.000Z"
    }),
    true
  );

  const findingsBaseline = createReleaseBaseline({
    candidate: fixture.candidate,
    unresolvedFindingDigests: [digestObject({ finding: "open" })]
  });
  assert.throws(
    () =>
      verifyReleaseApproval({
        approval,
        baseline: findingsBaseline,
        policy: fixture.policy,
        at: "2026-11-09T10:30:00.000Z"
      }),
    PolicyError
  );

  const changedPolicyCandidate = createReleaseCandidate(
    releaseCandidateInput(fixture, {
      policy: {
        ...fixture.candidate.policy,
        digest: digestObject({ policy: "changed" })
      }
    })
  );
  const changedPolicyBaseline = createReleaseBaseline({
    candidate: changedPolicyCandidate
  });
  assert.throws(
    () =>
      verifyReleaseApproval({
        approval,
        baseline: changedPolicyBaseline,
        policy: fixture.policy,
        at: "2026-11-09T10:30:00.000Z"
      }),
    PolicyError
  );

  const tamperedAction = clone(approval);
  tamperedAction.action = "authorize-implementation";
  assert.throws(
    () =>
      verifyReleaseApproval({
        approval: tamperedAction,
        baseline: evaluation.baseline,
        policy: fixture.policy,
        at: "2026-11-09T10:30:00.000Z"
      }),
    IntegrityError
  );
  assert.throws(
    () =>
      verifyReleaseApproval({
        approval,
        baseline: evaluation.baseline,
        policy: fixture.policy,
        at: "2026-11-09T11:00:00.001Z"
      }),
    AuthorizationError
  );
});

test("authorization requires admitted human authority and exact evidence", () => {
  const fixture = buildReleaseEvidenceFixture();
  const evaluation = eligibleEvaluation(fixture);
  const statuses = readyStatus(fixture.candidate.digest);
  const approval = releaseApproval(fixture, evaluation);
  const input = authorizationInput(
    fixture,
    evaluation,
    approval,
    statuses.at(-1)
  );
  const authorization = createReleaseAuthorization(input);
  assert.equal(verifyReleaseAuthorization(authorization), true);
  assert.equal(
    verifyReleaseAuthorizationBinding({
      authorization,
      ...input
    }),
    true
  );
  assert.equal(authorization.approvalStatus.axes.approval, "consumed");
  assert.equal(authorization.releaseStatus.axes.release, "authorized");
  assert.throws(
    () =>
      createReleaseDomainEvent({
        currentEvents: [],
        eventId: "event:authorization-object-bypass",
        eventType: "object.recorded",
        actor: releaseTestActors.system,
        occurredAt: authorization.authorizedAt,
        payload: { object: authorization }
      }),
    /require atomic events/
  );

  assert.throws(
    () =>
      releaseApproval(fixture, evaluation, {
        approvalId: "approval:unknown-authority",
        approvedBy: {
          type: "human",
          id: "human:unknown-authority"
        }
      }),
    AuthorizationError
  );

  const missing = evaluateReleaseEligibility({
    candidate: fixture.candidate,
    changeRevision: fixture.change,
    decisionRevisions: [fixture.decision],
    workOrder: fixture.workOrder,
    policy: fixture.policy,
    evidence: [],
    evaluatedAt: releaseTestTimes.evaluation
  });
  const missingApproval = releaseApproval(fixture, missing, {
    approvalId: "approval:missing-evidence"
  });
  assert.throws(
    () =>
      createReleaseAuthorization(
        authorizationInput(
          fixture,
          missing,
          missingApproval,
          statuses.at(-1),
          {
            authorizationId: "authorization:missing-evidence",
            consumptionId: "consumption:missing-evidence",
            evidence: []
          }
        )
      ),
    PolicyError
  );
});

async function temporaryStore(testContext) {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "fdos-release-evidence-")
  );
  testContext.after(async () => {
    await rm(directory, { recursive: true, force: true });
  });
  const idFactory = deterministicIdFactory("release");
  const open = () =>
    SqliteEventStore.open({
      directory,
      clock: () => new Date("2026-11-09T10:01:00.000Z"),
      idFactory
    });
  return { directory, open };
}

async function recordAuthorizationPrerequisites({
  coordinator,
  fixture,
  evaluation,
  approval,
  statuses
}) {
  let sequence = 0;
  const record = (eventType, payload) => {
    sequence += 1;
    return coordinator.recordDomainEvent({
      eventId: `event:release-${String(sequence).padStart(3, "0")}`,
      eventType,
      actor: releaseTestActors.system,
      occurredAt: new Date(
        Date.parse(releaseTestTimes.evaluation) + sequence
      ).toISOString(),
      payload
    });
  };
  for (const object of [
    fixture.policy,
    fixture.decision,
    fixture.change,
    fixture.workOrder,
    fixture.candidate,
    fixture.evidence,
    evaluation.baseline,
    evaluation,
    approval
  ]) {
    await record("object.recorded", { object });
  }
  for (const status of statuses) {
    await record("status.recorded", { status });
  }
  return sequence;
}

test(
  "approval consumption and authorization commit atomically and survive restart",
  async (t) => {
  const harness = await temporaryStore(t);
  const fixture = buildReleaseEvidenceFixture();
  const evaluation = eligibleEvaluation(fixture);
  const approval = releaseApproval(fixture, evaluation);
  const statuses = readyStatus(fixture.candidate.digest);
  let store = await harness.open();
  let coordinator = new ReleaseEvidenceCoordinator({ eventStore: store });
  const recordedCount = await recordAuthorizationPrerequisites({
    coordinator,
    fixture,
    evaluation,
    approval,
    statuses
  });
  const auditCountBefore = store.all().length;

  const originalAppend = store.append.bind(store);
  store.append = async () => {
    throw new Error("injected durable append failure");
  };
  await assert.rejects(
    () =>
      coordinator.authorizeRelease({
        eventId: "event:release-authorization-failed",
        ...authorizationInput(
          fixture,
          evaluation,
          approval,
          statuses.at(-1)
        )
      }),
    /injected durable append failure/
  );
  store.append = originalAppend;
  assert.equal(store.all().length, auditCountBefore);
  assert.equal(coordinator.state().approvalConsumptions.length, 0);
  assert.equal(
    coordinator.state().latestStatuses[0].axes.release,
    "eligible"
  );

  await store.close();
  store = await harness.open();
  coordinator = new ReleaseEvidenceCoordinator({ eventStore: store });
  assert.equal(coordinator.state().eventCount, recordedCount);
  assert.equal(coordinator.state().approvalConsumptions.length, 0);

  const result = await coordinator.authorizeRelease({
    eventId: "event:release-authorization-committed",
    ...authorizationInput(
      fixture,
      evaluation,
      approval,
      statuses.at(-1)
    )
  });
  assert.equal(result.state.approvalConsumptions.length, 1);
  assert.equal(result.state.latestStatuses[0].axes.approval, "consumed");
  assert.equal(result.state.latestStatuses[0].axes.release, "authorized");
  assert.equal(store.status().transactionActive, false);
  await store.close();

  store = await harness.open();
  coordinator = new ReleaseEvidenceCoordinator({ eventStore: store });
  const restarted = coordinator.state();
  assert.equal(restarted.approvalConsumptions.length, 1);
  assert.equal(restarted.latestStatuses[0].axes.release, "authorized");
  const countBeforeReplay = store.all().length;
  await assert.rejects(
    () =>
      coordinator.authorizeRelease({
        eventId: "event:release-authorization-replay",
        ...authorizationInput(
          fixture,
          evaluation,
          approval,
          statuses.at(-1),
          {
            authorizationId: "authorization:release-replay",
            consumptionId: "consumption:release-replay"
          }
        )
      }),
    ConflictError
  );
  assert.equal(store.all().length, countBeforeReplay);
  await store.close();
  }
);
