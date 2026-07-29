import { immutableJson, jsonClone } from "../kernel/canonical-json.js";
import {
  AuthorizationError,
  ConflictError,
  NotFoundError,
  PolicyError,
  ValidationError
} from "../kernel/errors.js";
import {
  enumValue,
  requiredString,
  uniqueStrings
} from "../kernel/validation.js";
import { SENSITIVITY_CLASSES } from "./action-catalog.js";

const SENSITIVITY_RANK = Object.freeze({
  public: 0,
  internal: 1,
  confidential: 2,
  restricted: 3
});

const ROLE_ID_PATTERN = /^[a-z][a-z0-9-]{1,63}$/;

export const PILOT_ROLE_DEFINITIONS = Object.freeze([
  {
    id: "chief-of-staff",
    name: "Chief of Staff",
    department: "executive",
    communicationStyle: "Concise, evidence-led and decision-oriented.",
    capabilities: [
      "work:intake",
      "work:synthesize",
      "work:specialist",
      "workflow:start",
      "task:delegate",
      "task:read:any",
      "audit:read",
      "evidence:export",
      "memory:company:read",
      "memory:company:propose",
      "memory:department:any:read",
      "memory:department:executive:propose"
    ],
    memoryReadScopes: ["company", "department:*"],
    memoryProposeScopes: ["company", "department:executive"],
    maxSensitivity: "confidential"
  },
  {
    id: "operations",
    name: "Operations",
    department: "operations",
    communicationStyle: "Operational, risk-aware and verification-oriented.",
    capabilities: [
      "operations:assess",
      "work:specialist",
      "task:delegate",
      "memory:company:read",
      "memory:department:operations:read",
      "memory:department:operations:propose",
      "connector:write:reversible"
    ],
    memoryReadScopes: ["company", "department:operations"],
    memoryProposeScopes: ["department:operations"],
    maxSensitivity: "confidential"
  },
  {
    id: "marketing",
    name: "Marketing",
    department: "marketing",
    communicationStyle: "Clear, audience-aware and claim-disciplined.",
    capabilities: [
      "marketing:draft",
      "work:specialist",
      "task:delegate",
      "memory:company:read",
      "memory:department:marketing:read",
      "memory:department:marketing:propose"
    ],
    memoryReadScopes: ["company", "department:marketing"],
    memoryProposeScopes: ["department:marketing"],
    maxSensitivity: "confidential"
  }
]);

function normalizeScope(scope, field = "memory scope") {
  const normalized = requiredString(scope, field, {
    max: 100,
    pattern: /^(company|department:(?:\*|[a-z][a-z0-9-]{1,63}))$/
  });
  return normalized;
}

function scopeMatches(rule, scope) {
  return rule === scope || (rule === "department:*" && scope.startsWith("department:"));
}

function normalizeRole(definition) {
  if (!definition || typeof definition !== "object" || Array.isArray(definition)) {
    throw new ValidationError("Role definition must be an object.");
  }
  const maxSensitivity = enumValue(
    definition.maxSensitivity,
    "role maximum sensitivity",
    SENSITIVITY_CLASSES.filter((value) => value !== "restricted")
  );
  return immutableJson({
    id: requiredString(definition.id, "role id", {
      max: 64,
      pattern: ROLE_ID_PATTERN
    }),
    name: requiredString(definition.name, "role name", { max: 120 }),
    department: requiredString(definition.department, "role department", {
      max: 64,
      pattern: ROLE_ID_PATTERN
    }),
    communicationStyle: requiredString(
      definition.communicationStyle,
      "role communication style",
      { max: 500 }
    ),
    capabilities: uniqueStrings(
      definition.capabilities,
      "role capabilities",
      {
        maximum: 64,
        pattern: /^[a-z][a-z0-9:*-]+$/
      }
    ).sort(),
    memoryReadScopes: uniqueStrings(
      definition.memoryReadScopes,
      "role memory read scopes",
      { maximum: 16 }
    )
      .map((scope) => normalizeScope(scope))
      .sort(),
    memoryProposeScopes: uniqueStrings(
      definition.memoryProposeScopes,
      "role memory propose scopes",
      { maximum: 16 }
    )
      .map((scope) => normalizeScope(scope))
      .sort(),
    maxSensitivity
  });
}

