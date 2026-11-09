import {
  CANONICAL_JSON_FORMAT_VERSION
} from "../kernel/canonical-json.js";
import {
  IntegrityError,
  ValidationError
} from "../kernel/errors.js";
import {
  assertPlainObject,
  isoDate,
  requiredString
} from "../kernel/validation.js";
import {
  RELEASE_EVIDENCE_SCHEMA_VERSION,
  contentAddressed,
  exactKeys,
  normalizedDigest,
  normalizedDigestList,
  normalizedInteger,
  normalizedPolicyBinding,
  normalizedPrincipal,
  normalizedRoleId,
  normalizedStableId,
  normalizedStringList,
  verifyContentAddressed
} from "./release-evidence-common.js";

const WORK_ORDER_KIND = "fdos-release-evidence-work-order";
const RELEASE_CANDIDATE_KIND =
  "fdos-release-evidence-release-candidate";
const RELEASE_BASELINE_KIND =
  "fdos-release-evidence-release-baseline";

const workOrderKeys = [
  "acceptanceCriterionIds",
  "allowedPathPrefixes",
  "allowedRepositories",
  "allowedTools",
  "assignedRoleId",
  "budget",
  "changeRevisionDigest",
  "contextProjectionDigest",
  "decisionRevisionDigests",
  "dependencyWorkOrderDigests",
  "expectedOutputs",
  "implementationScope",
  "kind",
  "nonGoals",
  "proposedAt",
  "proposedBy",
  "schemaVersion",
  "testPlan",
  "workOrderId",
  "workspaceId"
];

const candidateKeys = [
  "artifactDigest",
  "candidateId",
  "canonicalJsonFormatVersion",
  "changeRevisionDigest",
  "createdAt",
  "decisionRevisionDigests",
  "kind",
  "policy",
  "repositoryId",
  "schemaVersion",
  "sourceRevision",
  "verifier",
  "workOrderDigest",
  "workspaceId"
];

const baselineKeys = [
  "artifactDigest",
  "candidateDigest",
  "candidateId",
  "canonicalJsonFormatVersion",
  "changeRevisionDigest",
  "decisionRevisionDigests",
  "kind",
  "policy",
  "repositoryId",
  "schemaVersion",
  "sourceRevision",
  "unresolvedFindingDigests",
  "verifier",
  "workOrderDigest",
  "workspaceId"
];

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

function normalizedPathList(value, field) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 128) {
    throw new ValidationError(
      `${field} must contain between one and 128 paths.`
    );
  }
  const normalized = value.map((entry, index) =>
    normalizedPathPrefix(entry, `${field}[${index}]`)
  );
  if (new Set(normalized).size !== normalized.length) {
    throw new ValidationError(`${field} contains duplicate paths.`);
  }
  return normalized.sort();
}

function normalizeBudget(value, ErrorType = ValidationError) {
  exactKeys(
    value,
    [
      "currency",
      "maxCostMinorUnits",
      "maxDurationMinutes",
      "maxModelTokens"
    ],
    "work-order budget",
    ErrorType
  );
  return {
    maxDurationMinutes: normalizedInteger(
      value.maxDurationMinutes,
      "work-order maximum duration",
      { minimum: 1, maximum: 43_200 }
    ),
    maxModelTokens: normalizedInteger(
      value.maxModelTokens,
      "work-order maximum model tokens",
      { minimum: 0, maximum: 100_000_000 }
    ),
    maxCostMinorUnits: normalizedInteger(
      value.maxCostMinorUnits,
      "work-order maximum cost",
      { minimum: 0, maximum: 1_000_000_000 }
    ),
    currency: requiredString(
      value.currency,
      "work-order budget currency",
      { max: 3, min: 3, pattern: /^[A-Z]{3}$/ }
    )
  };
}

