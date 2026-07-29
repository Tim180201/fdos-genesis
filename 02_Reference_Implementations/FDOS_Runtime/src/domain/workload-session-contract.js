import {
  createHash,
  createPublicKey,
  verify as verifyBytes
} from "node:crypto";
import {
  canonicalJson,
  digestObject,
  immutableJson,
  jsonClone
} from "../kernel/canonical-json.js";
import {
  IntegrityError,
  ValidationError
} from "../kernel/errors.js";
import {
  assertPlainObject,
  requiredString
} from "../kernel/validation.js";
import {
  normalizeWorkerPackageBinding,
  workerPackageBindingsEqual
} from "./worker-package-contract.js";

const SCHEMA_VERSION = "1.0";
const SESSION_KIND = "fdos-ephemeral-workload-session";
const ENVELOPE_KIND =
  "fdos-authenticated-worker-response";
const SIGNATURE_STATEMENT_KIND =
  "fdos-workload-response-signature-statement";
const EVIDENCE_KIND =
  "fdos-workload-session-evidence";
const OBSERVATION_KIND =
  "fdos-workload-session-observation";
const ALGORITHM = "Ed25519";
export const WORKLOAD_SESSION_MODE =
  "ephemeral-ed25519-parent-challenge";
const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/;
const CHALLENGE_PATTERN = /^[a-zA-Z0-9_-]{43}$/;
const SIGNATURE_PATTERN = /^[a-zA-Z0-9_-]{86}$/;
const KEY_ID_PATTERN = /^key:session-[0-9a-f]{24}$/;
const sessionKeys = Object.freeze([
  "algorithm",
  "challenge",
  "keyId",
  "kind",
  "mode",
  "publicKeyPem",
  "schemaVersion",
  "workerPackage"
]);
const envelopeKeys = Object.freeze([
  "digest",
  "kind",
  "response",
  "schemaVersion",
  "signature",
  "workloadSession"
]);
const observationKeys = Object.freeze([
  "challengeDigest",
  "ephemeralKeyGeneratedByBootstrap",
  "externallyAttested",
  "keyId",
  "kind",
  "mode",
  "packageBindingDigest",
  "sessionDigest"
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

function normalizedBase64url(
  value,
  field,
  pattern,
  byteLength,
  ErrorType = ValidationError
) {
  const normalized = normalizedString(
    value,
    field,
    {
      max: 100,
      pattern
    },
    ErrorType
  );
  const bytes = Buffer.from(normalized, "base64url");
  if (
    bytes.length !== byteLength ||
    bytes.toString("base64url") !== normalized
  ) {
    throw new ErrorType(`${field} is invalid.`);
  }
  return normalized;
}

export function normalizeWorkloadSessionChallenge(
  value,
  ErrorType = ValidationError
) {
  return normalizedBase64url(
    value,
    "workload session challenge",
    CHALLENGE_PATTERN,
    32,
    ErrorType
  );
}

function normalizedSignature(
  value,
  ErrorType = ValidationError
) {
  return normalizedBase64url(
    value,
    "workload response signature",
    SIGNATURE_PATTERN,
    64,
    ErrorType
  );
}

function normalizedPublicKey(
  value,
  ErrorType = ValidationError
) {
  const publicKeyPem = normalizedString(
    value,
    "workload session public key",
    {
      max: 2_000,
      pattern: /^-----BEGIN PUBLIC KEY-----/
    },
    ErrorType
  );
  let publicKey;
  try {
    publicKey = createPublicKey(publicKeyPem);
  } catch {
    throw new ErrorType(
      "Workload session public key is invalid."
    );
  }
  if (publicKey.asymmetricKeyType !== "ed25519") {
    throw new ErrorType(
      "Workload session public key must be Ed25519."
    );
  }
  const canonicalPublicKeyPem = publicKey
    .export({
      type: "spki",
      format: "pem"
    })
    .trim();
  if (canonicalPublicKeyPem !== publicKeyPem) {
    throw new ErrorType(
      "Workload session public key is not canonical."
    );
  }
  return {
    publicKey,
    publicKeyPem: canonicalPublicKeyPem
  };
}

function keyIdForPublicKey(publicKey) {
  const bytes = publicKey.export({
    type: "spki",
    format: "der"
  });
  const fingerprint = createHash("sha256")
    .update(bytes)
    .digest("hex");
  return `key:session-${fingerprint.slice(0, 24)}`;
}

export function workloadSessionKeyId(publicKeyPem) {
  return keyIdForPublicKey(
    normalizedPublicKey(publicKeyPem).publicKey
  );
}

export function normalizeWorkloadSession(
  value,
  ErrorType = ValidationError
) {
  exactKeys(
    value,
    sessionKeys,
    "workload session",
    ErrorType
  );
  if (
    value.schemaVersion !== SCHEMA_VERSION ||
    value.kind !== SESSION_KIND ||
    value.algorithm !== ALGORITHM ||
    value.mode !== WORKLOAD_SESSION_MODE
  ) {
    throw new ErrorType(
      "Workload session identity is unsupported."
    );
  }
  const { publicKey, publicKeyPem } = normalizedPublicKey(
    value.publicKeyPem,
    ErrorType
  );
  const keyId = normalizedString(
    value.keyId,
    "workload session key id",
    {
      max: 100,
      pattern: KEY_ID_PATTERN
    },
    ErrorType
  );
  if (keyIdForPublicKey(publicKey) !== keyId) {
    throw new ErrorType(
      "Workload session key id does not match its public key."
    );
  }
  return immutableJson({
    schemaVersion: SCHEMA_VERSION,
    kind: SESSION_KIND,
    mode: WORKLOAD_SESSION_MODE,
    algorithm: ALGORITHM,
    challenge: normalizeWorkloadSessionChallenge(
      value.challenge,
      ErrorType
    ),
    keyId,
    publicKeyPem,
    workerPackage: normalizeWorkerPackageBinding(
      value.workerPackage,
      ErrorType
    )
  });
}

export function createWorkloadSession({
  challenge,
  publicKeyPem,
  workerPackage
}) {
  const { publicKey } = normalizedPublicKey(publicKeyPem);
  return normalizeWorkloadSession({
    schemaVersion: SCHEMA_VERSION,
    kind: SESSION_KIND,
    mode: WORKLOAD_SESSION_MODE,
    algorithm: ALGORITHM,
    challenge,
    keyId: keyIdForPublicKey(publicKey),
    publicKeyPem,
    workerPackage
  });
}

export function normalizeWorkloadSessionObservation(
  value,
  ErrorType = ValidationError
) {
  exactKeys(
    value,
    observationKeys,
    "workload session observation",
    ErrorType
  );
  if (
    value.kind !== OBSERVATION_KIND ||
    value.mode !== WORKLOAD_SESSION_MODE ||
    value.ephemeralKeyGeneratedByBootstrap !== true ||
    value.externallyAttested !== false
  ) {
    throw new ErrorType(
      "Workload session observation is unsupported."
    );
  }
  return immutableJson({
    kind: OBSERVATION_KIND,
    mode: WORKLOAD_SESSION_MODE,
    keyId: normalizedString(
      value.keyId,
      "workload session observation key id",
      {
        max: 100,
        pattern: KEY_ID_PATTERN
      },
      ErrorType
    ),
    sessionDigest: normalizedDigest(
      value.sessionDigest,
      "workload session observation digest",
      ErrorType
    ),
    challengeDigest: normalizedDigest(
      value.challengeDigest,
      "workload session challenge digest",
      ErrorType
    ),
    packageBindingDigest: normalizedDigest(
      value.packageBindingDigest,
      "workload session package-binding digest",
      ErrorType
    ),
    ephemeralKeyGeneratedByBootstrap: true,
    externallyAttested: false
  });
}

export function createWorkloadSessionObservation(
  value
) {
  const workloadSession =
    normalizeWorkloadSession(value);
  return normalizeWorkloadSessionObservation({
    kind: OBSERVATION_KIND,
    mode: WORKLOAD_SESSION_MODE,
    keyId: workloadSession.keyId,
    sessionDigest: digestObject(workloadSession),
    challengeDigest: digestObject({
      challenge: workloadSession.challenge
    }),
    packageBindingDigest: digestObject(
      workloadSession.workerPackage
    ),
    ephemeralKeyGeneratedByBootstrap: true,
    externallyAttested: false
  });
}

export function verifyWorkloadSessionObservation(
  value,
  {
    expectedChallenge,
    expectedWorkerPackage
  } = {}
) {
  const observation =
    normalizeWorkloadSessionObservation(
      value,
      IntegrityError
    );
  const challenge = normalizeWorkloadSessionChallenge(
    expectedChallenge,
    IntegrityError
  );
  const workerPackage = normalizeWorkerPackageBinding(
    expectedWorkerPackage,
    IntegrityError
  );
  if (
    observation.challengeDigest !==
      digestObject({ challenge }) ||
    observation.packageBindingDigest !==
      digestObject(workerPackage)
  ) {
    throw new IntegrityError(
      "Workload session observation differs from its request."
    );
  }
  return true;
}

function normalizedResponseReference(
  value,
  ErrorType = ValidationError
) {
  try {
    assertPlainObject(value, "worker response");
  } catch {
    throw new ErrorType(
      "Authenticated worker response has an invalid payload."
    );
  }
  const requestDigest = normalizedDigest(
    value.requestDigest,
    "authenticated worker request digest",
    ErrorType
  );
  const digest = normalizedDigest(
    value.digest,
    "authenticated worker response digest",
    ErrorType
  );
  try {
    const normalized = jsonClone(value);
    const unsigned = jsonClone(normalized);
    delete unsigned.digest;
    if (digestObject(unsigned) !== digest) {
      throw new Error(
        "Worker response digest mismatch."
      );
    }
    return {
      ...normalized,
      requestDigest,
      digest
    };
  } catch {
    throw new ErrorType(
      "Authenticated worker response digest is invalid."
    );
  }
}

export function createWorkloadResponseSignatureRequest({
  response,
  workloadSession
}) {
  const normalizedResponse =
    normalizedResponseReference(response);
  const normalizedSession =
    normalizeWorkloadSession(workloadSession);
  return immutableJson({
    schemaVersion: SCHEMA_VERSION,
    kind: SIGNATURE_STATEMENT_KIND,
    sessionDigest: digestObject(normalizedSession),
    requestDigest: normalizedResponse.requestDigest,
    responseDigest: normalizedResponse.digest
  });
}

export function createAuthenticatedWorkerResponse({
  response,
  workloadSession,
  signature
}) {
  const normalizedResponse =
    normalizedResponseReference(response);
  const normalizedSession =
    normalizeWorkloadSession(workloadSession);
  createWorkloadResponseSignatureRequest({
    response: normalizedResponse,
    workloadSession: normalizedSession
  });
  const unsigned = {
    schemaVersion: SCHEMA_VERSION,
    kind: ENVELOPE_KIND,
    workloadSession: normalizedSession,
    response: normalizedResponse,
    signature: normalizedSignature(signature)
  };
  return immutableJson({
    ...unsigned,
    digest: digestObject(unsigned)
  });
}

export function normalizeAuthenticatedWorkerResponse(
  value,
  ErrorType = IntegrityError
) {
  exactKeys(
    value,
    envelopeKeys,
    "authenticated worker response",
    ErrorType
  );
  if (
    value.schemaVersion !== SCHEMA_VERSION ||
    value.kind !== ENVELOPE_KIND
  ) {
    throw new ErrorType(
      "Authenticated worker response is unsupported."
    );
  }
  const workloadSession = normalizeWorkloadSession(
    value.workloadSession,
    ErrorType
  );
  const response = normalizedResponseReference(
    value.response,
    ErrorType
  );
  const signature = normalizedSignature(
    value.signature,
    ErrorType
  );
  const unsigned = {
    schemaVersion: SCHEMA_VERSION,
    kind: ENVELOPE_KIND,
    workloadSession,
    response,
    signature
  };
  const digest = normalizedDigest(
    value.digest,
    "authenticated worker response envelope digest",
    ErrorType
  );
  if (digestObject(unsigned) !== digest) {
    throw new ErrorType(
      "Authenticated worker response envelope digest mismatch."
    );
  }
  return immutableJson({
    ...unsigned,
    digest
  });
}

export function verifyAuthenticatedWorkerResponse(
  value,
  {
    expectedChallenge,
    expectedWorkerPackage
  } = {}
) {
  const envelope = normalizeAuthenticatedWorkerResponse(
    value,
    IntegrityError
  );
  const challenge = normalizeWorkloadSessionChallenge(
    expectedChallenge,
    IntegrityError
  );
  const workerPackage = normalizeWorkerPackageBinding(
    expectedWorkerPackage,
    IntegrityError
  );
  if (
    envelope.workloadSession.challenge !== challenge ||
    !workerPackageBindingsEqual(
      envelope.workloadSession.workerPackage,
      workerPackage
    )
  ) {
    throw new IntegrityError(
      "Workload session does not bind the exact request."
    );
  }
  const statement = createWorkloadResponseSignatureRequest({
    response: envelope.response,
    workloadSession: envelope.workloadSession
  });
  const publicKey = createPublicKey(
    envelope.workloadSession.publicKeyPem
  );
  const valid = verifyBytes(
    null,
    Buffer.from(canonicalJson(statement), "utf8"),
    publicKey,
    Buffer.from(envelope.signature, "base64url")
  );
  if (!valid) {
    throw new IntegrityError(
      "Workload response signature verification failed."
    );
  }
  const observation = createWorkloadSessionObservation(
    envelope.workloadSession
  );
  return immutableJson({
    kind: EVIDENCE_KIND,
    mode: observation.mode,
    algorithm: ALGORITHM,
    keyId: observation.keyId,
    sessionDigest: observation.sessionDigest,
    challengeDigest: observation.challengeDigest,
    packageBindingDigest:
      observation.packageBindingDigest,
    responseEnvelopeDigest: envelope.digest,
    responseSignatureVerified: true,
    challengeMatched: true,
    packageBindingMatched: true,
    externallyAttested: false
  });
}
