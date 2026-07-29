import {
  digestObject,
  immutableJson
} from "../kernel/canonical-json.js";
import {
  IntegrityError,
  ValidationError
} from "../kernel/errors.js";
import { assertId } from "../kernel/ids.js";
import {
  assertPlainObject,
  isoDate,
  requiredString
} from "../kernel/validation.js";
import {
  normalizeNetworkIsolationBinding
} from "./network-isolation-contract.js";
import {
  normalizeWorkerPackageBinding
} from "./worker-package-contract.js";
import {
  normalizeWorkloadSessionObservation,
  WORKLOAD_SESSION_MODE
} from "./workload-session-contract.js";

const SCHEMA_VERSION = "1.0";
const KIND = "fdos-verified-process-worker-receipt";
const PROTOCOL_VERSION = "1.4";
const RESPONSE_KIND = "fdos-process-worker-response";
const ALGORITHM = "Ed25519";
const MAX_REQUEST_TTL_MS = 5 * 60 * 1_000;
const MAX_PARENT_RUNTIME_CLOCK_SKEW_MS = 30_000;
const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/;
const CONNECTOR_ID_PATTERN =
  /^connector:[a-z][a-z0-9-]{1,63}:[a-zA-Z0-9][a-zA-Z0-9._-]{1,63}$/;

const receiptKeys = Object.freeze([
  "digest",
  "executionBoundary",
  "kind",
  "protocolVersion",
  "request",
  "response",
  "schemaVersion",
  "verification",
  "workerPackage",
  "workloadSession"
]);
const requestKeys = Object.freeze([
  "claimAttempt",
  "claimId",
  "connectorId",
  "deliveryId",
  "deliveryIntentDigest",
  "digest",
  "expiresAt",
  "issuedAt",
  "requestId"
]);
const responseKeys = Object.freeze([
  "completedAt",
  "digest",
  "envelopeDigest",
  "resultDigest"
]);
const executionBoundaryKeys = Object.freeze([
  "externalEffects",
  "filesystemWriteIsolationEnforced",
  "filesystemWriteIsolationProbe",
  "networkAccess",
  "networkIsolationEnforced",
  "networkIsolationPolicyDigest",
  "networkIsolationProbe",
  "networkIsolationProvider",
  "processSeparated",
  "shell"
]);
const workerPackageKeys = Object.freeze([
  "artifactDigest",
  "artifactId",
  "artifactVersion",
  "attestationDigest",
  "evaluatedFromVerifiedMemory",
  "issuerId",
  "keyId",
  "packageDigest",
  "packageDigestMatched",
  "packageId",
  "packageVersion",
  "releaseSignatureVerifiedByBootstrap",
  "trustAnchorDigest"
]);
const workloadSessionKeys = Object.freeze([
  "algorithm",
  "challengeDigest",
  "challengeMatched",
  "ephemeralKeyGeneratedByBootstrap",
  "externallyAttested",
  "keyId",
  "mode",
  "packageBindingDigest",
  "packageBindingMatched",
  "responseSignatureVerified",
  "sessionDigest"
]);
const verificationKeys = Object.freeze([
  "authenticatedEnvelopeVerified",
  "canonicalResponseVerified",
  "cleanProcessExitVerified",
  "emptyStandardErrorVerified",
  "outputBoundsVerified",
  "protocolResponseVerified"
]);

function exactKeys(
  value,
  expected,
  field,
  ErrorType = ValidationError
) {
  try {
    assertPlainObject(value, field);
  } catch {
    throw new ErrorType(`${field} has an unexpected shape.`);
  }
  const actual = Object.keys(value).sort();
  const normalizedExpected = [...expected].sort();
  if (
    actual.length !== normalizedExpected.length ||
    actual.some(
      (key, index) => key !== normalizedExpected[index]
    )
  ) {
    throw new ErrorType(`${field} has an unexpected shape.`);
  }
}

function normalizedString(
  value,
  field,
  options,
  ErrorType = ValidationError
) {
  try {
    return requiredString(value, field, options);
  } catch {
    throw new ErrorType(`${field} is invalid.`);
  }
}

function normalizedDigest(
  value,
  field,
  ErrorType = ValidationError
) {
  return normalizedString(
    value,
    field,
    {
      max: 71,
      pattern: DIGEST_PATTERN
    },
    ErrorType
  );
}

