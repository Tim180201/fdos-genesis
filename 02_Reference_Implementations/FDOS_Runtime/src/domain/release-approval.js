import { digestObject } from "../kernel/canonical-json.js";
import {
  AuthorizationError,
  IntegrityError,
  PolicyError,
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
  normalizedPrincipal,
  normalizedStableId,
  normalizedTimestampRange,
  verifyContentAddressed
} from "./release-evidence-common.js";
import {
  verifyReleaseBaseline,
  verifyWorkOrder
} from "./release-work.js";
import { verifyReleaseEvidencePolicy } from "./release-eligibility.js";

const APPROVAL_KIND = "fdos-release-evidence-approval";
const CONSUMPTION_KIND =
  "fdos-release-evidence-approval-consumption";
const MAX_APPROVAL_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

const approvalKeys = [
  "action",
  "approvedBy",
  "approvalId",
  "binding",
  "expiresAt",
  "issuedAt",
  "kind",
  "notBefore",
  "purpose",
  "schemaVersion",
  "singleUse",
  "state",
  "workspaceId"
];

const bindingKeys = [
  "actionIntentDigest",
  "baselineDigest",
  "findingsDigest",
  "policyDigest",
  "workOrderDigest"
];

const consumptionKeys = [
  "action",
  "actionIntentDigest",
  "approvalDigest",
  "approvalId",
  "consumedAt",
  "consumedBy",
  "consumptionId",
  "kind",
  "purpose",
  "schemaVersion",
  "subjectDigest",
  "workspaceId"
];

function findingsDigest(baseline) {
  return digestObject({
    unresolvedFindingDigests:
      baseline.unresolvedFindingDigests
  });
}

function actionIntentDigest({
  purpose,
  action,
  workOrderDigest,
  baselineDigest,
  policyDigest,
  unresolvedFindingsDigest
}) {
  return digestObject({
    purpose,
    action,
    workOrderDigest,
    baselineDigest,
    policyDigest,
    findingsDigest: unresolvedFindingsDigest
  });
}

function normalizeBinding(
  value,
  purpose,
  action,
  ErrorType = ValidationError
) {
  exactKeys(value, bindingKeys, "approval binding", ErrorType);
  const workOrderDigest = normalizedDigest(
    value.workOrderDigest,
    "approval work-order digest"
  );
  const baselineDigest = normalizedDigest(
    value.baselineDigest,
    "approval baseline digest",
    { nullable: true }
  );
  const unresolvedFindingsDigest = normalizedDigest(
    value.findingsDigest,
    "approval findings digest",
    { nullable: true }
  );
  const policyDigest = normalizedDigest(
    value.policyDigest,
    "approval policy digest"
  );
  if (
    (purpose === "work-order" &&
      (baselineDigest !== null ||
        unresolvedFindingsDigest !== null)) ||
    (purpose === "release" &&
      (baselineDigest === null ||
        unresolvedFindingsDigest === null))
  ) {
    throw new ErrorType(
      "Approval binding does not match its purpose."
    );
  }
  const expectedActionIntentDigest = actionIntentDigest({
    purpose,
    action,
    workOrderDigest,
    baselineDigest,
    policyDigest,
    unresolvedFindingsDigest
  });
  const normalizedActionIntentDigest = normalizedDigest(
    value.actionIntentDigest,
    "approval action-intent digest"
  );
  if (normalizedActionIntentDigest !== expectedActionIntentDigest) {
    throw new ErrorType(
      "Approval action intent does not match its binding."
    );
  }
  return {
    workOrderDigest,
    baselineDigest,
    policyDigest,
    findingsDigest: unresolvedFindingsDigest,
    actionIntentDigest: normalizedActionIntentDigest
  };
}

function normalizeApprovalUnsigned(
  source,
  ErrorType = ValidationError
) {
  exactKeys(source, approvalKeys, "release approval", ErrorType);
  if (
    source.schemaVersion !== RELEASE_EVIDENCE_SCHEMA_VERSION ||
    source.kind !== APPROVAL_KIND ||
    source.singleUse !== true ||
    source.state !== "valid"
  ) {
    throw new ErrorType("Release-approval format is unsupported.");
  }
  const purpose = enumValue(
    source.purpose,
    "approval purpose",
    ["work-order", "release"]
  );
  const expectedAction =
    purpose === "work-order"
      ? "authorize-implementation"
      : "authorize-release";
  if (source.action !== expectedAction) {
    throw new ErrorType("Approval action does not match its purpose.");
  }
  const issuedAt = isoDate(source.issuedAt, "approval issuedAt");
  const validity = normalizedTimestampRange({
    notBefore: source.notBefore,
    expiresAt: source.expiresAt,
    field: "approval",
    maximumDurationMs: MAX_APPROVAL_DURATION_MS
  });
  if (Date.parse(issuedAt) > Date.parse(validity.notBefore)) {
    throw new ErrorType(
      "Approval cannot be issued after its activation time."
    );
  }
  return {
    schemaVersion: RELEASE_EVIDENCE_SCHEMA_VERSION,
    kind: APPROVAL_KIND,
    workspaceId: normalizedStableId(
      source.workspaceId,
      "approval workspace id"
    ),
    approvalId: normalizedStableId(
      source.approvalId,
      "approval id"
    ),
    purpose,
    action: expectedAction,
    binding: normalizeBinding(
      source.binding,
      purpose,
      expectedAction,
      ErrorType
    ),
    approvedBy: normalizedPrincipal(
      source.approvedBy,
      "approval authority",
      { allowedTypes: ["human"] }
    ),
    issuedAt,
    notBefore: validity.notBefore,
    expiresAt: validity.expiresAt,
    singleUse: true,
    state: "valid"
  };
}

