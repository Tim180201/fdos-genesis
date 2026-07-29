import {
  digestObject,
  immutableJson,
  jsonClone
} from "../kernel/canonical-json.js";
import {
  AuthorizationError,
  ConflictError,
  NotFoundError,
  PolicyError,
  ValidationError
} from "../kernel/errors.js";
import {
  assertPlainObject,
  enumValue,
  requiredString
} from "../kernel/validation.js";
import {
  compareRisk,
  SENSITIVITY_CLASSES
} from "./action-catalog.js";

const CONTRACT_SCHEMA_VERSION = "1.0";
const MAX_PARAMETERS_BYTES = 32 * 1024;
const CONTRACT_ID_PATTERN = /^[a-z][a-z0-9.-]{1,79}$/;
const OPERATION_ID_PATTERN = /^[a-z][a-z0-9.-]{1,79}$/;
const CONNECTOR_ID_PATTERN =
  /^connector:[a-z][a-z0-9-]{1,63}:[a-zA-Z0-9][a-zA-Z0-9._-]{1,63}$/;
const VERSION_PATTERN = /^[0-9]+\.[0-9]+\.[0-9]+(?:-[a-z0-9.-]+)?$/;
const FIELD_NAME_PATTERN = /^[a-z][a-zA-Z0-9]{0,63}$/;
const SENSITIVE_FIELD_PATTERN =
  /(authorization|cookie|credential|password|privatekey|secret|token)/i;

const contractKeys = [
  "description",
  "executionMode",
  "externalEffects",
  "id",
  "maxAttempts",
  "name",
  "networkAccess",
  "operations",
  "version"
];
const operationKeys = [
  "actionType",
  "description",
  "id",
  "parameterFields",
  "riskClass",
  "sensitivity",
  "targetPrefix"
];
const parameterFieldKeys = [
  "maxLength",
  "name",
  "required",
  "type"
];
const instanceKeys = [
  "contractId",
  "contractVersion",
  "id",
  "name",
  "status"
];

function exactKeys(value, expected, field) {
  assertPlainObject(value, field);
  const actual = Object.keys(value).sort();
  const normalizedExpected = [...expected].sort();
  if (
    actual.length !== normalizedExpected.length ||
    actual.some((key, index) => key !== normalizedExpected[index])
  ) {
    throw new ValidationError(`${field} has an unexpected shape.`);
  }
}

function exactBoolean(value, field, expected) {
  if (value !== expected) {
    throw new PolicyError(`${field} must remain ${String(expected)}.`);
  }
  return value;
}

function normalizeParameterField(source, index) {
  const field = `connector parameter field ${index}`;
  exactKeys(source, parameterFieldKeys, field);
  const name = requiredString(source.name, `${field} name`, {
    max: 64,
    pattern: FIELD_NAME_PATTERN
  });
  if (SENSITIVE_FIELD_PATTERN.test(name)) {
    throw new PolicyError(
      `Connector parameter field ${name} may contain credential material.`
    );
  }
  const type = enumValue(source.type, `${field} type`, [
    "boolean",
    "integer",
    "string"
  ]);
  if (typeof source.required !== "boolean") {
    throw new ValidationError(`${field} required must be a boolean.`);
  }
  if (
    !Number.isSafeInteger(source.maxLength) ||
    (type === "string" &&
      (source.maxLength < 1 || source.maxLength > 4_000)) ||
    (type !== "string" && source.maxLength !== 0)
  ) {
    throw new ValidationError(`${field} maximum length is invalid.`);
  }
  return immutableJson({
    name,
    type,
    required: source.required,
    maxLength: source.maxLength
  });
}

