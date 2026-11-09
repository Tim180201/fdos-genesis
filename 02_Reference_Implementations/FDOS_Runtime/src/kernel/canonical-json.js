import { createHash } from "node:crypto";
import { ValidationError } from "./errors.js";

export const CANONICAL_JSON_FORMAT_VERSION = "2.0";
const INTEGRITY_DOMAIN =
  `fdos-canonical-json:${CANONICAL_JSON_FORMAT_VERSION}\u0000`;

function normalizedJson(value, path, seen) {
  if (value === null) return null;

  if (typeof value === "string" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new ValidationError(`Non-finite number at ${path}.`);
    }
    return Object.is(value, -0) ? 0 : value;
  }

  if (
    typeof value === "undefined" ||
    typeof value === "function" ||
    typeof value === "symbol" ||
    typeof value === "bigint"
  ) {
    throw new ValidationError(`Unsupported JSON value at ${path}.`);
  }

  if (seen.has(value)) {
    throw new ValidationError(`Circular JSON value at ${path}.`);
  }
  seen.add(value);

  try {
    if (Array.isArray(value)) {
      const ownKeys = Reflect.ownKeys(value);
      const expectedKeys = [
        ...Array.from({ length: value.length }, (_, index) => String(index)),
        "length"
      ];
      if (
        ownKeys.length !== expectedKeys.length ||
        ownKeys.some((key, index) => key !== expectedKeys[index])
      ) {
        throw new ValidationError(
          `Sparse or extended JSON array at ${path}.`
        );
      }
      return Array.from({ length: value.length }, (_, index) => {
        const descriptor = Object.getOwnPropertyDescriptor(
          value,
          String(index)
        );
        if (
          !descriptor ||
          descriptor.enumerable !== true ||
          !Object.hasOwn(descriptor, "value")
        ) {
          throw new ValidationError(`Non-data JSON value at ${path}[${index}].`);
        }
        return normalizedJson(
          descriptor.value,
          `${path}[${index}]`,
          seen
        );
      });
    }

    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new ValidationError(`Non-plain JSON object at ${path}.`);
    }

    const ownKeys = Reflect.ownKeys(value);
    if (ownKeys.some((key) => typeof key !== "string")) {
      throw new ValidationError(`Symbol-keyed JSON object at ${path}.`);
    }
    const result = Object.create(null);
    for (const key of ownKeys.sort()) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (
        !descriptor ||
        descriptor.enumerable !== true ||
        !Object.hasOwn(descriptor, "value")
      ) {
        throw new ValidationError(`Non-data JSON property at ${path}.${key}.`);
      }
      result[key] = normalizedJson(
        descriptor.value,
        `${path}.${key}`,
        seen
      );
    }
    return result;
  } finally {
    seen.delete(value);
  }
}

export function canonicalJson(value) {
  return JSON.stringify(normalizedJson(value, "$", new Set()));
}

export function canonicalIntegrityBytes(value) {
  return Buffer.from(
    `${INTEGRITY_DOMAIN}${canonicalJson(value)}`,
    "utf8"
  );
}

export function sha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function digestObject(value) {
  return `sha256:${createHash("sha256")
    .update(canonicalIntegrityBytes(value))
    .digest("hex")}`;
}

export function jsonClone(value) {
  return JSON.parse(canonicalJson(value));
}

export function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  Object.freeze(value);
  for (const entry of Object.values(value)) {
    deepFreeze(entry);
  }
  return value;
}

export function immutableJson(value) {
  return deepFreeze(jsonClone(value));
}