function createApproval({
  workspaceId,
  approvalId,
  purpose,
  action,
  workOrderDigest,
  baselineDigest,
  policyDigest,
  unresolvedFindingsDigest,
  approvedBy,
  issuedAt,
  notBefore,
  expiresAt
}) {
  const binding = {
    workOrderDigest,
    baselineDigest,
    policyDigest,
    findingsDigest: unresolvedFindingsDigest,
    actionIntentDigest: actionIntentDigest({
      purpose,
      action,
      workOrderDigest,
      baselineDigest,
      policyDigest,
      unresolvedFindingsDigest
    })
  };
  return contentAddressed(
    normalizeApprovalUnsigned({
      schemaVersion: RELEASE_EVIDENCE_SCHEMA_VERSION,
      kind: APPROVAL_KIND,
      workspaceId,
      approvalId,
      purpose,
      action,
      binding,
      approvedBy,
      issuedAt,
      notBefore,
      expiresAt,
      singleUse: true,
      state: "valid"
    })
  );
}

function assertPolicyAuthority({ approval, policy }) {
  verifyReleaseEvidencePolicy(policy);
  const admitted =
    approval.purpose === "work-order"
      ? policy.authority.workOrderApprovalAuthorityIds
      : policy.authority.releaseApprovalAuthorityIds;
  if (
    approval.workspaceId !== policy.workspaceId ||
    approval.binding.policyDigest !== policy.digest
  ) {
    throw new PolicyError(
      "Approval is not bound to the supplied authority policy."
    );
  }
  if (!admitted.includes(approval.approvedBy.id)) {
    throw new AuthorizationError(
      "Approval authority is not admitted by policy."
    );
  }
}

export function createWorkOrderApproval({
  approvalId,
  workOrder,
  policy,
  approvedBy,
  issuedAt,
  notBefore = issuedAt,
  expiresAt
}) {
  verifyWorkOrder(workOrder);
  verifyReleaseEvidencePolicy(policy);
  const approval = createApproval({
    workspaceId: workOrder.workspaceId,
    approvalId,
    purpose: "work-order",
    action: "authorize-implementation",
    workOrderDigest: workOrder.digest,
    baselineDigest: null,
    policyDigest: policy.digest,
    unresolvedFindingsDigest: null,
    approvedBy,
    issuedAt,
    notBefore,
    expiresAt
  });
  assertPolicyAuthority({ approval, policy });
  return approval;
}

export function createReleaseApproval({
  approvalId,
  baseline,
  policy,
  approvedBy,
  issuedAt,
  notBefore = issuedAt,
  expiresAt
}) {
  verifyReleaseBaseline(baseline);
  verifyReleaseEvidencePolicy(policy);
  const approval = createApproval({
    workspaceId: baseline.workspaceId,
    approvalId,
    purpose: "release",
    action: "authorize-release",
    workOrderDigest: baseline.workOrderDigest,
    baselineDigest: baseline.digest,
    policyDigest: baseline.policy.digest,
    unresolvedFindingsDigest: findingsDigest(baseline),
    approvedBy,
    issuedAt,
    notBefore,
    expiresAt
  });
  assertPolicyAuthority({ approval, policy });
  return approval;
}

export function verifyReleaseEvidenceApproval(value) {
  verifyContentAddressed(value, {
    field: "release approval",
    expectedKeys: approvalKeys,
    normalizeUnsigned: normalizeApprovalUnsigned,
    ErrorType: IntegrityError
  });
  return true;
}

function assertApprovalActive(approval, at) {
  const timestamp = isoDate(at, "approval verification time");
  if (Date.parse(timestamp) < Date.parse(approval.notBefore)) {
    throw new AuthorizationError("Approval is not active yet.");
  }
  if (Date.parse(timestamp) > Date.parse(approval.expiresAt)) {
    throw new AuthorizationError("Approval has expired.");
  }
  return timestamp;
}

