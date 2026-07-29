import { immutableJson } from "../kernel/canonical-json.js";
import {
  IntegrityError,
  ValidationError
} from "../kernel/errors.js";
import {
  assertPlainObject,
  requiredString
} from "../kernel/validation.js";
import {
  DRY_RUN_WORKER_ARTIFACT_ID,
  DRY_RUN_WORKER_ARTIFACT_VERSION,
  DRY_RUN_WORKER_PACKAGE_ID,
  DRY_RUN_WORKER_PACKAGE_VERSION
} from "./worker-identity.js";

const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/;
const ISSUER_PATTERN = /^issuer:[a-z][a-z0-9._-]{1,63}$/;
const KEY_ID_PATTERN = /^key:[a-z0-9][a-z0-9._-]{1,95}$/;
const bindingKeys = Object.freeze([
  "artifactDigest",
  "artifactId",
  "artifactVersion",
  "attestationDigest",
  "issuerId",
  "keyId",
  "packageDigest",
  "packageId",
  "packageVersion",
  "trustAnchorDigest"
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

export function normalizeWorkerPackageBinding(
  value,
  ErrorType = ValidationError
) {
  exactKeys(
    value,
    bindingKeys,
    "worker package binding",
    ErrorType
  );
  if (
    value.packageId !== DRY_RUN_WORKER_PACKAGE_ID ||
    value.packageVersion !== DRY_RUN_WORKER_PACKAGE_VERSION ||
    value.artifactId !== DRY_RUN_WORKER_ARTIFACT_ID ||
    value.artifactVersion !== DRY_RUN_WORKER_ARTIFACT_VERSION
  ) {
    throw new ErrorType("Worker package binding is unsupported.");
  }
  return immutableJson({
    packageId: DRY_RUN_WORKER_PACKAGE_ID,
    packageVersion: DRY_RUN_WORKER_PACKAGE_VERSION,
    packageDigest: normalizedDigest(
      value.packageDigest,
      "worker package digest",
      ErrorType
    ),
    artifactId: DRY_RUN_WORKER_ARTIFACT_ID,
    artifactVersion: DRY_RUN_WORKER_ARTIFACT_VERSION,
    artifactDigest: normalizedDigest(
      value.artifactDigest,
      "worker package artifact digest",
      ErrorType
    ),
    attestationDigest: normalizedDigest(
      value.attestationDigest,
      "worker package attestation digest",
      ErrorType
    ),
    trustAnchorDigest: normalizedDigest(
      value.trustAnchorDigest,
      "worker package trust-anchor digest",
      ErrorType
    ),
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
    )
  });
}

export function workerPackageBindingsEqual(left, right) {
  try {
    const normalizedLeft = normalizeWorkerPackageBinding(
      left,
      IntegrityError
    );
    const normalizedRight = normalizeWorkerPackageBinding(
      right,
      IntegrityError
    );
    return bindingKeys.every(
      (key) => normalizedLeft[key] === normalizedRight[key]
    );
  } catch {
    return false;
  }
}