function normalizedId(
  value,
  field,
  prefix,
  ErrorType = ValidationError
) {
  try {
    const normalized = assertId(value, field);
    if (!normalized.startsWith(prefix)) {
      throw new Error();
    }
    return normalized;
  } catch {
    throw new ErrorType(`${field} is invalid.`);
  }
}

function normalizedIsoDate(
  value,
  field,
  ErrorType = ValidationError
) {
  try {
    return isoDate(value, field);
  } catch {
    throw new ErrorType(`${field} is invalid.`);
  }
}

function normalizeRequest(
  value,
  ErrorType = ValidationError
) {
  exactKeys(
    value,
    requestKeys,
    "verified worker receipt request",
    ErrorType
  );
  const issuedAt = normalizedIsoDate(
    value.issuedAt,
    "verified worker request issuedAt",
    ErrorType
  );
  const expiresAt = normalizedIsoDate(
    value.expiresAt,
    "verified worker request expiresAt",
    ErrorType
  );
  const ttl = Date.parse(expiresAt) - Date.parse(issuedAt);
  if (ttl <= 0 || ttl > MAX_REQUEST_TTL_MS) {
    throw new ErrorType(
      "Verified worker receipt request validity is invalid."
    );
  }
  if (
    !Number.isSafeInteger(value.claimAttempt) ||
    value.claimAttempt < 1 ||
    value.claimAttempt > 3
  ) {
    throw new ErrorType(
      "Verified worker receipt claim attempt is invalid."
    );
  }
  return {
    requestId: normalizedId(
      value.requestId,
      "verified worker request id",
      "workerrequest_",
      ErrorType
    ),
    deliveryId: normalizedId(
      value.deliveryId,
      "verified worker delivery id",
      "delivery_",
      ErrorType
    ),
    claimId: normalizedId(
      value.claimId,
      "verified worker claim id",
      "claim_",
      ErrorType
    ),
    claimAttempt: value.claimAttempt,
    connectorId: normalizedString(
      value.connectorId,
      "verified worker connector id",
      {
        max: 160,
        pattern: CONNECTOR_ID_PATTERN
      },
      ErrorType
    ),
    issuedAt,
    expiresAt,
    deliveryIntentDigest: normalizedDigest(
      value.deliveryIntentDigest,
      "verified worker delivery-intent digest",
      ErrorType
    ),
    digest: normalizedDigest(
      value.digest,
      "verified worker request digest",
      ErrorType
    )
  };
}

function normalizeResponse(
  value,
  request,
  ErrorType = ValidationError
) {
  exactKeys(
    value,
    responseKeys,
    "verified worker receipt response",
    ErrorType
  );
  const completedAt = normalizedIsoDate(
    value.completedAt,
    "verified worker response completedAt",
    ErrorType
  );
  if (
    Date.parse(completedAt) < Date.parse(request.issuedAt) ||
    Date.parse(completedAt) > Date.parse(request.expiresAt)
  ) {
    throw new ErrorType(
      "Verified worker response falls outside its request."
    );
  }
  return {
    completedAt,
    resultDigest: normalizedDigest(
      value.resultDigest,
      "verified worker result digest",
      ErrorType
    ),
    digest: normalizedDigest(
      value.digest,
      "verified worker response digest",
      ErrorType
    ),
    envelopeDigest: normalizedDigest(
      value.envelopeDigest,
      "verified worker response-envelope digest",
      ErrorType
    )
  };
}

function normalizeExecutionBoundary(
  value,
  ErrorType = ValidationError
) {
  exactKeys(
    value,
    executionBoundaryKeys,
    "verified worker execution boundary",
    ErrorType
  );
  const isolation = normalizeNetworkIsolationBinding(
    {
      required: value.networkIsolationEnforced,
      provider: value.networkIsolationProvider,
      policyDigest: value.networkIsolationPolicyDigest
    },
    ErrorType
  );
  const expectedNetworkProbe = isolation.required
    ? "socket_listen_and_connect_denied"
    : "not_run";
  const expectedFilesystemProbe = isolation.required
    ? "dev_null_write_open_denied"
    : "not_run";
  if (
    value.processSeparated !== true ||
    value.shell !== false ||
    value.networkAccess !== false ||
    value.externalEffects !== false ||
    value.filesystemWriteIsolationEnforced !==
      isolation.required ||
    value.filesystemWriteIsolationProbe !==
      expectedFilesystemProbe ||
    value.networkIsolationProbe !== expectedNetworkProbe
  ) {
    throw new ErrorType(
      "Verified worker execution boundary is inconsistent."
    );
  }
  return {
    processSeparated: true,
    shell: false,
    networkAccess: false,
    externalEffects: false,
    filesystemWriteIsolationEnforced: isolation.required,
    filesystemWriteIsolationProbe:
      expectedFilesystemProbe,
    networkIsolationEnforced: isolation.required,
    networkIsolationProvider: isolation.provider,
    networkIsolationPolicyDigest: isolation.policyDigest,
    networkIsolationProbe: expectedNetworkProbe
  };
}

