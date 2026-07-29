import {
  createHash,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  sign as signBytes,
  verify as verifyBytes
} from "node:crypto";
import {
  canonicalJson,
  digestObject,
  immutableJson,
  jsonClone
} from "../kernel/canonical-json.js";
import {
  AuthorizationError,
  IntegrityError,
  ValidationError
} from "../kernel/errors.js";
import { assertId, createId } from "../kernel/ids.js";
import {
  assertPlainObject,
  isoDate,
  requiredString
} from "../kernel/validation.js";
import { agentIdPattern } from "../domain/agent-registry.js";

const INVOCATION_SCHEMA_VERSION = "1.0";
const INVOCATION_KIND = "fdos-signed-invocation";
const CLAIMS_KIND = "fdos-invocation-claims";
const RECEIPT_KIND = "fdos-verified-invocation";
const INVOCATION_ALGORITHM = "Ed25519";
const DEFAULT_AUDIENCE = "fdos-runtime";
const DEFAULT_TTL_MS = 2 * 60 * 1000;
const DEFAULT_MAX_TTL_MS = 5 * 60 * 1000;
const MAX_COMMAND_BYTES = 256 * 1024;

const organizationPattern = /^org:[a-z][a-z0-9._-]{1,63}$/;
const issuerPattern = /^issuer:[a-z][a-z0-9._-]{1,63}$/;
const keyIdPattern = /^key:[a-z0-9][a-z0-9._-]{1,95}$/;
const humanIdPattern =
  /^human:[a-zA-Z0-9][a-zA-Z0-9._-]{1,95}$/;
const connectorIdPattern =
  /^connector:[a-z][a-z0-9-]{1,63}:[a-zA-Z0-9][a-zA-Z0-9._-]{1,63}$/;

const envelopeKeys = [
  "algorithm",
  "claims",
  "keyId",
  "kind",
  "schemaVersion",
  "signature"
];
const claimKeys = [
  "audience",
  "authenticationAssurance",
  "authenticationMethod",
  "commandDigest",
  "correlationId",
  "expiresAt",
  "invocationId",
  "issuedAt",
  "issuerId",
  "kind",
  "notBefore",
  "operation",
  "organizationId",
  "principal",
  "schemaVersion"
];
const principalKeys = ["id", "type"];
const trustDescriptorKeys = [
  "algorithm",
  "issuerId",
  "keyId",
  "publicKeyPem"
];
const receiptKeys = [
  "audience",
  "authenticationAssurance",
  "authenticationMethod",
  "commandDigest",
  "correlationId",
  "envelopeDigest",
  "expiresAt",
  "invocationId",
  "issuedAt",
  "issuerId",
  "keyId",
  "kind",
  "notBefore",
  "operation",
  "organizationId",
  "principal",
  "receiptDigest",
  "schemaVersion",
  "verificationClockSkewMs",
  "verifiedAt"
];

