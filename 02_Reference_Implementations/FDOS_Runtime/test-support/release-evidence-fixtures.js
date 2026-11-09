import {
  createChangeRevision,
  createDecisionRevision,
  createEvidenceRecord,
  createReleaseCandidate,
  createReleaseEvidencePolicy,
  createWorkOrder,
  digestObject,
  RELEASE_EVIDENCE_VERIFIER,
  releaseEvidencePolicyBinding
} from "../src/index.js";

export const releaseTestActors = Object.freeze({
  owner: Object.freeze({
    type: "human",
    id: "human:release-owner"
  }),
  lead: Object.freeze({
    type: "agent",
    id: "agent:technical-lead"
  }),
  system: Object.freeze({
    type: "system",
    id: "system:release-evidence"
  })
});

export const releaseTestTimes = Object.freeze({
  decision: "2026-11-09T07:00:00.000Z",
  change: "2026-11-09T08:00:00.000Z",
  workOrder: "2026-11-09T08:30:00.000Z",
  candidate: "2026-11-09T09:00:00.000Z",
  evidence: "2026-11-09T09:30:00.000Z",
  evaluation: "2026-11-09T10:00:00.000Z",
  expiry: "2026-11-09T11:00:00.000Z"
});

export const releaseTestDigests = Object.freeze({
  artifact: digestObject({ fixture: "artifact", version: 1 }),
  context: digestObject({ fixture: "context", version: 1 }),
  observation: digestObject({ fixture: "observation", version: 1 }),
  producer: digestObject({
    fixture: "producer-identity",
    id: "service:ci-primary",
    version: "1.0.0"
  })
});

export function releaseCandidateInput(fixture, overrides = {}) {
  return {
    workspaceId: fixture.workspaceId,
    candidateId: "candidate:alpha",
    repositoryId: "repository:fdos-genesis",
    changeRevisionDigest: fixture.change.digest,
    decisionRevisionDigests: [fixture.decision.digest],
    workOrderDigest: fixture.workOrder.digest,
    sourceRevision: {
      objectFormat: "sha1",
      commit: "1".repeat(40),
      tree: "2".repeat(40)
    },
    artifactDigest: releaseTestDigests.artifact,
    policy: releaseEvidencePolicyBinding(fixture.policy),
    verifier: RELEASE_EVIDENCE_VERIFIER,
    createdAt: releaseTestTimes.candidate,
    ...overrides
  };
}

export function releaseEvidenceInput(fixture, overrides = {}) {
  return {
    workspaceId: fixture.workspaceId,
    evidenceId: "evidence:ci-tests",
    evidenceType: "ci.tests",
    subject: {
      kind: "release-candidate",
      id: fixture.candidate.candidateId,
      digest: fixture.candidate.digest
    },
    producer: {
      type: "service",
      id: "service:ci-primary",
      version: "1.0.0",
      identityDigest: releaseTestDigests.producer
    },
    provenance: {
      sourceSystem: "github.actions",
      sourceId: "run-1001",
      sourceRevision: fixture.candidate.sourceRevision.commit,
      collector: releaseTestActors.system,
      collectedAt: releaseTestTimes.evidence
    },
    integrity: {
      state: "verified",
      algorithm: "sha256",
      digest: releaseTestDigests.observation
    },
    freshness: {
      state: "fresh",
      observedAt: releaseTestTimes.evidence,
      validUntil: releaseTestTimes.expiry
    },
    observationDigest: releaseTestDigests.observation,
    classification: "internal",
    owningScope: "department:engineering",
    evaluatedAt: releaseTestTimes.evaluation,
    ...overrides
  };
}

export function buildReleaseEvidenceFixture() {
  const workspaceId = "workspace:fdos-alpha";
  const policy = createReleaseEvidencePolicy({
    workspaceId,
    policyId: "policy:fdos-alpha",
    version: "1.0.0",
    description: "Require trusted CI evidence for the exact candidate.",
    authority: {
      decisionAuthorityIds: [releaseTestActors.owner.id],
      workOrderApprovalAuthorityIds: [releaseTestActors.owner.id],
      releaseApprovalAuthorityIds: [releaseTestActors.owner.id]
    },
    requirements: [
      {
        id: "ci.tests.required",
        evidenceType: "ci.tests",
        subjectKind: "release-candidate",
        minimumCount: 1,
        producerIdentityDigests: [releaseTestDigests.producer]
      }
    ]
  });
  const decision = createDecisionRevision({
    workspaceId,
    decisionId: "decision:alpha-scope",
    title: "Authorize the bounded alpha scope",
    statement: "The alpha may change only its admitted runtime paths.",
    outcome: "constrained",
    constraints: ["No external action or deployment."],
    appliesToChangeIds: ["change:alpha"],
    authority: releaseTestActors.owner,
    effectiveAt: releaseTestTimes.decision,
    expiresAt: null,
    createdAt: releaseTestTimes.decision
  });
  const change = createChangeRevision({
    workspaceId,
    changeId: "change:alpha",
    title: "Implement deterministic release evidence",
    problemStatement: "Release decisions need exact, replayable evidence.",
    acceptanceCriteria: [
      {
        id: "AC-01",
        statement: "Trusted CI evidence binds the exact candidate."
      }
    ],
    decisionRevisionDigests: [decision.digest],
    requiredEvidenceTypes: ["ci.tests"],
    repositoryConstraints: [
      {
        repositoryId: "repository:fdos-genesis",
        baseBranch: "main",
        allowedPathPrefixes: [
          "02_Reference_Implementations/FDOS_Runtime"
        ]
      }
    ],
    policy: releaseEvidencePolicyBinding(policy),
    classification: "internal",
    owningScope: "department:engineering",
    createdAt: releaseTestTimes.change,
    createdBy: releaseTestActors.owner
  });
  const workOrder = createWorkOrder({
    workspaceId,
    workOrderId: "work-order:alpha",
    changeRevisionDigest: change.digest,
    decisionRevisionDigests: [decision.digest],
    assignedRoleId: "programmer",
    implementationScope: ["Implement the admitted domain contracts."],
    nonGoals: ["Do not deploy or connect an external repository."],
    allowedRepositories: ["repository:fdos-genesis"],
    allowedPathPrefixes: [
      "02_Reference_Implementations/FDOS_Runtime"
    ],
    allowedTools: ["tool:apply-patch", "tool:test-runner"],
    expectedOutputs: ["Domain source", "Adversarial tests"],
    acceptanceCriterionIds: ["AC-01"],
    testPlan: ["Run deterministic domain and replay tests."],
    dependencyWorkOrderDigests: [],
    contextProjectionDigest: releaseTestDigests.context,
    budget: {
      maxDurationMinutes: 240,
      maxModelTokens: 200_000,
      maxCostMinorUnits: 20_000,
      currency: "EUR"
    },
    proposedAt: releaseTestTimes.workOrder,
    proposedBy: releaseTestActors.lead
  });
  const partial = {
    workspaceId,
    policy,
    decision,
    change,
    workOrder
  };
  const candidate = createReleaseCandidate(
    releaseCandidateInput(partial)
  );
  const fixture = { ...partial, candidate };
  const evidence = createEvidenceRecord(
    releaseEvidenceInput(fixture)
  );
  return Object.freeze({ ...fixture, evidence });
}
