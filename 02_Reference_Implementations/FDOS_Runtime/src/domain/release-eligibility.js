import {
  CANONICAL_JSON_FORMAT_VERSION,
  digestObject,
  immutableJson
} from "../kernel/canonical-json.js";
import {
  IntegrityError,
  PolicyError,
  ValidationError
} from "../kernel/errors.js";
import {
  enumValue,
  isoDate,
  requiredString
} from "../kernel/validation.js";
import {
  FINDING_CODES,
  createReleaseFinding,
  verifyEvidenceRecord,
  verifyReleaseFinding
} from "./release-evidence-record.js";
import {
  RELEASE_EVIDENCE_SCHEMA_VERSION,
  contentAddressed,
  exactKeys,
  normalizedDigest,
  normalizedDigestList,
  normalizedInteger,
  normalizedPolicyBinding,
  normalizedSemver,
  normalizedStableId,
  verifyContentAddressed
} from "./release-evidence-common.js";
import {
  verifyChangeRevision,
  verifyDecisionRevision
} from "./release-revisions.js";
import {
  createReleaseBaseline,
  verifyReleaseBaseline,
  verifyReleaseCandidate,
  verifyWorkOrder
} from "./release-work.js";

const POLICY_KIND = "fdos-release-evidence-policy";
const EVALUATION_KIND = "fdos-release-evidence-evaluation";

const policyKeys = [
  "authority",
  "description",
  "kind",
  "policyId",
  "requirements",
  "schemaVersion",
  "unknownBlocks",
  "version",
  "workspaceId"
];

const authorityKeys = [
  "decisionAuthorityIds",
  "releaseApprovalAuthorityIds",
  "workOrderApprovalAuthorityIds"
];

const requirementKeys = [
  "evidenceType",
  "id",
  "minimumCount",
  "producerIdentityDigests",
  "subjectKind"
];

const evaluationKeys = [
  "baseline",
  "candidateDigest",
  "eligible",
  "evaluatedAt",
  "evidenceDigests",
  "evidenceState",
  "findings",
  "kind",
  "policyDigest",
  "schemaVersion",
  "verifier",
  "workspaceId"
];

const VERIFIER_UNSIGNED = Object.freeze({
  id: "verifier:release-evidence-domain",
  version: "0.1.0-experimental",
  canonicalJsonFormatVersion: CANONICAL_JSON_FORMAT_VERSION,
  rulesFormatVersion: "1.0"
});

export const RELEASE_EVIDENCE_VERIFIER = immutableJson({
  id: VERIFIER_UNSIGNED.id,
  version: VERIFIER_UNSIGNED.version,
  digest: digestObject(VERIFIER_UNSIGNED)
});

function normalizeRequirement(
  source,
  index,
  ErrorType = ValidationError
) {
  exactKeys(
    source,
    requirementKeys,
    `evidence requirement ${index}`,
    ErrorType
  );
  return {
    id: requiredString(
      source.id,
      `evidence requirement ${index} id`,
      {
        max: 80,
        pattern: /^[a-z][a-z0-9.-]{2,79}$/
      }
    ),
    evidenceType: requiredString(
      source.evidenceType,
      `evidence requirement ${index} type`,
      {
        max: 80,
        pattern: /^[a-z][a-z0-9.-]{1,79}$/
      }
    ),
    subjectKind: enumValue(
      source.subjectKind,
      `evidence requirement ${index} subject`,
      [
        "change-revision",
        "decision-revision",
        "work-order",
        "release-candidate"
      ]
    ),
    minimumCount: normalizedInteger(
      source.minimumCount,
      `evidence requirement ${index} minimum count`,
      { minimum: 1, maximum: 16 }
    ),
    producerIdentityDigests: normalizedDigestList(
      source.producerIdentityDigests,
      `evidence requirement ${index} producers`,
      { minimum: 1, maximum: 32 }
    )
  };
}

