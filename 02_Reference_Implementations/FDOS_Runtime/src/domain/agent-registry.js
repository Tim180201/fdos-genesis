import { immutableJson, jsonClone } from "../kernel/canonical-json.js";
import {
  AuthorizationError,
  ConflictError,
  NotFoundError,
  ValidationError
} from "../kernel/errors.js";
import { enumValue, requiredString } from "../kernel/validation.js";

const AGENT_ID_PATTERN =
  /^agent:[a-z][a-z0-9-]{1,63}:[a-zA-Z0-9][a-zA-Z0-9._-]{1,63}$/;

export const PILOT_AGENT_DEFINITIONS = Object.freeze([
  {
    id: "agent:chief-of-staff:primary",
    name: "Primary Chief of Staff Agent",
    roleId: "chief-of-staff",
    status: "active"
  },
  {
    id: "agent:operations:primary",
    name: "Primary Operations Agent",
    roleId: "operations",
    status: "active"
  },
  {
    id: "agent:marketing:primary",
    name: "Primary Marketing Agent",
    roleId: "marketing",
    status: "active"
  }
]);

function normalizeDefinition(definition, roleRegistry) {
  if (!definition || typeof definition !== "object" || Array.isArray(definition)) {
    throw new ValidationError("Agent definition must be an object.");
  }
  const roleId = requiredString(definition.roleId, "agent role id", {
    max: 64,
    pattern: /^[a-z][a-z0-9-]{1,63}$/
  });
  roleRegistry.get(roleId);
  return immutableJson({
    id: requiredString(definition.id, "agent id", {
      max: 140,
      pattern: AGENT_ID_PATTERN
    }),
    name: requiredString(definition.name, "agent name", { max: 160 }),
    roleId,
    status: enumValue(definition.status || "active", "agent status", [
      "active",
      "suspended",
      "retired"
    ])
  });
}

export function agentActor(id) {
  return immutableJson({
    type: "agent",
    id: requiredString(id, "agent actor id", {
      max: 140,
      pattern: AGENT_ID_PATTERN
    })
  });
}

export class AgentRegistry {
  constructor({ roleRegistry, definitions = PILOT_AGENT_DEFINITIONS }) {
    this.roleRegistry = roleRegistry;
    this.agents = new Map();
    for (const definition of definitions) {
      const agent = normalizeDefinition(definition, roleRegistry);
      if (this.agents.has(agent.id)) {
        throw new ConflictError(`Duplicate agent instance: ${agent.id}.`);
      }
      this.agents.set(agent.id, agent);
    }
  }

  get(agentId) {
    const agent = this.agents.get(agentId);
    if (!agent) throw new NotFoundError(`Unknown agent instance: ${agentId}.`);
    return jsonClone(agent);
  }

  list() {
    return [...this.agents.values()].map(jsonClone);
  }

  resolveActor(actor) {
    if (!actor || actor.type !== "agent") {
      throw new AuthorizationError("An agent actor identity is required.");
    }
    const agent = this.get(actor.id);
    if (agent.status !== "active") {
      throw new AuthorizationError(
        `Agent instance ${agent.id} is ${agent.status}.`
      );
    }
    if (actor.roleId && actor.roleId !== agent.roleId) {
      throw new AuthorizationError(
        `Agent ${agent.id} cannot claim role ${actor.roleId}.`
      );
    }
    return immutableJson({
      type: "agent",
      id: agent.id,
      roleId: agent.roleId
    });
  }
}

export const agentIdPattern = AGENT_ID_PATTERN;
