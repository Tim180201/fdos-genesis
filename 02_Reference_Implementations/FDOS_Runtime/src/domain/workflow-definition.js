import {
  digestObject,
  immutableJson,
  jsonClone
} from "../kernel/canonical-json.js";
import {
  ConflictError,
  NotFoundError,
  ValidationError
} from "../kernel/errors.js";
import {
  requiredString,
  uniqueStrings
} from "../kernel/validation.js";
import { createActionIntent } from "./action-intent.js";

const WORKFLOW_ID_PATTERN = /^[a-z][a-z0-9.-]{2,119}$/;
const STEP_ID_PATTERN = /^[a-z][a-z0-9-]{1,63}$/;
const SEMVER_PATTERN =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?$/;

function assertAcyclic(steps) {
  const byId = new Map(steps.map((step) => [step.id, step]));
  const visiting = new Set();
  const visited = new Set();

  function visit(stepId) {
    if (visiting.has(stepId)) {
      throw new ValidationError(`Workflow dependency cycle at ${stepId}.`);
    }
    if (visited.has(stepId)) return;
    visiting.add(stepId);
    for (const dependency of byId.get(stepId).dependencies) {
      visit(dependency);
    }
    visiting.delete(stepId);
    visited.add(stepId);
  }

  for (const step of steps) visit(step.id);
}

function normalizeStep(step, { actionCatalog, roleRegistry }) {
  if (!step || typeof step !== "object" || Array.isArray(step)) {
    throw new ValidationError("Workflow step must be an object.");
  }
  const roleId = requiredString(step.roleId, "workflow step role", {
    max: 64,
    pattern: /^[a-z][a-z0-9-]{1,63}$/
  });
  roleRegistry.get(roleId);

  const actionIntentTemplate = createActionIntent({
    catalog: actionCatalog,
    actionType: step.actionType,
    target: requiredString(step.target, "workflow step target", { max: 500 }),
    parameters: {
      definitionTemplate: true,
      stepParameters: step.parameters || {}
    },
    declaredRiskClass: step.riskClass,
    sensitivity: step.sensitivity || "internal"
  });

  return {
    id: requiredString(step.id, "workflow step id", {
      max: 64,
      pattern: STEP_ID_PATTERN
    }),
    title: requiredString(step.title, "workflow step title", { max: 200 }),
    roleId,
    instructions: requiredString(step.instructions, "workflow instructions", {
      max: 4_000
    }),
    desiredOutcome: requiredString(
      step.desiredOutcome,
      "workflow desired outcome",
      { max: 1_000 }
    ),
    dependencies: uniqueStrings(
      step.dependencies || [],
      "workflow dependencies",
      { maximum: 16, pattern: STEP_ID_PATTERN }
    ).sort(),
    action: {
      actionType: actionIntentTemplate.actionType,
      target: actionIntentTemplate.target,
      riskClass: actionIntentTemplate.riskClass,
      sensitivity: actionIntentTemplate.sensitivity,
      parameters: jsonClone(step.parameters || {})
    },
    output: {
      requiredFields: uniqueStrings(
        step.output?.requiredFields || [],
        "workflow required output fields",
        {
          maximum: 32,
          pattern: /^[a-z][a-zA-Z0-9]{0,63}$/
        }
      ).sort()
    }
  };
}

