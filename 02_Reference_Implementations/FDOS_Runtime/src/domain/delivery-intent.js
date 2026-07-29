import {
  digestObject,
  immutableJson,
  jsonClone
} from "../kernel/canonical-json.js";
import {
  IntegrityError,
  PolicyError,
  ValidationError
} from "../kernel/errors.js";
import { assertId } from "../kernel/ids.js";
import {
  assertPlainObject,
  enumValue,
  isoDate,
  requiredString
} from "../kernel/validation.js";
import { compareRisk } from "./action-catalog.js";
import { verifyActionIntent } from "./action-intent.js";

const DELIVERY_INTENT_SCHEMA_VERSION = "1.0";
const DELIVERY_INTENT_KIND = "fdos-connector-delivery-intent";
const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/;
const AGENT_ID_PATTERN =
  /^agent:[a-z][a-z0-9-]{1,63}:[a-zA-Z0-9][a-zA-Z0-9._-]{1,63}$/;

const intentKeys = [
  "connector",
  "digest",
  "idempotencyDigest",
  "kind",
  "operation",
  "parameters",
  "parametersDigest",
  "requestDigest",
  "requestedAt",
  "requestedBy",
  "schemaVersion",
  "target",
  "task"
];
const connectorBindingKeys = [
  "contractDigest",
  "contractId",
  "contractVersion",
  "executionMode",
  "externalEffects",
  "id",
  "maxAttempts",
  "networkAccess"
];
const operationBindingKeys = [
  "actionType",
  "capability",
  "digest",
  "id",
  "riskClass",
  "sensitivity",
  "targetPrefix"
];
const taskBindingKeys = [
  "actionIntentDigest",
  "attempt",
  "id",
  "ownerRoleId",
  "runId"
];

function exactKeys(value, expected, field, ErrorType = ValidationError) {
  assertPlainObject(value, field);
  const actual = Object.keys(value).sort();
  const normalizedExpected = [...expected].sort();
  if (
    actual.length !== normalizedExpected.length ||
    actual.some((key, index) => key !== normalizedExpected[index])
  ) {
    throw new ErrorType(`${field} has an unexpected shape.`);
  }
}

function normalizedDigest(value, field) {
  return requiredString(value, field, {
    max: 71,
    pattern: DIGEST_PATTERN
  });
}

function normalizeConnectorBinding(source, ErrorType = ValidationError) {
  exactKeys(
    source,
    connectorBindingKeys,
    "delivery connector binding",
    ErrorType
  );
  if (
    source.executionMode !== "dry_run" ||
    source.networkAccess !== false ||
    source.externalEffects !== false
  ) {
    throw new ErrorType(
      "Delivery connector binding exceeds the dry-run boundary."
    );
  }
  if (
    !Number.isSafeInteger(source.maxAttempts) ||
    source.maxAttempts < 1 ||
    source.maxAttempts > 3
  ) {
    throw new ErrorType("Delivery connector retry budget is invalid.");
  }
  return {
    id: requiredString(source.id, "delivery connector id", {
      max: 160,
      pattern:
        /^connector:[a-z][a-z0-9-]{1,63}:[a-zA-Z0-9][a-zA-Z0-9._-]{1,63}$/
    }),
    contractId: requiredString(
      source.contractId,
      "delivery contract id",
      {
        max: 80,
        pattern: /^[a-z][a-z0-9.-]{1,79}$/
      }
    ),
    contractVersion: requiredString(
      source.contractVersion,
      "delivery contract version",
      {
        max: 80,
        pattern: /^[0-9]+\.[0-9]+\.[0-9]+(?:-[a-z0-9.-]+)?$/
      }
    ),
    contractDigest: normalizedDigest(
      source.contractDigest,
      "delivery contract digest"
    ),
    executionMode: "dry_run",
    networkAccess: false,
    externalEffects: false,
    maxAttempts: source.maxAttempts
  };
}

function normalizeOperationBinding(source, ErrorType = ValidationError) {
  exactKeys(
    source,
    operationBindingKeys,
    "delivery operation binding",
    ErrorType
  );
  const riskClass = enumValue(
    source.riskClass,
    "delivery operation risk class",
    ["A0", "A1"]
  );
  const sensitivity = enumValue(
    source.sensitivity,
    "delivery operation sensitivity",
    ["public", "internal"]
  );
  return {
    id: requiredString(source.id, "delivery operation id", {
      max: 80,
      pattern: /^[a-z][a-z0-9.-]{1,79}$/
    }),
    digest: normalizedDigest(
      source.digest,
      "delivery operation digest"
    ),
    actionType: requiredString(
      source.actionType,
      "delivery operation action type",
      {
        max: 120,
        pattern: /^[a-z][a-z0-9.-]+$/
      }
    ),
    capability: requiredString(
      source.capability,
      "delivery operation capability",
      {
        max: 120,
        pattern: /^[a-z][a-z0-9:*-]+$/
      }
    ),
    riskClass,
    sensitivity,
    targetPrefix: requiredString(
      source.targetPrefix,
      "delivery operation target prefix",
      { max: 120 }
    )
  };
}

