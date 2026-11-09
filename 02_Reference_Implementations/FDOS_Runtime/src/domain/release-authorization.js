import {
  AuthorizationError,
  IntegrityError,
  PolicyError,
  ValidationError
} from "../kernel/errors.js";
import { isoDate } from "../kernel/validation.js";
import {
  RELEASE_EVIDENCE_SCHEMA_VERSION,
  contentAddressed,
  exactKeys,
  normalizedDigest,
  normalizedPrincipal,
  normalizedStableId,
  verifyContentAddressed
} from "./release-evidence-common.js";
import {
  consumeReleaseApproval,
  verifyApprovalConsumption,
  verifyReleaseApproval,
  verifyReleaseEvidenceApproval
} from "./release-approval.js";
import {
  verifyReleaseEvaluationAgainst,
  verifyReleaseEvidencePolicy
} from "./release-eligibility.js";
import {
  transitionReleaseStatus,
  verifyReleaseStatus,
  verifyReleaseStatusTransition
} from "./release-status.js";
import { verifyReleaseBaseline } from "./release-work.js";

const AUTHORIZATION_KIND =
  "fdos-release-evidence-release-authorization";

const authorizationKeys = [
  "approvalConsumption",
  "approvalDigest",
  "approvalStatus",
  "authorizationId",
  "authorizedAt",
  "authorizedBy",
  "baselineDigest",
  "candidateDigest",
  "evaluationDigest",
  "kind",
  "policyDigest",
  "previousStatusDigest",
  "releaseStatus",
  "schemaVersion",
  "workspaceId"
];

function samePrincipal(left, right) {
  return left.type === right.type && left.id === right.id;
}

function exactAuthorizationAxes(status, releaseState) {
  return (
    status.axes.evidence === "verified" &&
    status.axes.implementation === "completed" &&
    status.axes.review === "accepted" &&
    status.axes.approval === "consumed" &&
    status.axes.release === releaseState
  );
}

function normalizeAuthorizationUnsigned(
  source,
  ErrorType = ValidationError
) {
  exactKeys(
    source,
    authorizationKeys,
    "release authorization",
    ErrorType
  );
  if (
    source.schemaVersion !== RELEASE_EVIDENCE_SCHEMA_VERSION ||
    source.kind !== AUTHORIZATION_KIND
  ) {
    throw new ErrorType(
      "Release-authorization format is unsupported."
    );
  }
  const workspaceId = normalizedStableId(
    source.workspaceId,
    "release authorization workspace id"
  );
  const authorizedAt = isoDate(
    source.authorizedAt,
    "release authorization time"
  );
  const authorizedBy = normalizedPrincipal(
    source.authorizedBy,
    "release authorization actor",
    { allowedTypes: ["human", "system"] }
  );
  verifyApprovalConsumption(source.approvalConsumption);
  verifyReleaseStatus(source.approvalStatus);
  verifyReleaseStatus(source.releaseStatus);

  const candidateDigest = normalizedDigest(
    source.candidateDigest,
    "release authorization candidate"
  );
  const baselineDigest = normalizedDigest(
    source.baselineDigest,
    "release authorization baseline"
  );
  const approvalDigest = normalizedDigest(
    source.approvalDigest,
    "release authorization approval"
  );
  const previousStatusDigest = normalizedDigest(
    source.previousStatusDigest,
    "release authorization previous status"
  );
  if (
    source.approvalConsumption.workspaceId !== workspaceId ||
    source.approvalConsumption.purpose !== "release" ||
    source.approvalConsumption.approvalDigest !== approvalDigest ||
    source.approvalConsumption.subjectDigest !== baselineDigest ||
    source.approvalConsumption.consumedAt !== authorizedAt ||
    !samePrincipal(source.approvalConsumption.consumedBy, authorizedBy) ||
    source.approvalStatus.candidateDigest !== candidateDigest ||
    source.approvalStatus.previousDigest !== previousStatusDigest ||
    source.approvalStatus.changedAxis !== "approval" ||
    source.approvalStatus.changedFrom !== "valid" ||
    source.approvalStatus.changedTo !== "consumed" ||
    source.approvalStatus.transitionedAt !== authorizedAt ||
    !samePrincipal(source.approvalStatus.transitionedBy, authorizedBy) ||
    !exactAuthorizationAxes(source.approvalStatus, "eligible") ||
    source.releaseStatus.candidateDigest !== candidateDigest ||
    source.releaseStatus.previousDigest !==
      source.approvalStatus.digest ||
    source.releaseStatus.changedAxis !== "release" ||
    source.releaseStatus.changedFrom !== "eligible" ||
    source.releaseStatus.changedTo !== "authorized" ||
    source.releaseStatus.transitionedAt !== authorizedAt ||
    !samePrincipal(source.releaseStatus.transitionedBy, authorizedBy) ||
    !exactAuthorizationAxes(source.releaseStatus, "authorized")
  ) {
    throw new ErrorType(
      "Release authorization does not encode one exact finalization."
    );
  }
  verifyReleaseStatusTransition(
    source.approvalStatus,
    source.releaseStatus
  );
  return {
    schemaVersion: RELEASE_EVIDENCE_SCHEMA_VERSION,
    kind: AUTHORIZATION_KIND,
    workspaceId,
    authorizationId: normalizedStableId(
      source.authorizationId,
      "release authorization id"
    ),
    candidateDigest,
    baselineDigest,
    evaluationDigest: normalizedDigest(
      source.evaluationDigest,
      "release authorization evaluation"
    ),
    policyDigest: normalizedDigest(
      source.policyDigest,
      "release authorization policy"
    ),
    approvalDigest,
    previousStatusDigest,
    approvalConsumption: source.approvalConsumption,
    approvalStatus: source.approvalStatus,
    releaseStatus: source.releaseStatus,
    authorizedBy,
    authorizedAt
  };
}