function normalizeAuthorityIds(value, field) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 32) {
    throw new ValidationError(
      `${field} must contain between one and 32 identities.`
    );
  }
  const normalized = value.map((entry, index) =>
    normalizedStableId(entry, `${field}[${index}]`)
  );
  if (new Set(normalized).size !== normalized.length) {
    throw new ValidationError(`${field} contains duplicate identities.`);
  }
  return normalized.sort();
}

function normalizeAuthority(value, ErrorType = ValidationError) {
  exactKeys(
    value,
    authorityKeys,
    "release policy authority",
    ErrorType
  );
  return {
    decisionAuthorityIds: normalizeAuthorityIds(
      value.decisionAuthorityIds,
      "release policy decision authorities"
    ),
    workOrderApprovalAuthorityIds: normalizeAuthorityIds(
      value.workOrderApprovalAuthorityIds,
      "release policy work-order approval authorities"
    ),
    releaseApprovalAuthorityIds: normalizeAuthorityIds(
      value.releaseApprovalAuthorityIds,
      "release policy release approval authorities"
    )
  };
}

function normalizePolicyUnsigned(
  source,
  ErrorType = ValidationError
) {
  exactKeys(source, policyKeys, "release evidence policy", ErrorType);
  if (
    source.schemaVersion !== RELEASE_EVIDENCE_SCHEMA_VERSION ||
    source.kind !== POLICY_KIND ||
    source.unknownBlocks !== true ||
    !Array.isArray(source.requirements) ||
    source.requirements.length < 1 ||
    source.requirements.length > 64
  ) {
    throw new ErrorType(
      "Release-evidence policy format is unsupported."
    );
  }
  const requirements = source.requirements.map(
    (requirement, index) =>
      normalizeRequirement(requirement, index, ErrorType)
  );
  if (
    new Set(requirements.map((requirement) => requirement.id)).size !==
    requirements.length
  ) {
    throw new ErrorType(
      "Release-evidence policy requirement IDs must be unique."
    );
  }
  requirements.sort((left, right) => left.id.localeCompare(right.id));
  return {
    schemaVersion: RELEASE_EVIDENCE_SCHEMA_VERSION,
    kind: POLICY_KIND,
    workspaceId: normalizedStableId(
      source.workspaceId,
      "release policy workspace id"
    ),
    policyId: normalizedStableId(
      source.policyId,
      "release policy id"
    ),
    version: normalizedSemver(
      source.version,
      "release policy version"
    ),
    description: requiredString(
      source.description,
      "release policy description",
      { max: 1_000 }
    ),
    authority: normalizeAuthority(source.authority, ErrorType),
    requirements,
    unknownBlocks: true
  };
}

export function createReleaseEvidencePolicy(source) {
  return contentAddressed(
    normalizePolicyUnsigned({
      ...source,
      schemaVersion: RELEASE_EVIDENCE_SCHEMA_VERSION,
      kind: POLICY_KIND,
      unknownBlocks: true
    })
  );
}

export function verifyReleaseEvidencePolicy(value) {
  verifyContentAddressed(value, {
    field: "release evidence policy",
    expectedKeys: policyKeys,
    normalizeUnsigned: normalizePolicyUnsigned,
    ErrorType: IntegrityError
  });
  return true;
}

export function releaseEvidencePolicyBinding(policy) {
  verifyReleaseEvidencePolicy(policy);
  return immutableJson({
    id: policy.policyId,
    version: policy.version,
    digest: policy.digest
  });
}