function normalizeOperation(source, index, actionCatalog) {
  const field = `connector operation ${index}`;
  exactKeys(source, operationKeys, field);
  const actionType = requiredString(
    source.actionType,
    `${field} action type`,
    {
      max: 120,
      pattern: /^[a-z][a-z0-9.-]+$/
    }
  );
  const action = actionCatalog.get(actionType);
  const riskClass = enumValue(
    source.riskClass,
    `${field} risk class`,
    ["A0", "A1"]
  );
  if (compareRisk(riskClass, action.minimumRiskClass) < 0) {
    throw new PolicyError(
      `${actionType} cannot be contracted below ${action.minimumRiskClass}.`
    );
  }
  const sensitivity = enumValue(
    source.sensitivity,
    `${field} sensitivity`,
    SENSITIVITY_CLASSES
  );
  if (!["public", "internal"].includes(sensitivity)) {
    throw new PolicyError(
      "Dry-run connector contracts may handle only public or internal data."
    );
  }
  const targetPrefix = requiredString(
    source.targetPrefix,
    `${field} target prefix`,
    {
      max: 120,
      pattern:
        /^(internal|reference|sandbox):(?:[a-zA-Z0-9][a-zA-Z0-9:._/-]*)?$/
    }
  );
  if (!Array.isArray(source.parameterFields)) {
    throw new ValidationError(
      "Connector operation parameter fields must be a list."
    );
  }
  const fields = source.parameterFields.map((entry, fieldIndex) =>
    normalizeParameterField(entry, fieldIndex)
  );
  if (fields.length > 16) {
    throw new ValidationError(
      "Connector operation has too many parameter fields."
    );
  }
  const names = fields.map((entry) => entry.name);
  if (new Set(names).size !== names.length) {
    throw new ConflictError(
      "Connector operation contains duplicate parameter fields."
    );
  }
  const unsigned = {
    id: requiredString(source.id, `${field} id`, {
      max: 80,
      pattern: OPERATION_ID_PATTERN
    }),
    description: requiredString(
      source.description,
      `${field} description`,
      { max: 500 }
    ),
    actionType,
    capability: action.capability,
    targetPrefix,
    riskClass,
    sensitivity,
    parameterFields: fields
  };
  return immutableJson({
    ...unsigned,
    digest: digestObject(unsigned)
  });
}

function normalizeContract(source, actionCatalog) {
  exactKeys(source, contractKeys, "connector contract");
  if (!Array.isArray(source.operations) || source.operations.length < 1) {
    throw new ValidationError(
      "Connector contract requires at least one operation."
    );
  }
  if (source.operations.length > 32) {
    throw new ValidationError("Connector contract has too many operations.");
  }
  if (source.executionMode !== "dry_run") {
    throw new PolicyError(
      "Only dry-run connector contracts are enabled in this experiment."
    );
  }
  exactBoolean(
    source.networkAccess,
    "Connector contract network access",
    false
  );
  exactBoolean(
    source.externalEffects,
    "Connector contract external effects",
    false
  );
  if (
    !Number.isSafeInteger(source.maxAttempts) ||
    source.maxAttempts < 1 ||
    source.maxAttempts > 3
  ) {
    throw new ValidationError(
      "Connector contract maxAttempts must be between one and three."
    );
  }
  const operations = source.operations.map((entry, index) =>
    normalizeOperation(entry, index, actionCatalog)
  );
  const operationIds = operations.map((entry) => entry.id);
  if (new Set(operationIds).size !== operationIds.length) {
    throw new ConflictError(
      "Connector contract contains duplicate operations."
    );
  }
  const unsigned = {
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    id: requiredString(source.id, "connector contract id", {
      max: 80,
      pattern: CONTRACT_ID_PATTERN
    }),
    version: requiredString(source.version, "connector contract version", {
      max: 80,
      pattern: VERSION_PATTERN
    }),
    name: requiredString(source.name, "connector contract name", {
      max: 160
    }),
    description: requiredString(
      source.description,
      "connector contract description",
      { max: 1_000 }
    ),
    executionMode: "dry_run",
    networkAccess: false,
    externalEffects: false,
    maxAttempts: source.maxAttempts,
    operations
  };
  return immutableJson({
    ...unsigned,
    digest: digestObject(unsigned)
  });
}

function contractKey(id, version) {
  return `${id}@${version}`;
}

function normalizeInstance(source, contracts) {
  exactKeys(source, instanceKeys, "connector instance");
  const contractId = requiredString(
    source.contractId,
    "connector instance contract id",
    {
      max: 80,
      pattern: CONTRACT_ID_PATTERN
    }
  );
  const contractVersion = requiredString(
    source.contractVersion,
    "connector instance contract version",
    {
      max: 80,
      pattern: VERSION_PATTERN
    }
  );
  const contract = contracts.get(contractKey(contractId, contractVersion));
  if (!contract) {
    throw new NotFoundError(
      `Unknown connector contract: ${contractId}@${contractVersion}.`
    );
  }
  return immutableJson({
    id: requiredString(source.id, "connector instance id", {
      max: 160,
      pattern: CONNECTOR_ID_PATTERN
    }),
    name: requiredString(source.name, "connector instance name", {
      max: 160
    }),
    contractId,
    contractVersion,
    contractDigest: contract.digest,
    status: enumValue(source.status, "connector instance status", [
      "active",
      "suspended",
      "retired"
    ])
  });
}

function normalizeParameterValue(value, field) {
  if (field.type === "string") {
    return requiredString(value, `connector parameter ${field.name}`, {
      max: field.maxLength
    });
  }
  if (field.type === "boolean") {
    if (typeof value !== "boolean") {
      throw new ValidationError(
        `Connector parameter ${field.name} must be a boolean.`
      );
    }
    return value;
  }
  if (!Number.isSafeInteger(value)) {
    throw new ValidationError(
      `Connector parameter ${field.name} must be a safe integer.`
    );
  }
  return value;
}

