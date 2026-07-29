import {
  digestObject,
  immutableJson,
  jsonClone
} from "../kernel/canonical-json.js";
import {
  IntegrityError,
  PolicyError,
  ValidationError
} from "../kernel/errors.js";
import { assertId } from "../kernel/ids.js";
import {
  assertPlainObject,
  isoDate,
  requiredString
} from "../kernel/validation.js";
import {
  normalizeDeliveryOutcome,
  verifyDeliveryIntent
} from "../domain/delivery-intent.js";
import {
  NO_NETWORK_ISOLATION_PROVIDER,
  normalizeNetworkIsolationBinding,
  processOnlyNetworkIsolationBinding
} from "../domain/network-isolation-contract.js";
import {
  normalizeWorkerPackageBinding,
  workerPackageBindingsEqual
} from "../domain/worker-package-contract.js";
import {
  normalizeWorkloadSessionChallenge,
  normalizeWorkloadSessionObservation,
  verifyWorkloadSessionObservation
} from "../domain/workload-session-contract.js";

const PROTOCOL_SCHEMA_VERSION = "1.4";
const REQUEST_KIND = "fdos-process-worker-request";
const RESPONSE_KIND = "fdos-process-worker-response";
const MAX_REQUEST_TTL_MS = 5 * 60 * 1_000;
const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/;
const CONNECTOR_ID_PATTERN =
  /^connector:[a-z][a-z0-9-]{1,63}:[a-zA-Z0-9][a-zA-Z0-9._-]{1,63}$/;
