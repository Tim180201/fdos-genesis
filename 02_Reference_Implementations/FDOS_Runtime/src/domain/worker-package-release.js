import {
  createHash,
  createPublicKey,
  verify as verifyBytes
} from "node:crypto";
import {
  canonicalJson,
  digestObject,
  immutableJson
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
  createDryRunWorkerArtifact,
  normalizeDryRunWorkerArtifact
} from "./worker-artifact-attestation.js";
import {
  normalizeWorkerPackageBinding
} from "./worker-package-contract.js";
import {
  DRY_RUN_WORKER_ARTIFACT_FILES,
  DRY_RUN_WORKER_ARTIFACT_ID,
  DRY_RUN_WORKER_ARTIFACT_VERSION,
  DRY_RUN_WORKER_PACKAGE_ID,
  DRY_RUN_WORKER_PACKAGE_VERSION
} from "./worker-identity.js";

const SCHEMA_VERSION = "1.0";
const PACKAGE_KIND = "fdos-worker-package";
const ATTESTATION_KIND =
  "fdos-signed-worker-package-attestation";
const ALGORITHM = "Ed25519";
const ENCODING = "utf8";
const MAX_PACKAGE_BYTES = 2 * 1024 * 1024;
const MAX_MODULE_BYTES = 256 * 1024;
const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/;
const SIGNATURE_PATTERN = /^[a-zA-Z0-9_-]{80,100}$/;
const ISSUER_PATTERN = /^issuer:[a-z][a-z0-9._-]{1,63}$/;
const KEY_ID_PATTERN = /^key:[a-z0-9][a-z0-9._-]{1,95}$/;
const FILE_PATH_PATTERN =
  /^src\/[a-z0-9][a-z0-9./-]*\.js$/;