export function connectorActor(id) {
  return immutableJson({
    type: "connector",
    id: requiredString(id, "connector actor id", {
      max: 160,
      pattern: CONNECTOR_ID_PATTERN
    })
  });
}

export class ConnectorRegistry {
  constructor({
    actionCatalog,
    contractDefinitions = [],
    instanceDefinitions = []
  }) {
    if (!actionCatalog) {
      throw new ValidationError(
        "Connector registry requires an action catalog."
      );
    }
    if (
      !Array.isArray(contractDefinitions) ||
      !Array.isArray(instanceDefinitions)
    ) {
      throw new ValidationError(
        "Connector contracts and instances must be lists."
      );
    }
    this.contracts = new Map();
    this.instances = new Map();
    for (const definition of contractDefinitions) {
      const contract = normalizeContract(definition, actionCatalog);
      const key = contractKey(contract.id, contract.version);
      if (this.contracts.has(key)) {
        throw new ConflictError(`Duplicate connector contract: ${key}.`);
      }
      this.contracts.set(key, contract);
    }
    for (const definition of instanceDefinitions) {
      const instance = normalizeInstance(definition, this.contracts);
      if (this.instances.has(instance.id)) {
        throw new ConflictError(
          `Duplicate connector instance: ${instance.id}.`
        );
      }
      this.instances.set(instance.id, instance);
    }
  }

  getContract(id, version) {
    const contract = this.contracts.get(contractKey(id, version));
    if (!contract) {
      throw new NotFoundError(`Unknown connector contract: ${id}@${version}.`);
    }
    return jsonClone(contract);
  }

  getInstance(id) {
    const instance = this.instances.get(id);
    if (!instance) {
      throw new NotFoundError(`Unknown connector instance: ${id}.`);
    }
    return jsonClone(instance);
  }

  listContracts() {
    return [...this.contracts.values()].map(jsonClone);
  }

  listInstances() {
    return [...this.instances.values()].map(jsonClone);
  }

  hasActionType(actionType) {
    return [...this.contracts.values()].some((contract) =>
      contract.operations.some(
        (operation) => operation.actionType === actionType
      )
    );
  }

  resolveActor(actor) {
    if (!actor || actor.type !== "connector") {
      throw new AuthorizationError(
        "A connector actor identity is required."
      );
    }
    const instance = this.instances.get(actor.id);
    if (!instance) {
      throw new AuthorizationError(
        "Connector instance is not registered."
      );
    }
    if (instance.status !== "active") {
      throw new AuthorizationError(
        `Connector instance ${instance.id} is ${instance.status}.`
      );
    }
    return connectorActor(instance.id);
  }

  resolveOperation(connectorId, operationId) {
    const instance = this.getInstance(connectorId);
    if (instance.status !== "active") {
      throw new AuthorizationError(
        `Connector instance ${instance.id} is ${instance.status}.`
      );
    }
    const contract = this.getContract(
      instance.contractId,
      instance.contractVersion
    );
    if (contract.digest !== instance.contractDigest) {
      throw new PolicyError(
        `Connector instance ${instance.id} has a stale contract binding.`
      );
    }
    const normalizedOperationId = requiredString(
      operationId,
      "connector operation id",
      {
        max: 80,
        pattern: OPERATION_ID_PATTERN
      }
    );
    const operation = contract.operations.find(
      (candidate) => candidate.id === normalizedOperationId
    );
    if (!operation) {
      throw new AuthorizationError(
        `Connector ${instance.id} is not authorized for ${normalizedOperationId}.`
      );
    }
    return immutableJson({ instance, contract, operation });
  }

  normalizeParameters(operation, source) {
    assertPlainObject(source, "connector parameters");
    const schema = new Map(
      operation.parameterFields.map((field) => [field.name, field])
    );
    const actualKeys = Object.keys(source);
    const unexpected = actualKeys.filter((key) => !schema.has(key));
    const missing = operation.parameterFields
      .filter((field) => field.required && !Object.hasOwn(source, field.name))
      .map((field) => field.name);
    if (unexpected.length > 0 || missing.length > 0) {
      throw new ValidationError("Connector parameter shape is invalid.", {
        unexpected,
        missing
      });
    }
    const normalized = {};
    for (const key of actualKeys.sort()) {
      normalized[key] = normalizeParameterValue(source[key], schema.get(key));
    }
    const frozen = immutableJson(normalized);
    if (
      Buffer.byteLength(JSON.stringify(frozen), "utf8") >
      MAX_PARAMETERS_BYTES
    ) {
      throw new ValidationError(
        "Connector parameters exceed the 32 KiB limit."
      );
    }
    return frozen;
  }
}

export const connectorIdPattern = CONNECTOR_ID_PATTERN;
