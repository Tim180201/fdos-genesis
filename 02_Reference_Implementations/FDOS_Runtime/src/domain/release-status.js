import {
  ConflictError,
  IntegrityError,
  ValidationError
} from "../kernel/errors.js";
import {
  enumValue,
  isoDate
} from "../kernel/validation.js";
import {
  RELEASE_EVIDENCE_SCHEMA_VERSION,
  contentAddressed,
  exactKeys,
  normalizedDigest,
  normalizedInteger,
  normalizedPrincipal,
  verifyContentAddressed
} from "./release-evidence-common.js";

const STATUS_KIND = "fdos-release-evidence-status-revision";

export const RELEASE_STATUS_AXES = Object.freeze({
  evidence: Object.freeze([
    "missing",
    "observed",
    "verified",
    "stale",
    "invalid",
    "unknown"
  ]),
  implementation: Object.freeze([
    "planned",
    "active",
    "completed",
    "superseded",
    "failed"
  ]),
  review: Object.freeze([
    "not-requested",
    "pending",
    "changes-requested",
    "accepted"
  ]),
  approval: Object.freeze([
    "not-required",
    "pending",
    "valid",
    "expired",
    "consumed",
    "revoked"
  ]),
  release: Object.freeze([
    "draft",
    "ineligible",
    "eligible",
    "authorized",
    "published",
    "withdrawn"
  ])
});

const transitions = Object.freeze({
  evidence: Object.freeze({
    missing: ["observed", "unknown"],
    observed: ["verified", "stale", "invalid", "unknown"],
    verified: ["stale", "invalid", "unknown"],
    stale: ["observed", "verified", "invalid", "unknown"],
    invalid: ["observed", "unknown"],
    unknown: ["observed", "verified", "stale", "invalid"]
  }),
  implementation: Object.freeze({
    planned: ["active", "superseded"],
    active: ["completed", "failed", "superseded"],
    completed: ["superseded"],
    superseded: [],
    failed: ["active", "superseded"]
  }),
  review: Object.freeze({
    "not-requested": ["pending"],
    pending: ["changes-requested", "accepted"],
    "changes-requested": ["pending"],
    accepted: ["pending"]
  }),
  approval: Object.freeze({
    "not-required": ["pending"],
    pending: ["valid", "revoked"],
    valid: ["expired", "consumed", "revoked"],
    expired: ["pending"],
    consumed: [],
    revoked: ["pending"]
  }),
  release: Object.freeze({
    draft: ["ineligible", "eligible"],
    ineligible: ["draft", "eligible"],
    eligible: ["ineligible", "authorized"],
    authorized: ["ineligible", "published", "withdrawn"],
    published: ["withdrawn"],
    withdrawn: []
  })
});

const statusKeys = [
  "axes",
  "candidateDigest",
  "changedAxis",
  "changedFrom",
  "changedTo",
  "kind",
  "previousDigest",
  "revision",
  "schemaVersion",
  "transitionedAt",
  "transitionedBy"
];

const axisKeys = [
  "approval",
  "evidence",
  "implementation",
  "release",
  "review"
];

function normalizeAxes(value, ErrorType = ValidationError) {
  exactKeys(value, axisKeys, "release status axes", ErrorType);
  return Object.fromEntries(
    axisKeys.map((axis) => [
      axis,
      enumValue(
        value[axis],
        `release ${axis} status`,
        RELEASE_STATUS_AXES[axis]
      )
    ])
  );
}

