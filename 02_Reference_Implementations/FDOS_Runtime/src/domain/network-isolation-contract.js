import {
  digestObject,
  immutableJson
} from "../kernel/canonical-json.js";
import {
  IntegrityError,
  ValidationError
} from "../kernel/errors.js";
import {
  assertPlainObject,
  requiredString
} from "../kernel/validation.js";

export const NO_NETWORK_ISOLATION_PROVIDER = "none";
export const DARWIN_NETWORK_ISOLATION_PROVIDER =
  "darwin-sandbox-exec-network-write-deny-v1";
const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/;
const bindingKeys = Object.freeze([
  "policyDigest",
  "provider",
  "required"
]);
const noIsolationPolicy = Object.freeze({
  schemaVersion: "1.0",
  kind: "fdos-network-isolation-policy",
  provider: NO_NETWORK_ISOLATION_PROVIDER,
  networkIsolationEnforced: false
});
export const NO_NETWORK_ISOLATION_POLICY_DIGEST =
  digestObject(noIsolationPolicy);

function exactKeys(value, expected, field, ErrorType) {
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

export function normalizeNetworkIsolationBinding(
  value,
  ErrorType = ValidationError
) {
  exactKeys(
    value,
    bindingKeys,
    "worker network-isolation binding",
    ErrorType
  );
  let provider;
  let policyDigest;
  try {
    provider = requiredString(
      value.provider,
      "worker network-isolation provider",
      {
        max: 80,
        pattern: /^[a-z][a-z0-9-]{1,79}$/
      }
    );
    policyDigest = requiredString(
      value.policyDigest,
      "worker network-isolation policy digest",
      {
        max: 71,
        pattern: DIGEST_PATTERN
      }
    );
  } catch (error) {
    if (ErrorType === ValidationError) throw error;
    throw new ErrorType(
      "Worker network-isolation identity is invalid."
    );
  }
  if (
    provider === NO_NETWORK_ISOLATION_PROVIDER &&
    value.required === false &&
    policyDigest === NO_NETWORK_ISOLATION_POLICY_DIGEST
  ) {
    return immutableJson({
      required: false,
      provider,
      policyDigest
    });
  }
  if (
    provider === DARWIN_NETWORK_ISOLATION_PROVIDER &&
    value.required === true
  ) {
    return immutableJson({
      required: true,
      provider,
      policyDigest
    });
  }
  throw new ErrorType(
    "Worker network-isolation binding is inconsistent."
  );
}

export function processOnlyNetworkIsolationBinding() {
  return immutableJson({
    required: false,
    provider: NO_NETWORK_ISOLATION_PROVIDER,
    policyDigest: NO_NETWORK_ISOLATION_POLICY_DIGEST
  });
}

export function verifyNetworkIsolationBinding(value) {
  normalizeNetworkIsolationBinding(value, IntegrityError);
  return true;
}