function normalizeTaskBinding(source, ErrorType = ValidationError) {
  exactKeys(source, taskBindingKeys, "delivery task binding", ErrorType);
  if (!Number.isSafeInteger(source.attempt) || source.attempt < 1) {
    throw new ErrorType("Delivery task attempt is invalid.");
  }
  return {
    id: assertId(source.id, "delivery task id"),
    runId: assertId(source.runId, "delivery run id"),
    attempt: source.attempt,
    actionIntentDigest: normalizedDigest(
      source.actionIntentDigest,
      "delivery action-intent digest"
    ),
    ownerRoleId: requiredString(
      source.ownerRoleId,
      "delivery task owner role",
      {
        max: 64,
        pattern: /^[a-z][a-z0-9-]{1,63}$/
      }
    )
  };
}

export function createDeliveryIntent({
  actionCatalog,
  resolvedConnector,
  task,
  parameters,
  requestedBy,
  requestedAt,
  idempotencyKey
}) {
  if (!actionCatalog || !resolvedConnector) {
    throw new ValidationError(
      "Delivery intent requires action and connector registries."
    );
  }
  assertPlainObject(task, "delivery task");
  verifyActionIntent(task.actionIntent, actionCatalog);
  const { instance, contract, operation } = resolvedConnector;
  if (
    contract.executionMode !== "dry_run" ||
    contract.networkAccess !== false ||
    contract.externalEffects !== false
  ) {
    throw new PolicyError(
      "Connector delivery exceeds the dry-run experiment boundary."
    );
  }
  if (
    task.actionIntent.actionType !== operation.actionType ||
    task.actionIntent.capability !== operation.capability ||
    task.actionIntent.riskClass !== operation.riskClass ||
    task.actionIntent.sensitivity !== operation.sensitivity ||
    !task.actionIntent.target.startsWith(operation.targetPrefix)
  ) {
    throw new PolicyError(
      "Connector operation does not exactly match the task action intent."
    );
  }
  if (compareRisk(task.actionIntent.riskClass, "A2") >= 0) {
    throw new PolicyError(
      "A2–A4 connector delivery is disabled in this experiment."
    );
  }
  const normalizedRequestedBy = requiredString(
    requestedBy,
    "delivery requester",
    {
      max: 140,
      pattern: AGENT_ID_PATTERN
    }
  );
  const normalizedRequestedAt = isoDate(
    requestedAt,
    "delivery requestedAt"
  );
  const normalizedIdempotencyKey = requiredString(
    idempotencyKey,
    "delivery idempotency key",
    { max: 200 }
  );
  const normalizedParameters = immutableJson(
    jsonClone(assertPlainObject(parameters, "delivery parameters"))
  );
  const connector = {
    id: instance.id,
    contractId: contract.id,
    contractVersion: contract.version,
    contractDigest: contract.digest,
    executionMode: contract.executionMode,
    networkAccess: contract.networkAccess,
    externalEffects: contract.externalEffects,
    maxAttempts: contract.maxAttempts
  };
  const operationBinding = {
    id: operation.id,
    digest: operation.digest,
    actionType: operation.actionType,
    capability: operation.capability,
    riskClass: operation.riskClass,
    sensitivity: operation.sensitivity,
    targetPrefix: operation.targetPrefix
  };
  const taskBinding = {
    id: assertId(task.id, "delivery task id"),
    runId: assertId(task.runId, "delivery run id"),
    attempt: task.attempt,
    actionIntentDigest: task.actionIntent.digest,
    ownerRoleId: task.ownerRoleId
  };
  const parametersDigest = digestObject(normalizedParameters);
  const requestDigest = digestObject({
    connector,
    operation: operationBinding,
    task: taskBinding,
    target: task.actionIntent.target,
    parametersDigest
  });
  const unsigned = {
    schemaVersion: DELIVERY_INTENT_SCHEMA_VERSION,
    kind: DELIVERY_INTENT_KIND,
    connector,
    operation: operationBinding,
    task: taskBinding,
    target: task.actionIntent.target,
    parameters: normalizedParameters,
    parametersDigest,
    requestedBy: normalizedRequestedBy,
    requestedAt: normalizedRequestedAt,
    idempotencyDigest: digestObject({
      connectorId: instance.id,
      operationId: operation.id,
      requestedBy: normalizedRequestedBy,
      key: normalizedIdempotencyKey
    }),
    requestDigest
  };
  return immutableJson({
    ...unsigned,
    digest: digestObject(unsigned)
  });
}

