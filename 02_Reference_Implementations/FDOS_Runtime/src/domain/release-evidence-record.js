import {
  IntegrityError,
  ValidationError
} from "../kernel/errors.js";
import {
  enumValue,
  isoDate,
  requiredString
} from "../kernel/validation.js";
import {
  CLASSIFICATIONS,
  RELEASE_EVIDENCE_SCHEMA_VERSION,
  contentAddressed,
  exactKeys,
  normalizedDigest,
  normalizedDigestList,
  normalizedObjectReference,
  normalizedPrincipal,
  normalizedSemver,
  normalizedStableId,
  verifyContentAddressed
} from "./release-evidence-common.js";

const EVIDENCE_KIND = "fdos-release-evidence-record";
const FINDING_KIND = "fdos-release-evidence-finding";

export const EVIDENCE_STATES = Object.freeze([
  "missing",
  "observed",
  "verified",
  "stale",
  "invalid",
  "unknown"
]);

export const FINDING_CODES = Object.freeze([
  "MISSING_EVIDENCE",
  "INVALID_EVIDENCE",
  "STALE_EVIDENCE",
  "UNKNOWN_EVIDENCE",
  "UNTRUSTED_PRODUCER",
  "SUBJECT_MISMATCH",
  "POLICY_MISMATCH",
  "INTEGRITY_MISMATCH",
  "APPROVAL_MISMATCH"
]);

const evidenceKeys = [
  "classification",
  "evaluatedAt",
  "evidenceId",
  "evidenceType",
  "freshness",
  "integrity",
  "kind",
  "observationDigest",
  "owningScope",
  "producer",
  "provenance",
  "schemaVersion",
  "state",
  "subject",
  "workspaceId"
];

const findingKeys = [
  "code",
  "createdAt",
  "evidenceDigests",
  "findingId",
  "kind",
  "message",
  "remediation",
  "ruleId",
  "schemaVersion",
  "severity",
  "state",
  "subject",
  "workspaceId"
];

function normalizeProducer(value, ErrorType = ValidationError) {
  exactKeys(
    value,
    ["id", "identityDigest", "type", "version"],
    "evidence producer",
    ErrorType
  );
  return {
    type: enumValue(
      value.type,
      "evidence producer type",
      ["human", "agent", "service", "system"]
    ),
    id: normalizedStableId(value.id, "evidence producer id"),
    version: normalizedSemver(
      value.version,
      "evidence producer version"
    ),
    identityDigest: normalizedDigest(
      value.identityDigest,
      "evidence producer identity"
    )
  };
}

function normalizeProvenance(value, ErrorType = ValidationError) {
  exactKeys(
    value,
    [
      "collectedAt",
      "collector",
      "sourceId",
      "sourceRevision",
      "sourceSystem"
    ],
    "evidence provenance",
    ErrorType
  );
  return {
    sourceSystem: requiredString(
      value.sourceSystem,
      "evidence provenance source system",
      {
        max: 80,
        pattern: /^[a-z][a-z0-9.-]{1,79}$/
      }
    ),
    sourceId: requiredString(
      value.sourceId,
      "evidence provenance source id",
      { max: 300 }
    ),
    sourceRevision: requiredString(
      value.sourceRevision,
      "evidence provenance source revision",
      { max: 300 }
    ),
    collector: normalizedPrincipal(
      value.collector,
      "evidence collector",
      {
        allowedTypes: ["human", "agent", "service", "system"]
      }
    ),
    collectedAt: isoDate(
      value.collectedAt,
      "evidence collectedAt"
    )
  };
}

function normalizeIntegrity(value, ErrorType = ValidationError) {
  exactKeys(
    value,
    ["algorithm", "digest", "state"],
    "evidence integrity",
    ErrorType
  );
  const state = enumValue(
    value.state,
    "evidence integrity state",
    ["observed", "verified", "invalid", "unknown"]
  );
  if (state === "unknown") {
    if (value.algorithm !== null || value.digest !== null) {
      throw new ErrorType(
        "Unknown evidence integrity cannot assert an algorithm or digest."
      );
    }
    return { state, algorithm: null, digest: null };
  }
  if (value.algorithm !== "sha256") {
    throw new ErrorType(
      "Observed evidence integrity must use SHA-256."
    );
  }
  return {
    state,
    algorithm: "sha256",
    digest: normalizedDigest(
      value.digest,
      "evidence integrity digest"
    )
  };
}

function normalizeFreshness(
  value,
  evaluatedAt,
  ErrorType = ValidationError
) {
  exactKeys(
    value,
    ["observedAt", "state", "validUntil"],
    "evidence freshness",
    ErrorType
  );
  const observedAt = isoDate(
    value.observedAt,
    "evidence observedAt"
  );
  if (Date.parse(observedAt) > Date.parse(evaluatedAt)) {
    throw new ErrorType(
      "Evidence cannot be evaluated before it was observed."
    );
  }
  const validUntil =
    value.validUntil === null
      ? null
      : isoDate(value.validUntil, "evidence validUntil");
  if (
    validUntil !== null &&
    Date.parse(validUntil) < Date.parse(observedAt)
  ) {
    throw new ErrorType(
      "Evidence freshness expires before observation."
    );
  }
  const state =
    validUntil === null
      ? "unknown"
      : Date.parse(evaluatedAt) <= Date.parse(validUntil)
        ? "fresh"
        : "stale";
  if (value.state !== state) {
    throw new ErrorType(
      "Evidence freshness state does not match its timestamps."
    );
  }
  return { state, observedAt, validUntil };
}