function normalizeWorkerPackage(
  value,
  ErrorType = ValidationError
) {
  exactKeys(
    value,
    workerPackageKeys,
    "verified worker package observation",
    ErrorType
  );
  if (
    value.packageDigestMatched !== true ||
    value.releaseSignatureVerifiedByBootstrap !== true ||
    value.evaluatedFromVerifiedMemory !== true
  ) {
    throw new ErrorType(
      "Verified worker package observation is inconsistent."
    );
  }
  const binding = normalizeWorkerPackageBinding(
    {
      packageId: value.packageId,
      packageVersion: value.packageVersion,
      packageDigest: value.packageDigest,
      artifactId: value.artifactId,
      artifactVersion: value.artifactVersion,
      artifactDigest: value.artifactDigest,
      attestationDigest: value.attestationDigest,
      trustAnchorDigest: value.trustAnchorDigest,
      issuerId: value.issuerId,
      keyId: value.keyId
    },
    ErrorType
  );
  return {
    ...binding,
    packageDigestMatched: true,
    releaseSignatureVerifiedByBootstrap: true,
    evaluatedFromVerifiedMemory: true
  };
}

function normalizeWorkloadSessionEvidence(
  value,
  workerPackage,
  ErrorType = ValidationError
) {
  exactKeys(
    value,
    workloadSessionKeys,
    "verified worker workload session",
    ErrorType
  );
  if (
    value.algorithm !== ALGORITHM ||
    value.responseSignatureVerified !== true ||
    value.challengeMatched !== true ||
    value.packageBindingMatched !== true
  ) {
    throw new ErrorType(
      "Verified worker workload session is inconsistent."
    );
  }
  const observation =
    normalizeWorkloadSessionObservation(
      {
        kind: "fdos-workload-session-observation",
        mode: value.mode,
        keyId: value.keyId,
        sessionDigest: value.sessionDigest,
        challengeDigest: value.challengeDigest,
        packageBindingDigest: value.packageBindingDigest,
        ephemeralKeyGeneratedByBootstrap:
          value.ephemeralKeyGeneratedByBootstrap,
        externallyAttested: value.externallyAttested
      },
      ErrorType
    );
  const packageBinding = normalizeWorkerPackageBinding(
    {
      packageId: workerPackage.packageId,
      packageVersion: workerPackage.packageVersion,
      packageDigest: workerPackage.packageDigest,
      artifactId: workerPackage.artifactId,
      artifactVersion: workerPackage.artifactVersion,
      artifactDigest: workerPackage.artifactDigest,
      attestationDigest: workerPackage.attestationDigest,
      trustAnchorDigest: workerPackage.trustAnchorDigest,
      issuerId: workerPackage.issuerId,
      keyId: workerPackage.keyId
    },
    ErrorType
  );
  if (
    observation.packageBindingDigest !==
      digestObject(packageBinding)
  ) {
    throw new ErrorType(
      "Verified workload session does not bind its package."
    );
  }
  return {
    mode: WORKLOAD_SESSION_MODE,
    algorithm: ALGORITHM,
    keyId: observation.keyId,
    sessionDigest: observation.sessionDigest,
    challengeDigest: observation.challengeDigest,
    packageBindingDigest: observation.packageBindingDigest,
    ephemeralKeyGeneratedByBootstrap: true,
    responseSignatureVerified: true,
    challengeMatched: true,
    packageBindingMatched: true,
    externallyAttested: false
  };
}

function normalizeVerification(
  value,
  ErrorType = ValidationError
) {
  exactKeys(
    value,
    verificationKeys,
    "verified worker receipt verification",
    ErrorType
  );
  if (
    verificationKeys.some((field) => value[field] !== true)
  ) {
    throw new ErrorType(
      "Verified worker receipt has an incomplete verification."
    );
  }
  return Object.fromEntries(
    verificationKeys.map((field) => [field, true])
  );
}