export function verifyDeliveryIntent(intent) {
  exactKeys(
    intent,
    intentKeys,
    "connector delivery intent",
    IntegrityError
  );
  if (
    intent.schemaVersion !== DELIVERY_INTENT_SCHEMA_VERSION ||
    intent.kind !== DELIVERY_INTENT_KIND
  ) {
    throw new IntegrityError("Connector delivery intent is unsupported.");
  }
  const connector = normalizeConnectorBinding(intent.connector, IntegrityError);
  const operation = normalizeOperationBinding(intent.operation, IntegrityError);
  const task = normalizeTaskBinding(intent.task, IntegrityError);
  const target = requiredString(intent.target, "delivery target", {
    max: 500
  });
  if (!target.startsWith(operation.targetPrefix)) {
    throw new IntegrityError(
      "Delivery target falls outside the contracted target prefix."
    );
  }
  const parameters = jsonClone(
    assertPlainObject(intent.parameters, "delivery parameters")
  );
  const parametersDigest = normalizedDigest(
    intent.parametersDigest,
    "delivery parameters digest"
  );
  if (digestObject(parameters) !== parametersDigest) {
    throw new IntegrityError("Delivery parameter digest mismatch.");
  }
  const requestedBy = requiredString(
    intent.requestedBy,
    "delivery requester",
    {
      max: 140,
      pattern: AGENT_ID_PATTERN
    }
  );
  isoDate(intent.requestedAt, "delivery requestedAt");
  normalizedDigest(intent.idempotencyDigest, "delivery idempotency digest");
  const requestDigest = normalizedDigest(
    intent.requestDigest,
    "delivery request digest"
  );
  if (
    digestObject({
      connector,
      operation,
      task,
      target,
      parametersDigest
    }) !== requestDigest
  ) {
    throw new IntegrityError("Delivery request digest mismatch.");
  }
  const unsigned = jsonClone(intent);
  delete unsigned.digest;
  if (digestObject(unsigned) !== intent.digest) {
    throw new IntegrityError("Connector delivery-intent digest mismatch.");
  }
  return true;
}

function exactEvidence(source, expected, field) {
  exactKeys(source, expected, field);
  if (source.externalEffect !== "none") {
    throw new PolicyError(
      "Dry-run connector outcomes must declare no external effect."
    );
  }
}

export function normalizeDeliveryOutcome(type, source) {
  const normalizedType = enumValue(type, "delivery outcome", [
    "failed",
    "simulated",
    "uncertain"
  ]);
  if (normalizedType === "simulated") {
    exactEvidence(
      source,
      ["externalEffect", "resultDigest"],
      "simulated delivery evidence"
    );
    return immutableJson({
      type: normalizedType,
      evidence: {
        externalEffect: "none",
        resultDigest: normalizedDigest(
          source.resultDigest,
          "simulated result digest"
        )
      }
    });
  }
  if (normalizedType === "failed") {
    exactEvidence(
      source,
      [
        "errorCode",
        "externalEffect",
        "messageDigest",
        "retryable"
      ],
      "failed delivery evidence"
    );
    if (typeof source.retryable !== "boolean") {
      throw new ValidationError(
        "Failed delivery retryable must be a boolean."
      );
    }
    return immutableJson({
      type: normalizedType,
      evidence: {
        externalEffect: "none",
        errorCode: requiredString(
          source.errorCode,
          "delivery error code",
          {
            max: 64,
            pattern: /^[A-Z][A-Z0-9_]{2,63}$/
          }
        ),
        messageDigest: normalizedDigest(
          source.messageDigest,
          "delivery failure message digest"
        ),
        retryable: source.retryable
      }
    });
  }
  exactEvidence(
    source,
    [
      "evidenceDigest",
      "externalEffect",
      "reasonCode"
    ],
    "uncertain delivery evidence"
  );
  return immutableJson({
    type: normalizedType,
    evidence: {
      externalEffect: "none",
      reasonCode: requiredString(
        source.reasonCode,
        "delivery uncertainty reason code",
        {
          max: 64,
          pattern: /^[A-Z][A-Z0-9_]{2,63}$/
        }
      ),
      evidenceDigest: normalizedDigest(
        source.evidenceDigest,
        "delivery uncertainty evidence digest"
      )
    }
  });
}

export function verifyDeliveryOutcome(outcome) {
  exactKeys(
    outcome,
    ["evidence", "recordedAt", "recordedBy", "type"],
    "delivery outcome",
    IntegrityError
  );
  const normalized = normalizeDeliveryOutcome(
    outcome.type,
    outcome.evidence
  );
  const recordedBy = requiredString(
    outcome.recordedBy,
    "delivery outcome recorder",
    {
      max: 160,
      pattern:
        /^connector:[a-z][a-z0-9-]{1,63}:[a-zA-Z0-9][a-zA-Z0-9._-]{1,63}$/
    }
  );
  const recordedAt = isoDate(
    outcome.recordedAt,
    "delivery outcome recordedAt"
  );
  return immutableJson({
    ...normalized,
    recordedBy,
    recordedAt
  });
}
