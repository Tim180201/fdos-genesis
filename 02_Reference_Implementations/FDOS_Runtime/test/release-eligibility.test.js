import assert from "node:assert/strict";
import test from "node:test";
import {
  createChangeRevision,
  createDecisionRevision,
  createEvidenceRecord,
  createReleaseCandidate,
  createWorkOrder,
  digestObject,
  evaluateReleaseEligibility,
  IntegrityError,
  PolicyError,
  RELEASE_EVIDENCE_VERIFIER,
  releaseEvidencePolicyBinding,
  ValidationError,
  verifyReleaseEvaluation
} from "../src/index.js";
import {
  buildReleaseEvidenceFixture,
  releaseCandidateInput,
  releaseEvidenceInput,
  releaseTestActors,
  releaseTestDigests,
  releaseTestTimes
} from "../test-support/release-evidence-fixtures.js";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function decisionInput(decision, overrides = {}) {
  return {
    workspaceId: decision.workspaceId,
    decisionId: decision.decisionId,
    title: decision.title,
    statement: decision.statement,
    outcome: decision.outcome,
    constraints: decision.constraints,
    appliesToChangeIds: decision.appliesToChangeIds,
    authority: decision.authority,
    effectiveAt: decision.effectiveAt,
    expiresAt: decision.expiresAt,
    createdAt: decision.createdAt,
    ...overrides
  };
}