function exactLists(left, right) {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function domainBindings({
  candidate,
  changeRevision,
  decisionRevisions,
  workOrder,
  policy,
  evaluatedAt
}) {
  verifyReleaseCandidate(candidate);
  verifyChangeRevision(changeRevision);
  verifyWorkOrder(workOrder);
  verifyReleaseEvidencePolicy(policy);
  for (const decision of decisionRevisions) {
    verifyDecisionRevision(decision);
  }
  const decisionDigests = decisionRevisions
    .map((decision) => decision.digest)
    .sort();
  const policyBinding = releaseEvidencePolicyBinding(policy);
  const requiredEvidenceTypes = [
    ...new Set(
      policy.requirements.map((requirement) => requirement.evidenceType)
    )
  ].sort();
  const criterionIds = changeRevision.acceptanceCriteria
    .map((criterion) => criterion.id)
    .sort();
  const repositoryConstraints = new Map(
    changeRevision.repositoryConstraints.map((constraint) => [
      constraint.repositoryId,
      constraint
    ])
  );
  const candidateConstraint = repositoryConstraints.get(
    candidate.repositoryId
  );
  if (
    candidate.workspaceId !== changeRevision.workspaceId ||
    candidate.workspaceId !== workOrder.workspaceId ||
    candidate.workspaceId !== policy.workspaceId ||
    decisionRevisions.some(
      (decision) => decision.workspaceId !== candidate.workspaceId
    ) ||
    candidate.changeRevisionDigest !== changeRevision.digest ||
    workOrder.changeRevisionDigest !== changeRevision.digest ||
    !exactLists(
      changeRevision.decisionRevisionDigests,
      decisionDigests
    ) ||
    !exactLists(
      candidate.decisionRevisionDigests,
      decisionDigests
    ) ||
    !exactLists(
      workOrder.decisionRevisionDigests,
      decisionDigests
    ) ||
    candidate.workOrderDigest !== workOrder.digest ||
    changeRevision.policy.id !== policyBinding.id ||
    changeRevision.policy.version !== policyBinding.version ||
    changeRevision.policy.digest !== policyBinding.digest ||
    candidate.policy.id !== policyBinding.id ||
    candidate.policy.version !== policyBinding.version ||
    candidate.policy.digest !== policyBinding.digest ||
    candidate.verifier.id !== RELEASE_EVIDENCE_VERIFIER.id ||
    candidate.verifier.version !==
      RELEASE_EVIDENCE_VERIFIER.version ||
    candidate.verifier.digest !== RELEASE_EVIDENCE_VERIFIER.digest ||
    changeRevision.requiredEvidenceTypes.some(
      (evidenceType) => !requiredEvidenceTypes.includes(evidenceType)
    ) ||
    !exactLists(
      workOrder.acceptanceCriterionIds,
      criterionIds
    ) ||
    workOrder.allowedRepositories.length !== 1 ||
    workOrder.allowedRepositories[0] !== candidate.repositoryId ||
    !candidateConstraint ||
    workOrder.allowedRepositories.some(
      (repositoryId) => !repositoryConstraints.has(repositoryId)
    ) ||
    workOrder.allowedPathPrefixes.some(
      (pathPrefix) =>
        !candidateConstraint.allowedPathPrefixes.some(
          (allowedPrefix) =>
            pathPrefix === allowedPrefix ||
            pathPrefix.startsWith(`${allowedPrefix}/`)
        )
    ) ||
    decisionRevisions.some(
      (decision) =>
        !policy.authority.decisionAuthorityIds.includes(
          decision.authority.id
        ) ||
        Date.parse(decision.effectiveAt) > Date.parse(evaluatedAt) ||
        (decision.expiresAt !== null &&
          Date.parse(evaluatedAt) > Date.parse(decision.expiresAt)) ||
        !["approved", "constrained"].includes(decision.outcome)
    ) ||
    !decisionRevisions.every((decision) =>
      decision.appliesToChangeIds.includes(changeRevision.changeId)
    )
  ) {
    throw new PolicyError(
      "Release domain objects do not describe one exact baseline."
    );
  }
}

function subjectReferences({
  candidate,
  changeRevision,
  decisionRevisions,
  workOrder
}) {
  return new Map([
    [
      "change-revision",
      [
        {
          kind: "change-revision",
          id: changeRevision.changeId,
          digest: changeRevision.digest
        }
      ]
    ],
    [
      "decision-revision",
      decisionRevisions.map((decision) => ({
        kind: "decision-revision",
        id: decision.decisionId,
        digest: decision.digest
      }))
    ],
    [
      "work-order",
      [
        {
          kind: "work-order",
          id: workOrder.workOrderId,
          digest: workOrder.digest
        }
      ]
    ],
    [
      "release-candidate",
      [
        {
          kind: "release-candidate",
          id: candidate.candidateId,
          digest: candidate.digest
        }
      ]
    ]
  ]);
}

function matchesReference(subject, expected) {
  return expected.some(
    (reference) =>
      subject.kind === reference.kind &&
      subject.id === reference.id &&
      subject.digest === reference.digest
  );
}

function currentEvidenceState(evidence, evaluatedAt) {
  if (Date.parse(evidence.evaluatedAt) > Date.parse(evaluatedAt)) {
    return "unknown";
  }
  if (evidence.integrity.state === "invalid") return "invalid";
  if (evidence.integrity.state === "unknown") return "unknown";
  if (evidence.integrity.state !== "verified") return "observed";
  if (evidence.freshness.validUntil === null) return "unknown";
  if (
    Date.parse(evaluatedAt) >
    Date.parse(evidence.freshness.validUntil)
  ) {
    return "stale";
  }
  return "verified";
}

const findingDefinitions = Object.freeze({
  MISSING_EVIDENCE: {
    severity: "high",
    message: "Required evidence is missing or below the minimum count.",
    remediation: "Collect the required evidence for the exact subject."
  },
  INVALID_EVIDENCE: {
    severity: "critical",
    message: "Required evidence failed integrity verification.",
    remediation: "Replace it with independently verifiable evidence."
  },
  STALE_EVIDENCE: {
    severity: "high",
    message: "Required evidence is stale for this evaluation time.",
    remediation: "Collect fresh evidence for the unchanged subject."
  },
  UNKNOWN_EVIDENCE: {
    severity: "high",
    message: "Required evidence has unknown integrity or freshness.",
    remediation: "Resolve the unknown state; do not infer success."
  },
  UNTRUSTED_PRODUCER: {
    severity: "critical",
    message: "Evidence was produced by an unadmitted identity.",
    remediation: "Use an explicitly admitted producer identity."
  },
  SUBJECT_MISMATCH: {
    severity: "critical",
    message: "Evidence applies to another subject or revision.",
    remediation: "Collect evidence bound to the exact release subject."
  }
});

function findingId({ requirement, code, candidate }) {
  return `finding:${digestObject({
    requirementId: requirement.id,
    code,
    candidateDigest: candidate.digest
  }).slice("sha256:".length, "sha256:".length + 32)}`;
}

function findingFor({
  requirement,
  code,
  candidate,
  evidence,
  evaluatedAt
}) {
  const definition = findingDefinitions[code];
  return createReleaseFinding({
    workspaceId: candidate.workspaceId,
    findingId: findingId({ requirement, code, candidate }),
    ruleId: `release-evidence.${requirement.id}`,
    code,
    severity: definition.severity,
    subject: {
      kind: "release-candidate",
      id: candidate.candidateId,
      digest: candidate.digest
    },
    evidenceDigests: evidence.map((entry) => entry.digest),
    message: definition.message,
    remediation: definition.remediation,
    createdAt: evaluatedAt
  });
}

function evaluateRequirement({
  requirement,
  references,
  evidence,
  candidate,
  evaluatedAt
}) {
  const typed = evidence.filter(
    (entry) => entry.evidenceType === requirement.evidenceType
  );
  if (typed.length === 0) {
    return findingFor({
      requirement,
      code: "MISSING_EVIDENCE",
      candidate,
      evidence: [],
      evaluatedAt
    });
  }
  const expectedSubjects = references.get(requirement.subjectKind);
  const subjectBound = typed.filter((entry) =>
    matchesReference(entry.subject, expectedSubjects)
  );
  if (subjectBound.length === 0) {
    return findingFor({
      requirement,
      code: "SUBJECT_MISMATCH",
      candidate,
      evidence: typed,
      evaluatedAt
    });
  }
  const trusted = subjectBound.filter((entry) =>
    requirement.producerIdentityDigests.includes(
      entry.producer.identityDigest
    )
  );
  if (trusted.length === 0) {
    return findingFor({
      requirement,
      code: "UNTRUSTED_PRODUCER",
      candidate,
      evidence: subjectBound,
      evaluatedAt
    });
  }
  const byState = Map.groupBy(trusted, (entry) =>
    currentEvidenceState(entry, evaluatedAt)
  );
  if (
    (byState.get("verified") || []).length >=
    requirement.minimumCount
  ) {
    return null;
  }
  for (const [state, code] of [
    ["invalid", "INVALID_EVIDENCE"],
    ["stale", "STALE_EVIDENCE"],
    ["unknown", "UNKNOWN_EVIDENCE"],
    ["observed", "UNKNOWN_EVIDENCE"]
  ]) {
    const matching = byState.get(state) || [];
    if (matching.length > 0) {
      return findingFor({
        requirement,
        code,
        candidate,
        evidence: matching,
        evaluatedAt
      });
    }
  }
  return findingFor({
    requirement,
    code: "MISSING_EVIDENCE",
    candidate,
    evidence: trusted,
    evaluatedAt
  });
}

function evidenceState(findings) {
  if (findings.length === 0) return "verified";
  if (findings.some((finding) => finding.code === "INVALID_EVIDENCE")) {
    return "invalid";
  }
  if (findings.some((finding) => finding.code === "STALE_EVIDENCE")) {
    return "stale";
  }
  if (findings.some((finding) => finding.code === "UNKNOWN_EVIDENCE")) {
    return "unknown";
  }
  return "missing";
}

function normalizeEvaluationUnsigned(
  source,
  ErrorType = ValidationError
) {
  exactKeys(
    source,
    evaluationKeys,
    "release evaluation",
    ErrorType
  );
  if (
    source.schemaVersion !== RELEASE_EVIDENCE_SCHEMA_VERSION ||
    source.kind !== EVALUATION_KIND ||
    typeof source.eligible !== "boolean" ||
    !Array.isArray(source.findings)
  ) {
    throw new ErrorType("Release-evaluation format is unsupported.");
  }
  const verifier = normalizedPolicyBinding(
    source.verifier,
    "evaluation verifier",
    ErrorType
  );
  if (
    verifier.id !== RELEASE_EVIDENCE_VERIFIER.id ||
    verifier.version !== RELEASE_EVIDENCE_VERIFIER.version ||
    verifier.digest !== RELEASE_EVIDENCE_VERIFIER.digest
  ) {
    throw new ErrorType("Release evaluation used another verifier.");
  }
  const findings = source.findings.map((finding) => {
    verifyReleaseFinding(finding);
    return finding;
  });
  const normalizedEvidenceState = enumValue(
    source.evidenceState,
    "evaluation evidence state",
    ["missing", "verified", "stale", "invalid", "unknown"]
  );
  if (
    source.eligible !== (findings.length === 0) ||
    normalizedEvidenceState !== evidenceState(findings)
  ) {
    throw new ErrorType(
      "Release evaluation result does not match its findings."
    );
  }
  verifyReleaseBaseline(source.baseline);
  const workspaceId = normalizedStableId(
    source.workspaceId,
    "evaluation workspace id"
  );
  const findingDigests = findings
    .map((finding) => finding.digest)
    .sort();
  if (
    workspaceId !== source.baseline.workspaceId ||
    !exactLists(
      source.baseline.unresolvedFindingDigests,
      findingDigests
    )
  ) {
    throw new ErrorType(
      "Release baseline does not bind evaluation findings."
    );
  }
  return {
    schemaVersion: RELEASE_EVIDENCE_SCHEMA_VERSION,
    kind: EVALUATION_KIND,
    workspaceId,
    candidateDigest: normalizedDigest(
      source.candidateDigest,
      "evaluation candidate digest"
    ),
    policyDigest: normalizedDigest(
      source.policyDigest,
      "evaluation policy digest"
    ),
    verifier,
    evaluatedAt: isoDate(
      source.evaluatedAt,
      "evaluation evaluatedAt"
    ),
    evidenceDigests: normalizedDigestList(
      source.evidenceDigests,
      "evaluation evidence digests",
      { maximum: 512 }
    ),
    findings,
    baseline: source.baseline,
    evidenceState: normalizedEvidenceState,
    eligible: source.eligible
  };
}

export function evaluateReleaseEligibility({
  candidate,
  changeRevision,
  decisionRevisions = [],
  workOrder,
  policy,
  evidence = [],
  evaluatedAt
}) {
  const normalizedEvaluatedAt = isoDate(
    evaluatedAt,
    "release evaluation time"
  );
  if (!Array.isArray(decisionRevisions) || !Array.isArray(evidence)) {
    throw new ValidationError(
      "Release evaluation revisions and evidence must be lists."
    );
  }
  domainBindings({
    candidate,
    changeRevision,
    decisionRevisions,
    workOrder,
    policy,
    evaluatedAt: normalizedEvaluatedAt
  });
  for (const entry of evidence) {
    verifyEvidenceRecord(entry);
    if (entry.workspaceId !== candidate.workspaceId) {
      throw new PolicyError(
        "Release evidence crosses the workspace boundary."
      );
    }
  }
  const references = subjectReferences({
    candidate,
    changeRevision,
    decisionRevisions,
    workOrder
  });
  const findings = policy.requirements
    .map((requirement) =>
      evaluateRequirement({
        requirement,
        references,
        evidence,
        candidate,
        evaluatedAt: normalizedEvaluatedAt
      })
    )
    .filter(Boolean)
    .sort((left, right) => left.ruleId.localeCompare(right.ruleId));
  const baseline = createReleaseBaseline({
    candidate,
    unresolvedFindingDigests: findings.map(
      (finding) => finding.digest
    )
  });
  return contentAddressed(
    normalizeEvaluationUnsigned({
      schemaVersion: RELEASE_EVIDENCE_SCHEMA_VERSION,
      kind: EVALUATION_KIND,
      workspaceId: candidate.workspaceId,
      candidateDigest: candidate.digest,
      policyDigest: policy.digest,
      verifier: RELEASE_EVIDENCE_VERIFIER,
      evaluatedAt: normalizedEvaluatedAt,
      evidenceDigests: evidence.map((entry) => entry.digest),
      findings,
      baseline,
      evidenceState: evidenceState(findings),
      eligible: findings.length === 0
    })
  );
}

export function verifyReleaseEvaluation(value) {
  verifyContentAddressed(value, {
    field: "release evaluation",
    expectedKeys: evaluationKeys,
    normalizeUnsigned: normalizeEvaluationUnsigned,
    ErrorType: IntegrityError
  });
  return true;
}

export function verifyReleaseEvaluationAgainst({
  evaluation,
  candidate,
  changeRevision,
  decisionRevisions = [],
  workOrder,
  policy,
  evidence = []
}) {
  verifyReleaseEvaluation(evaluation);
  const expected = evaluateReleaseEligibility({
    candidate,
    changeRevision,
    decisionRevisions,
    workOrder,
    policy,
    evidence,
    evaluatedAt: evaluation.evaluatedAt
  });
  if (expected.digest !== evaluation.digest) {
    throw new IntegrityError(
      "Release evaluation does not reproduce from recorded inputs."
    );
  }
  return true;
}

export function supportedReleaseFindingCodes() {
  return [...FINDING_CODES];
}