function normalizeStatusUnsigned(
  source,
  ErrorType = ValidationError
) {
  exactKeys(source, statusKeys, "release status revision", ErrorType);
  if (
    source.schemaVersion !== RELEASE_EVIDENCE_SCHEMA_VERSION ||
    source.kind !== STATUS_KIND
  ) {
    throw new ErrorType("Release-status format is unsupported.");
  }
  const revision = normalizedInteger(
    source.revision,
    "release status revision",
    { minimum: 1, maximum: 1_000_000 }
  );
  const previousDigest = normalizedDigest(
    source.previousDigest,
    "release status previous digest",
    { nullable: true }
  );
  const changedAxis =
    source.changedAxis === "initial"
      ? "initial"
      : enumValue(
          source.changedAxis,
          "release changed axis",
          axisKeys
        );
  if (
    (revision === 1 &&
      (previousDigest !== null ||
        changedAxis !== "initial" ||
        source.changedFrom !== null ||
        source.changedTo !== null)) ||
    (revision > 1 &&
      (previousDigest === null ||
        changedAxis === "initial" ||
        source.changedFrom === null ||
        source.changedTo === null))
  ) {
    throw new ErrorType(
      "Release-status transition metadata is inconsistent."
    );
  }
  if (changedAxis !== "initial") {
    enumValue(
      source.changedFrom,
      "release status transition source",
      RELEASE_STATUS_AXES[changedAxis]
    );
    enumValue(
      source.changedTo,
      "release status transition target",
      RELEASE_STATUS_AXES[changedAxis]
    );
  }
  const axes = normalizeAxes(source.axes, ErrorType);
  if (
    revision === 1 &&
    (axes.evidence !== "missing" ||
      axes.implementation !== "planned" ||
      axes.review !== "not-requested" ||
      axes.approval !== "not-required" ||
      axes.release !== "draft")
  ) {
    throw new ErrorType(
      "Initial release status must use least-authoritative states."
    );
  }
  if (
    revision > 1 &&
    (axes[changedAxis] !== source.changedTo ||
      !transitions[changedAxis][source.changedFrom].includes(
        source.changedTo
      ))
  ) {
    throw new ErrorType(
      "Release-status transition metadata is invalid."
    );
  }
  return {
    schemaVersion: RELEASE_EVIDENCE_SCHEMA_VERSION,
    kind: STATUS_KIND,
    candidateDigest: normalizedDigest(
      source.candidateDigest,
      "release status candidate digest"
    ),
    revision,
    previousDigest,
    axes,
    changedAxis,
    changedFrom: source.changedFrom,
    changedTo: source.changedTo,
    transitionedAt: isoDate(
      source.transitionedAt,
      "release status transitionedAt"
    ),
    transitionedBy: normalizedPrincipal(
      source.transitionedBy,
      "release status actor",
      {
        allowedTypes: ["human", "agent", "service", "system"]
      }
    )
  };
}

export function createReleaseStatus({
  candidateDigest,
  transitionedAt,
  transitionedBy
}) {
  return contentAddressed(
    normalizeStatusUnsigned({
      schemaVersion: RELEASE_EVIDENCE_SCHEMA_VERSION,
      kind: STATUS_KIND,
      candidateDigest,
      revision: 1,
      previousDigest: null,
      axes: {
        evidence: "missing",
        implementation: "planned",
        review: "not-requested",
        approval: "not-required",
        release: "draft"
      },
      changedAxis: "initial",
      changedFrom: null,
      changedTo: null,
      transitionedAt,
      transitionedBy
    })
  );
}

export function verifyReleaseStatus(value) {
  verifyContentAddressed(value, {
    field: "release status revision",
    expectedKeys: statusKeys,
    normalizeUnsigned: normalizeStatusUnsigned,
    ErrorType: IntegrityError
  });
  return true;
}

export function transitionReleaseStatus(
  previous,
  {
    axis,
    to,
    transitionedAt,
    transitionedBy
  }
) {
  verifyReleaseStatus(previous);
  const normalizedAxis = enumValue(
    axis,
    "release transition axis",
    axisKeys
  );
  const normalizedTo = enumValue(
    to,
    "release transition target",
    RELEASE_STATUS_AXES[normalizedAxis]
  );
  const from = previous.axes[normalizedAxis];
  if (!transitions[normalizedAxis][from].includes(normalizedTo)) {
    throw new ConflictError(
      `Release ${normalizedAxis} cannot transition from ${from} to ${normalizedTo}.`
    );
  }
  return contentAddressed(
    normalizeStatusUnsigned({
      schemaVersion: RELEASE_EVIDENCE_SCHEMA_VERSION,
      kind: STATUS_KIND,
      candidateDigest: previous.candidateDigest,
      revision: previous.revision + 1,
      previousDigest: previous.digest,
      axes: {
        ...previous.axes,
        [normalizedAxis]: normalizedTo
      },
      changedAxis: normalizedAxis,
      changedFrom: from,
      changedTo: normalizedTo,
      transitionedAt,
      transitionedBy
    })
  );
}

export function verifyReleaseStatusTransition(previous, next) {
  verifyReleaseStatus(previous);
  verifyReleaseStatus(next);
  if (
    next.candidateDigest !== previous.candidateDigest ||
    next.revision !== previous.revision + 1 ||
    next.previousDigest !== previous.digest ||
    next.changedAxis === "initial" ||
    next.changedFrom !== previous.axes[next.changedAxis] ||
    next.changedTo !== next.axes[next.changedAxis] ||
    !transitions[next.changedAxis][next.changedFrom].includes(
      next.changedTo
    ) ||
    axisKeys.some(
      (axis) =>
        axis !== next.changedAxis &&
        previous.axes[axis] !== next.axes[axis]
    )
  ) {
    throw new IntegrityError(
      "Release status transition is not an exact one-axis successor."
    );
  }
  return true;
}