function changeInput(change, overrides = {}) {
  return {
    workspaceId: change.workspaceId,
    changeId: change.changeId,
    title: change.title,
    problemStatement: change.problemStatement,
    acceptanceCriteria: change.acceptanceCriteria,
    decisionRevisionDigests: change.decisionRevisionDigests,
    requiredEvidenceTypes: change.requiredEvidenceTypes,
    repositoryConstraints: change.repositoryConstraints,
    policy: change.policy,
    classification: change.classification,
    owningScope: change.owningScope,
    createdAt: change.createdAt,
    createdBy: change.createdBy,
    ...overrides
  };
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

function rebindDecision(fixture, decisionOverrides) {
  const decision = createDecisionRevision(
    decisionInput(fixture.decision, decisionOverrides)
  );
  const change = createChangeRevision(
    changeInput(fixture.change, {
      decisionRevisionDigests: [decision.digest]
    })
  );
  const workOrder = createWorkOrder(
    workOrderInput(fixture.workOrder, {
      changeRevisionDigest: change.digest,
      decisionRevisionDigests: [decision.digest]
    })
  );
  const rebound = { ...fixture, decision, change, workOrder };
  const candidate = createReleaseCandidate(
    releaseCandidateInput(rebound)
  );
  return { ...rebound, candidate };
}

function rebindChange(
  fixture,
  changeOverrides = {},
  workOrderOverrides = {}
) {
  const change = createChangeRevision(
    changeInput(fixture.change, changeOverrides)
  );
  const workOrder = createWorkOrder(
    workOrderInput(fixture.workOrder, {
      changeRevisionDigest: change.digest,
      ...workOrderOverrides
    })
  );
  const rebound = { ...fixture, change, workOrder };
  const candidate = createReleaseCandidate(
    releaseCandidateInput(rebound)
  );
  return { ...rebound, candidate };
}

function evaluationInput(fixture, overrides = {}) {
  return {
    candidate: fixture.candidate,
    changeRevision: fixture.change,
    decisionRevisions: [fixture.decision],
    workOrder: fixture.workOrder,
    policy: fixture.policy,
    evidence: [fixture.evidence],
    evaluatedAt: releaseTestTimes.evaluation,
    ...overrides
  };
}

function evidence(fixture, suffix, overrides = {}) {
  return createEvidenceRecord(
    releaseEvidenceInput(fixture, {
      evidenceId: `evidence:${suffix}`,
      ...overrides
    })
  );
}

test("deterministic eligibility accepts only complete verified evidence", () => {
  const fixture = buildReleaseEvidenceFixture();
  const input = evaluationInput(fixture);
  const first = evaluateReleaseEligibility(input);
  const second = evaluateReleaseEligibility(clone(input));
  assert.equal(first.eligible, true);
  assert.equal(first.evidenceState, "verified");
  assert.deepEqual(first.findings, []);
  assert.equal(first.digest, second.digest);
  assert.equal(first.baseline.candidateDigest, fixture.candidate.digest);
  assert.equal(first.baseline.policy.digest, fixture.policy.digest);
  assert.equal(verifyReleaseEvaluation(first), true);
});

test("missing, invalid, stale and unknown evidence remain distinct", () => {
  const fixture = buildReleaseEvidenceFixture();
  const missing = evaluateReleaseEligibility(
    evaluationInput(fixture, { evidence: [] })
  );
  const invalidEvidence = evidence(fixture, "invalid", {
    integrity: {
      state: "invalid",
      algorithm: "sha256",
      digest: releaseTestDigests.observation
    }
  });
  const invalid = evaluateReleaseEligibility(
    evaluationInput(fixture, { evidence: [invalidEvidence] })
  );
  const stale = evaluateReleaseEligibility(
    evaluationInput(fixture, {
      evaluatedAt: "2026-11-09T11:00:00.001Z"
    })
  );
  const unknownEvidence = evidence(fixture, "unknown", {
    integrity: { state: "unknown", algorithm: null, digest: null },
    freshness: {
      state: "unknown",
      observedAt: releaseTestTimes.evidence,
      validUntil: null
    }
  });
  const unknown = evaluateReleaseEligibility(
    evaluationInput(fixture, { evidence: [unknownEvidence] })
  );

  assert.deepEqual(
    [missing, invalid, stale, unknown].map((entry) => [
      entry.eligible,
      entry.evidenceState,
      entry.findings[0].code
    ]),
    [
      [false, "missing", "MISSING_EVIDENCE"],
      [false, "invalid", "INVALID_EVIDENCE"],
      [false, "stale", "STALE_EVIDENCE"],
      [false, "unknown", "UNKNOWN_EVIDENCE"]
    ]
  );
  assert.equal(
    new Set(
      [missing, invalid, stale, unknown].map(
        (entry) => entry.findings[0].remediation
      )
    ).size,
    4
  );
});

test("at least 20 adversarial applicability fixtures fail closed", async (t) => {
  const fixture = buildReleaseEvidenceFixture();
  const alternate = (label) => digestObject({ adverse: label });
  const wrongType = evidence(fixture, "wrong-type", {
    evidenceType: "ci.lint"
  });
  const wrongSubjectDigest = evidence(fixture, "wrong-digest", {
    subject: {
      ...fixture.evidence.subject,
      digest: alternate("subject")
    }
  });
  const wrongSubjectId = evidence(fixture, "wrong-id", {
    subject: {
      ...fixture.evidence.subject,
      id: "candidate:other"
    }
  });
  const wrongSubjectKind = evidence(fixture, "wrong-kind", {
    subject: {
      kind: "work-order",
      id: fixture.workOrder.workOrderId,
      digest: fixture.workOrder.digest
    }
  });
  const untrustedProducer = evidence(fixture, "untrusted-producer", {
    producer: {
      ...fixture.evidence.producer,
      identityDigest: alternate("producer")
    }
  });
  const invalidIntegrity = evidence(fixture, "invalid-integrity", {
    integrity: {
      state: "invalid",
      algorithm: "sha256",
      digest: releaseTestDigests.observation
    }
  });
  const unknownIntegrity = evidence(fixture, "unknown-integrity", {
    integrity: { state: "unknown", algorithm: null, digest: null },
    freshness: {
      state: "fresh",
      observedAt: releaseTestTimes.evidence,
      validUntil: releaseTestTimes.expiry
    }
  });
  const observedIntegrity = evidence(fixture, "observed-integrity", {
    integrity: {
      state: "observed",
      algorithm: "sha256",
      digest: releaseTestDigests.observation
    }
  });
  const unknownFreshness = evidence(fixture, "unknown-freshness", {
    freshness: {
      state: "unknown",
      observedAt: releaseTestTimes.evidence,
      validUntil: null
    }
  });
  const futureEvaluation = evidence(fixture, "future-evaluation", {
    evaluatedAt: "2026-11-09T10:30:00.000Z"
  });
  const crossWorkspace = evidence(fixture, "cross-workspace", {
    workspaceId: "workspace:other"
  });
  const expiredDecision = rebindDecision(fixture, {
    expiresAt: "2026-11-09T09:59:59.999Z"
  });
  const rejectedDecision = rebindDecision(fixture, {
    outcome: "rejected"
  });
  const unknownAuthority = rebindDecision(fixture, {
    authority: { type: "human", id: "human:unknown-authority" }
  });
  const wrongApplicability = rebindDecision(fixture, {
    appliesToChangeIds: ["change:other"]
  });
  const wrongChangePolicy = rebindChange(fixture, {
    policy: {
      ...fixture.change.policy,
      digest: alternate("change-policy")
    }
  });
  const missingChangeDecision = rebindChange(fixture, {
    decisionRevisionDigests: []
  });
  const wrongAcceptanceProfile = rebindChange(
    fixture,
    {},
    { acceptanceCriterionIds: ["AC-OTHER"] }
  );

  const tamperedEvidence = clone(fixture.evidence);
  tamperedEvidence.observationDigest = alternate("observation");
  const extraEvidence = clone(fixture.evidence);
  extraEvidence.rawPayload = "unadmitted";
  const tamperedCandidate = clone(fixture.candidate);
  tamperedCandidate.artifactDigest = alternate("artifact-tamper");
  const tamperedPolicy = clone(fixture.policy);
  tamperedPolicy.description = "Tampered policy";

  const cases = [
    ["missing evidence", { evidence: [] }],
    ["wrong evidence type", { evidence: [wrongType] }],
    ["wrong subject digest", { evidence: [wrongSubjectDigest] }],
    ["wrong subject id", { evidence: [wrongSubjectId] }],
    ["wrong subject kind", { evidence: [wrongSubjectKind] }],
    ["untrusted producer", { evidence: [untrustedProducer] }],
    ["invalid integrity", { evidence: [invalidIntegrity] }],
    ["unknown integrity", { evidence: [unknownIntegrity] }],
    ["observed-only integrity", { evidence: [observedIntegrity] }],
    ["unknown freshness", { evidence: [unknownFreshness] }],
    [
      "stale freshness",
      { evaluatedAt: "2026-11-09T11:00:00.001Z" }
    ],
    ["future evidence evaluation", { evidence: [futureEvaluation] }],
    ["cross-workspace evidence", { evidence: [crossWorkspace] }],
    ["tampered evidence", { evidence: [tamperedEvidence] }],
    ["evidence with extra property", { evidence: [extraEvidence] }],
    [
      "candidate change mismatch",
      {
        candidate: createReleaseCandidate(
          releaseCandidateInput(fixture, {
            changeRevisionDigest: alternate("change")
          })
        )
      }
    ],
    [
      "candidate decision mismatch",
      {
        candidate: createReleaseCandidate(
          releaseCandidateInput(fixture, {
            decisionRevisionDigests: [alternate("decision")]
          })
        )
      }
    ],
    [
      "candidate work-order mismatch",
      {
        candidate: createReleaseCandidate(
          releaseCandidateInput(fixture, {
            workOrderDigest: alternate("work-order")
          })
        )
      }
    ],
    [
      "candidate policy mismatch",
      {
        candidate: createReleaseCandidate(
          releaseCandidateInput(fixture, {
            policy: {
              id: fixture.policy.policyId,
              version: fixture.policy.version,
              digest: alternate("policy")
            }
          })
        )
      }
    ],
    [
      "candidate verifier mismatch",
      {
        candidate: createReleaseCandidate(
          releaseCandidateInput(fixture, {
            verifier: {
              ...RELEASE_EVIDENCE_VERIFIER,
              digest: alternate("verifier")
            }
          })
        )
      }
    ],
    ["expired decision authority", expiredDecision],
    ["rejected decision authority", rejectedDecision],
    ["unadmitted decision authority", unknownAuthority],
    ["decision applies to another change", wrongApplicability],
    ["change policy mismatch", wrongChangePolicy],
    ["change omits applicable decision", missingChangeDecision],
    ["work order uses another acceptance profile", wrongAcceptanceProfile],
    [
      "candidate repository is outside the work order",
      {
        candidate: createReleaseCandidate(
          releaseCandidateInput(fixture, {
            repositoryId: "repository:other"
          })
        )
      }
    ],
    ["missing decision revision", { decisionRevisions: [] }],
    ["tampered candidate", { candidate: tamperedCandidate }],
    ["tampered policy", { policy: tamperedPolicy }]
  ];

  assert.ok(cases.length >= 20);
  for (const [name, override] of cases) {
    await t.test(name, () => {
      let result;
      try {
        result = evaluateReleaseEligibility(
          evaluationInput(
            Object.hasOwn(override, "candidate") ||
              Object.hasOwn(override, "decision") ||
              Object.hasOwn(override, "change") ||
              Object.hasOwn(override, "workOrder")
              ? { ...fixture, ...override }
              : fixture,
            override
          )
        );
      } catch (error) {
        assert.ok(
          error instanceof ValidationError ||
            error instanceof IntegrityError ||
            error instanceof PolicyError,
          `${name} failed with an unexpected error: ${error}`
        );
        return;
      }
      assert.equal(result.eligible, false, name);
      assert.notEqual(result.evidenceState, "verified", name);
    });
  }
});