const requestKeys = Object.freeze([
  "claimId",
  "connectorId",
  "deliveryId",
  "digest",
  "execution",
  "expiresAt",
  "intent",
  "issuedAt",
  "kind",
  "requestId",
  "schemaVersion"
]);
const executionKeys = Object.freeze([
  "externalEffects",
  "mode",
  "networkAccess",
  "networkIsolation",
  "workerPackage",
  "workloadSessionChallenge"
]);
const responseKeys = Object.freeze([
  "claimId",
  "completedAt",
  "connectorId",
  "deliveryId",
  "digest",
  "kind",
  "outcome",
  "requestDigest",
  "requestId",
  "schemaVersion",
  "workerBoundary"
]);
const workerBoundaryKeys = Object.freeze([
  "externalEffects",
  "filesystemWriteIsolationEnforced",
  "filesystemWriteIsolationProbe",
  "networkAccess",
  "networkIsolationEnforced",
  "networkIsolationPolicyDigest",
  "networkIsolationProbe",
  "networkIsolationProvider",
  "processSeparated",
  "shell",
  "workerPackage",
  "workloadSession"
]);
const isolationAttestationKeys = Object.freeze([
  "enforced",
  "filesystemWriteEnforced",
  "filesystemWriteProbe",
  "policyDigest",
  "probe",
  "provider"
]);
const packageObservationKeys = Object.freeze([
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

function exactKeys(value, expected, field, ErrorType = ValidationError) {
  try {
    assertPlainObject(value, field);
  } catch (error) {
    if (ErrorType === ValidationError) throw error;
    throw new ErrorType(`${field} has an unexpected shape.`);
  }
  const actual = Object.keys(value).sort();
  const normalizedExpected = [...expected].sort();
  if (
    actual.length !== normalizedExpected.length ||
    actual.some((key, index) => key !== normalizedExpected[index])
  ) {
    throw new ErrorType(`${field} has an unexpected shape.`);
  }
}

function normalizedDigest(value, field, ErrorType = ValidationError) {
  try {
    return requiredString(value, field, {
      max: 71,
      pattern: DIGEST_PATTERN
    });
  } catch (error) {
    if (ErrorType === ValidationError) throw error;
    throw new ErrorType(`${field} is invalid.`);
  }
}

function normalizedId(value, field, prefix, ErrorType = ValidationError) {
  try {
    const id = assertId(value, field);
    if (!id.startsWith(prefix)) {
      throw new ValidationError(`${field} has the wrong prefix.`);
    }
    return id;
  } catch (error) {
    if (ErrorType === ValidationError) throw error;
    throw new ErrorType(`${field} is invalid.`);
  }
}

function normalizeExecution(value, ErrorType = ValidationError) {
  exactKeys(value, executionKeys, "worker execution boundary", ErrorType);
  if (
    value.mode !== "dry_run" ||
    value.networkAccess !== false ||
    value.externalEffects !== false
  ) {
    throw new ErrorType(
      "Worker request exceeds the no-network dry-run boundary."
    );
  }
  return {
    mode: "dry_run",
    networkAccess: false,
    externalEffects: false,
    networkIsolation: normalizeNetworkIsolationBinding(
      value.networkIsolation,
      ErrorType
    ),
    workerPackage: normalizeWorkerPackageBinding(
      value.workerPackage,
      ErrorType
    ),
    workloadSessionChallenge:
      normalizeWorkloadSessionChallenge(
        value.workloadSessionChallenge,
        ErrorType
      )
  };
}

function normalizeRequest(request, ErrorType = ValidationError) {
  exactKeys(request, requestKeys, "worker request", ErrorType);
  if (
    request.schemaVersion !== PROTOCOL_SCHEMA_VERSION ||
    request.kind !== REQUEST_KIND
  ) {
    throw new ErrorType("Worker request protocol is unsupported.");
  }
  const requestId = normalizedId(
    request.requestId,
    "worker request id",
    "workerrequest_",
    ErrorType
  );
  const deliveryId = normalizedId(
    request.deliveryId,
    "worker delivery id",
    "delivery_",
    ErrorType
  );
  const claimId = normalizedId(
    request.claimId,
    "worker claim id",
    "claim_",
    ErrorType
  );
  let connectorId;
  try {
    connectorId = requiredString(
      request.connectorId,
      "worker connector id",
      {
        max: 160,
        pattern: CONNECTOR_ID_PATTERN
      }
    );
  } catch (error) {
    if (ErrorType === ValidationError) throw error;
    throw new ErrorType("Worker connector id is invalid.");
  }
  try {
    verifyDeliveryIntent(request.intent);
  } catch (error) {
    if (ErrorType === ValidationError) throw error;
    throw new ErrorType("Worker delivery intent is invalid.");
  }
  if (
    request.intent.connector.id !== connectorId ||
    request.intent.connector.executionMode !== "dry_run" ||
    request.intent.connector.networkAccess !== false ||
    request.intent.connector.externalEffects !== false
  ) {
    throw new ErrorType(
      "Worker request and delivery intent boundary differ."
    );
  }
  let issuedAt;
  let expiresAt;
  try {
    issuedAt = isoDate(request.issuedAt, "worker request issuedAt");
    expiresAt = isoDate(request.expiresAt, "worker request expiresAt");
  } catch (error) {
    if (ErrorType === ValidationError) throw error;
    throw new ErrorType("Worker request time binding is invalid.");
  }
  const ttl = Date.parse(expiresAt) - Date.parse(issuedAt);
  if (ttl <= 0 || ttl > MAX_REQUEST_TTL_MS) {
    throw new ErrorType("Worker request validity window is invalid.");
  }
  const execution = normalizeExecution(request.execution, ErrorType);
  const unsigned = {
    schemaVersion: PROTOCOL_SCHEMA_VERSION,
    kind: REQUEST_KIND,
    requestId,
    deliveryId,
    claimId,
    connectorId,
    issuedAt,
    expiresAt,
    execution,
    intent: jsonClone(request.intent)
  };
  const digest = normalizedDigest(
    request.digest,
    "worker request digest",
    ErrorType
  );
  if (digestObject(unsigned) !== digest) {
    throw new ErrorType("Worker request digest mismatch.");
  }
  return immutableJson({ ...unsigned, digest });
}

function normalizeWorkerBoundary(value, ErrorType = IntegrityError) {
  exactKeys(
    value,
    workerBoundaryKeys,
    "worker response boundary",
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
  const expectedProbe = isolation.required
    ? "socket_listen_and_connect_denied"
    : "not_run";
  const expectedFilesystemProbe = isolation.required
    ? "dev_null_write_open_denied"
    : "not_run";
  const workerPackage = normalizeWorkerPackageObservation(
    value.workerPackage,
    ErrorType
  );
  const workloadSession =
    normalizeWorkloadSessionObservation(
      value.workloadSession,
      ErrorType
    );
  if (
    value.processSeparated !== true ||
    value.shell !== false ||
    value.networkAccess !== false ||
    value.externalEffects !== false ||
    value.networkIsolationProbe !== expectedProbe ||
    value.filesystemWriteIsolationEnforced !== isolation.required ||
    value.filesystemWriteIsolationProbe !== expectedFilesystemProbe
  ) {
    throw new ErrorType("Worker response boundary is inconsistent.");
  }
  return {
    processSeparated: true,
    shell: false,
    networkAccess: false,
    externalEffects: false,
    filesystemWriteIsolationEnforced: isolation.required,
    filesystemWriteIsolationProbe: expectedFilesystemProbe,
    networkIsolationEnforced: isolation.required,
    networkIsolationProvider: isolation.provider,
    networkIsolationPolicyDigest: isolation.policyDigest,
    networkIsolationProbe: expectedProbe,
    workerPackage,
    workloadSession
  };
}

function normalizeWorkerPackageObservation(
  value,
  ErrorType = IntegrityError
) {
  exactKeys(
    value,
    packageObservationKeys,
    "worker package observation",
    ErrorType
  );
  if (
    value.packageDigestMatched !== true ||
    value.releaseSignatureVerifiedByBootstrap !== true ||
    value.evaluatedFromVerifiedMemory !== true
  ) {
    throw new ErrorType(
      "Worker package was not verified before evaluation."
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

function packageObservationMatchesBinding(observation, binding) {
  const observedBinding = {
    packageId: observation.packageId,
    packageVersion: observation.packageVersion,
    packageDigest: observation.packageDigest,
    artifactId: observation.artifactId,
    artifactVersion: observation.artifactVersion,
    artifactDigest: observation.artifactDigest,
    attestationDigest: observation.attestationDigest,
    trustAnchorDigest: observation.trustAnchorDigest,
    issuerId: observation.issuerId,
    keyId: observation.keyId
  };
  return (
    observation.packageDigestMatched === true &&
    observation.releaseSignatureVerifiedByBootstrap === true &&
    observation.evaluatedFromVerifiedMemory === true &&
    workerPackageBindingsEqual(observedBinding, binding)
  );
}

function createWorkerBoundary(
  requestIsolation,
  networkIsolationAttestation,
  requestPackage,
  workerPackageObservation,
  requestWorkloadSessionChallenge,
  workloadSessionObservation
) {
  const source =
    networkIsolationAttestation ??
    (requestIsolation.required
      ? null
      : {
          enforced: false,
          filesystemWriteEnforced: false,
          filesystemWriteProbe: "not_run",
          provider: NO_NETWORK_ISOLATION_PROVIDER,
          policyDigest: requestIsolation.policyDigest,
          probe: "not_run"
        });
  exactKeys(
    source,
    isolationAttestationKeys,
    "worker network-isolation attestation"
  );
  const boundary = normalizeWorkerBoundary(
    {
      processSeparated: true,
      shell: false,
      networkAccess: false,
      externalEffects: false,
      filesystemWriteIsolationEnforced:
        source.filesystemWriteEnforced,
      filesystemWriteIsolationProbe:
        source.filesystemWriteProbe,
      networkIsolationEnforced: source.enforced,
      networkIsolationProvider: source.provider,
      networkIsolationPolicyDigest: source.policyDigest,
      networkIsolationProbe: source.probe,
      workerPackage: workerPackageObservation,
      workloadSession: workloadSessionObservation
    },
    ValidationError
  );
  if (
    boundary.networkIsolationEnforced !== requestIsolation.required ||
    boundary.networkIsolationProvider !== requestIsolation.provider ||
    boundary.networkIsolationPolicyDigest !==
      requestIsolation.policyDigest
  ) {
    throw new PolicyError(
      "Worker network-isolation attestation differs from the request."
    );
  }
  if (
    !packageObservationMatchesBinding(
      boundary.workerPackage,
      requestPackage
    )
  ) {
    throw new PolicyError(
      "Worker package observation differs from the request."
    );
  }
  try {
    verifyWorkloadSessionObservation(
      boundary.workloadSession,
      {
        expectedChallenge:
          requestWorkloadSessionChallenge,
        expectedWorkerPackage: requestPackage
      }
    );
  } catch {
    throw new PolicyError(
      "Worker workload session differs from the request."
    );
  }
  return boundary;
}

function normalizeResponse(response, ErrorType = IntegrityError) {
  exactKeys(response, responseKeys, "worker response", ErrorType);
  if (
    response.schemaVersion !== PROTOCOL_SCHEMA_VERSION ||
    response.kind !== RESPONSE_KIND
  ) {
    throw new ErrorType("Worker response protocol is unsupported.");
  }
  const requestId = normalizedId(
    response.requestId,
    "worker response request id",
    "workerrequest_",
    ErrorType
  );
  const deliveryId = normalizedId(
    response.deliveryId,
    "worker response delivery id",
    "delivery_",
    ErrorType
  );
  const claimId = normalizedId(
    response.claimId,
    "worker response claim id",
    "claim_",
    ErrorType
  );
  let connectorId;
  let completedAt;
  try {
    connectorId = requiredString(
      response.connectorId,
      "worker response connector id",
      {
        max: 160,
        pattern: CONNECTOR_ID_PATTERN
      }
    );
    completedAt = isoDate(
      response.completedAt,
      "worker response completedAt"
    );
  } catch (error) {
    throw new ErrorType("Worker response identity or time is invalid.");
  }
  const requestDigest = normalizedDigest(
    response.requestDigest,
    "worker response request digest",
    ErrorType
  );
  let outcome;
  try {
    exactKeys(
      response.outcome,
      ["evidence", "type"],
      "worker response outcome",
      ErrorType
    );
    outcome = normalizeDeliveryOutcome(
      response.outcome.type,
      response.outcome.evidence
    );
  } catch (error) {
    if (error instanceof ErrorType) throw error;
    throw new ErrorType("Worker response outcome is invalid.");
  }
  if (outcome.type !== "simulated") {
    throw new ErrorType(
      "Process worker may return only a simulated outcome."
    );
  }
  const workerBoundary = normalizeWorkerBoundary(
    response.workerBoundary,
    ErrorType
  );
  const unsigned = {
    schemaVersion: PROTOCOL_SCHEMA_VERSION,
    kind: RESPONSE_KIND,
    requestId,
    deliveryId,
    claimId,
    connectorId,
    requestDigest,
    completedAt,
    outcome,
    workerBoundary
  };
  const digest = normalizedDigest(
    response.digest,
    "worker response digest",
    ErrorType
  );
  if (digestObject(unsigned) !== digest) {
    throw new ErrorType("Worker response digest mismatch.");
  }
  return immutableJson({ ...unsigned, digest });
}

export function createDryRunWorkerRequest({
  delivery,
  requestId,
  issuedAt,
  expiresAt,
  networkIsolation = processOnlyNetworkIsolationBinding(),
  workerPackage,
  workloadSessionChallenge
}) {
  assertPlainObject(delivery, "claimed connector delivery");
  if (
    delivery.status !== "claimed" ||
    !delivery.claim ||
    delivery.claim.connectorId !== delivery.intent?.connector?.id
  ) {
    throw new PolicyError(
      "Process worker requires one active claimed connector delivery."
    );
  }
  verifyDeliveryIntent(delivery.intent);
  if (
    delivery.intent.connector.executionMode !== "dry_run" ||
    delivery.intent.connector.networkAccess !== false ||
    delivery.intent.connector.externalEffects !== false
  ) {
    throw new PolicyError(
      "Process worker accepts only no-network, no-effect dry-run intents."
    );
  }
  const unsigned = {
    schemaVersion: PROTOCOL_SCHEMA_VERSION,
    kind: REQUEST_KIND,
    requestId: normalizedId(
      requestId,
      "worker request id",
      "workerrequest_"
    ),
    deliveryId: normalizedId(
      delivery.id,
      "worker delivery id",
      "delivery_"
    ),
    claimId: normalizedId(
      delivery.claim.id,
      "worker claim id",
      "claim_"
    ),
    connectorId: requiredString(
      delivery.intent.connector.id,
      "worker connector id",
      {
        max: 160,
        pattern: CONNECTOR_ID_PATTERN
      }
    ),
    issuedAt: isoDate(issuedAt, "worker request issuedAt"),
    expiresAt: isoDate(expiresAt, "worker request expiresAt"),
    execution: {
      mode: "dry_run",
      networkAccess: false,
      externalEffects: false,
      networkIsolation: normalizeNetworkIsolationBinding(
        networkIsolation
      ),
      workerPackage: normalizeWorkerPackageBinding(
        workerPackage
      ),
      workloadSessionChallenge:
        normalizeWorkloadSessionChallenge(
          workloadSessionChallenge
        )
    },
    intent: jsonClone(delivery.intent)
  };
  return normalizeRequest({
    ...unsigned,
    digest: digestObject(unsigned)
  });
}

export function verifyDryRunWorkerRequest(request, { now } = {}) {
  const normalized = normalizeRequest(request, IntegrityError);
  if (now !== undefined) {
    const normalizedNow = isoDate(now, "worker verification time");
    if (
      Date.parse(normalizedNow) < Date.parse(normalized.issuedAt) ||
      Date.parse(normalizedNow) > Date.parse(normalized.expiresAt)
    ) {
      throw new PolicyError("Worker request is outside its validity window.");
    }
  }
  return true;
}

export function createDryRunWorkerResponse({
  request,
  completedAt,
  networkIsolationAttestation,
  workerPackageObservation,
  workloadSessionObservation
}) {
  const normalizedRequest = normalizeRequest(request, IntegrityError);
  const normalizedCompletedAt = isoDate(
    completedAt,
    "worker response completedAt"
  );
  if (
    Date.parse(normalizedCompletedAt) <
      Date.parse(normalizedRequest.issuedAt) ||
    Date.parse(normalizedCompletedAt) >
      Date.parse(normalizedRequest.expiresAt)
  ) {
    throw new PolicyError(
      "Worker response falls outside the request validity window."
    );
  }
  const workerBoundary = createWorkerBoundary(
    normalizedRequest.execution.networkIsolation,
    networkIsolationAttestation,
    normalizedRequest.execution.workerPackage,
    workerPackageObservation,
    normalizedRequest.execution
      .workloadSessionChallenge,
    workloadSessionObservation
  );
  const outcome = normalizeDeliveryOutcome("simulated", {
    externalEffect: "none",
    resultDigest: digestObject({
      requestDigest: normalizedRequest.digest,
      intentDigest: normalizedRequest.intent.digest,
      operationDigest: normalizedRequest.intent.operation.digest,
      completedAt: normalizedCompletedAt,
      workerBoundary,
      simulated: true,
      externalEffect: "none"
    })
  });
  const unsigned = {
    schemaVersion: PROTOCOL_SCHEMA_VERSION,
    kind: RESPONSE_KIND,
    requestId: normalizedRequest.requestId,
    deliveryId: normalizedRequest.deliveryId,
    claimId: normalizedRequest.claimId,
    connectorId: normalizedRequest.connectorId,
    requestDigest: normalizedRequest.digest,
    completedAt: normalizedCompletedAt,
    outcome,
    workerBoundary
  };
  return normalizeResponse({
    ...unsigned,
    digest: digestObject(unsigned)
  });
}

export function verifyDryRunWorkerResponse(response, request) {
  const normalizedRequest = normalizeRequest(request, IntegrityError);
  const normalizedResponse = normalizeResponse(response, IntegrityError);
  verifyWorkloadSessionObservation(
    normalizedResponse.workerBoundary.workloadSession,
    {
      expectedChallenge:
        normalizedRequest.execution
          .workloadSessionChallenge,
      expectedWorkerPackage:
        normalizedRequest.execution.workerPackage
    }
  );
  if (
    normalizedResponse.requestId !== normalizedRequest.requestId ||
    normalizedResponse.deliveryId !== normalizedRequest.deliveryId ||
    normalizedResponse.claimId !== normalizedRequest.claimId ||
    normalizedResponse.connectorId !== normalizedRequest.connectorId ||
    normalizedResponse.requestDigest !== normalizedRequest.digest ||
    normalizedResponse.workerBoundary.networkIsolationEnforced !==
      normalizedRequest.execution.networkIsolation.required ||
    normalizedResponse.workerBoundary.networkIsolationProvider !==
      normalizedRequest.execution.networkIsolation.provider ||
    normalizedResponse.workerBoundary.networkIsolationPolicyDigest !==
      normalizedRequest.execution.networkIsolation.policyDigest ||
    !packageObservationMatchesBinding(
      normalizedResponse.workerBoundary.workerPackage,
      normalizedRequest.execution.workerPackage
    ) ||
    Date.parse(normalizedResponse.completedAt) <
      Date.parse(normalizedRequest.issuedAt) ||
    Date.parse(normalizedResponse.completedAt) >
      Date.parse(normalizedRequest.expiresAt)
  ) {
    throw new IntegrityError(
      "Worker response does not bind the exact request."
    );
  }
  return true;
}