function evidenceState(integrity, freshness) {
  if (integrity.state === "invalid") return "invalid";
  if (
    integrity.state === "unknown" ||
    freshness.state === "unknown"
  ) {
    return "unknown";
  }
  if (freshness.state === "stale") return "stale";
  if (integrity.state === "verified") return "verified";
  return "observed";
}

function normalizeEvidenceUnsigned(
  source,
  ErrorType = ValidationError
) {
  exactKeys(source, evidenceKeys, "evidence record", ErrorType);
  if (
    source.schemaVersion !== RELEASE_EVIDENCE_SCHEMA_VERSION ||
    source.kind !== EVIDENCE_KIND
  ) {
    throw new ErrorType("Evidence-record format is unsupported.");
  }
  const evaluatedAt = isoDate(
    source.evaluatedAt,
    "evidence evaluatedAt"
  );
  const integrity = normalizeIntegrity(source.integrity, ErrorType);
  const freshness = normalizeFreshness(
    source.freshness,
    evaluatedAt,
    ErrorType
  );
  const derivedState = evidenceState(integrity, freshness);
  if (source.state !== derivedState) {
    throw new ErrorType(
      "Evidence state does not match integrity and freshness."
    );
  }
  const provenance = normalizeProvenance(
    source.provenance,
    ErrorType
  );
  if (
    Date.parse(provenance.collectedAt) > Date.parse(evaluatedAt)
  ) {
    throw new ErrorType(
      "Evidence cannot be evaluated before collection."
    );
  }
  return {
    schemaVersion: RELEASE_EVIDENCE_SCHEMA_VERSION,
    kind: EVIDENCE_KIND,
    workspaceId: normalizedStableId(
      source.workspaceId,
      "evidence workspace id"
    ),
    evidenceId: normalizedStableId(
      source.evidenceId,
      "evidence id"
    ),
    evidenceType: requiredString(
      source.evidenceType,
      "evidence type",
      {
        max: 80,
        pattern: /^[a-z][a-z0-9.-]{1,79}$/
      }
    ),
    subject: normalizedObjectReference(
      source.subject,
      "evidence subject",
      ErrorType
    ),
    producer: normalizeProducer(source.producer, ErrorType),
    provenance,
    integrity,
    freshness,
    observationDigest: normalizedDigest(
      source.observationDigest,
      "evidence observation digest"
    ),
    classification: enumValue(
      source.classification,
      "evidence classification",
      CLASSIFICATIONS
    ),
    owningScope: normalizedStableId(
      source.owningScope,
      "evidence owning scope"
    ),
    evaluatedAt,
    state: derivedState
  };
}

export function createEvidenceRecord(source) {
  return contentAddressed(
    normalizeEvidenceUnsigned({
      ...source,
      schemaVersion: RELEASE_EVIDENCE_SCHEMA_VERSION,
      kind: EVIDENCE_KIND,
      state: source.state || evidenceState(
        source.integrity,
        source.freshness
      )
    })
  );
}

export function verifyEvidenceRecord(value) {
  verifyContentAddressed(value, {
    field: "evidence record",
    expectedKeys: evidenceKeys,
    normalizeUnsigned: normalizeEvidenceUnsigned,
    ErrorType: IntegrityError
  });
  return true;
}

function normalizeFindingUnsigned(
  source,
  ErrorType = ValidationError
) {
  exactKeys(source, findingKeys, "release finding", ErrorType);
  if (
    source.schemaVersion !== RELEASE_EVIDENCE_SCHEMA_VERSION ||
    source.kind !== FINDING_KIND ||
    source.state !== "open"
  ) {
    throw new ErrorType("Release-finding format is unsupported.");
  }
  return {
    schemaVersion: RELEASE_EVIDENCE_SCHEMA_VERSION,
    kind: FINDING_KIND,
    workspaceId: normalizedStableId(
      source.workspaceId,
      "finding workspace id"
    ),
    findingId: normalizedStableId(
      source.findingId,
      "finding id"
    ),
    ruleId: requiredString(source.ruleId, "finding rule id", {
      max: 120,
      pattern: /^[a-z][a-z0-9.-]{2,119}$/
    }),
    code: enumValue(source.code, "finding code", FINDING_CODES),
    severity: enumValue(
      source.severity,
      "finding severity",
      ["info", "low", "medium", "high", "critical"]
    ),
    subject: normalizedObjectReference(
      source.subject,
      "finding subject",
      ErrorType
    ),
    evidenceDigests: normalizedDigestList(
      source.evidenceDigests,
      "finding evidence digests",
      { maximum: 64 }
    ),
    message: requiredString(source.message, "finding message", {
      max: 1_000
    }),
    remediation: requiredString(
      source.remediation,
      "finding remediation",
      { max: 1_000 }
    ),
    state: "open",
    createdAt: isoDate(source.createdAt, "finding createdAt")
  };
}

export function createReleaseFinding(source) {
  return contentAddressed(
    normalizeFindingUnsigned({
      ...source,
      schemaVersion: RELEASE_EVIDENCE_SCHEMA_VERSION,
      kind: FINDING_KIND,
      state: "open"
    })
  );
}

export function verifyReleaseFinding(value) {
  verifyContentAddressed(value, {
    field: "release finding",
    expectedKeys: findingKeys,
    normalizeUnsigned: normalizeFindingUnsigned,
    ErrorType: IntegrityError
  });
  return true;
}
