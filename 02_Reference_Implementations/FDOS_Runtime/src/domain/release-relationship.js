import {
  IntegrityError,
  ValidationError
} from "../kernel/errors.js";
import { isoDate } from "../kernel/validation.js";
import {
  RELEASE_EVIDENCE_SCHEMA_VERSION,
  contentAddressed,
  exactKeys,
  normalizedObjectReference,
  normalizedPrincipal,
  normalizedStableId,
  verifyContentAddressed
} from "./release-evidence-common.js";

const RELATIONSHIP_KIND =
  "fdos-release-evidence-relationship";

const relationshipKeys = [
  "createdAt",
  "createdBy",
  "from",
  "kind",
  "relationshipId",
  "schemaVersion",
  "to",
  "type",
  "workspaceId"
];

const relationshipRules = Object.freeze({
  "revision-supersedes": [
    ["change-revision", "change-revision"],
    ["decision-revision", "decision-revision"]
  ],
  "decision-applies-to-change": [
    ["decision-revision", "change-revision"]
  ],
  "work-order-implements-change": [
    ["work-order", "change-revision"]
  ],
  "work-order-depends-on-work-order": [
    ["work-order", "work-order"]
  ],
  "candidate-uses-change": [
    ["release-candidate", "change-revision"]
  ],
  "candidate-uses-decision": [
    ["release-candidate", "decision-revision"]
  ],
  "candidate-uses-work-order": [
    ["release-candidate", "work-order"]
  ],
  "evidence-observes-subject": [
    ["evidence", "change-revision"],
    ["evidence", "decision-revision"],
    ["evidence", "work-order"],
    ["evidence", "release-candidate"],
    ["evidence", "release-baseline"]
  ],
  "finding-blocks-candidate": [
    ["finding", "release-candidate"],
    ["finding", "release-baseline"]
  ],
  "approval-authorizes-work-order": [
    ["approval", "work-order"]
  ],
  "approval-authorizes-release": [
    ["approval", "release-baseline"]
  ],
  "consumption-uses-approval": [
    ["approval-consumption", "approval"]
  ]
});

function normalizeRelationshipUnsigned(
  source,
  ErrorType = ValidationError
) {
  exactKeys(
    source,
    relationshipKeys,
    "release relationship",
    ErrorType
  );
  if (
    source.schemaVersion !== RELEASE_EVIDENCE_SCHEMA_VERSION ||
    source.kind !== RELATIONSHIP_KIND ||
    !Object.hasOwn(relationshipRules, source.type)
  ) {
    throw new ErrorType(
      "Release-evidence relationship type is unsupported."
    );
  }
  const from = normalizedObjectReference(
    source.from,
    "relationship source",
    ErrorType
  );
  const to = normalizedObjectReference(
    source.to,
    "relationship target",
    ErrorType
  );
  const admitted = relationshipRules[source.type].some(
    ([fromKind, toKind]) =>
      from.kind === fromKind && to.kind === toKind
  );
  if (!admitted) {
    throw new ErrorType(
      "Release-evidence relationship endpoints are incompatible."
    );
  }
  if (
    source.type === "revision-supersedes" &&
    from.id !== to.id
  ) {
    throw new ErrorType(
      "A revision can supersede only the same stable object."
    );
  }
  return {
    schemaVersion: RELEASE_EVIDENCE_SCHEMA_VERSION,
    kind: RELATIONSHIP_KIND,
    workspaceId: normalizedStableId(
      source.workspaceId,
      "relationship workspace id"
    ),
    relationshipId: normalizedStableId(
      source.relationshipId,
      "relationship id"
    ),
    type: source.type,
    from,
    to,
    createdAt: isoDate(
      source.createdAt,
      "relationship createdAt"
    ),
    createdBy: normalizedPrincipal(
      source.createdBy,
      "relationship creator",
      {
        allowedTypes: ["human", "agent", "service", "system"]
      }
    )
  };
}

export function createReleaseRelationship(source) {
  return contentAddressed(
    normalizeRelationshipUnsigned({
      ...source,
      schemaVersion: RELEASE_EVIDENCE_SCHEMA_VERSION,
      kind: RELATIONSHIP_KIND
    })
  );
}

export function verifyReleaseRelationship(value) {
  verifyContentAddressed(value, {
    field: "release relationship",
    expectedKeys: relationshipKeys,
    normalizeUnsigned: normalizeRelationshipUnsigned,
    ErrorType: IntegrityError
  });
  return true;
}