function assertAuthorizationPreconditions({
  evaluation,
  candidate,
  changeRevision,
  decisionRevisions,
  workOrder,
  evidence,
  policy,
  approval,
  previousStatus,
  authorizedAt
}) {
  verifyReleaseEvaluationAgainst({
    evaluation,
    candidate,
    changeRevision,
    decisionRevisions,
    workOrder,
    policy,
    evidence
  });
  verifyReleaseEvidencePolicy(policy);
  verifyReleaseEvidenceApproval(approval);
  verifyReleaseStatus(previousStatus);
  verifyReleaseBaseline(evaluation.baseline);
  verifyReleaseApproval({
    approval,
    baseline: evaluation.baseline,
    policy,
    at: authorizedAt
  });
  if (
    !evaluation.eligible ||
    evaluation.evidenceState !== "verified" ||
    evaluation.findings.length !== 0 ||
    evaluation.workspaceId !== policy.workspaceId ||
    evaluation.policyDigest !== policy.digest ||
    evaluation.baseline.policy.digest !== policy.digest ||
    previousStatus.candidateDigest !== evaluation.candidateDigest ||
    previousStatus.axes.evidence !== "verified" ||
    previousStatus.axes.implementation !== "completed" ||
    previousStatus.axes.review !== "accepted" ||
    previousStatus.axes.approval !== "valid" ||
    previousStatus.axes.release !== "eligible"
  ) {
    throw new PolicyError(
      "Release authorization preconditions are not satisfied."
    );
  }
  if (
    !policy.authority.releaseApprovalAuthorityIds.includes(
      approval.approvedBy.id
    )
  ) {
    throw new AuthorizationError(
      "Release approval authority is not admitted by policy."
    );
  }
}

export function createReleaseAuthorization({
  authorizationId,
  consumptionId,
  evaluation,
  candidate,
  changeRevision,
  decisionRevisions = [],
  workOrder,
  evidence = [],
  policy,
  approval,
  previousStatus,
  authorizedBy,
  authorizedAt
}) {
  assertAuthorizationPreconditions({
    evaluation,
    candidate,
    changeRevision,
    decisionRevisions,
    workOrder,
    evidence,
    policy,
    approval,
    previousStatus,
    authorizedAt
  });
  const approvalConsumption = consumeReleaseApproval({
    consumptionId,
    approval,
    baseline: evaluation.baseline,
    policy,
    consumedBy: authorizedBy,
    consumedAt: authorizedAt
  });
  const approvalStatus = transitionReleaseStatus(previousStatus, {
    axis: "approval",
    to: "consumed",
    transitionedAt: authorizedAt,
    transitionedBy: authorizedBy
  });
  const releaseStatus = transitionReleaseStatus(approvalStatus, {
    axis: "release",
    to: "authorized",
    transitionedAt: authorizedAt,
    transitionedBy: authorizedBy
  });
  return contentAddressed(
    normalizeAuthorizationUnsigned({
      schemaVersion: RELEASE_EVIDENCE_SCHEMA_VERSION,
      kind: AUTHORIZATION_KIND,
      workspaceId: evaluation.workspaceId,
      authorizationId,
      candidateDigest: evaluation.candidateDigest,
      baselineDigest: evaluation.baseline.digest,
      evaluationDigest: evaluation.digest,
      policyDigest: policy.digest,
      approvalDigest: approval.digest,
      previousStatusDigest: previousStatus.digest,
      approvalConsumption,
      approvalStatus,
      releaseStatus,
      authorizedBy,
      authorizedAt
    })
  );
}

export function verifyReleaseAuthorization(value) {
  verifyContentAddressed(value, {
    field: "release authorization",
    expectedKeys: authorizationKeys,
    normalizeUnsigned: normalizeAuthorizationUnsigned,
    ErrorType: IntegrityError
  });
  return true;
}

export function verifyReleaseAuthorizationBinding({
  authorization,
  evaluation,
  candidate,
  changeRevision,
  decisionRevisions = [],
  workOrder,
  evidence = [],
  policy,
  approval,
  previousStatus
}) {
  verifyReleaseAuthorization(authorization);
  assertAuthorizationPreconditions({
    evaluation,
    candidate,
    changeRevision,
    decisionRevisions,
    workOrder,
    evidence,
    policy,
    approval,
    previousStatus,
    authorizedAt: authorization.authorizedAt
  });
  if (
    authorization.workspaceId !== evaluation.workspaceId ||
    authorization.candidateDigest !== evaluation.candidateDigest ||
    authorization.baselineDigest !== evaluation.baseline.digest ||
    authorization.evaluationDigest !== evaluation.digest ||
    authorization.policyDigest !== policy.digest ||
    authorization.approvalDigest !== approval.digest ||
    authorization.previousStatusDigest !== previousStatus.digest ||
    authorization.approvalConsumption.approvalId !==
      approval.approvalId ||
    authorization.approvalConsumption.actionIntentDigest !==
      approval.binding.actionIntentDigest
  ) {
    throw new PolicyError(
      "Release authorization is not bound to the supplied authority."
    );
  }
  verifyReleaseStatusTransition(
    previousStatus,
    authorization.approvalStatus
  );
  verifyReleaseStatusTransition(
    authorization.approvalStatus,
    authorization.releaseStatus
  );
  return true;
}
