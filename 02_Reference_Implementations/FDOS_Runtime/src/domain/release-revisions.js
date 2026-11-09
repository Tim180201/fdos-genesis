import {
  ConflictError,
  IntegrityError,
  ValidationError
} from "../kernel/errors.js";
import {
  assertPlainObject,
  enumValue,
  isoDate,
  requiredString
} from "../kernel/validation.js";
import {
  CLASSIFICATIONS,
  RELEASE_EVIDENCE_SCHEMA_VERSION,
  changedAuthorityProjection,
  contentAddressed,
  exactKeys,
  normalizedDigest,
  normalizedDigestList,
  normalizedInteger,
  normalizedPolicyBinding,
  normalizedPrincipal,
  normalizedStableId,
  normalizedStringList,
  verifyContentAddressed
} from "./release-evidence-common.js";

const CHANGE_KIND = "fdos-release-evidence-change-revision";
const DECISION_KIND = "fdos-release-evidence-decision-revision";
const EVIDENCE_TYPE_PATTERN = /^[a-z][a-z0-9.-]{1,79}$/;
const CRITERION_ID_PATTERN = /^[A-Z][A-Z0-9-]{1,39}$/;

const changeKeys = [
  "acceptanceCriteria",
  "changeId",
  "classification",
  "createdAt",
  "createdBy",
  "decisionRevisionDigests",
  "kind",
  "owningScope",
  "policy",
  "problemStatement",
  "repositoryConstraints",
  "requiredEvidenceTypes",
  "revision",
  "schemaVersion",
  "supersedesDigest",
  "title",
  "workspaceId"
];

const decisionKeys = [
  "appliesToChangeIds",
  "authority",
  "constraints",
  "createdAt",
  "decisionId",
  "effectiveAt",
  "expiresAt",
  "kind",
  "outcome",
  "revision",
  "schemaVersion",
  "statement",
  "supersedesDigest",
  "title",
  "workspaceId"
];

function normalizedRevision(value, field) {
  return normalizedInteger(value, field, {
    minimum: 1,
    maximum: 1_000_000
  });
}

function normalizedSupersedes(value, revision, field) {
  const digest = normalizedDigest(value, field, {
    nullable: true
  });
  if (
    (revision === 1 && digest !== null) ||
    (revision > 1 && digest === null)
  ) {
    throw new ValidationError(
      `${field} does not match the revision sequence.`
    );
  }
  return digest;
}

function normalizeAcceptanceCriteria(value, ErrorType = ValidationError) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 64) {
    throw new ErrorType(
      "Change acceptance criteria must contain between one and 64 items."
    );
  }
  const normalized = value.map((criterion, index) => {
    exactKeys(
      criterion,
      ["id", "statement"],
      `change acceptance criterion ${index}`,
      ErrorType
    );
    return {
      id: requiredString(
        criterion.id,
        `change acceptance criterion ${index} id`,
        { max: 40, pattern: CRITERION_ID_PATTERN }
      ),
      statement: requiredString(
        criterion.statement,
        `change acceptance criterion ${index} statement`,
        { max: 2_000 }
      )
    };
  });
  if (
    new Set(normalized.map((criterion) => criterion.id)).size !==
    normalized.length
  ) {
    throw new ErrorType(
      "Change acceptance criterion identifiers must be unique."
    );
  }
  return normalized.sort((left, right) =>
    left.id.localeCompare(right.id)
  );
}

function normalizedPathPrefix(value, field) {
  const prefix = requiredString(value, field, {
    max: 300,
    pattern: /^[a-zA-Z0-9._/-]+$/
  });
  if (
    prefix.startsWith("/") ||
    prefix.includes("\\") ||
    prefix.split("/").some((segment) =>
      segment === "" || segment === "." || segment === ".."
    )
  ) {
    throw new ValidationError(`${field} is not a safe relative path.`);
  }
  return prefix;
}

