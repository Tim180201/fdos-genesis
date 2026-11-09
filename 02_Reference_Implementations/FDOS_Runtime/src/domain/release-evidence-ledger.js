import {
  digestObject,
  immutableJson,
  jsonClone
} from "../kernel/canonical-json.js";
import {
  ConflictError,
  IntegrityError,
  ValidationError
} from "../kernel/errors.js";
import {
  isoDate,
  requiredString
} from "../kernel/validation.js";
import {
  RELEASE_EVIDENCE_SCHEMA_VERSION,
  exactKeys,
  normalizedDigest,
  normalizedInteger,
  normalizedPrincipal,
  normalizedStableId
} from "./release-evidence-common.js";
import {
  verifyApprovalConsumption,
  verifyReleaseEvidenceApproval
} from "./release-approval.js";
import {
  verifyReleaseAuthorization,
  verifyReleaseAuthorizationBinding
} from "./release-authorization.js";
import {
  verifyReleaseEvaluation,
  verifyReleaseEvidencePolicy
} from "./release-eligibility.js";
import {
  verifyEvidenceRecord,
  verifyReleaseFinding
} from "./release-evidence-record.js";
import {
  verifyReleaseRelationship
} from "./release-relationship.js";
import {
  verifyChangeRevision,
  verifyDecisionRevision
} from "./release-revisions.js";
import {
  verifyReleaseStatus,
  verifyReleaseStatusTransition
} from "./release-status.js";
import {
  verifyReleaseBaseline,
  verifyReleaseCandidate,
  verifyWorkOrder
} from "./release-work.js";

const EVENT_KIND = "fdos-release-evidence-domain-event";
const STATE_KIND = "fdos-release-evidence-domain-state";

const eventKeys = [
  "actor",
  "eventId",
  "eventType",
  "kind",
  "occurredAt",
  "payload",
  "previousDigest",
  "schemaVersion",
  "sequence"
];

const objectDefinitions = Object.freeze({
  "fdos-release-evidence-change-revision": {
    referenceKind: "change-revision",
    id: (value) => value.changeId,
    identity: (value) => `${value.changeId}@${value.revision}`,
    verify: verifyChangeRevision
  },
  "fdos-release-evidence-decision-revision": {
    referenceKind: "decision-revision",
    id: (value) => value.decisionId,
    identity: (value) => `${value.decisionId}@${value.revision}`,
    verify: verifyDecisionRevision
  },
  "fdos-release-evidence-work-order": {
    referenceKind: "work-order",
    id: (value) => value.workOrderId,
    identity: (value) => value.workOrderId,
    verify: verifyWorkOrder
  },
  "fdos-release-evidence-release-candidate": {
    referenceKind: "release-candidate",
    id: (value) => value.candidateId,
    identity: (value) => value.candidateId,
    verify: verifyReleaseCandidate
  },
  "fdos-release-evidence-release-baseline": {
    referenceKind: "release-baseline",
    id: (value) => value.candidateId,
    identity: (value) =>
      `${value.candidateId}@${value.digest}`,
    verify: verifyReleaseBaseline
  },
  "fdos-release-evidence-record": {
    referenceKind: "evidence",
    id: (value) => value.evidenceId,
    identity: (value) => value.evidenceId,
    verify: verifyEvidenceRecord
  },
  "fdos-release-evidence-finding": {
    referenceKind: "finding",
    id: (value) => value.findingId,
    identity: (value) => value.findingId,
    verify: verifyReleaseFinding
  },
  "fdos-release-evidence-approval": {
    referenceKind: "approval",
    id: (value) => value.approvalId,
    identity: (value) => value.approvalId,
    verify: verifyReleaseEvidenceApproval
  },
  "fdos-release-evidence-approval-consumption": {
    referenceKind: "approval-consumption",
    id: (value) => value.consumptionId,
    identity: (value) => value.consumptionId,
    verify: verifyApprovalConsumption
  },
  "fdos-release-evidence-policy": {
    referenceKind: "release-policy",
    id: (value) => value.policyId,
    identity: (value) => `${value.policyId}@${value.version}`,
    verify: verifyReleaseEvidencePolicy
  },
  "fdos-release-evidence-evaluation": {
    referenceKind: "release-evaluation",
    id: (value) => value.baseline.candidateId,
    identity: (value) => value.digest,
    verify: verifyReleaseEvaluation
  },
  "fdos-release-evidence-release-authorization": {
    referenceKind: "release-authorization",
    id: (value) => value.authorizationId,
    identity: (value) => value.authorizationId,
    verify: verifyReleaseAuthorization
  }
});