export function createWorkflowDefinition(
  source,
  { actionCatalog, roleRegistry }
) {
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    throw new ValidationError("Workflow definition must be an object.");
  }
  if (!Array.isArray(source.steps) || source.steps.length < 2 || source.steps.length > 32) {
    throw new ValidationError("Workflow must contain between 2 and 32 steps.");
  }
  const steps = source.steps.map((step) =>
    normalizeStep(step, { actionCatalog, roleRegistry })
  );
  const stepIds = new Set(steps.map((step) => step.id));
  if (stepIds.size !== steps.length) {
    throw new ValidationError("Workflow step identifiers must be unique.");
  }
  for (const step of steps) {
    for (const dependency of step.dependencies) {
      if (!stepIds.has(dependency)) {
        throw new ValidationError(
          `Step ${step.id} references missing dependency ${dependency}.`
        );
      }
      if (dependency === step.id) {
        throw new ValidationError(`Step ${step.id} cannot depend on itself.`);
      }
    }
  }
  assertAcyclic(steps);

  const unsigned = {
    schemaVersion: "1.0",
    id: requiredString(source.id, "workflow id", {
      max: 120,
      pattern: WORKFLOW_ID_PATTERN
    }),
    version: requiredString(source.version, "workflow version", {
      max: 80,
      pattern: SEMVER_PATTERN
    }),
    name: requiredString(source.name, "workflow name", { max: 200 }),
    purpose: requiredString(source.purpose, "workflow purpose", { max: 1_000 }),
    ownerRoleId: requiredString(source.ownerRoleId, "workflow owner role", {
      max: 64,
      pattern: /^[a-z][a-z0-9-]{1,63}$/
    }),
    maxHandoffDepth:
      source.maxHandoffDepth === undefined ? 2 : source.maxHandoffDepth,
    maxHandoffsPerRun:
      source.maxHandoffsPerRun === undefined ? 6 : source.maxHandoffsPerRun,
    steps
  };
  roleRegistry.get(unsigned.ownerRoleId);
  if (
    !Number.isInteger(unsigned.maxHandoffDepth) ||
    unsigned.maxHandoffDepth < 0 ||
    unsigned.maxHandoffDepth > 4
  ) {
    throw new ValidationError("Workflow handoff depth must be between 0 and 4.");
  }
  if (
    !Number.isInteger(unsigned.maxHandoffsPerRun) ||
    unsigned.maxHandoffsPerRun < 0 ||
    unsigned.maxHandoffsPerRun > 20
  ) {
    throw new ValidationError("Workflow handoff budget must be between 0 and 20.");
  }
  return immutableJson({
    ...unsigned,
    digest: digestObject(unsigned)
  });
}

function semverParts(version) {
  const [major, minor, patch] = version.split(/[.-]/, 3).map(Number);
  return [major, minor, patch];
}

export class WorkflowRegistry {
  constructor({ actionCatalog, roleRegistry, definitions = [] }) {
    this.actionCatalog = actionCatalog;
    this.roleRegistry = roleRegistry;
    this.definitions = new Map();
    for (const definition of definitions) this.register(definition);
  }

  register(source) {
    const definition = createWorkflowDefinition(source, {
      actionCatalog: this.actionCatalog,
      roleRegistry: this.roleRegistry
    });
    const key = `${definition.id}@${definition.version}`;
    const existing = this.definitions.get(key);
    if (existing && existing.digest !== definition.digest) {
      throw new ConflictError(`Workflow ${key} already has another digest.`);
    }
    this.definitions.set(key, definition);
    return jsonClone(definition);
  }

  get(id, version) {
    if (version) {
      const definition = this.definitions.get(`${id}@${version}`);
      if (!definition) {
        throw new NotFoundError(`Unknown workflow: ${id}@${version}.`);
      }
      return jsonClone(definition);
    }
    const candidates = [...this.definitions.values()].filter(
      (definition) => definition.id === id
    );
    if (!candidates.length) throw new NotFoundError(`Unknown workflow: ${id}.`);
    candidates.sort((left, right) => {
      const leftParts = semverParts(left.version);
      const rightParts = semverParts(right.version);
      for (let index = 0; index < 3; index += 1) {
        if (leftParts[index] !== rightParts[index]) {
          return rightParts[index] - leftParts[index];
        }
      }
      return right.version.localeCompare(left.version);
    });
    return jsonClone(candidates[0]);
  }

  list() {
    return [...this.definitions.values()].map(jsonClone);
  }
}
