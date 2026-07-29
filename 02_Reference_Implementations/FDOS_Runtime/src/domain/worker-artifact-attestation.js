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
  IntegrityError,
  ValidationError
} from "../kernel/errors.js";
import {
  assertPlainObject,
  isoDate,
  requiredString
} from "../kernel/validation.js";

const SCHEMA_VERSION = "1.0";
const ARTIFACT_KIND = "fdos-worker-artifact";
const ATTESTATION_KIND =
  "fdos-signed-worker-artifact-attestation";
const ALGORITHM = "Ed25519";
const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/;
const SIGNATURE_PATTERN = /^[a-zA-Z0-9_-]{80,100}$/;
const ISSUER_PATTERN = /^issuer:[a-z][a-z0-9._-]{1,63}$/;
const KEY_ID_PATTERN = /^key:[a-z0-9][a-z0-9._-]{1,95}$/;
const FILE_PATH_PATTERN =
  /^src\/[a-z0-9][a-z0-9./-]*\.js$/;
const MAX_ARTIFACT_FILES = 32;
const MAX_ARTIFACT_FILE_BYTES = 256 * 1024;

export const DRY_RUN_WORKER_ARTIFACT_ID =
  "worker:connector-dry-run";
export const DRY_RUN_WORKER_ARTIFACT_VERSION =
  "1.0.0-experimental";
export const DRY_RUN_WORKER_ENTRYPOINT =
  "src/workers/dry-run-connector-worker.js";
export const DRY_RUN_WORKER_ARTIFACT_FILES = Object.freeze([
  "src/domain/action-catalog.js",
  "src/domain/action-intent.js",
  "src/domain/delivery-intent.js",
  "src/domain/network-isolation-contract.js",
  "src/domain/worker-artifact-attestation.js",
  "src/integrations/dry-run-worker-artifact.js",
  "src/kernel/canonical-json.js",
  "src/kernel/errors.js",
  "src/kernel/ids.js",
  "src/kernel/validation.js",
  "src/workers/dry-run-connector-worker.js",
  "src/workers/dry-run-worker-protocol.js"
]);

const artifactKeys = Object.freeze([
  "artifactId",
  "artifactVersion",
  "digest",
  "entrypoint",
  "files",
  "kind",
  "schemaVersion"
]);
const artifactFileKeys = Object.freeze([
  "digest",
  "path",
  "size"
]);
const attestationKeys = Object.freeze([
  "algorithm",
  "artifactDigest",
  "artifactId",
  "artifactVersion",
  "issuedAt",
  "issuerId",
  "keyId",
  "kind",
  "schemaVersion",
  "signature"
]);
const trustDescriptorKeys = Object.freeze([
  "algorithm",
  "issuerId",
  "keyId",
  "publicKeyPem"
]);
const bindingKeys = Object.freeze([
  "artifactDigest",
  "artifactId",
  "artifactVersion",
  "attestationDigest",
  "issuerId",
  "keyId"
]);