function responseBoundary(
  executionBoundary,
  workerPackage,
  workloadSession
) {
  return {
    processSeparated: true,
    shell: false,
    networkAccess: false,
    externalEffects: false,
    filesystemWriteIsolationEnforced:
      executionBoundary.filesystemWriteIsolationEnforced,
    filesystemWriteIsolationProbe:
      executionBoundary.filesystemWriteIsolationProbe,
    networkIsolationEnforced:
      executionBoundary.networkIsolationEnforced,
    networkIsolationProvider:
      executionBoundary.networkIsolationProvider,
    networkIsolationPolicyDigest:
      executionBoundary.networkIsolationPolicyDigest,
    networkIsolationProbe:
      executionBoundary.networkIsolationProbe,
    workerPackage,
    workloadSession: {
      kind: "fdos-workload-session-observation",
      mode: workloadSession.mode,
      keyId: workloadSession.keyId,
      sessionDigest: workloadSession.sessionDigest,
      challengeDigest: workloadSession.challengeDigest,
      packageBindingDigest:
        workloadSession.packageBindingDigest,
      ephemeralKeyGeneratedByBootstrap: true,
      externallyAttested: false
    }
  };
}

function expectedResponseDigest(
  request,
  response,
  executionBoundary,
  workerPackage,
  workloadSession
) {
  return digestObject({
    schemaVersion: PROTOCOL_VERSION,
    kind: RESPONSE_KIND,
    requestId: request.requestId,
    deliveryId: request.deliveryId,
    claimId: request.claimId,
    connectorId: request.connectorId,
    requestDigest: request.digest,
    completedAt: response.completedAt,
    outcome: {
      type: "simulated",
      evidence: {
        externalEffect: "none",
        resultDigest: response.resultDigest
      }
    },
    workerBoundary: responseBoundary(
      executionBoundary,
      workerPackage,
      workloadSession
    )
  });
}

export function normalizeVerifiedWorkerReceipt(
  value,
  ErrorType = ValidationError
) {
  exactKeys(
    value,
    receiptKeys,
    "verified worker receipt",
    ErrorType
  );
  if (
    value.schemaVersion !== SCHEMA_VERSION ||
    value.kind !== KIND ||
    value.protocolVersion !== PROTOCOL_VERSION
  ) {
    throw new ErrorType(
      "Verified worker receipt is unsupported."
    );
  }
  const request = normalizeRequest(value.request, ErrorType);
  const response = normalizeResponse(
    value.response,
    request,
    ErrorType
  );
  const executionBoundary = normalizeExecutionBoundary(
    value.executionBoundary,
    ErrorType
  );
  const workerPackage = normalizeWorkerPackage(
    value.workerPackage,
    ErrorType
  );
  const workloadSession =
    normalizeWorkloadSessionEvidence(
      value.workloadSession,
      workerPackage,
      ErrorType
    );
  const verification = normalizeVerification(
    value.verification,
    ErrorType
  );
  if (
    expectedResponseDigest(
      request,
      response,
      executionBoundary,
      workerPackage,
      workloadSession
    ) !== response.digest
  ) {
    throw new ErrorType(
      "Verified worker receipt response digest mismatch."
    );
  }
  const unsigned = {
    schemaVersion: SCHEMA_VERSION,
    kind: KIND,
    protocolVersion: PROTOCOL_VERSION,
    request,
    response,
    executionBoundary,
    workerPackage,
    workloadSession,
    verification
  };
  const digest = normalizedDigest(
    value.digest,
    "verified worker receipt digest",
    ErrorType
  );
  if (digestObject(unsigned) !== digest) {
    throw new ErrorType(
      "Verified worker receipt digest mismatch."
    );
  }
  return immutableJson({
    ...unsigned,
    digest
  });
}