function normalizeWorkOrderUnsigned(
  source,
  ErrorType = ValidationError
) {
  exactKeys(source, workOrderKeys, "work order", ErrorType);
  if (
    source.schemaVersion !== RELEASE_EVIDENCE_SCHEMA_VERSION ||
    source.kind !== WORK_ORDER_KIND
  ) {
    throw new ErrorType("Work-order format is unsupported.");
  }
  return {
    schemaVersion: RELEASE_EVIDENCE_SCHEMA_VERSION,
    kind: WORK_ORDER_KIND,
    workspaceId: normalizedStableId(
      source.workspaceId,
      "work-order workspace id"
    ),
    workOrderId: normalizedStableId(
      source.workOrderId,
      "work-order id"
    ),
    changeRevisionDigest: normalizedDigest(
      source.changeRevisionDigest,
      "work-order change revision"
    ),
    decisionRevisionDigests: normalizedDigestList(
      source.decisionRevisionDigests,
      "work-order decision revisions",
      { maximum: 64 }
    ),
    assignedRoleId: normalizedRoleId(
      source.assignedRoleId,
      "work-order assigned role"
    ),
    implementationScope: normalizedStringList(
      source.implementationScope,
      "work-order implementation scope",
      { minimum: 1, maximum: 64, itemMaximum: 1_000 }
    ),
    nonGoals: normalizedStringList(
      source.nonGoals,
      "work-order non-goals",
      { maximum: 64, itemMaximum: 1_000 }
    ),
    allowedRepositories: normalizedStringList(
      source.allowedRepositories,
      "work-order allowed repositories",
      {
        minimum: 1,
        maximum: 16,
        itemMaximum: 160,
        pattern: /^[a-z][a-z0-9-]{1,31}:[a-zA-Z0-9][a-zA-Z0-9._:-]{1,127}$/
      }
    ),
    allowedPathPrefixes: normalizedPathList(
      source.allowedPathPrefixes,
      "work-order allowed paths"
    ),
    allowedTools: normalizedStringList(
      source.allowedTools,
      "work-order allowed tools",
      {
        minimum: 1,
        maximum: 64,
        itemMaximum: 120,
        pattern: /^[a-z][a-z0-9._:-]{1,119}$/
      }
    ),
    expectedOutputs: normalizedStringList(
      source.expectedOutputs,
      "work-order expected outputs",
      { minimum: 1, maximum: 64, itemMaximum: 500 }
    ),
    acceptanceCriterionIds: normalizedStringList(
      source.acceptanceCriterionIds,
      "work-order acceptance criteria",
      {
        minimum: 1,
        maximum: 64,
        itemMaximum: 40,
        pattern: /^[A-Z][A-Z0-9-]{1,39}$/
      }
    ),
    testPlan: normalizedStringList(
      source.testPlan,
      "work-order test plan",
      { minimum: 1, maximum: 64, itemMaximum: 1_000 }
    ),
    dependencyWorkOrderDigests: normalizedDigestList(
      source.dependencyWorkOrderDigests,
      "work-order dependencies",
      { maximum: 64 }
    ),
    contextProjectionDigest: normalizedDigest(
      source.contextProjectionDigest,
      "work-order context projection"
    ),
    budget: normalizeBudget(source.budget, ErrorType),
    proposedAt: isoDate(
      source.proposedAt,
      "work-order proposedAt"
    ),
    proposedBy: normalizedPrincipal(
      source.proposedBy,
      "work-order proposer",
      { allowedTypes: ["human", "agent"] }
    )
  };
}

export function createWorkOrder(source) {
  assertPlainObject(source, "work-order input");
  return contentAddressed(
    normalizeWorkOrderUnsigned({
      ...source,
      schemaVersion: RELEASE_EVIDENCE_SCHEMA_VERSION,
      kind: WORK_ORDER_KIND
    })
  );
}

export function verifyWorkOrder(value) {
  verifyContentAddressed(value, {
    field: "work order",
    expectedKeys: workOrderKeys,
    normalizeUnsigned: normalizeWorkOrderUnsigned,
    ErrorType: IntegrityError
  });
  return true;
}

function normalizeSourceRevision(value, ErrorType = ValidationError) {
  exactKeys(
    value,
    ["commit", "objectFormat", "tree"],
    "release source revision",
    ErrorType
  );
  const objectFormat = requiredString(
    value.objectFormat,
    "release source object format",
    { max: 6, pattern: /^(sha1|sha256)$/ }
  );
  const objectPattern =
    objectFormat === "sha1"
      ? /^[0-9a-f]{40}$/
      : /^[0-9a-f]{64}$/;
  return {
    objectFormat,
    commit: requiredString(
      value.commit,
      "release source commit",
      { max: 64, pattern: objectPattern }
    ),
    tree: requiredString(
      value.tree,
      "release source tree",
      { max: 64, pattern: objectPattern }
    )
  };
}

function normalizeCandidateUnsigned(
  source,
  ErrorType = ValidationError
) {
  exactKeys(source, candidateKeys, "release candidate", ErrorType);
  if (
    source.schemaVersion !== RELEASE_EVIDENCE_SCHEMA_VERSION ||
    source.kind !== RELEASE_CANDIDATE_KIND
  ) {
    throw new ErrorType("Release-candidate format is unsupported.");
  }
  if (
    source.canonicalJsonFormatVersion !==
    CANONICAL_JSON_FORMAT_VERSION
  ) {
    throw new ErrorType(
      "Release candidate uses an unsupported canonical JSON format."
    );
  }
  return {
    schemaVersion: RELEASE_EVIDENCE_SCHEMA_VERSION,
    kind: RELEASE_CANDIDATE_KIND,
    workspaceId: normalizedStableId(
      source.workspaceId,
      "release workspace id"
    ),
    candidateId: normalizedStableId(
      source.candidateId,
      "release candidate id"
    ),
    repositoryId: normalizedStableId(
      source.repositoryId,
      "release repository id"
    ),
    changeRevisionDigest: normalizedDigest(
      source.changeRevisionDigest,
      "release change revision"
    ),
    decisionRevisionDigests: normalizedDigestList(
      source.decisionRevisionDigests,
      "release decision revisions",
      { maximum: 64 }
    ),
    workOrderDigest: normalizedDigest(
      source.workOrderDigest,
      "release work order"
    ),
    sourceRevision: normalizeSourceRevision(
      source.sourceRevision,
      ErrorType
    ),
    artifactDigest: normalizedDigest(
      source.artifactDigest,
      "release artifact digest",
      { nullable: true }
    ),
    policy: normalizedPolicyBinding(
      source.policy,
      "release policy",
      ErrorType
    ),
    verifier: normalizedPolicyBinding(
      source.verifier,
      "release verifier",
      ErrorType
    ),
    canonicalJsonFormatVersion: CANONICAL_JSON_FORMAT_VERSION,
    createdAt: isoDate(source.createdAt, "release createdAt")
  };
}