export function verifyWorkOrderApproval({
  approval,
  workOrder,
  policy,
  at
}) {
  verifyReleaseEvidenceApproval(approval);
  verifyWorkOrder(workOrder);
  assertPolicyAuthority({ approval, policy });
  assertApprovalActive(approval, at);
  if (
    approval.workspaceId !== workOrder.workspaceId ||
    approval.purpose !== "work-order" ||
    approval.action !== "authorize-implementation" ||
    approval.binding.workOrderDigest !== workOrder.digest ||
    approval.binding.policyDigest !== policy.digest
  ) {
    throw new PolicyError(
      "Work-order approval does not bind the requested work."
    );
  }
  return true;
}

export function verifyReleaseApproval({ approval, baseline, policy, at }) {
  verifyReleaseEvidenceApproval(approval);
  verifyReleaseBaseline(baseline);
  assertPolicyAuthority({ approval, policy });
  assertApprovalActive(approval, at);
  if (
    approval.workspaceId !== baseline.workspaceId ||
    approval.purpose !== "release" ||
    approval.action !== "authorize-release" ||
    approval.binding.workOrderDigest !== baseline.workOrderDigest ||
    approval.binding.baselineDigest !== baseline.digest ||
    approval.binding.policyDigest !== baseline.policy.digest ||
    approval.binding.findingsDigest !== findingsDigest(baseline)
  ) {
    throw new PolicyError(
      "Release approval does not bind the requested baseline."
    );
  }
  return true;
}

function normalizeConsumptionUnsigned(
  source,
  ErrorType = ValidationError
) {
  exactKeys(
    source,
    consumptionKeys,
    "approval consumption",
    ErrorType
  );
  if (
    source.schemaVersion !== RELEASE_EVIDENCE_SCHEMA_VERSION ||
    source.kind !== CONSUMPTION_KIND
  ) {
    throw new ErrorType(
      "Approval-consumption format is unsupported."
    );
  }
  const purpose = enumValue(
    source.purpose,
    "consumption purpose",
    ["work-order", "release"]
  );
  const action =
    purpose === "work-order"
      ? "authorize-implementation"
      : "authorize-release";
  if (source.action !== action) {
    throw new ErrorType(
      "Approval consumption action does not match its purpose."
    );
  }
  return {
    schemaVersion: RELEASE_EVIDENCE_SCHEMA_VERSION,
    kind: CONSUMPTION_KIND,
    workspaceId: normalizedStableId(
      source.workspaceId,
      "consumption workspace id"
    ),
    consumptionId: normalizedStableId(
      source.consumptionId,
      "consumption id"
    ),
    approvalId: normalizedStableId(
      source.approvalId,
      "consumption approval id"
    ),
    approvalDigest: normalizedDigest(
      source.approvalDigest,
      "consumption approval digest"
    ),
    purpose,
    action,
    actionIntentDigest: normalizedDigest(
      source.actionIntentDigest,
      "consumption action intent"
    ),
    subjectDigest: normalizedDigest(
      source.subjectDigest,
      "consumption subject digest"
    ),
    consumedBy: normalizedPrincipal(
      source.consumedBy,
      "consumption actor",
      { allowedTypes: ["human", "system"] }
    ),
    consumedAt: isoDate(source.consumedAt, "consumption consumedAt")
  };
}

function createConsumption({
  consumptionId,
  approval,
  subjectDigest,
  consumedBy,
  consumedAt
}) {
  return contentAddressed(
    normalizeConsumptionUnsigned({
      schemaVersion: RELEASE_EVIDENCE_SCHEMA_VERSION,
      kind: CONSUMPTION_KIND,
      workspaceId: approval.workspaceId,
      consumptionId,
      approvalId: approval.approvalId,
      approvalDigest: approval.digest,
      purpose: approval.purpose,
      action: approval.action,
      actionIntentDigest: approval.binding.actionIntentDigest,
      subjectDigest,
      consumedBy,
      consumedAt
    })
  );
}

export function consumeWorkOrderApproval({
  consumptionId,
  approval,
  workOrder,
  policy,
  consumedBy,
  consumedAt
}) {
  verifyWorkOrderApproval({
    approval,
    workOrder,
    policy,
    at: consumedAt
  });
  return createConsumption({
    consumptionId,
    approval,
    subjectDigest: workOrder.digest,
    consumedBy,
    consumedAt
  });
}

export function consumeReleaseApproval({
  consumptionId,
  approval,
  baseline,
  policy,
  consumedBy,
  consumedAt
}) {
  verifyReleaseApproval({
    approval,
    baseline,
    policy,
    at: consumedAt
  });
  return createConsumption({
    consumptionId,
    approval,
    subjectDigest: baseline.digest,
    consumedBy,
    consumedAt
  });
}

export function verifyApprovalConsumption(value) {
  verifyContentAddressed(value, {
    field: "approval consumption",
    expectedKeys: consumptionKeys,
    normalizeUnsigned: normalizeConsumptionUnsigned,
    ErrorType: IntegrityError
  });
  return true;
}