function normalizeRepositoryConstraints(
  value,
  ErrorType = ValidationError
) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 16) {
    throw new ErrorType(
      "Change repository constraints must contain between one and 16 items."
    );
  }
  const normalized = value.map((constraint, index) => {
    exactKeys(
      constraint,
      ["allowedPathPrefixes", "baseBranch", "repositoryId"],
      `change repository constraint ${index}`,
      ErrorType
    );
    if (!Array.isArray(constraint.allowedPathPrefixes)) {
      throw new ErrorType(
        "Change repository path constraints must be a list."
      );
    }
    const allowedPathPrefixes = constraint.allowedPathPrefixes.map(
      (entry, pathIndex) =>
        normalizedPathPrefix(
          entry,
          `change repository constraint ${index} path ${pathIndex}`
        )
    );
    if (
      allowedPathPrefixes.length < 1 ||
      allowedPathPrefixes.length > 64 ||
      new Set(allowedPathPrefixes).size !== allowedPathPrefixes.length
    ) {
      throw new ErrorType(
        "Change repository path constraints are invalid."
      );
    }
    return {
      repositoryId: normalizedStableId(
        constraint.repositoryId,
        `change repository constraint ${index} repository`
      ),
      baseBranch: requiredString(
        constraint.baseBranch,
        `change repository constraint ${index} branch`,
        {
          max: 200,
          pattern: /^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/
        }
      ),
      allowedPathPrefixes: allowedPathPrefixes.sort()
    };
  });
  if (
    new Set(
      normalized.map((constraint) => constraint.repositoryId)
    ).size !== normalized.length
  ) {
    throw new ErrorType(
      "Change repository constraints contain duplicate repositories."
    );
  }
  return normalized.sort((left, right) =>
    left.repositoryId.localeCompare(right.repositoryId)
  );
}

function normalizeChangeUnsigned(source, ErrorType = ValidationError) {
  exactKeys(source, changeKeys, "change revision", ErrorType);
  if (
    source.schemaVersion !== RELEASE_EVIDENCE_SCHEMA_VERSION ||
    source.kind !== CHANGE_KIND
  ) {
    throw new ErrorType("Change revision format is unsupported.");
  }
  const revision = normalizedRevision(
    source.revision,
    "change revision number"
  );
  return {
    schemaVersion: RELEASE_EVIDENCE_SCHEMA_VERSION,
    kind: CHANGE_KIND,
    workspaceId: normalizedStableId(
      source.workspaceId,
      "change workspace id"
    ),
    changeId: normalizedStableId(source.changeId, "change id"),
    revision,
    supersedesDigest: normalizedSupersedes(
      source.supersedesDigest,
      revision,
      "change supersedes digest"
    ),
    title: requiredString(source.title, "change title", {
      max: 200
    }),
    problemStatement: requiredString(
      source.problemStatement,
      "change problem statement",
      { max: 8_000 }
    ),
    acceptanceCriteria: normalizeAcceptanceCriteria(
      source.acceptanceCriteria,
      ErrorType
    ),
    decisionRevisionDigests: normalizedDigestList(
      source.decisionRevisionDigests,
      "change decision revisions",
      { maximum: 64 }
    ),
    requiredEvidenceTypes: normalizedStringList(
      source.requiredEvidenceTypes,
      "change required evidence types",
      {
        minimum: 1,
        maximum: 64,
        itemMaximum: 80,
        pattern: EVIDENCE_TYPE_PATTERN
      }
    ),
    repositoryConstraints: normalizeRepositoryConstraints(
      source.repositoryConstraints,
      ErrorType
    ),
    policy: normalizedPolicyBinding(
      source.policy,
      "change policy",
      ErrorType
    ),
    classification: enumValue(
      source.classification,
      "change classification",
      CLASSIFICATIONS
    ),
    owningScope: normalizedStableId(
      source.owningScope,
      "change owning scope"
    ),
    createdAt: isoDate(source.createdAt, "change createdAt"),
    createdBy: normalizedPrincipal(
      source.createdBy,
      "change creator",
      { allowedTypes: ["human"] }
    )
  };
}

function buildChange(source) {
  return contentAddressed(normalizeChangeUnsigned(source));
}

export function createChangeRevision(source) {
  assertPlainObject(source, "change revision input");
  return buildChange({
    ...source,
    schemaVersion: RELEASE_EVIDENCE_SCHEMA_VERSION,
    kind: CHANGE_KIND,
    revision: 1,
    supersedesDigest: null
  });
}

export function verifyChangeRevision(value) {
  verifyContentAddressed(value, {
    field: "change revision",
    expectedKeys: changeKeys,
    normalizeUnsigned: normalizeChangeUnsigned,
    ErrorType: IntegrityError
  });
  return true;
}

export function reviseChangeRevision(
  previous,
  changes,
  { createdAt, createdBy }
) {
  verifyChangeRevision(previous);
  assertPlainObject(changes, "change revision changes");
  const allowed = new Set([
    "acceptanceCriteria",
    "classification",
    "decisionRevisionDigests",
    "owningScope",
    "policy",
    "problemStatement",
    "repositoryConstraints",
    "requiredEvidenceTypes",
    "title"
  ]);
  const keys = Object.keys(changes);
  if (
    keys.length < 1 ||
    keys.some((key) => !allowed.has(key))
  ) {
    throw new ValidationError(
      "Change revision changes contain an unsupported field."
    );
  }
  const candidateSource = {
    ...previous,
    ...changes,
    revision: previous.revision + 1,
    supersedesDigest: previous.digest,
    createdAt,
    createdBy
  };
  delete candidateSource.digest;
  const candidate = buildChange(candidateSource);
  if (
    !changedAuthorityProjection(previous, candidate, [
      "createdAt",
      "createdBy",
      "digest",
      "revision",
      "supersedesDigest"
    ])
  ) {
    throw new ConflictError(
      "A new change revision requires a material authority-bearing change."
    );
  }
  return candidate;
}