function objectDefinition(value, ErrorType = ValidationError) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !Object.hasOwn(objectDefinitions, value.kind)
  ) {
    throw new ErrorType(
      "Release domain object kind is unsupported."
    );
  }
  return objectDefinitions[value.kind];
}

function verifiedObject(value, ErrorType = ValidationError) {
  const definition = objectDefinition(value, ErrorType);
  try {
    definition.verify(value);
  } catch (error) {
    if (ErrorType === ValidationError) throw error;
    throw new ErrorType("Release domain object is invalid.");
  }
  return jsonClone(value);
}

function normalizePayload(eventType, value, ErrorType) {
  if (eventType === "object.recorded") {
    exactKeys(value, ["object"], "object event payload", ErrorType);
    const object = verifiedObject(value.object, ErrorType);
    if (
      [
        "fdos-release-evidence-approval-consumption",
        "fdos-release-evidence-release-authorization"
      ].includes(object.kind)
    ) {
      throw new ErrorType(
        "Approval consumption and release authorization require atomic events."
      );
    }
    return { object };
  }
  if (eventType === "status.recorded") {
    exactKeys(value, ["status"], "status event payload", ErrorType);
    try {
      verifyReleaseStatus(value.status);
    } catch (error) {
      if (ErrorType === ValidationError) throw error;
      throw new ErrorType("Release status is invalid.");
    }
    if (
      value.status.axes.approval === "consumed" ||
      ["authorized", "published"].includes(
        value.status.axes.release
      )
    ) {
      throw new ErrorType(
        "Consumed or authorized status requires a dedicated atomic event."
      );
    }
    return { status: jsonClone(value.status) };
  }
  if (eventType === "relationship.recorded") {
    exactKeys(
      value,
      ["relationship"],
      "relationship event payload",
      ErrorType
    );
    try {
      verifyReleaseRelationship(value.relationship);
    } catch (error) {
      if (ErrorType === ValidationError) throw error;
      throw new ErrorType("Release relationship is invalid.");
    }
    return { relationship: jsonClone(value.relationship) };
  }
  if (eventType === "approval.consumed") {
    exactKeys(
      value,
      ["consumption"],
      "approval event payload",
      ErrorType
    );
    try {
      verifyApprovalConsumption(value.consumption);
    } catch (error) {
      if (ErrorType === ValidationError) throw error;
      throw new ErrorType("Approval consumption is invalid.");
    }
    return { consumption: jsonClone(value.consumption) };
  }
  if (eventType === "release.authorized") {
    exactKeys(
      value,
      ["authorization"],
      "authorization event payload",
      ErrorType
    );
    try {
      verifyReleaseAuthorization(value.authorization);
    } catch (error) {
      if (ErrorType === ValidationError) throw error;
      throw new ErrorType("Release authorization is invalid.");
    }
    return { authorization: jsonClone(value.authorization) };
  }
  throw new ErrorType("Release domain event type is unsupported.");
}

function normalizeEventUnsigned(
  source,
  ErrorType = ValidationError
) {
  exactKeys(source, eventKeys, "release domain event", ErrorType);
  if (
    source.schemaVersion !== RELEASE_EVIDENCE_SCHEMA_VERSION ||
    source.kind !== EVENT_KIND
  ) {
    throw new ErrorType("Release domain event format is unsupported.");
  }
  const sequence = normalizedInteger(
    source.sequence,
    "release domain event sequence",
    { minimum: 1 }
  );
  const previousDigest = normalizedDigest(
    source.previousDigest,
    "release domain previous digest",
    { nullable: true }
  );
  if (
    (sequence === 1 && previousDigest !== null) ||
    (sequence > 1 && previousDigest === null)
  ) {
    throw new ErrorType(
      "Release domain event link is inconsistent."
    );
  }
  const eventType = requiredString(
    source.eventType,
    "release domain event type",
    {
      max: 80,
      pattern: /^[a-z][a-z0-9.-]{2,79}$/
    }
  );
  return {
    schemaVersion: RELEASE_EVIDENCE_SCHEMA_VERSION,
    kind: EVENT_KIND,
    sequence,
    eventId: normalizedStableId(
      source.eventId,
      "release domain event id"
    ),
    eventType,
    previousDigest,
    actor: normalizedPrincipal(
      source.actor,
      "release domain event actor",
      {
        allowedTypes: ["human", "agent", "service", "system"]
      }
    ),
    occurredAt: isoDate(
      source.occurredAt,
      "release domain event occurredAt"
    ),
    payload: normalizePayload(
      eventType,
      source.payload,
      ErrorType
    )
  };
}

