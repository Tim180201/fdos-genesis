import {
  digestObject,
  immutableJson,
  jsonClone
} from "../kernel/canonical-json.js";
import { IntegrityError, PolicyError, ValidationError } from "../kernel/errors.js";
import {
  assertPlainObject,
  enumValue,
  requiredString
} from "../kernel/validation.js";
import {
  compareRisk,
  RISK_CLASSES,
  SENSITIVITY_CLASSES
} from "./action-catalog.js";

const INTENT_VERSION = "1.0";

export function executionModeFor(riskClass) {
  enumValue(riskClass, "risk class", RISK_CLASSES);
  if (riskClass === "A0" || riskClass === "A1") return "role_authorized";
  if (riskClass === "A2") return "human_approval";
  return "blocked";
}

export function createActionIntent({
  catalog,
  actionType,
  target,
  parameters = {},
  declaredRiskClass,
  sensitivity = "internal"
}) {
  if (!catalog) throw new ValidationError("Action catalog is required.");
  const definition = catalog.get(actionType);
  const riskClass = declaredRiskClass
    ? enumValue(declaredRiskClass, "declared risk class", RISK_CLASSES)
    : definition.minimumRiskClass;

  if (compareRisk(riskClass, definition.minimumRiskClass) < 0) {
    throw new PolicyError(
      `${actionType} cannot be classified below ${definition.minimumRiskClass}.`,
      {
        actionType,
        declaredRiskClass: riskClass,
        minimumRiskClass: definition.minimumRiskClass
      }
    );
  }

  const normalizedSensitivity = enumValue(
    sensitivity,
    "sensitivity",
    SENSITIVITY_CLASSES
  );
  if (normalizedSensitivity === "restricted") {
    throw new PolicyError("Restricted data is disabled in the Level 1 runtime.");
  }

  const unsigned = {
    schemaVersion: INTENT_VERSION,
    actionType: definition.type,
    capability: definition.capability,
    target: requiredString(target, "action target", { max: 500 }),
    parametersDigest: digestObject(
      assertPlainObject(parameters, "action parameters")
    ),
    riskClass,
    sensitivity: normalizedSensitivity,
    executionMode: executionModeFor(riskClass)
  };
  return immutableJson({
    ...unsigned,
    digest: digestObject(unsigned)
  });
}

export function verifyActionIntent(intent, catalog) {
  assertPlainObject(intent, "action intent");
  if (intent.schemaVersion !== INTENT_VERSION) {
    throw new IntegrityError("Unsupported action-intent version.");
  }
  const definition = catalog.get(intent.actionType);
  if (intent.capability !== definition.capability) {
    throw new IntegrityError("Action-intent capability does not match catalogue.");
  }
  if (compareRisk(intent.riskClass, definition.minimumRiskClass) < 0) {
    throw new IntegrityError("Action intent is under-classified.");
  }
  enumValue(intent.sensitivity, "action-intent sensitivity", SENSITIVITY_CLASSES);
  if (intent.sensitivity === "restricted") {
    throw new PolicyError("Restricted data is disabled in the Level 1 runtime.");
  }
  if (intent.executionMode !== executionModeFor(intent.riskClass)) {
    throw new IntegrityError("Action-intent execution mode is invalid.");
  }
  requiredString(intent.target, "action-intent target", { max: 500 });
  requiredString(intent.parametersDigest, "action-intent parameters digest", {
    max: 80,
    pattern: /^sha256:[a-f0-9]{64}$/
  });

  const unsigned = jsonClone(intent);
  delete unsigned.digest;
  const calculated = digestObject(unsigned);
  if (intent.digest !== calculated) {
    throw new IntegrityError("Action-intent digest mismatch.");
  }
  return true;
}