function normalizeDecisionUnsigned(source, ErrorType = ValidationError) {
  exactKeys(source, decisionKeys, "decision revision", ErrorType);
  if (
    source.schemaVersion !== RELEASE_EVIDENCE_SCHEMA_VERSION ||
    source.kind !== DECISION_KIND
  ) {
    throw new ErrorType("Decision revision format is unsupported.");
  }
  const revision = normalizedRevision(
    source.revision,
    "decision revision number"
  );
  const effectiveAt = isoDate(
    source.effectiveAt,
    "decision effectiveAt"
  );
  const expiresAt =
    source.expiresAt === null
      ? null
      : isoDate(source.expiresAt, "decision expiresAt");
  if (
    expiresAt !== null &&
    Date.parse(expiresAt) <= Date.parse(effectiveAt)
  ) {
    throw new ErrorType("Decision expiration is not after its effect.");
  }
  return {
    schemaVersion: RELEASE_EVIDENCE_SCHEMA_VERSION,
    kind: DECISION_KIND,
    workspaceId: normalizedStableId(
      source.workspaceId,
      "decision workspace id"
    ),
    decisionId: normalizedStableId(
      source.decisionId,
      "decision id"
    ),
    revision,
    supersedesDigest: normalizedSupersedes(
      source.supersedesDigest,
      revision,
      "decision supersedes digest"
    ),
    title: requiredString(source.title, "decision title", {
      max: 200
    }),
    statement: requiredString(
      source.statement,
      "decision statement",
      { max: 8_000 }
    ),
    outcome: enumValue(
      source.outcome,
      "decision outcome",
      ["approved", "rejected", "constrained", "deferred"]
    ),
    constraints: normalizedStringList(
      source.constraints,
      "decision constraints",
      { maximum: 32, itemMaximum: 1_000 }
    ),
    appliesToChangeIds: normalizedStringList(
      source.appliesToChangeIds,
      "decision applicable changes",
      {
        minimum: 1,
        maximum: 64,
        itemMaximum: 160,
        pattern: /^[a-z][a-z0-9-]{1,31}:[a-zA-Z0-9][a-zA-Z0-9._:-]{1,127}$/
      }
    ),
    authority: normalizedPrincipal(
      source.authority,
      "decision authority",
      { allowedTypes: ["human"] }
    ),
    effectiveAt,
    expiresAt,
    createdAt: isoDate(source.createdAt, "decision createdAt")
  };
}

function buildDecision(source) {
  return contentAddressed(normalizeDecisionUnsigned(source));
}

export function createDecisionRevision(source) {
  assertPlainObject(source, "decision revision input");
  return buildDecision({
    ...source,
    schemaVersion: RELEASE_EVIDENCE_SCHEMA_VERSION,
    kind: DECISION_KIND,
    revision: 1,
    supersedesDigest: null
  });
}

export function verifyDecisionRevision(value) {
  verifyContentAddressed(value, {
    field: "decision revision",
    expectedKeys: decisionKeys,
    normalizeUnsigned: normalizeDecisionUnsigned,
    ErrorType: IntegrityError
  });
  return true;
}

export function reviseDecisionRevision(
  previous,
  changes,
  { createdAt }
) {
  verifyDecisionRevision(previous);
  assertPlainObject(changes, "decision revision changes");
  const allowed = new Set([
    "appliesToChangeIds",
    "authority",
    "constraints",
    "effectiveAt",
    "expiresAt",
    "outcome",
    "statement",
    "title"
  ]);
  const keys = Object.keys(changes);
  if (
    keys.length < 1 ||
    keys.some((key) => !allowed.has(key))
  ) {
    throw new ValidationError(
      "Decision revision changes contain an unsupported field."
    );
  }
  const candidateSource = {
    ...previous,
    ...changes,
    revision: previous.revision + 1,
    supersedesDigest: previous.digest,
    createdAt
  };
  delete candidateSource.digest;
  const candidate = buildDecision(candidateSource);
  if (
    !changedAuthorityProjection(previous, candidate, [
      "createdAt",
      "digest",
      "revision",
      "supersedesDigest"
    ])
  ) {
    throw new ConflictError(
      "A new decision revision requires a material authority-bearing change."
    );
  }
  return candidate;
}