function exactKeys(
  value,
  expected,
  field,
  ErrorType = ValidationError
) {
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

function normalizedString(
  value,
  field,
  options,
  ErrorType = ValidationError
) {
  try {
    return requiredString(value, field, options);
  } catch (error) {
    if (ErrorType === ValidationError) throw error;
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

function normalizeArtifactFile(
  value,
  ErrorType = ValidationError
) {
  exactKeys(
    value,
    artifactFileKeys,
    "worker artifact file",
    ErrorType
  );
  const filePath = normalizedString(
    value.path,
    "worker artifact file path",
    {
      max: 200,
      pattern: FILE_PATH_PATTERN
    },
    ErrorType
  );
  if (
    filePath.includes("/" + "/") ||
    filePath.split("/").some(
      (segment) => segment === "." || segment === ".."
    )
  ) {
    throw new ErrorType("Worker artifact file path is unsafe.");
  }
  if (
    !Number.isSafeInteger(value.size) ||
    value.size < 1 ||
    value.size > MAX_ARTIFACT_FILE_BYTES
  ) {
    throw new ErrorType("Worker artifact file size is invalid.");
  }
  return {
    path: filePath,
    size: value.size,
    digest: normalizedDigest(
      value.digest,
      "worker artifact file digest",
      ErrorType
    )
  };
}

export function normalizeDryRunWorkerArtifact(
  value,
  ErrorType = ValidationError
) {
  exactKeys(value, artifactKeys, "worker artifact", ErrorType);
  if (
    value.schemaVersion !== SCHEMA_VERSION ||
    value.kind !== ARTIFACT_KIND ||
    value.artifactId !== DRY_RUN_WORKER_ARTIFACT_ID ||
    value.artifactVersion !== DRY_RUN_WORKER_ARTIFACT_VERSION ||
    value.entrypoint !== DRY_RUN_WORKER_ENTRYPOINT ||
    !Array.isArray(value.files) ||
    value.files.length < 1 ||
    value.files.length > MAX_ARTIFACT_FILES
  ) {
    throw new ErrorType("Worker artifact identity is unsupported.");
  }
  const files = value.files.map((file) =>
    normalizeArtifactFile(file, ErrorType)
  );
  if (
    files.length !== DRY_RUN_WORKER_ARTIFACT_FILES.length ||
    files.some(
      (file, index) =>
        file.path !== DRY_RUN_WORKER_ARTIFACT_FILES[index]
    ) ||
    !files.some(
      (file) => file.path === DRY_RUN_WORKER_ENTRYPOINT
    )
  ) {
    throw new ErrorType(
      "Worker artifact files are incomplete or not canonical."
    );
  }
  for (let index = 1; index < files.length; index += 1) {
    if (files[index - 1].path >= files[index].path) {
      throw new ErrorType(
        "Worker artifact files are incomplete or not canonical."
      );
    }
  }
  const unsigned = {
    schemaVersion: SCHEMA_VERSION,
    kind: ARTIFACT_KIND,
    artifactId: DRY_RUN_WORKER_ARTIFACT_ID,
    artifactVersion: DRY_RUN_WORKER_ARTIFACT_VERSION,
    entrypoint: DRY_RUN_WORKER_ENTRYPOINT,
    files
  };
  const digest = normalizedDigest(
    value.digest,
    "worker artifact digest",
    ErrorType
  );
  if (digestObject(unsigned) !== digest) {
    throw new ErrorType("Worker artifact digest mismatch.");
  }
  return immutableJson({ ...unsigned, digest });
}

export function createDryRunWorkerArtifact({ files }) {
  if (!Array.isArray(files)) {
    throw new ValidationError(
      "Worker artifact files must be an array."
    );
  }
  const normalizedFiles = files
    .map((file) => normalizeArtifactFile(file))
    .sort((left, right) =>
      left.path < right.path
        ? -1
        : left.path > right.path
          ? 1
          : 0
    );
  const unsigned = {
    schemaVersion: SCHEMA_VERSION,
    kind: ARTIFACT_KIND,
    artifactId: DRY_RUN_WORKER_ARTIFACT_ID,
    artifactVersion: DRY_RUN_WORKER_ARTIFACT_VERSION,
    entrypoint: DRY_RUN_WORKER_ENTRYPOINT,
    files: normalizedFiles
  };
  return normalizeDryRunWorkerArtifact({
    ...unsigned,
    digest: digestObject(unsigned)
  });
}

function normalizeAttestation(
  value,
  ErrorType = ValidationError
) {
  exactKeys(
    value,
    attestationKeys,
    "worker artifact attestation",
    ErrorType
  );
  if (
    value.schemaVersion !== SCHEMA_VERSION ||
    value.kind !== ATTESTATION_KIND ||
    value.algorithm !== ALGORITHM ||
    value.artifactId !== DRY_RUN_WORKER_ARTIFACT_ID ||
    value.artifactVersion !== DRY_RUN_WORKER_ARTIFACT_VERSION
  ) {
    throw new ErrorType(
      "Worker artifact attestation is unsupported."
    );
  }
  let issuedAt;
  try {
    issuedAt = isoDate(
      value.issuedAt,
      "worker artifact attestation issuedAt"
    );
  } catch (error) {
    if (ErrorType === ValidationError) throw error;
    throw new ErrorType(
      "Worker artifact attestation time is invalid."
    );
  }
  return immutableJson({
    schemaVersion: SCHEMA_VERSION,
    kind: ATTESTATION_KIND,
    algorithm: ALGORITHM,
    issuerId: normalizedString(
      value.issuerId,
      "worker artifact issuer",
      {
        max: 71,
        pattern: ISSUER_PATTERN
      },
      ErrorType
    ),
    keyId: normalizedString(
      value.keyId,
      "worker artifact key id",
      {
        max: 100,
        pattern: KEY_ID_PATTERN
      },
      ErrorType
    ),
    artifactId: DRY_RUN_WORKER_ARTIFACT_ID,
    artifactVersion: DRY_RUN_WORKER_ARTIFACT_VERSION,
    artifactDigest: normalizedDigest(
      value.artifactDigest,
      "attested worker artifact digest",
      ErrorType
    ),
    issuedAt,
    signature: normalizedString(
      value.signature,
      "worker artifact signature",
      {
        max: 100,
        pattern: SIGNATURE_PATTERN
      },
      ErrorType
    )
  });
}

function publicKeyFingerprint(publicKey) {
  const bytes = publicKey.export({
    type: "spki",
    format: "der"
  });
  return createHash("sha256").update(bytes).digest("hex");
}

function normalizeTrustDescriptor(value) {
  exactKeys(
    value,
    trustDescriptorKeys,
    "worker artifact trust descriptor"
  );
  if (value.algorithm !== ALGORITHM) {
    throw new ValidationError(
      "Worker artifact trust algorithm is unsupported."
    );
  }
  const publicKeyPem = requiredString(
    value.publicKeyPem,
    "worker artifact public key",
    {
      max: 2_000,
      pattern: /^-----BEGIN PUBLIC KEY-----/
    }
  );
  let publicKey;
  try {
    publicKey = createPublicKey(publicKeyPem);
  } catch {
    throw new ValidationError(
      "Worker artifact public key is invalid."
    );
  }
  if (publicKey.asymmetricKeyType !== "ed25519") {
    throw new ValidationError(
      "Worker artifact public key must be Ed25519."
    );
  }
  return {
    algorithm: ALGORITHM,
    issuerId: requiredString(
      value.issuerId,
      "worker artifact trusted issuer",
      {
        max: 71,
        pattern: ISSUER_PATTERN
      }
    ),
    keyId: requiredString(
      value.keyId,
      "worker artifact trusted key id",
      {
        max: 100,
        pattern: KEY_ID_PATTERN
      }
    ),
    publicKeyPem,
    publicKey,
    publicKeyFingerprint: publicKeyFingerprint(publicKey)
  };
}

function unsignedAttestation(attestation) {
  const unsigned = jsonClone(attestation);
  delete unsigned.signature;
  return unsigned;
}

function verifiedAttestation(
  attestation,
  artifact,
  trustedKeys
) {
  const normalizedArtifact = normalizeDryRunWorkerArtifact(
    artifact,
    IntegrityError
  );
  const normalizedAttestation = normalizeAttestation(
    attestation,
    IntegrityError
  );
  if (
    !Array.isArray(trustedKeys) ||
    trustedKeys.length < 1 ||
    trustedKeys.length > 8
  ) {
    throw new ValidationError(
      "Worker artifact verifier requires one to eight trusted keys."
    );
  }
  const trust = new Map();
  for (const value of trustedKeys) {
    const descriptor = normalizeTrustDescriptor(value);
    if (trust.has(descriptor.keyId)) {
      throw new ValidationError(
        `Duplicate worker artifact trust key: ${descriptor.keyId}.`
      );
    }
    trust.set(descriptor.keyId, descriptor);
  }
  const trustedKey = trust.get(normalizedAttestation.keyId);
  if (!trustedKey) {
    throw new IntegrityError(
      "Worker artifact signing key is not trusted."
    );
  }
  if (normalizedAttestation.issuerId !== trustedKey.issuerId) {
    throw new IntegrityError(
      "Worker artifact issuer does not match its trusted key."
    );
  }
  if (
    normalizedAttestation.artifactDigest !==
      normalizedArtifact.digest
  ) {
    throw new IntegrityError(
      "Signed worker artifact digest differs from local source."
    );
  }
  const valid = verifyBytes(
    null,
    Buffer.from(
      canonicalJson(unsignedAttestation(normalizedAttestation)),
      "utf8"
    ),
    trustedKey.publicKey,
    Buffer.from(normalizedAttestation.signature, "base64url")
  );
  if (!valid) {
    throw new IntegrityError(
      "Worker artifact signature verification failed."
    );
  }
  return {
    artifact: normalizedArtifact,
    attestation: normalizedAttestation
  };
}

export function verifyWorkerArtifactAttestation(
  attestation,
  { artifact, trustedKeys } = {}
) {
  verifiedAttestation(attestation, artifact, trustedKeys);
  return true;
}

export function normalizeWorkerArtifactBinding(
  value,
  ErrorType = ValidationError
) {
  exactKeys(
    value,
    bindingKeys,
    "worker artifact binding",
    ErrorType
  );
  if (
    value.artifactId !== DRY_RUN_WORKER_ARTIFACT_ID ||
    value.artifactVersion !== DRY_RUN_WORKER_ARTIFACT_VERSION
  ) {
    throw new ErrorType("Worker artifact binding is unsupported.");
  }
  return immutableJson({
    artifactId: DRY_RUN_WORKER_ARTIFACT_ID,
    artifactVersion: DRY_RUN_WORKER_ARTIFACT_VERSION,
    artifactDigest: normalizedDigest(
      value.artifactDigest,
      "worker artifact binding digest",
      ErrorType
    ),
    attestationDigest: normalizedDigest(
      value.attestationDigest,
      "worker artifact attestation digest",
      ErrorType
    ),
    issuerId: normalizedString(
      value.issuerId,
      "worker artifact binding issuer",
      {
        max: 71,
        pattern: ISSUER_PATTERN
      },
      ErrorType
    ),
    keyId: normalizedString(
      value.keyId,
      "worker artifact binding key id",
      {
        max: 100,
        pattern: KEY_ID_PATTERN
      },
      ErrorType
    )
  });
}

export function createWorkerArtifactBinding({
  artifact,
  attestation,
  trustedKeys
}) {
  const verified = verifiedAttestation(
    attestation,
    artifact,
    trustedKeys
  );
  return normalizeWorkerArtifactBinding({
    artifactId: verified.artifact.artifactId,
    artifactVersion: verified.artifact.artifactVersion,
    artifactDigest: verified.artifact.digest,
    attestationDigest: digestObject(verified.attestation),
    issuerId: verified.attestation.issuerId,
    keyId: verified.attestation.keyId
  });
}

export class LocalWorkerArtifactAuthority {
  static create({
    issuerId = "issuer:fdos-worker-release-local",
    keyId,
    clock = () => new Date()
  } = {}) {
    const { privateKey, publicKey } =
      generateKeyPairSync("ed25519");
    const fingerprint = publicKeyFingerprint(publicKey);
    return new LocalWorkerArtifactAuthority({
      issuerId,
      keyId: keyId || `key:${fingerprint.slice(0, 24)}`,
      clock,
      privateKey,
      publicKey
    });
  }

  #clock;
  #privateKey;
  #publicKey;

  constructor({
    issuerId,
    keyId,
    clock,
    privateKey,
    publicKey
  }) {
    if (typeof clock !== "function") {
      throw new ValidationError(
        "Worker artifact authority clock must be a function."
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
      throw new ValidationError(
        "Worker artifact signing keys must be Ed25519."
      );
    }
    this.issuerId = requiredString(
      issuerId,
      "worker artifact authority issuer",
      {
        max: 71,
        pattern: ISSUER_PATTERN
      }
    );
    this.keyId = requiredString(
      keyId,
      "worker artifact authority key id",
      {
        max: 100,
        pattern: KEY_ID_PATTERN
      }
    );
    const now = clock();
    if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
      throw new ValidationError(
        "Worker artifact authority clock returned an invalid date."
      );
    }
    this.#clock = clock;
    this.#privateKey = normalizedPrivateKey;
    this.#publicKey = normalizedPublicKey;
  }

  trustDescriptor() {
    return immutableJson({
      algorithm: ALGORITHM,
      issuerId: this.issuerId,
      keyId: this.keyId,
      publicKeyPem: this.#publicKey.export({
        type: "spki",
        format: "pem"
      })
    });
  }

  issue({ artifact }) {
    const normalizedArtifact =
      normalizeDryRunWorkerArtifact(artifact);
    const now = this.#clock();
    if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
      throw new ValidationError(
        "Worker artifact authority clock returned an invalid date."
      );
    }
    const unsigned = immutableJson({
      schemaVersion: SCHEMA_VERSION,
      kind: ATTESTATION_KIND,
      algorithm: ALGORITHM,
      issuerId: this.issuerId,
      keyId: this.keyId,
      artifactId: normalizedArtifact.artifactId,
      artifactVersion: normalizedArtifact.artifactVersion,
      artifactDigest: normalizedArtifact.digest,
      issuedAt: now.toISOString()
    });
    const signature = signBytes(
      null,
      Buffer.from(canonicalJson(unsigned), "utf8"),
      this.#privateKey
    ).toString("base64url");
    return normalizeAttestation({
      ...unsigned,
      signature
    });
  }
}