function verifyEvents(events) {
  if (!Array.isArray(events)) {
    throw new ValidationError(
      "Release domain events must be a list."
    );
  }
  let previousDigest = null;
  let previousOccurredAt = null;
  const eventIds = new Set();
  for (const [index, event] of events.entries()) {
    exactKeys(
      event,
      [...eventKeys, "digest"],
      `release domain event ${index + 1}`,
      IntegrityError
    );
    const source = jsonClone(event);
    delete source.digest;
    const unsigned = normalizeEventUnsigned(source, IntegrityError);
    if (
      unsigned.sequence !== index + 1 ||
      unsigned.previousDigest !== previousDigest ||
      digestObject(unsigned) !== event.digest ||
      eventIds.has(unsigned.eventId) ||
      (previousOccurredAt !== null &&
        Date.parse(unsigned.occurredAt) < previousOccurredAt)
    ) {
      throw new IntegrityError(
        `Release domain event ${index + 1} breaks the chain.`
      );
    }
    eventIds.add(unsigned.eventId);
    previousDigest = event.digest;
    previousOccurredAt = Date.parse(unsigned.occurredAt);
  }
  return previousDigest;
}

function objectIndexEntry(value) {
  const definition = objectDefinition(value, IntegrityError);
  return {
    definition,
    id: definition.id(value),
    identity: definition.identity(value),
    referenceKind: definition.referenceKind
  };
}

function relationshipMatchesBinding(relationship, from, to) {
  switch (relationship.type) {
    case "revision-supersedes":
      return (
        from.value.revision === to.value.revision + 1 &&
        from.value.supersedesDigest === to.value.digest
      );
    case "decision-applies-to-change":
      return from.value.appliesToChangeIds.includes(to.value.changeId);
    case "work-order-implements-change":
      return from.value.changeRevisionDigest === to.value.digest;
    case "work-order-depends-on-work-order":
      return from.value.dependencyWorkOrderDigests.includes(
        to.value.digest
      );
    case "candidate-uses-change":
      return from.value.changeRevisionDigest === to.value.digest;
    case "candidate-uses-decision":
      return from.value.decisionRevisionDigests.includes(to.value.digest);
    case "candidate-uses-work-order":
      return from.value.workOrderDigest === to.value.digest;
    case "evidence-observes-subject":
    case "finding-blocks-candidate":
      return (
        from.value.subject.kind === relationship.to.kind &&
        from.value.subject.id === relationship.to.id &&
        from.value.subject.digest === relationship.to.digest
      );
    case "approval-authorizes-work-order":
      return (
        from.value.purpose === "work-order" &&
        from.value.binding.workOrderDigest === to.value.digest
      );
    case "approval-authorizes-release":
      return (
        from.value.purpose === "release" &&
        from.value.binding.baselineDigest === to.value.digest
      );
    case "consumption-uses-approval":
      return (
        from.value.approvalId === to.value.approvalId &&
        from.value.approvalDigest === to.value.digest
      );
    default:
      return false;
  }
}

function assertWorkspace(currentWorkspaceId, candidateWorkspaceId) {
  if (
    currentWorkspaceId !== null &&
    currentWorkspaceId !== candidateWorkspaceId
  ) {
    throw new ConflictError(
      "Release domain event crosses the workspace boundary."
    );
  }
  return currentWorkspaceId || candidateWorkspaceId;
}