const commandPayloadSchemas = Object.freeze({
  "agent.profile": {
    required: [],
    optional: []
  },
  "workflow.start": {
    required: ["objective", "workflowId"],
    optional: ["idempotencyKey", "input", "version"]
  },
  "workflow.view": {
    required: ["runId"],
    optional: []
  },
  "task.list-ready": {
    required: [],
    optional: []
  },
  "task.get": {
    required: ["taskId"],
    optional: []
  },
  "task.context": {
    required: ["taskId"],
    optional: []
  },
  "task.claim": {
    required: ["taskId"],
    optional: []
  },
  "task.complete": {
    required: ["result", "taskId"],
    optional: []
  },
  "task.fail": {
    required: ["reason", "taskId"],
    optional: ["retryable"]
  },
  "task.retry": {
    required: ["taskId"],
    optional: []
  },
  "task.cancel": {
    required: ["reason", "taskId"],
    optional: []
  },
  "task.handoff": {
    required: [
      "context",
      "desiredOutcome",
      "targetRoleId",
      "taskId",
      "title"
    ],
    optional: [
      "actionType",
      "parameters",
      "requiredOutputFields",
      "riskClass",
      "sensitivity",
      "target"
    ]
  },
  "approval.request": {
    required: ["reason", "taskId"],
    optional: ["ttlMinutes"]
  },
  "approval.decide": {
    required: ["approvalId", "decision"],
    optional: ["reason"]
  },
  "approval.list": {
    required: [],
    optional: ["taskId"]
  },
  "memory.propose": {
    required: ["content", "scope", "title"],
    optional: ["sensitivity", "sourceEvidence", "sourceReferences"]
  },
  "memory.review": {
    required: ["candidateId", "decision", "reason"],
    optional: []
  },
  "memory.read": {
    required: ["scope"],
    optional: []
  },
  "memory.list-candidates": {
    required: [],
    optional: []
  },
  "outbox.prepare": {
    required: [
      "connectorId",
      "idempotencyKey",
      "operationId",
      "parameters",
      "taskId"
    ],
    optional: []
  },
  "outbox.get": {
    required: ["deliveryId"],
    optional: []
  },
  "outbox.list": {
    required: [],
    optional: ["status"]
  },
  "outbox.claim": {
    required: ["deliveryId", "leaseSeconds"],
    optional: []
  },
  "outbox.record-outcome": {
    required: [
      "claimId",
      "deliveryId",
      "evidence",
      "outcome"
    ],
    optional: []
  },
  "outbox.reconcile-expired": {
    required: ["deliveryId"],
    optional: []
  },
  "outbox.retry": {
    required: ["deliveryId", "reason"],
    optional: []
  },
  "outbox.cancel": {
    required: ["deliveryId", "reason"],
    optional: []
  },
  "outbox.resolve-uncertain": {
    required: [
      "decision",
      "deliveryId",
      "evidenceDigest",
      "reason"
    ],
    optional: ["resultDigest", "retryable"]
  },
  "audit.read": {
    required: [],
    optional: ["runId"]
  },
  "evidence.export": {
    required: ["runId"],
    optional: []
  }
});

export const INVOCATION_OPERATIONS = Object.freeze(
  Object.keys(commandPayloadSchemas).sort()
);

function exactShape(value, expectedKeys, field, ErrorType = ValidationError) {
  assertPlainObject(value, field);
  const actualKeys = Object.keys(value).sort();
  if (
    actualKeys.length !== expectedKeys.length ||
    actualKeys.some((key, index) => key !== expectedKeys[index])
  ) {
    throw new ErrorType(`${field} has an unexpected shape.`);
  }
}

function validClockValue(clock, field) {
  const value = clock();
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
    throw new ValidationError(`${field} returned an invalid date.`);
  }
  return value;
}

function normalizeOrganizationId(value) {
  return requiredString(value, "invocation organization id", {
    max: 68,
    pattern: organizationPattern
  });
}

function normalizeIssuerId(value) {
  return requiredString(value, "invocation issuer id", {
    max: 71,
    pattern: issuerPattern
  });
}

function normalizeKeyId(value) {
  return requiredString(value, "invocation key id", {
    max: 100,
    pattern: keyIdPattern
  });
}

function normalizePrincipal(value, ErrorType = ValidationError) {
  exactShape(value, principalKeys, "invocation principal", ErrorType);
  const type = requiredString(value.type, "invocation principal type", {
    max: 16,
    pattern: /^(human|agent|connector)$/
  });
  const pattern =
    type === "human"
      ? humanIdPattern
      : type === "agent"
        ? agentIdPattern
        : connectorIdPattern;
  return immutableJson({
    type,
    id: requiredString(value.id, "invocation principal id", {
      max: 160,
      pattern
    })
  });
}

function normalizeAudience(value) {
  return requiredString(value, "invocation audience", {
    max: 120,
    pattern: /^[a-z][a-z0-9._-]{1,119}$/
  });
}

function normalizeOperation(value) {
  const operation = requiredString(value, "invocation operation", {
    max: 80,
    pattern: /^[a-z][a-z0-9.-]{1,79}$/
  });
  if (!Object.hasOwn(commandPayloadSchemas, operation)) {
    throw new ValidationError(`Unsupported invocation operation: ${operation}.`);
  }
  return operation;
}

function normalizeDigest(value, field) {
  return requiredString(value, field, {
    max: 71,
    pattern: /^sha256:[0-9a-f]{64}$/
  });
}

function normalizeCommandPayload(type, payload) {
  assertPlainObject(payload, "invocation command payload");
  const schema = commandPayloadSchemas[type];
  const allowed = new Set([...schema.required, ...schema.optional]);
  const actualKeys = Object.keys(payload);
  const missing = schema.required.filter(
    (key) => !Object.hasOwn(payload, key)
  );
  const unexpected = actualKeys.filter((key) => !allowed.has(key));
  if (missing.length > 0 || unexpected.length > 0) {
    throw new ValidationError("Invocation command payload shape is invalid.", {
      missing,
      unexpected
    });
  }
  return jsonClone(payload);
}

