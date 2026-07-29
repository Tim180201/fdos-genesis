import { immutableJson } from "../kernel/canonical-json.js";
import { ConflictError, PolicyError, ValidationError } from "../kernel/errors.js";
import {
  enumValue,
  requiredString,
  uniqueStrings
} from "../kernel/validation.js";

export const RISK_CLASSES = Object.freeze(["A0", "A1", "A2", "A3", "A4"]);
export const SENSITIVITY_CLASSES = Object.freeze([
  "public",
  "internal",
  "confidential",
  "restricted"
]);

const RISK_RANK = Object.freeze(
  Object.fromEntries(RISK_CLASSES.map((riskClass, index) => [riskClass, index]))
);

const DEFAULT_ACTIONS = Object.freeze([
  {
    type: "work.intake.analyze",
    capability: "work:intake",
    minimumRiskClass: "A0",
    description: "Analyze a bounded work request."
  },
  {
    type: "operations.release.assess",
    capability: "operations:assess",
    minimumRiskClass: "A0",
    description: "Assess internal software-change readiness."
  },
  {
    type: "marketing.release.draft",
    capability: "marketing:draft",
    minimumRiskClass: "A1",
    description: "Prepare an internal, unpublished communication draft."
  },
  {
    type: "executive.release.synthesize",
    capability: "work:synthesize",
    minimumRiskClass: "A0",
    description: "Synthesize internal evidence into a recommendation."
  },
  {
    type: "specialist.analysis",
    capability: "work:specialist",
    minimumRiskClass: "A0",
    description: "Perform a bounded specialist analysis."
  },
  {
    type: "connector.reversible.write",
    capability: "connector:write:reversible",
    minimumRiskClass: "A2",
    description: "Perform a registered, bounded and reversible connector write."
  },
  {
    type: "email.send",
    capability: "email:send",
    minimumRiskClass: "A3",
    description: "Send an external email."
  },
  {
    type: "content.publish",
    capability: "content:publish",
    minimumRiskClass: "A3",
    description: "Publish content externally."
  },
  {
    type: "contract.sign",
    capability: "contract:sign",
    minimumRiskClass: "A3",
    description: "Create a binding contractual action."
  },
  {
    type: "payment.execute",
    capability: "payment:execute",
    minimumRiskClass: "A3",
    description: "Execute a financial payment."
  },
  {
    type: "personnel.decide",
    capability: "personnel:decide",
    minimumRiskClass: "A3",
    description: "Make a material personnel decision."
  },
  {
    type: "record.delete",
    capability: "record:delete",
    minimumRiskClass: "A4",
    description: "Delete an organizational record."
  },
  {
    type: "audit.alter",
    capability: "audit:alter",
    minimumRiskClass: "A4",
    description: "Alter or remove audit evidence."
  },
  {
    type: "governance.bypass",
    capability: "governance:bypass",
    minimumRiskClass: "A4",
    description: "Bypass a governance control."
  }
]);

function normalizeDefinition(definition) {
  if (!definition || typeof definition !== "object" || Array.isArray(definition)) {
    throw new ValidationError("Action definition must be an object.");
  }
  return immutableJson({
    type: requiredString(definition.type, "action type", {
      max: 120,
      pattern: /^[a-z][a-z0-9.-]+$/
    }),
    capability: requiredString(definition.capability, "action capability", {
      max: 120,
      pattern: /^[a-z][a-z0-9:*-]+$/
    }),
    minimumRiskClass: enumValue(
      definition.minimumRiskClass,
      "minimum risk class",
      RISK_CLASSES
    ),
    description: requiredString(definition.description, "action description", {
      max: 500
    }),
    tags: uniqueStrings(definition.tags || [], "action tags", {
      maximum: 16,
      pattern: /^[a-z][a-z0-9-]+$/
    })
  });
}

export function compareRisk(left, right) {
  enumValue(left, "risk class", RISK_CLASSES);
  enumValue(right, "risk class", RISK_CLASSES);
  return RISK_RANK[left] - RISK_RANK[right];
}

export class ActionCatalog {
  constructor(additionalDefinitions = []) {
    this.definitions = new Map();
    for (const definition of [...DEFAULT_ACTIONS, ...additionalDefinitions]) {
      const normalized = normalizeDefinition(definition);
      const existing = this.definitions.get(normalized.type);
      if (existing) {
        if (JSON.stringify(existing) !== JSON.stringify(normalized)) {
          throw new ConflictError(
            `Conflicting action definition: ${normalized.type}.`
          );
        }
        continue;
      }
      this.definitions.set(normalized.type, normalized);
    }
  }

  get(type) {
    const definition = this.definitions.get(type);
    if (!definition) {
      throw new PolicyError(`Unknown action type denied: ${type || "<empty>"}.`, {
        actionType: type || null
      });
    }
    return definition;
  }

  list() {
    return [...this.definitions.values()].map((definition) => ({
      ...definition,
      tags: [...definition.tags]
    }));
  }
}

export const defaultActionDefinitions = DEFAULT_ACTIONS;
