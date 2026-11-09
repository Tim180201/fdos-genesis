import assert from "node:assert/strict";
import test from "node:test";
import {
  ConflictError,
  createEvidenceRecord,
  createReleaseDomainEvent,
  createReleaseRelationship,
  createReleaseBaseline,
  createReleaseCandidate,
  createReleaseStatus,
  digestObject,
  IntegrityError,
  replayReleaseEvidenceDomain,
  reviseChangeRevision,
  reviseDecisionRevision,
  transitionReleaseStatus,
  ValidationError,
  verifyEvidenceRecord,
  verifyReleaseBaseline,
  verifyReleaseRelationship,
  verifyReleaseStatus,
  verifyReleaseStatusTransition
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

function withDigest(unsigned) {
  return { ...unsigned, digest: digestObject(unsigned) };
}

test("material edits create immutable change and decision revisions", () => {
  const fixture = buildReleaseEvidenceFixture();
  const revisedChange = reviseChangeRevision(
    fixture.change,
    {
      acceptanceCriteria: [
        ...fixture.change.acceptanceCriteria,
        {
          id: "AC-02",
          statement: "Unknown evidence blocks release authorization."
        }
      ]
    },
    {
      createdAt: "2026-11-09T10:05:00.000Z",
      createdBy: releaseTestActors.owner
    }
  );
  assert.equal(Object.isFrozen(fixture.change), true);
  assert.equal(Object.isFrozen(revisedChange), true);
  assert.equal(revisedChange.revision, 2);
  assert.equal(revisedChange.supersedesDigest, fixture.change.digest);
  assert.notEqual(revisedChange.digest, fixture.change.digest);
  assert.equal(fixture.change.acceptanceCriteria.length, 1);

  const revisedDecision = reviseDecisionRevision(
    fixture.decision,
    { constraints: ["No deployment.", "No external repository write."] },
    { createdAt: "2026-11-09T10:06:00.000Z" }
  );
  assert.equal(revisedDecision.revision, 2);
  assert.equal(
    revisedDecision.supersedesDigest,
    fixture.decision.digest
  );
  assert.notEqual(revisedDecision.digest, fixture.decision.digest);

  assert.throws(
    () =>
      reviseChangeRevision(
        fixture.change,
        { title: fixture.change.title },
        {
          createdAt: "2026-11-09T10:07:00.000Z",
          createdBy: releaseTestActors.owner
        }
      ),
    ConflictError
  );
  assert.throws(
    () =>
      reviseDecisionRevision(
        fixture.decision,
        { outcome: fixture.decision.outcome },
        { createdAt: "2026-11-09T10:08:00.000Z" }
      ),
    ConflictError
  );
  assert.throws(
    () =>
      reviseChangeRevision(
        fixture.change,
        { workspaceId: "workspace:other" },
        {
          createdAt: "2026-11-09T10:09:00.000Z",
          createdBy: releaseTestActors.owner
        }
      ),
    ValidationError
  );
});

test("release baseline digest binds every authority-bearing input", () => {
  const fixture = buildReleaseEvidenceFixture();
  const baseline = createReleaseBaseline({
    candidate: fixture.candidate,
    unresolvedFindingDigests: []
  });
  assert.equal(verifyReleaseBaseline(baseline), true);
  assert.equal(baseline.changeRevisionDigest, fixture.change.digest);
  assert.deepEqual(
    baseline.decisionRevisionDigests,
    [fixture.decision.digest]
  );
  assert.equal(baseline.workOrderDigest, fixture.workOrder.digest);
  assert.equal(
    baseline.sourceRevision.commit,
    fixture.candidate.sourceRevision.commit
  );
  assert.equal(baseline.artifactDigest, releaseTestDigests.artifact);
  assert.equal(baseline.policy.digest, fixture.policy.digest);

  const alternate = (label) => digestObject({ alternate: label });
  const candidateMutations = [
    ["change", { changeRevisionDigest: alternate("change") }],
    ["decisions", { decisionRevisionDigests: [alternate("decision")] }],
    ["work order", { workOrderDigest: alternate("work-order") }],
    [
      "commit",
      {
        sourceRevision: {
          ...fixture.candidate.sourceRevision,
          commit: "3".repeat(40)
        }
      }
    ],
    [
      "tree",
      {
        sourceRevision: {
          ...fixture.candidate.sourceRevision,
          tree: "4".repeat(40)
        }
      }
    ],
    ["artifact", { artifactDigest: alternate("artifact") }],
    [
      "policy",
      {
        policy: {
          id: "policy:fdos-alpha",
          version: "1.0.1",
          digest: alternate("policy")
        }
      }
    ],
    [
      "verifier",
      {
        verifier: {
          id: "verifier:release-evidence-domain",
          version: "0.1.1-experimental",
          digest: alternate("verifier")
        }
      }
    ]
  ];
  for (const [label, mutation] of candidateMutations) {
    const candidate = createReleaseCandidate(
      releaseCandidateInput(fixture, mutation)
    );
    const changed = createReleaseBaseline({ candidate });
    assert.notEqual(
      changed.digest,
      baseline.digest,
      `${label} must change the baseline digest`
    );
  }

  const findingsChanged = createReleaseBaseline({
    candidate: fixture.candidate,
    unresolvedFindingDigests: [alternate("finding")]
  });
  assert.notEqual(findingsChanged.digest, baseline.digest);

  const tampered = clone(baseline);
  tampered.sourceRevision.commit = "5".repeat(40);
  assert.throws(() => verifyReleaseBaseline(tampered), IntegrityError);
});

test("evidence records retain exact subject, producer and provenance state", () => {
  const fixture = buildReleaseEvidenceFixture();
  assert.equal(verifyEvidenceRecord(fixture.evidence), true);
  assert.deepEqual(fixture.evidence.subject, {
    kind: "release-candidate",
    id: fixture.candidate.candidateId,
    digest: fixture.candidate.digest
  });
  assert.equal(
    fixture.evidence.producer.identityDigest,
    releaseTestDigests.producer
  );
  assert.equal(fixture.evidence.state, "verified");
  assert.equal(fixture.evidence.freshness.state, "fresh");
  assert.equal(Object.isFrozen(fixture.evidence.provenance), true);

  const unknown = createEvidenceRecord(
    releaseEvidenceInput(fixture, {
      evidenceId: "evidence:unknown",
      integrity: {
        state: "unknown",
        algorithm: null,
        digest: null
      },
      freshness: {
        state: "unknown",
        observedAt: releaseTestTimes.evidence,
        validUntil: null
      }
    })
  );
  assert.equal(unknown.state, "unknown");

  const extraField = clone(fixture.evidence);
  extraField.rawLog = "must not enter the closed evidence contract";
  assert.throws(() => verifyEvidenceRecord(extraField), IntegrityError);

  const wrongState = clone(fixture.evidence);
  wrongState.state = "unknown";
  const wrongStateUnsigned = clone(wrongState);
  delete wrongStateUnsigned.digest;
  assert.throws(
    () => verifyEvidenceRecord(withDigest(wrongStateUnsigned)),
    IntegrityError
  );

  assert.throws(
    () =>
      createEvidenceRecord(
        releaseEvidenceInput(fixture, {
          evidenceId: "evidence:future",
          freshness: {
            state: "fresh",
            observedAt: "2026-11-09T10:30:00.000Z",
            validUntil: "2026-11-09T11:30:00.000Z"
          }
        })
      ),
    ValidationError
  );
});

test("release status transitions change exactly one independent axis", () => {
  const fixture = buildReleaseEvidenceFixture();
  const initial = createReleaseStatus({
    candidateDigest: fixture.candidate.digest,
    transitionedAt: releaseTestTimes.candidate,
    transitionedBy: releaseTestActors.system
  });
  const observed = transitionReleaseStatus(initial, {
    axis: "evidence",
    to: "observed",
    transitionedAt: releaseTestTimes.evidence,
    transitionedBy: releaseTestActors.system
  });
  assert.equal(verifyReleaseStatusTransition(initial, observed), true);
  assert.deepEqual(observed.axes, {
    approval: "not-required",
    evidence: "observed",
    implementation: "planned",
    release: "draft",
    review: "not-requested"
  });
  const active = transitionReleaseStatus(observed, {
    axis: "implementation",
    to: "active",
    transitionedAt: releaseTestTimes.evaluation,
    transitionedBy: releaseTestActors.lead
  });
  assert.equal(active.axes.evidence, "observed");
  assert.equal(active.axes.implementation, "active");
  assert.equal(active.axes.release, "draft");

  assert.throws(
    () =>
      transitionReleaseStatus(initial, {
        axis: "release",
        to: "authorized",
        transitionedAt: releaseTestTimes.evaluation,
        transitionedBy: releaseTestActors.system
      }),
    ConflictError
  );

  const multiAxisUnsigned = clone(observed);
  delete multiAxisUnsigned.digest;
  multiAxisUnsigned.axes.review = "pending";
  const multiAxis = withDigest(multiAxisUnsigned);
  assert.equal(verifyReleaseStatus(multiAxis), true);
  assert.throws(
    () => verifyReleaseStatusTransition(initial, multiAxis),
    IntegrityError
  );

  const forgedInitialUnsigned = clone(initial);
  delete forgedInitialUnsigned.digest;
  forgedInitialUnsigned.axes.release = "authorized";
  assert.throws(
    () => verifyReleaseStatus(withDigest(forgedInitialUnsigned)),
    IntegrityError
  );
});

test("typed relationships replay only between recorded exact revisions", () => {
  const fixture = buildReleaseEvidenceFixture();
  const revised = reviseChangeRevision(
    fixture.change,
    { title: "Implement deterministic release evidence safely" },
    {
      createdAt: "2026-11-09T10:10:00.000Z",
      createdBy: releaseTestActors.owner
    }
  );
  const relationshipSource = {
    workspaceId: fixture.workspaceId,
    relationshipId: "relationship:change-revision",
    type: "revision-supersedes",
    from: {
      kind: "change-revision",
      id: revised.changeId,
      digest: revised.digest
    },
    to: {
      kind: "change-revision",
      id: fixture.change.changeId,
      digest: fixture.change.digest
    },
    createdAt: "2026-11-09T10:10:00.000Z",
    createdBy: releaseTestActors.system
  };
  const relationship = createReleaseRelationship(relationshipSource);
  assert.equal(verifyReleaseRelationship(relationship), true);

  let events = [];
  for (const [index, object] of [fixture.change, revised].entries()) {
    events.push(
      createReleaseDomainEvent({
        currentEvents: events,
        eventId: `event:relationship-object-${index + 1}`,
        eventType: "object.recorded",
        actor: releaseTestActors.system,
        occurredAt: "2026-11-09T10:10:00.000Z",
        payload: { object }
      })
    );
  }
  events.push(
    createReleaseDomainEvent({
      currentEvents: events,
      eventId: "event:relationship-recorded",
      eventType: "relationship.recorded",
      actor: releaseTestActors.system,
      occurredAt: "2026-11-09T10:10:00.001Z",
      payload: { relationship }
    })
  );
  const state = replayReleaseEvidenceDomain(events);
  assert.equal(state.objects.length, 2);
  assert.equal(state.relationships.length, 1);
  assert.equal(state.relationships[0].digest, relationship.digest);

  assert.throws(
    () =>
      createReleaseRelationship({
        ...relationshipSource,
        relationshipId: "relationship:wrong-endpoints",
        type: "decision-applies-to-change",
        from: {
          kind: "work-order",
          id: fixture.workOrder.workOrderId,
          digest: fixture.workOrder.digest
        }
      }),
    ValidationError
  );

  const unrecorded = createReleaseRelationship({
    ...relationshipSource,
    relationshipId: "relationship:unrecorded-revision",
    from: {
      ...relationship.from,
      digest: digestObject({ unrecorded: true })
    }
  });
  assert.throws(
    () =>
      createReleaseDomainEvent({
        currentEvents: events,
        eventId: "event:unrecorded-relationship",
        eventType: "relationship.recorded",
        actor: releaseTestActors.system,
        occurredAt: "2026-11-09T10:10:00.002Z",
        payload: { relationship: unrecorded }
      }),
    ConflictError
  );

  const reversed = createReleaseRelationship({
    ...relationshipSource,
    relationshipId: "relationship:reversed-revision",
    from: relationship.to,
    to: relationship.from
  });
  assert.throws(
    () =>
      createReleaseDomainEvent({
        currentEvents: events,
        eventId: "event:reversed-relationship",
        eventType: "relationship.recorded",
        actor: releaseTestActors.system,
        occurredAt: "2026-11-09T10:10:00.003Z",
        payload: { relationship: reversed }
      }),
    ConflictError
  );
});