export function replayReleaseEvidenceDomain(events) {
  const headDigest = verifyEvents(events);
  const objects = new Map();
  const objectsByDigest = new Map();
  const relationships = new Map();
  const latestStatuses = new Map();
  const consumedApprovals = new Map();
  let workspaceId = null;

  const retainObject = (value) => {
    const indexed = objectIndexEntry(value);
    const key = `${indexed.referenceKind}:${indexed.identity}`;
    const existing = objects.get(key);
    const digestExisting = objectsByDigest.get(value.digest);
    if (
      (existing && existing.digest !== value.digest) ||
      (digestExisting &&
        (digestExisting.referenceKind !== indexed.referenceKind ||
          digestExisting.id !== indexed.id))
    ) {
      throw new ConflictError(
        "Release domain object identity has conflicting content."
      );
    }
    objects.set(key, value);
    objectsByDigest.set(value.digest, {
      ...indexed,
      value
    });
    return indexed;
  };

  for (const event of events) {
    if (event.eventType === "object.recorded") {
      const value = event.payload.object;
      workspaceId = assertWorkspace(
        workspaceId,
        value.workspaceId
      );
      const indexed = objectIndexEntry(value);
      if (
        ["change-revision", "decision-revision"].includes(
          indexed.referenceKind
        ) &&
        value.revision > 1
      ) {
        const predecessor = objectsByDigest.get(
          value.supersedesDigest
        );
        if (
          predecessor?.referenceKind !== indexed.referenceKind ||
          predecessor.id !== indexed.id ||
          predecessor.value.revision !== value.revision - 1 ||
          Date.parse(predecessor.value.createdAt) >
            Date.parse(value.createdAt)
        ) {
          throw new ConflictError(
            "Release revision predecessor is not recorded exactly."
          );
        }
      }
      retainObject(value);
      continue;
    }

    if (event.eventType === "status.recorded") {
      const status = event.payload.status;
      const candidate = objectsByDigest.get(status.candidateDigest);
      if (
        !candidate ||
        candidate.referenceKind !== "release-candidate"
      ) {
        throw new ConflictError(
          "Release status references an unrecorded candidate."
        );
      }
      workspaceId = assertWorkspace(
        workspaceId,
        candidate.value.workspaceId
      );
      const previous = latestStatuses.get(status.candidateDigest);
      if (previous) {
        verifyReleaseStatusTransition(previous, status);
      } else if (
        status.revision !== 1 ||
        status.previousDigest !== null
      ) {
        throw new ConflictError(
          "Release status does not begin with revision one."
        );
      }
      if (
        status.changedAxis === "release" &&
        status.changedTo === "eligible" &&
        ![...objectsByDigest.values()].some(
          (entry) =>
            entry.referenceKind === "release-evaluation" &&
            entry.value.candidateDigest === status.candidateDigest &&
            entry.value.eligible
        )
      ) {
        throw new ConflictError(
          "Eligible status requires a recorded eligible evaluation."
        );
      }
      latestStatuses.set(status.candidateDigest, status);
      continue;
    }

    if (event.eventType === "relationship.recorded") {
      const relationship = event.payload.relationship;
      workspaceId = assertWorkspace(
        workspaceId,
        relationship.workspaceId
      );
      const from = objectsByDigest.get(relationship.from.digest);
      const to = objectsByDigest.get(relationship.to.digest);
      if (
        !from ||
        !to ||
        from.referenceKind !== relationship.from.kind ||
        to.referenceKind !== relationship.to.kind ||
        from.id !== relationship.from.id ||
        to.id !== relationship.to.id ||
        !relationshipMatchesBinding(relationship, from, to)
      ) {
        throw new ConflictError(
          "Release relationship references an unrecorded object."
        );
      }
      const existing = relationships.get(
        relationship.relationshipId
      );
      if (existing && existing.digest !== relationship.digest) {
        throw new ConflictError(
          "Release relationship identifier conflicts."
        );
      }
      relationships.set(
        relationship.relationshipId,
        relationship
      );
      continue;
    }

    if (event.eventType === "release.authorized") {
      const authorization = event.payload.authorization;
      workspaceId = assertWorkspace(
        workspaceId,
        authorization.workspaceId
      );
      const evaluation = objectsByDigest.get(
        authorization.evaluationDigest
      );
      const policy = objectsByDigest.get(
        authorization.policyDigest
      );
      const approval = objectsByDigest.get(
        authorization.approvalDigest
      );
      const baseline = objectsByDigest.get(
        authorization.baselineDigest
      );
      const candidate = objectsByDigest.get(
        authorization.candidateDigest
      );
      const previousStatus = latestStatuses.get(
        authorization.candidateDigest
      );
      if (
        evaluation?.referenceKind !== "release-evaluation" ||
        policy?.referenceKind !== "release-policy" ||
        approval?.referenceKind !== "approval" ||
        baseline?.referenceKind !== "release-baseline" ||
        candidate?.referenceKind !== "release-candidate" ||
        !previousStatus ||
        previousStatus.digest !== authorization.previousStatusDigest ||
        evaluation.value.baseline.digest !== baseline.value.digest
      ) {
        throw new ConflictError(
          "Release authorization references unrecorded authority."
        );
      }
      const changeRevision = objectsByDigest.get(
        candidate.value.changeRevisionDigest
      );
      const workOrder = objectsByDigest.get(
        candidate.value.workOrderDigest
      );
      const decisionRevisions =
        candidate.value.decisionRevisionDigests.map((digest) =>
          objectsByDigest.get(digest)
        );
      const evidence = evaluation.value.evidenceDigests.map((digest) =>
        objectsByDigest.get(digest)
      );
      if (
        changeRevision?.referenceKind !== "change-revision" ||
        workOrder?.referenceKind !== "work-order" ||
        decisionRevisions.some(
          (entry) => entry?.referenceKind !== "decision-revision"
        ) ||
        evidence.some((entry) => entry?.referenceKind !== "evidence")
      ) {
        throw new ConflictError(
          "Release authorization evaluation inputs are unrecorded."
        );
      }
      verifyReleaseAuthorizationBinding({
        authorization,
        evaluation: evaluation.value,
        candidate: candidate.value,
        changeRevision: changeRevision.value,
        decisionRevisions: decisionRevisions.map(
          (entry) => entry.value
        ),
        workOrder: workOrder.value,
        evidence: evidence.map((entry) => entry.value),
        policy: policy.value,
        approval: approval.value,
        previousStatus
      });
      if (consumedApprovals.has(authorization.approvalDigest)) {
        throw new ConflictError(
          "Release approval has already been consumed."
        );
      }
      consumedApprovals.set(
        authorization.approvalDigest,
        authorization.approvalConsumption
      );
      retainObject(authorization.approvalConsumption);
      latestStatuses.set(
        authorization.candidateDigest,
        authorization.releaseStatus
      );
      retainObject(authorization);
      continue;
    }

    const consumption = event.payload.consumption;
    workspaceId = assertWorkspace(
      workspaceId,
      consumption.workspaceId
    );
    const approvalEntry = [...objectsByDigest.values()].find(
      (entry) =>
        entry.referenceKind === "approval" &&
        entry.id === consumption.approvalId
    );
    const subject = objectsByDigest.get(consumption.subjectDigest);
    if (
      !approvalEntry ||
      approvalEntry.value.digest !== consumption.approvalDigest ||
      approvalEntry.value.binding.actionIntentDigest !==
        consumption.actionIntentDigest ||
      approvalEntry.value.purpose !== consumption.purpose ||
      !subject ||
      (consumption.purpose === "work-order" &&
        subject.referenceKind !== "work-order") ||
      (consumption.purpose === "release" &&
        subject.referenceKind !== "release-baseline")
    ) {
      throw new ConflictError(
        "Approval consumption is not bound to recorded authority."
      );
    }
    if (consumedApprovals.has(consumption.approvalDigest)) {
      throw new ConflictError(
        "Release approval has already been consumed."
      );
    }
    consumedApprovals.set(
      consumption.approvalDigest,
      consumption
    );
    retainObject(consumption);
  }

  return immutableJson({
    schemaVersion: RELEASE_EVIDENCE_SCHEMA_VERSION,
    kind: STATE_KIND,
    workspaceId,
    eventCount: events.length,
    headDigest,
    objects: [...objects.values()],
    relationships: [...relationships.values()],
    latestStatuses: [...latestStatuses.values()],
    approvalConsumptions: [...consumedApprovals.values()]
  });
}

export function createReleaseDomainEvent({
  currentEvents,
  eventId,
  eventType,
  actor,
  occurredAt,
  payload
}) {
  replayReleaseEvidenceDomain(currentEvents);
  const unsigned = normalizeEventUnsigned({
    schemaVersion: RELEASE_EVIDENCE_SCHEMA_VERSION,
    kind: EVENT_KIND,
    sequence: currentEvents.length + 1,
    eventId,
    eventType,
    previousDigest:
      currentEvents.length === 0
        ? null
        : currentEvents.at(-1).digest,
    actor,
    occurredAt,
    payload
  });
  const event = immutableJson({
    ...unsigned,
    digest: digestObject(unsigned)
  });
  replayReleaseEvidenceDomain([...currentEvents, event]);
  return event;
}

export function verifyReleaseDomainEventChain(events) {
  const state = replayReleaseEvidenceDomain(events);
  return immutableJson({
    valid: true,
    eventCount: state.eventCount,
    headDigest: state.headDigest
  });
}
