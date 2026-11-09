import {
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
  enumValue,
  isoDate,
  requiredString
} from "../kernel/validation.js";

export const RELEASE_EVIDENCE_SCHEMA_VERSION = "1.0";
export const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/;
export const SEMVER_PATTERN =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?$/;
export const STABLE_ID_PATTERN =
  /^[a-z][a-z0-9-]{1,31}:[a-zA-Z0-9][a-zA-Z0-9._:-]{1,127}$/;
export const ROLE_ID_PATTERN = /^[a-z][a-z0-9-]{1,63}$/;
export const CLASSIFICATIONS = Object.freeze([
  "public",
  "internal",
  "confidential"
]);
export const PRINCIPAL_TYPES = Object.freeze([
  "human",
  "agent",
  "service",
  "system"
]);
export const RELEASE_OBJECT_KINDS = Object.freeze([
  "change-revision",
  "decision-revision",
  "work-order",
  "release-candidate",
  "release-baseline",
  "evidence",
  "finding",
  "approval",
  "approval-consumption",
  "release-policy",
  "release-evaluation",
  "release-authorization"
]);

export function exactKeys(
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
    actual.some(
      (key, index) => key !== normalizedExpected[index]
    )
  ) {
    throw new ErrorType(`${field} has an unexpected shape.`);
  }
}

export function normalizedDigest(
  value,
  field,
  { nullable = false } = {}
) {
  if (nullable && value === null) return null;
  return requiredString(value, field, {
    max: 71,
    pattern: DIGEST_PATTERN
  });
}

export function normalizedStableId(value, field) {
  return requiredString(value, field, {
    max: 160,
    pattern: STABLE_ID_PATTERN
  });
}

export function normalizedRoleId(value, field) {
  return requiredString(value, field, {
    max: 64,
    pattern: ROLE_ID_PATTERN
  });
}

export function normalizedSemver(value, field) {
  return requiredString(value, field, {
    max: 80,
    pattern: SEMVER_PATTERN
  });
}

export function normalizedInteger(
  value,
  field,
  { minimum = 0, maximum = Number.MAX_SAFE_INTEGER } = {}
) {
  if (
    !Number.isSafeInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    throw new ValidationError(`${field} is invalid.`);
  }
  return value;
}

export function normalizedPrincipal(
  value,
  field,
  {
    allowedTypes = PRINCIPAL_TYPES,
    ErrorType = ValidationError
  } = {}
) {
  exactKeys(value, ["id", "type"], field, ErrorType);
  return {
    type: enumValue(
      value.type,
      `${field} type`,
      allowedTypes
    ),
    id: normalizedStableId(value.id, `${field} id`)
  };
}

export function normalizedDigestList(
  value,
  field,
  { minimum = 0, maximum = 64 } = {}
) {
  if (
    !Array.isArray(value) ||
    value.length < minimum ||
    value.length > maximum
  ) {
    throw new ValidationError(`${field} must be a bounded list.`);
  }
  const normalized = value.map((entry, index) =>
    normalizedDigest(entry, `${field}[${index}]`)
  );
  if (new Set(normalized).size !== normalized.length) {
    throw new ValidationError(`${field} contains duplicates.`);
  }
  return normalized.sort();
}

export function normalizedStringList(
  value,
  field,
  {
    minimum = 0,
    maximum = 64,
    itemMaximum = 500,
    pattern
  } = {}
) {
  if (
    !Array.isArray(value) ||
    value.length < minimum ||
    value.length > maximum
  ) {
    throw new ValidationError(`${field} must be a bounded list.`);
  }
  const normalized = value.map((entry, index) =>
    requiredString(entry, `${field}[${index}]`, {
      max: itemMaximum,
      pattern
    })
  );
  if (new Set(normalized).size !== normalized.length) {
    throw new ValidationError(`${field} contains duplicates.`);
  }
  return normalized.sort();
}

export function normalizedPolicyBinding(
  value,
  field,
  ErrorType = ValidationError
) {
  exactKeys(value, ["digest", "id", "version"], field, ErrorType);
  return {
    id: normalizedStableId(value.id, `${field} id`),
    version: normalizedSemver(value.version, `${field} version`),
    digest: normalizedDigest(value.digest, `${field} digest`)
  };
}

export function normalizedObjectReference(
  value,
  field,
  ErrorType = ValidationError
) {
  exactKeys(value, ["digest", "id", "kind"], field, ErrorType);
  return {
    kind: enumValue(
      value.kind,
      `${field} kind`,
      RELEASE_OBJECT_KINDS
    ),
    id: normalizedStableId(value.id, `${field} id`),
    digest: normalizedDigest(value.digest, `${field} digest`)
  };
}

export function normalizedTimestampRange({
  notBefore,
  expiresAt,
  field,
  maximumDurationMs
}) {
  const normalizedNotBefore = isoDate(
    notBefore,
    `${field} notBefore`
  );
  const normalizedExpiresAt = isoDate(
    expiresAt,
    `${field} expiresAt`
  );
  const duration =
    Date.parse(normalizedExpiresAt) -
    Date.parse(normalizedNotBefore);
  if (
    duration <= 0 ||
    (maximumDurationMs !== undefined &&
      duration > maximumDurationMs)
  ) {
    throw new ValidationError(`${field} validity window is invalid.`);
  }
  return {
    notBefore: normalizedNotBefore,
    expiresAt: normalizedExpiresAt
  };
}

export function contentAddressed(unsigned) {
  return immutableJson({
    ...unsigned,
    digest: digestObject(unsigned)
  });
}

export function verifyContentAddressed(
  value,
  {
    field,
    expectedKeys,
    normalizeUnsigned,
    ErrorType = IntegrityError
  }
) {
  exactKeys(
    value,
    [...expectedKeys, "digest"],
    field,
    ErrorType
  );
  const source = jsonClone(value);
  delete source.digest;
  const unsigned = normalizeUnsigned(source, ErrorType);
  const digest = normalizedDigest(
    value.digest,
    `${field} digest`
  );
  if (digestObject(unsigned) !== digest) {
    throw new ErrorType(`${field} digest mismatch.`);
  }
  return immutableJson({ ...unsigned, digest });
}

export function changedAuthorityProjection(
  left,
  right,
  omittedKeys
) {
  const leftProjection = jsonClone(left);
  const rightProjection = jsonClone(right);
  for (const key of omittedKeys) {
    delete leftProjection[key];
    delete rightProjection[key];
  }
  return digestObject(leftProjection) !== digestObject(rightProjection);
}
