import { createHash } from "node:crypto";
import { ValidationError } from "./errors.js";

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
      return value.map((entry, index) =>
        normalizedJson(entry, `${path}[${index}]`, seen)
      );
    }

    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new ValidationError(`Non-plain JSON object at ${path}.`);
    }

    const result = {};
    for (const key of Object.keys(value).sort()) {
      result[key] = normalizedJson(value[key], `${path}.${key}`, seen);
    }
    return result;
  } finally {
    seen.delete(value);
  }
}

export function canonicalJson(value) {
  return JSON.stringify(normalizedJson(value, "$", new Set()));
}

export function sha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function digestObject(value) {
  return `sha256:${sha256(canonicalJson(value))}`;
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