export function humanActor(id = "human:owner") {
  return immutableJson({
    type: "human",
    id: requiredString(id, "human actor id", {
      max: 120,
      pattern: /^human:[a-zA-Z0-9][a-zA-Z0-9._-]+$/
    })
  });
}

export const systemActor = immutableJson({
  type: "system",
  id: "fdos-runtime"
});

export class RoleRegistry {
  constructor(definitions = PILOT_ROLE_DEFINITIONS) {
    this.roles = new Map();
    for (const definition of definitions) {
      const role = normalizeRole(definition);
      if (this.roles.has(role.id)) {
        throw new ConflictError(`Duplicate role: ${role.id}.`);
      }
      this.roles.set(role.id, role);
    }
  }

  get(roleId) {
    const role = this.roles.get(roleId);
    if (!role) throw new NotFoundError(`Unknown role: ${roleId}.`);
    return jsonClone(role);
  }

  list() {
    return [...this.roles.values()].map(jsonClone);
  }

  hasCapability(roleId, capability) {
    const role = this.get(roleId);
    return role.capabilities.includes(capability);
  }

  assertCapability(roleId, capability) {
    if (!this.hasCapability(roleId, capability)) {
      throw new AuthorizationError(
        `${roleId} lacks capability ${capability}.`,
        { roleId, capability }
      );
    }
    return true;
  }

  assertTaskRead(actor, task) {
    if (actor.type === "human") return true;
    if (actor.type !== "agent") {
      throw new AuthorizationError("System actors cannot read task content.");
    }
    if (
      actor.roleId === task.ownerRoleId ||
      this.hasCapability(actor.roleId, "task:read:any")
    ) {
      return true;
    }
    throw new AuthorizationError(
      `Agent ${actor.id} cannot read task ${task.id}.`
    );
  }

  assertMemoryAccess(actor, scope, sensitivity, mode = "read") {
    const normalizedScope = normalizeScope(scope);
    const normalizedSensitivity = enumValue(
      sensitivity,
      "memory sensitivity",
      SENSITIVITY_CLASSES
    );
    if (normalizedSensitivity === "restricted") {
      throw new PolicyError("Restricted memory is disabled.");
    }
    if (normalizedScope === "company" && normalizedSensitivity === "confidential") {
      throw new PolicyError("Confidential memory must use a department scope.");
    }
    if (actor.type === "human") return normalizedScope;
    if (actor.type !== "agent") {
      throw new AuthorizationError("System actor has no memory access.");
    }
    const role = this.get(actor.roleId);
    if (
      SENSITIVITY_RANK[normalizedSensitivity] >
      SENSITIVITY_RANK[role.maxSensitivity]
    ) {
      throw new AuthorizationError(
        `${actor.id} cannot access ${normalizedSensitivity} memory.`
      );
    }
    const scopes =
      mode === "propose" ? role.memoryProposeScopes : role.memoryReadScopes;
    if (!scopes.some((rule) => scopeMatches(rule, normalizedScope))) {
      throw new AuthorizationError(
        `${actor.id} cannot ${mode} memory in ${normalizedScope}.`
      );
    }
    const exactCapability = `memory:${normalizedScope}:${mode}`;
    const wildcardCapability = normalizedScope.startsWith("department:")
      ? `memory:department:any:${mode}`
      : null;
    if (
      !role.capabilities.includes(exactCapability) &&
      !(wildcardCapability && role.capabilities.includes(wildcardCapability))
    ) {
      throw new AuthorizationError(
        `${actor.id} lacks capability ${exactCapability}.`
      );
    }
    return normalizedScope;
  }
}

export const roleIdPattern = ROLE_ID_PATTERN;