export function normalizeInvocationCommand(command) {
  exactShape(command, ["payload", "type"], "invocation command");
  const type = normalizeOperation(command.type);
  const normalized = immutableJson({
    type,
    payload: normalizeCommandPayload(type, command.payload)
  });
  if (Buffer.byteLength(canonicalJson(normalized), "utf8") > MAX_COMMAND_BYTES) {
    throw new ValidationError(
      "Invocation command exceeds the 256 KiB limit."
    );
  }
  return normalized;
}

export function invocationCommandDigest(command) {
  return digestObject({
    schemaVersion: INVOCATION_SCHEMA_VERSION,
    command: normalizeInvocationCommand(command)
  });
}

export function invocationSubject(command, fallbackInvocationId) {
  const normalized = normalizeInvocationCommand(command);
  for (const key of [
    "taskId",
    "runId",
    "approvalId",
    "candidateId",
    "deliveryId"
  ]) {
    if (typeof normalized.payload[key] === "string") {
      return normalized.payload[key];
    }
  }
  return assertId(fallbackInvocationId, "invocation subject fallback");
}

function unsignedEnvelope(envelope) {
  const unsigned = jsonClone(envelope);
  delete unsigned.signature;
  return unsigned;
}

function publicKeyFingerprint(publicKey) {
  const der = publicKey.export({ type: "spki", format: "der" });
  return createHash("sha256").update(der).digest("hex");
}

function normalizeTrustDescriptor(value) {
  exactShape(value, trustDescriptorKeys, "invocation trust descriptor");
  if (value.algorithm !== INVOCATION_ALGORITHM) {
    throw new ValidationError("Invocation trust algorithm is unsupported.");
  }
  const publicKeyPem = requiredString(
    value.publicKeyPem,
    "invocation public key",
    {
      max: 2_000,
      pattern: /^-----BEGIN PUBLIC KEY-----/
    }
  );
  let publicKey;
  try {
    publicKey = createPublicKey(publicKeyPem);
  } catch {
    throw new ValidationError("Invocation public key is invalid.");
  }
  if (publicKey.asymmetricKeyType !== "ed25519") {
    throw new ValidationError("Invocation public key must be Ed25519.");
  }
  return {
    algorithm: INVOCATION_ALGORITHM,
    issuerId: normalizeIssuerId(value.issuerId),
    keyId: normalizeKeyId(value.keyId),
    publicKey,
    publicKeyFingerprint: publicKeyFingerprint(publicKey)
  };
}

function validateTimeWindow(
  claims,
  now,
  { clockSkewMs, maxTtlMs }
) {
  const issuedAt = isoDate(claims.issuedAt, "invocation issuedAt");
  const notBefore = isoDate(claims.notBefore, "invocation notBefore");
  const expiresAt = isoDate(claims.expiresAt, "invocation expiresAt");
  const issuedMs = Date.parse(issuedAt);
  const notBeforeMs = Date.parse(notBefore);
  const expiresMs = Date.parse(expiresAt);
  if (
    notBeforeMs < issuedMs ||
    expiresMs <= notBeforeMs ||
    expiresMs - issuedMs > maxTtlMs
  ) {
    throw new AuthorizationError("Invocation validity window is invalid.");
  }
  if (issuedMs > now.getTime() + clockSkewMs) {
    throw new AuthorizationError("Invocation was issued in the future.");
  }
  if (notBeforeMs > now.getTime() + clockSkewMs) {
    throw new AuthorizationError("Invocation is not active yet.");
  }
  if (expiresMs <= now.getTime() - clockSkewMs) {
    throw new AuthorizationError("Invocation has expired.");
  }
  return { issuedAt, notBefore, expiresAt };
}

export class LocalInvocationAuthority {
  static create({
    organizationId = "org:fdos-pilot",
    issuerId = "issuer:fdos-local",
    keyId,
    audience = DEFAULT_AUDIENCE,
    clock = () => new Date(),
    idFactory = createId
  } = {}) {
    const { privateKey, publicKey } = generateKeyPairSync("ed25519");
    const fingerprint = publicKeyFingerprint(publicKey);
    return new LocalInvocationAuthority({
      organizationId,
      issuerId,
      keyId: keyId || `key:${fingerprint.slice(0, 24)}`,
      audience,
      clock,
      idFactory,
      privateKey,
      publicKey
    });
  }

