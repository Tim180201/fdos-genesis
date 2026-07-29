import { ValidationError } from "./errors.js";

export function requiredString(
  value,
  field,
  { min = 1, max = 4_000, pattern } = {}
) {
  if (typeof value !== "string") {
    throw new ValidationError(`${field} must be a string.`);
  }
  const normalized = value.trim();
  if (
    normalized.length < min ||
    normalized.length > max ||
    (pattern && !pattern.test(normalized))
  ) {
    throw new ValidationError(`${field} is invalid.`);
  }
  return normalized;
}

export function optionalString(value, field, options = {}) {
  if (value === undefined || value === null) return null;
  return requiredString(value, field, options);
}

export function uniqueStrings(
  value,
  field,
  { maximum = 32, pattern } = {}
) {
  if (!Array.isArray(value)) {
    throw new ValidationError(`${field} must be a list.`);
  }
  const normalized = value.map((entry, index) =>
    requiredString(entry, `${field}[${index}]`, { max: 200, pattern })
  );
  if (normalized.length > maximum || new Set(normalized).size !== normalized.length) {
    throw new ValidationError(`${field} contains duplicates or too many values.`);
  }
  return normalized;
}

export function enumValue(value, field, allowed) {
  if (!allowed.includes(value)) {
    throw new ValidationError(
      `${field} must be one of: ${allowed.join(", ")}.`
    );
  }
  return value;
}

export function isoDate(value, field) {
  if (
    typeof value !== "string" ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString() !== value
  ) {
    throw new ValidationError(`${field} must be an ISO-8601 timestamp.`);
  }
  return value;
}

export function assertPlainObject(value, field) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    (Object.getPrototypeOf(value) !== Object.prototype &&
      Object.getPrototypeOf(value) !== null)
  ) {
    throw new ValidationError(`${field} must be a plain object.`);
  }
  return value;
}