const packageKeys = Object.freeze([
  "artifact",
  "digest",
  "kind",
  "modules",
  "packageId",
  "packageVersion",
  "schemaVersion"
]);
const moduleKeys = Object.freeze([
  "digest",
  "encoding",
  "path",
  "size",
  "source"
]);
const attestationRequestKeys = Object.freeze([
  "algorithm",
  "artifactDigest",
  "artifactId",
  "artifactVersion",
  "issuedAt",
  "issuerId",
  "keyId",
  "kind",
  "packageDigest",
  "packageId",
  "packageVersion",
  "schemaVersion"
]);
const attestationKeys = Object.freeze([
  ...attestationRequestKeys,
  "signature"
]);
const trustDescriptorKeys = Object.freeze([
  "algorithm",
  "issuerId",
  "keyId",
  "publicKeyPem"
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

function normalizedSignature(
  value,
  field,
  ErrorType = ValidationError
) {
  const signature = normalizedString(
    value,
    field,
    {
      max: 100,
      pattern: SIGNATURE_PATTERN
    },
    ErrorType
  );
  const bytes = Buffer.from(signature, "base64url");
  if (
    bytes.length !== 64 ||
    bytes.toString("base64url") !== signature
  ) {
    throw new ErrorType(`${field} is invalid.`);
  }
  return signature;
}

function sha256Buffer(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function normalizeModule(
  value,
  ErrorType = ValidationError
) {
  exactKeys(value, moduleKeys, "worker package module", ErrorType);
  if (value.encoding !== ENCODING) {
    throw new ErrorType("Worker package module encoding is unsupported.");
  }
  const modulePath = normalizedString(
    value.path,
    "worker package module path",
    {
      max: 200,
      pattern: FILE_PATH_PATTERN
    },
    ErrorType
  );
  if (
    typeof value.source !== "string" ||
    value.source.length < 1
  ) {
    throw new ErrorType(
      "Worker package module source is invalid."
    );
  }
  const source = value.source;
  const bytes = Buffer.from(source, "utf8");
  if (
    !Number.isSafeInteger(value.size) ||
    value.size < 1 ||
    value.size > MAX_MODULE_BYTES ||
    value.size !== bytes.length
  ) {
    throw new ErrorType("Worker package module size is invalid.");
  }
  const digest = normalizedDigest(
    value.digest,
    "worker package module digest",
    ErrorType
  );
  if (sha256Buffer(bytes) !== digest) {
    throw new ErrorType("Worker package module digest mismatch.");
  }
  return {
    path: modulePath,
    encoding: ENCODING,
    size: bytes.length,
    digest,
    source
  };
}

export function normalizeDryRunWorkerPackage(
  value,
  ErrorType = ValidationError
) {
  exactKeys(value, packageKeys, "worker package", ErrorType);
  if (
    value.schemaVersion !== SCHEMA_VERSION ||
    value.kind !== PACKAGE_KIND ||
    value.packageId !== DRY_RUN_WORKER_PACKAGE_ID ||
    value.packageVersion !== DRY_RUN_WORKER_PACKAGE_VERSION ||
    !Array.isArray(value.modules)
  ) {
    throw new ErrorType("Worker package identity is unsupported.");
  }
  const artifact = normalizeDryRunWorkerArtifact(
    value.artifact,
    ErrorType
  );
  const modules = value.modules.map((module) =>
    normalizeModule(module, ErrorType)
  );
  if (
    modules.length !== DRY_RUN_WORKER_ARTIFACT_FILES.length ||
    modules.some(
      (module, index) =>
        module.path !== DRY_RUN_WORKER_ARTIFACT_FILES[index]
    )
  ) {
    throw new ErrorType(
      "Worker package modules are incomplete or not canonical."
    );
  }
  let totalBytes = 0;
  for (let index = 0; index < modules.length; index += 1) {
    const module = modules[index];
    const file = artifact.files[index];
    totalBytes += module.size;
    if (
      index > 0 &&
      modules[index - 1].path >= module.path
    ) {
      throw new ErrorType(
        "Worker package modules are not canonically ordered."
      );
    }
    if (
      file.path !== module.path ||
      file.size !== module.size ||
      file.digest !== module.digest
    ) {
      throw new ErrorType(
        "Worker package module differs from its source artifact."
      );
    }
  }
  if (totalBytes > MAX_PACKAGE_BYTES) {
    throw new ErrorType("Worker package exceeds its byte limit.");
  }
  const reconstructedArtifact = createDryRunWorkerArtifact({
    files: modules.map((module) => ({
      path: module.path,
      size: module.size,
      digest: module.digest
    }))
  });
  if (reconstructedArtifact.digest !== artifact.digest) {
    throw new ErrorType(
      "Worker package source artifact cannot be reconstructed."
    );
  }
  const unsigned = {
    schemaVersion: SCHEMA_VERSION,
    kind: PACKAGE_KIND,
    packageId: DRY_RUN_WORKER_PACKAGE_ID,
    packageVersion: DRY_RUN_WORKER_PACKAGE_VERSION,
    artifact,
    modules
  };
  const digest = normalizedDigest(
    value.digest,
    "worker package digest",
    ErrorType
  );
  if (digestObject(unsigned) !== digest) {
    throw new ErrorType("Worker package digest mismatch.");
  }
  return immutableJson({ ...unsigned, digest });
}

export function createDryRunWorkerPackage({
  artifact,
  modules
}) {
  const normalizedArtifact =
    normalizeDryRunWorkerArtifact(artifact);
  if (!Array.isArray(modules)) {
    throw new ValidationError(
      "Worker package modules must be an array."
    );
  }
  const normalizedModules = modules
    .map((module) => {
      if (
        typeof module?.source !== "string" ||
        module.source.length < 1
      ) {
        throw new ValidationError(
          "Worker package source is invalid."
        );
      }
      const source = module.source;
      const bytes = Buffer.from(source, "utf8");
      return normalizeModule({
        path: module.path,
        encoding: ENCODING,
        size: bytes.length,
        digest: sha256Buffer(bytes),
        source
      });
    })
    .sort((left, right) =>
      left.path < right.path
        ? -1
        : left.path > right.path
          ? 1
          : 0
    );
  const unsigned = {
    schemaVersion: SCHEMA_VERSION,
    kind: PACKAGE_KIND,
    packageId: DRY_RUN_WORKER_PACKAGE_ID,
    packageVersion: DRY_RUN_WORKER_PACKAGE_VERSION,
    artifact: normalizedArtifact,
    modules: normalizedModules
  };
  return normalizeDryRunWorkerPackage({
    ...unsigned,
    digest: digestObject(unsigned)
  });
}

function normalizeAttestationRequest(
  value,
  ErrorType = ValidationError
) {
  exactKeys(
    value,
    attestationRequestKeys,
    "worker package attestation request",
    ErrorType
  );
  if (
    value.schemaVersion !== SCHEMA_VERSION ||
    value.kind !== ATTESTATION_KIND ||
    value.algorithm !== ALGORITHM ||
    value.packageId !== DRY_RUN_WORKER_PACKAGE_ID ||
    value.packageVersion !== DRY_RUN_WORKER_PACKAGE_VERSION ||
    value.artifactId !== DRY_RUN_WORKER_ARTIFACT_ID ||
    value.artifactVersion !== DRY_RUN_WORKER_ARTIFACT_VERSION
  ) {
    throw new ErrorType(
      "Worker package attestation request is unsupported."
    );
  }
  let issuedAt;
  try {
    issuedAt = isoDate(
      value.issuedAt,
      "worker package attestation issuedAt"
    );
  } catch {
    throw new ErrorType(
      "Worker package attestation time is invalid."
    );
  }
  return immutableJson({
    schemaVersion: SCHEMA_VERSION,
    kind: ATTESTATION_KIND,
    algorithm: ALGORITHM,
    issuerId: normalizedString(
      value.issuerId,
      "worker package issuer",
      {
        max: 71,
        pattern: ISSUER_PATTERN
      },
      ErrorType
    ),
    keyId: normalizedString(
      value.keyId,
      "worker package key id",
      {
        max: 100,
        pattern: KEY_ID_PATTERN
      },
      ErrorType
    ),
    packageId: DRY_RUN_WORKER_PACKAGE_ID,
    packageVersion: DRY_RUN_WORKER_PACKAGE_VERSION,
    packageDigest: normalizedDigest(
      value.packageDigest,
      "attested worker package digest",
      ErrorType
    ),
    artifactId: DRY_RUN_WORKER_ARTIFACT_ID,
    artifactVersion: DRY_RUN_WORKER_ARTIFACT_VERSION,
    artifactDigest: normalizedDigest(
      value.artifactDigest,
      "attested worker artifact digest",
      ErrorType
    ),
    issuedAt
  });
}

function normalizeAttestation(
  value,
  ErrorType = ValidationError
) {
  exactKeys(
    value,
    attestationKeys,
    "worker package attestation",
    ErrorType
  );
  const request = normalizeAttestationRequest(
    Object.fromEntries(
      attestationRequestKeys.map((key) => [key, value[key]])
    ),
    ErrorType
  );
  return immutableJson({
    ...request,
    signature: normalizedSignature(
      value.signature,
      "worker package signature",
      ErrorType
    )
  });
}

export function createWorkerPackageAttestationRequest({
  workerPackage,
  issuerId,
  keyId,
  issuedAt
}) {
  const normalizedPackage =
    normalizeDryRunWorkerPackage(workerPackage);
  return normalizeAttestationRequest({
    schemaVersion: SCHEMA_VERSION,
    kind: ATTESTATION_KIND,
    algorithm: ALGORITHM,
    issuerId,
    keyId,
    packageId: normalizedPackage.packageId,
    packageVersion: normalizedPackage.packageVersion,
    packageDigest: normalizedPackage.digest,
    artifactId: normalizedPackage.artifact.artifactId,
    artifactVersion:
      normalizedPackage.artifact.artifactVersion,
    artifactDigest: normalizedPackage.artifact.digest,
    issuedAt
  });
}

export function createWorkerPackageAttestation({
  request,
  signature
}) {
  return normalizeAttestation({
    ...normalizeAttestationRequest(request),
    signature
  });
}

export function normalizeWorkerPackageTrustDescriptor(
  value,
  ErrorType = ValidationError
) {
  exactKeys(
    value,
    trustDescriptorKeys,
    "worker package trust descriptor",
    ErrorType
  );
  if (value.algorithm !== ALGORITHM) {
    throw new ErrorType(
      "Worker package trust algorithm is unsupported."
    );
  }
  const publicKeyPem = normalizedString(
    value.publicKeyPem,
    "worker package public key",
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
    throw new ErrorType("Worker package public key is invalid.");
  }
  if (publicKey.asymmetricKeyType !== "ed25519") {
    throw new ErrorType(
      "Worker package public key must be Ed25519."
    );
  }
  return immutableJson({
    algorithm: ALGORITHM,
    issuerId: normalizedString(
      value.issuerId,
      "worker package trusted issuer",
      {
        max: 71,
        pattern: ISSUER_PATTERN
      },
      ErrorType
    ),
    keyId: normalizedString(
      value.keyId,
      "worker package trusted key id",
      {
        max: 100,
        pattern: KEY_ID_PATTERN
      },
      ErrorType
    ),
    publicKeyPem
  });
}

export function workerPackageTrustAnchorDigest(value) {
  return digestObject(
    normalizeWorkerPackageTrustDescriptor(value)
  );
}

function verifiedPackageRelease(
  attestation,
  workerPackage,
  trustedKeys,
  expectedTrustAnchorDigest
) {
  const normalizedPackage = normalizeDryRunWorkerPackage(
    workerPackage,
    IntegrityError
  );
  const normalizedAttestation = normalizeAttestation(
    attestation,
    IntegrityError
  );
  const normalizedAnchorDigest = normalizedDigest(
    expectedTrustAnchorDigest,
    "expected worker package trust-anchor digest"
  );
  if (
    !Array.isArray(trustedKeys) ||
    trustedKeys.length < 1 ||
    trustedKeys.length > 8
  ) {
    throw new ValidationError(
      "Worker package verifier requires one to eight trusted keys."
    );
  }
  const trust = new Map();
  for (const value of trustedKeys) {
    const descriptor =
      normalizeWorkerPackageTrustDescriptor(value);
    if (trust.has(descriptor.keyId)) {
      throw new ValidationError(
        `Duplicate worker package trust key: ${descriptor.keyId}.`
      );
    }
    trust.set(descriptor.keyId, descriptor);
  }
  const trustedKey = trust.get(normalizedAttestation.keyId);
  if (!trustedKey) {
    throw new IntegrityError(
      "Worker package signing key is not trusted."
    );
  }
  const trustAnchorDigest =
    workerPackageTrustAnchorDigest(trustedKey);
  if (trustAnchorDigest !== normalizedAnchorDigest) {
    throw new IntegrityError(
      "Worker package trust anchor differs from its external pin."
    );
  }
  if (normalizedAttestation.issuerId !== trustedKey.issuerId) {
    throw new IntegrityError(
      "Worker package issuer does not match its trusted key."
    );
  }
  if (
    normalizedAttestation.packageDigest !==
      normalizedPackage.digest ||
    normalizedAttestation.artifactDigest !==
      normalizedPackage.artifact.digest
  ) {
    throw new IntegrityError(
      "Signed worker package differs from its local bytes."
    );
  }
  const publicKey = createPublicKey(trustedKey.publicKeyPem);
  const valid = verifyBytes(
    null,
    Buffer.from(
      canonicalJson(
        normalizeAttestationRequest(
          Object.fromEntries(
            attestationRequestKeys.map((key) => [
              key,
              normalizedAttestation[key]
            ])
          )
        )
      ),
      "utf8"
    ),
    publicKey,
    Buffer.from(normalizedAttestation.signature, "base64url")
  );
  if (!valid) {
    throw new IntegrityError(
      "Worker package signature verification failed."
    );
  }
  return {
    workerPackage: normalizedPackage,
    attestation: normalizedAttestation,
    trustAnchorDigest
  };
}

export function verifyWorkerPackageAttestation(
  attestation,
  {
    workerPackage,
    trustedKeys,
    expectedTrustAnchorDigest
  } = {}
) {
  verifiedPackageRelease(
    attestation,
    workerPackage,
    trustedKeys,
    expectedTrustAnchorDigest
  );
  return true;
}

export function createWorkerPackageBinding({
  workerPackage,
  attestation,
  trustedKeys,
  expectedTrustAnchorDigest
}) {
  const verified = verifiedPackageRelease(
    attestation,
    workerPackage,
    trustedKeys,
    expectedTrustAnchorDigest
  );
  return normalizeWorkerPackageBinding({
    packageId: verified.workerPackage.packageId,
    packageVersion: verified.workerPackage.packageVersion,
    packageDigest: verified.workerPackage.digest,
    artifactId: verified.workerPackage.artifact.artifactId,
    artifactVersion:
      verified.workerPackage.artifact.artifactVersion,
    artifactDigest: verified.workerPackage.artifact.digest,
    attestationDigest: digestObject(verified.attestation),
    trustAnchorDigest: verified.trustAnchorDigest,
    issuerId: verified.attestation.issuerId,
    keyId: verified.attestation.keyId
  });
}