export function createVerifiedWorkerReceipt({
  request,
  response,
  responseEnvelopeDigest,
  workerBoundary,
  workloadSession,
  claimAttempt
}) {
  if (
    responseEnvelopeDigest !==
      workloadSession?.responseEnvelopeDigest
  ) {
    throw new ValidationError(
      "Verified worker receipt envelope binding is inconsistent."
    );
  }
  const unsigned = {
    schemaVersion: SCHEMA_VERSION,
    kind: KIND,
    protocolVersion: PROTOCOL_VERSION,
    request: {
      requestId: request?.requestId,
      deliveryId: request?.deliveryId,
      claimId: request?.claimId,
      claimAttempt,
      connectorId: request?.connectorId,
      issuedAt: request?.issuedAt,
      expiresAt: request?.expiresAt,
      deliveryIntentDigest: request?.intent?.digest,
      digest: request?.digest
    },
    response: {
      completedAt: response?.completedAt,
      resultDigest: response?.outcome?.evidence?.resultDigest,
      digest: response?.digest,
      envelopeDigest: responseEnvelopeDigest
    },
    executionBoundary: {
      processSeparated: workerBoundary?.processSeparated,
      shell: workerBoundary?.shell,
      networkAccess: workerBoundary?.networkAccess,
      externalEffects: workerBoundary?.externalEffects,
      filesystemWriteIsolationEnforced:
        workerBoundary?.filesystemWriteIsolationEnforced,
      filesystemWriteIsolationProbe:
        workerBoundary?.filesystemWriteIsolationProbe,
      networkIsolationEnforced:
        workerBoundary?.networkIsolationEnforced,
      networkIsolationProvider:
        workerBoundary?.networkIsolationProvider,
      networkIsolationPolicyDigest:
        workerBoundary?.networkIsolationPolicyDigest,
      networkIsolationProbe:
        workerBoundary?.networkIsolationProbe
    },
    workerPackage: workerBoundary?.workerPackage,
    workloadSession: {
      mode: workloadSession?.mode,
      algorithm: workloadSession?.algorithm,
      keyId: workloadSession?.keyId,
      sessionDigest: workloadSession?.sessionDigest,
      challengeDigest: workloadSession?.challengeDigest,
      packageBindingDigest:
        workloadSession?.packageBindingDigest,
      ephemeralKeyGeneratedByBootstrap:
        workerBoundary?.workloadSession
          ?.ephemeralKeyGeneratedByBootstrap,
      responseSignatureVerified:
        workloadSession?.responseSignatureVerified,
      challengeMatched: workloadSession?.challengeMatched,
      packageBindingMatched:
        workloadSession?.packageBindingMatched,
      externallyAttested:
        workloadSession?.externallyAttested
    },
    verification: {
      authenticatedEnvelopeVerified: true,
      canonicalResponseVerified: true,
      cleanProcessExitVerified: true,
      emptyStandardErrorVerified: true,
      outputBoundsVerified: true,
      protocolResponseVerified: true
    }
  };
  return normalizeVerifiedWorkerReceipt({
    ...unsigned,
    digest: digestObject(unsigned)
  });
}

export function assertVerifiedWorkerReceiptBinding(
  value,
  {
    delivery,
    claim,
    outcome,
    recordedAt
  },
  ErrorType = ValidationError
) {
  const receipt = normalizeVerifiedWorkerReceipt(
    value,
    ErrorType
  );
  const normalizedRecordedAt = normalizedIsoDate(
    recordedAt,
    "worker receipt recordedAt",
    ErrorType
  );
  if (
    outcome?.type !== "simulated" ||
    receipt.request.deliveryId !== delivery?.id ||
    receipt.request.claimId !== claim?.id ||
    receipt.request.claimAttempt !== claim?.attempt ||
    receipt.request.connectorId !== claim?.connectorId ||
    receipt.request.connectorId !==
      delivery?.intent?.connector?.id ||
    receipt.request.deliveryIntentDigest !==
      delivery?.intent?.digest ||
    receipt.response.resultDigest !==
      outcome?.evidence?.resultDigest ||
    Date.parse(receipt.request.issuedAt) <
      Date.parse(claim?.claimedAt) ||
    Date.parse(receipt.request.expiresAt) >
      Date.parse(claim?.expiresAt) ||
    Date.parse(receipt.response.completedAt) -
      Date.parse(normalizedRecordedAt) >
      MAX_PARENT_RUNTIME_CLOCK_SKEW_MS
  ) {
    throw new ErrorType(
      "Verified worker receipt does not bind the active delivery outcome."
    );
  }
  return receipt;
}

export function verifyVerifiedWorkerReceipt(value) {
  normalizeVerifiedWorkerReceipt(value, IntegrityError);
  return true;
}
