import { randomUUID } from "node:crypto";
import { ValidationError } from "./errors.js";

const ID_PATTERN = /^[a-z][a-z0-9-]{1,31}_[a-zA-Z0-9][a-zA-Z0-9_-]{5,95}$/;
const PREFIX_PATTERN = /^[a-z][a-z0-9-]{1,31}$/;

export function createId(prefix) {
  if (!PREFIX_PATTERN.test(prefix)) {
    throw new ValidationError(`Invalid identifier prefix: ${prefix}.`);
  }
  return `${prefix}_${randomUUID().replaceAll("-", "")}`;
}

export function assertId(value, field = "identifier") {
  if (typeof value !== "string" || !ID_PATTERN.test(value)) {
    throw new ValidationError(`Invalid ${field}.`);
  }
  return value;
}

export function deterministicIdFactory(namespace = "test") {
  let sequence = 0;
  return (prefix) => {
    sequence += 1;
    return `${prefix}_${namespace}_${String(sequence).padStart(6, "0")}`;
  };
}