  #privateKey;
  #publicKey;
  #clock;
  #idFactory;

  constructor({
    organizationId,
    issuerId,
    keyId,
    audience,
    clock,
    idFactory,
    privateKey,
    publicKey
  }) {
    if (typeof clock !== "function" || typeof idFactory !== "function") {
      throw new ValidationError(
        "Invocation authority clock and ID factory must be functions."
      );
    }
    const normalizedPrivateKey =
      privateKey?.type === "private"
        ? privateKey
        : createPrivateKey(privateKey);
    const normalizedPublicKey =
      publicKey?.type === "public"
        ? publicKey
        : createPublicKey(publicKey);
    if (
      normalizedPrivateKey.asymmetricKeyType !== "ed25519" ||
      normalizedPublicKey.asymmetricKeyType !== "ed25519"
    ) {
      throw new ValidationError("Invocation signing keys must be Ed25519.");
    }
    this.organizationId = normalizeOrganizationId(organizationId);
    this.issuerId = normalizeIssuerId(issuerId);
    this.keyId = normalizeKeyId(keyId);
    this.audience = normalizeAudience(audience);
    this.#clock = clock;
    this.#idFactory = idFactory;
    this.#privateKey = normalizedPrivateKey;
    this.#publicKey = normalizedPublicKey;
    validClockValue(this.#clock, "Invocation authority clock");
  }

  trustDescriptor() {
    return immutableJson({
      algorithm: INVOCATION_ALGORITHM,
      issuerId: this.issuerId,
      keyId: this.keyId,
      publicKeyPem: this.#publicKey.export({
        type: "spki",
        format: "pem"
      })
    });
  }

  issue({
    principal,
    command,
    correlationId,
    invocationId,
    ttlMs = DEFAULT_TTL_MS,
    notBeforeDelayMs = 0
  }) {
    if (
      !Number.isSafeInteger(ttlMs) ||
      ttlMs < 1_000 ||
      ttlMs > DEFAULT_MAX_TTL_MS
    ) {
      throw new ValidationError(
        "Invocation TTL must be between one second and five minutes."
      );
    }
    if (
      !Number.isSafeInteger(notBeforeDelayMs) ||
      notBeforeDelayMs < 0 ||
      notBeforeDelayMs >= ttlMs ||
      notBeforeDelayMs > 60_000
    ) {
      throw new ValidationError("Invocation activation delay is invalid.");
    }
    const normalizedCommand = normalizeInvocationCommand(command);
    const now = validClockValue(
      this.#clock,
      "Invocation authority clock"
    );
    const normalizedInvocationId = assertId(
      invocationId || this.#idFactory("invocation"),
      "invocation id"
    );
    const normalizedCorrelationId = assertId(
      correlationId || this.#idFactory("correlation"),
      "invocation correlation id"
    );
    const claims = immutableJson({
      schemaVersion: INVOCATION_SCHEMA_VERSION,
      kind: CLAIMS_KIND,
      issuerId: this.issuerId,
      audience: this.audience,
      organizationId: this.organizationId,
      invocationId: normalizedInvocationId,
      correlationId: normalizedCorrelationId,
      principal: normalizePrincipal(principal),
      operation: normalizedCommand.type,
      commandDigest: invocationCommandDigest(normalizedCommand),
      authenticationMethod: "ed25519",
      authenticationAssurance: "experimental-local",
      issuedAt: now.toISOString(),
      notBefore: new Date(
        now.getTime() + notBeforeDelayMs
      ).toISOString(),
      expiresAt: new Date(now.getTime() + ttlMs).toISOString()
    });
    const unsigned = immutableJson({
      schemaVersion: INVOCATION_SCHEMA_VERSION,
      kind: INVOCATION_KIND,
      algorithm: INVOCATION_ALGORITHM,
      keyId: this.keyId,
      claims
    });
    const signature = signBytes(
      null,
      Buffer.from(canonicalJson(unsigned), "utf8"),
      this.#privateKey
    ).toString("base64url");
    return immutableJson({ ...unsigned, signature });
  }
}

export class InvocationVerifier {
  #clock;
  #trustedKeys;