export function createReleaseCandidate(source) {
  assertPlainObject(source, "release-candidate input");
  return contentAddressed(
    normalizeCandidateUnsigned({
      ...source,
      schemaVersion: RELEASE_EVIDENCE_SCHEMA_VERSION,
      kind: RELEASE_CANDIDATE_KIND,
      canonicalJsonFormatVersion:
        CANONICAL_JSON_FORMAT_VERSION
    })
  );
}

export function verifyReleaseCandidate(value) {
  verifyContentAddressed(value, {
    field: "release candidate",
    expectedKeys: candidateKeys,
    normalizeUnsigned: normalizeCandidateUnsigned,
    ErrorType: IntegrityError
  });
  return true;
}

function normalizeBaselineUnsigned(
  source,
  ErrorType = ValidationError
) {
  exactKeys(source, baselineKeys, "release baseline", ErrorType);
  if (
    source.schemaVersion !== RELEASE_EVIDENCE_SCHEMA_VERSION ||
    source.kind !== RELEASE_BASELINE_KIND ||
    source.canonicalJsonFormatVersion !==
      CANONICAL_JSON_FORMAT_VERSION
  ) {
    throw new ErrorType("Release-baseline format is unsupported.");
  }
  return {
    schemaVersion: RELEASE_EVIDENCE_SCHEMA_VERSION,
    kind: RELEASE_BASELINE_KIND,
    workspaceId: normalizedStableId(
      source.workspaceId,
      "baseline workspace id"
    ),
    candidateId: normalizedStableId(
      source.candidateId,
      "baseline candidate id"
    ),
    candidateDigest: normalizedDigest(
      source.candidateDigest,
      "baseline candidate digest"
    ),
    repositoryId: normalizedStableId(
      source.repositoryId,
      "baseline repository id"
    ),
    changeRevisionDigest: normalizedDigest(
      source.changeRevisionDigest,
      "baseline change revision"
    ),
    decisionRevisionDigests: normalizedDigestList(
      source.decisionRevisionDigests,
      "baseline decision revisions",
      { maximum: 64 }
    ),
    workOrderDigest: normalizedDigest(
      source.workOrderDigest,
      "baseline work order"
    ),
    sourceRevision: normalizeSourceRevision(
      source.sourceRevision,
      ErrorType
    ),
    artifactDigest: normalizedDigest(
      source.artifactDigest,
      "baseline artifact digest",
      { nullable: true }
    ),
    policy: normalizedPolicyBinding(
      source.policy,
      "baseline policy",
      ErrorType
    ),
    verifier: normalizedPolicyBinding(
      source.verifier,
      "baseline verifier",
      ErrorType
    ),
    canonicalJsonFormatVersion: CANONICAL_JSON_FORMAT_VERSION,
    unresolvedFindingDigests: normalizedDigestList(
      source.unresolvedFindingDigests,
      "baseline unresolved findings",
      { maximum: 256 }
    )
  };
}

export function createReleaseBaseline({
  candidate,
  unresolvedFindingDigests = []
}) {
  verifyReleaseCandidate(candidate);
  return contentAddressed(
    normalizeBaselineUnsigned({
      schemaVersion: RELEASE_EVIDENCE_SCHEMA_VERSION,
      kind: RELEASE_BASELINE_KIND,
      workspaceId: candidate.workspaceId,
      candidateId: candidate.candidateId,
      candidateDigest: candidate.digest,
      repositoryId: candidate.repositoryId,
      changeRevisionDigest: candidate.changeRevisionDigest,
      decisionRevisionDigests:
        candidate.decisionRevisionDigests,
      workOrderDigest: candidate.workOrderDigest,
      sourceRevision: candidate.sourceRevision,
      artifactDigest: candidate.artifactDigest,
      policy: candidate.policy,
      verifier: candidate.verifier,
      canonicalJsonFormatVersion:
        candidate.canonicalJsonFormatVersion,
      unresolvedFindingDigests
    })
  );
}

export function verifyReleaseBaseline(value) {
  verifyContentAddressed(value, {
    field: "release baseline",
    expectedKeys: baselineKeys,
    normalizeUnsigned: normalizeBaselineUnsigned,
    ErrorType: IntegrityError
  });
  return true;
}