  constructor({
    trustedKeys,
    organizationId = "org:fdos-pilot",
    audience = DEFAULT_AUDIENCE,
    clock = () => new Date(),
    clockSkewMs = 0,
    maxTtlMs = DEFAULT_MAX_TTL_MS
  } = {}) {
    if (
      !Array.isArray(trustedKeys) ||
      trustedKeys.length < 1 ||
      trustedKeys.length > 16
    ) {
      throw new ValidationError(
        "Invocation verifier requires between one and 16 trusted keys."
      );
    }
    if (typeof clock !== "function") {
      throw new ValidationError("Invocation verifier clock must be a function.");
    }
    if (
      !Number.isSafeInteger(clockSkewMs) ||
      clockSkewMs < 0 ||
      clockSkewMs > 30_000
    ) {
      throw new ValidationError("Invocation clock skew is invalid.");
    }
    if (
      !Number.isSafeInteger(maxTtlMs) ||
      maxTtlMs < 1_000 ||
      maxTtlMs > 10 * 60 * 1000
    ) {
      throw new ValidationError("Invocation maximum TTL is invalid.");
    }
    this.organizationId = normalizeOrganizationId(organizationId);
    this.audience = normalizeAudience(audience);
    this.clockSkewMs = clockSkewMs;
    this.maxTtlMs = maxTtlMs;
    this.#clock = clock;
    this.#trustedKeys = new Map();
    for (const source of trustedKeys) {
      const descriptor = normalizeTrustDescriptor(source);
      if (this.#trustedKeys.has(descriptor.keyId)) {
        throw new ValidationError(
          `Duplicate invocation trust key: ${descriptor.keyId}.`
        );
      }
      this.#trustedKeys.set(descriptor.keyId, descriptor);
    }
    validClockValue(this.#clock, "Invocation verifier clock");
  }

  verify(envelope, { command }) {
    exactShape(
      envelope,
      envelopeKeys,
      "signed invocation",
      IntegrityError
    );
    if (
      envelope.schemaVersion !== INVOCATION_SCHEMA_VERSION ||
      envelope.kind !== INVOCATION_KIND ||
      envelope.algorithm !== INVOCATION_ALGORITHM
    ) {
      throw new IntegrityError("Signed invocation envelope is unsupported.");
    }
    const keyId = normalizeKeyId(envelope.keyId);
    const trustedKey = this.#trustedKeys.get(keyId);
    if (!trustedKey) {
      throw new AuthorizationError("Invocation signing key is not trusted.");
    }
    const signature = requiredString(
      envelope.signature,
      "invocation signature",
      {
        max: 128,
        pattern: /^[a-zA-Z0-9_-]{80,100}$/
      }
    );
    const unsigned = unsignedEnvelope(envelope);
    const signatureValid = verifyBytes(
      null,
      Buffer.from(canonicalJson(unsigned), "utf8"),
      trustedKey.publicKey,
      Buffer.from(signature, "base64url")
    );
    if (!signatureValid) {
      throw new IntegrityError("Invocation signature verification failed.");
    }

    exactShape(
      envelope.claims,
      claimKeys,
      "invocation claims",
      IntegrityError
    );
    const claims = envelope.claims;
    if (
      claims.schemaVersion !== INVOCATION_SCHEMA_VERSION ||
      claims.kind !== CLAIMS_KIND
    ) {
      throw new IntegrityError("Invocation claims are unsupported.");
    }
    const issuerId = normalizeIssuerId(claims.issuerId);
    if (issuerId !== trustedKey.issuerId) {
      throw new AuthorizationError(
        "Invocation issuer does not match its trusted key."
      );
    }
    const audience = normalizeAudience(claims.audience);
    if (audience !== this.audience) {
      throw new AuthorizationError("Invocation audience is not authorized.");
    }
    const organizationId = normalizeOrganizationId(claims.organizationId);
    if (organizationId !== this.organizationId) {
      throw new AuthorizationError(
        "Invocation organization is not authorized."
      );
    }
    const normalizedCommand = normalizeInvocationCommand(command);
    const operation = normalizeOperation(claims.operation);
    if (operation !== normalizedCommand.type) {
      throw new AuthorizationError(
        "Invocation is bound to another operation."
      );
    }
    const commandDigest = normalizeDigest(
      claims.commandDigest,
      "invocation command digest"
    );
    if (commandDigest !== invocationCommandDigest(normalizedCommand)) {
      throw new AuthorizationError(
        "Invocation is bound to different command content."
      );
    }
    if (
      claims.authenticationMethod !== "ed25519" ||
      claims.authenticationAssurance !== "experimental-local"
    ) {
      throw new AuthorizationError(
        "Invocation authentication assurance is unsupported."
      );
    }
    const now = validClockValue(
      this.#clock,
      "Invocation verifier clock"
    );
    const timeWindow = validateTimeWindow(claims, now, {
      clockSkewMs: this.clockSkewMs,
      maxTtlMs: this.maxTtlMs
    });
    const unsignedReceipt = {
      schemaVersion: INVOCATION_SCHEMA_VERSION,
      kind: RECEIPT_KIND,
      keyId,
      issuerId,
      audience,
      organizationId,
      invocationId: assertId(claims.invocationId, "invocation id"),
      correlationId: assertId(
        claims.correlationId,
        "invocation correlation id"
      ),
      principal: normalizePrincipal(claims.principal, IntegrityError),
      operation,
      commandDigest,
      authenticationMethod: claims.authenticationMethod,
      authenticationAssurance: claims.authenticationAssurance,
      issuedAt: timeWindow.issuedAt,
      notBefore: timeWindow.notBefore,
      expiresAt: timeWindow.expiresAt,
      verificationClockSkewMs: this.clockSkewMs,
      verifiedAt: now.toISOString(),
      envelopeDigest: digestObject(envelope)
    };
    return immutableJson({
      ...unsignedReceipt,
      receiptDigest: digestObject(unsignedReceipt)
    });
  }
}

export function verifyInvocationReceipt(receipt) {
  exactShape(
    receipt,
    receiptKeys,
    "verified invocation receipt",
    IntegrityError
  );
  const unsigned = jsonClone(receipt);
  const receiptDigest = unsigned.receiptDigest;
  delete unsigned.receiptDigest;
  if (
    receipt.schemaVersion !== INVOCATION_SCHEMA_VERSION ||
    receipt.kind !== RECEIPT_KIND ||
    digestObject(unsigned) !== receiptDigest
  ) {
    throw new IntegrityError("Verified invocation receipt is invalid.");
  }
  normalizeKeyId(receipt.keyId);
  normalizeIssuerId(receipt.issuerId);
  normalizeAudience(receipt.audience);
  normalizeOrganizationId(receipt.organizationId);
  assertId(receipt.invocationId, "invocation id");
  assertId(receipt.correlationId, "invocation correlation id");
  normalizePrincipal(receipt.principal, IntegrityError);
  normalizeOperation(receipt.operation);
  normalizeDigest(receipt.commandDigest, "invocation command digest");
  normalizeDigest(receipt.envelopeDigest, "invocation envelope digest");
  const issuedAt = isoDate(receipt.issuedAt, "invocation issuedAt");
  const notBefore = isoDate(receipt.notBefore, "invocation notBefore");
  const expiresAt = isoDate(receipt.expiresAt, "invocation expiresAt");
  const verifiedAt = isoDate(receipt.verifiedAt, "invocation verifiedAt");
  if (
    !Number.isSafeInteger(receipt.verificationClockSkewMs) ||
    receipt.verificationClockSkewMs < 0 ||
    receipt.verificationClockSkewMs > 30_000
  ) {
    throw new IntegrityError(
      "Verified invocation clock skew is invalid."
    );
  }
  const issuedMs = Date.parse(issuedAt);
  const notBeforeMs = Date.parse(notBefore);
  const expiresMs = Date.parse(expiresAt);
  const verifiedMs = Date.parse(verifiedAt);
  const skewMs = receipt.verificationClockSkewMs;
  if (
    notBeforeMs < issuedMs ||
    expiresMs <= notBeforeMs ||
    expiresMs - issuedMs > 10 * 60 * 1_000 ||
    verifiedMs < issuedMs - skewMs ||
    verifiedMs < notBeforeMs - skewMs ||
    verifiedMs >= expiresMs + skewMs
  ) {
    throw new IntegrityError(
      "Verified invocation time evidence is inconsistent."
    );
  }
  if (
    receipt.authenticationMethod !== "ed25519" ||
    receipt.authenticationAssurance !== "experimental-local"
  ) {
    throw new IntegrityError(
      "Verified invocation authentication method is invalid."
    );
  }
  return true;
}
