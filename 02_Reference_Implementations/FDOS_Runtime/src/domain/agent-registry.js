import {
  digestObject,
  immutableJson,
  jsonClone
} from "../kernel/canonical-json.js";
import {
  AuthorizationError,
  ConflictError,
  NotFoundError,
  ValidationError
} from "../kernel/errors.js";
import {
  assertPlainObject,
  enumValue,
  requiredString
} from "../kernel/validation.js";
import {
  PERSONALITY_INVARIANTS,
  PERSONALITY_PRECEDENCE,
  PersonalityRegistry
} from "./personality-profile.js";

const AGENT_ID_PATTERN =
  /^agent:[a-z][a-z0-9-]{1,63}:[a-zA-Z0-9][a-zA-Z0-9._-]{1,63}$/;
const AGENT_DEFINITION_KEYS = Object.freeze([
  "id",
  "name",
  "personalityProfileId",
  "personalityProfileVersion",
  "roleId",
  "status"
]);
const OPERATING_PROFILE_SCHEMA_VERSION = "1.0";

export const PILOT_AGENT_DEFINITIONS = Object.freeze([
  {
    id: "agent:chief-of-staff:primary",
    name: "Primary Chief of Staff Agent",
    roleId: "chief-of-staff",
    personalityProfileId:
      "personality:chief-of-staff:executive-steward",
    personalityProfileVersion: "1.0.0-experimental",
    status: "active"
  },
  {
    id: "agent:operations:primary",
    name: "Primary Operations Agent",
    roleId: "operations",
    personalityProfileId:
      "personality:operations:reliability-guardian",
    personalityProfileVersion: "1.0.0-experimental",
    status: "active"
  },
  {
    id: "agent:marketing:primary",
    name: "Primary Marketing Agent",
    roleId: "marketing",
    personalityProfileId:
      "personality:marketing:audience-builder",
    personalityProfileVersion: "1.0.0-experimental",
    status: "active"
  }
]);

function exactDefinitionKeys(definition) {
  assertPlainObject(definition, "agent definition");
  const actual = Object.keys(definition).sort();
  const expected = [...AGENT_DEFINITION_KEYS].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    throw new ValidationError("Agent definition has an unexpected shape.");
  }
}

function normalizeDefinition(
  definition,
  roleRegistry,
  personalityRegistry
) {
  exactDefinitionKeys(definition);
  const roleId = requiredString(definition.roleId, "agent role id", {
    max: 64,
    pattern: /^[a-z][a-z0-9-]{1,63}$/
  });
  roleRegistry.get(roleId);
  const personality = personalityRegistry.resolveForRole(
    definition.personalityProfileId,
    definition.personalityProfileVersion,
    roleId
  );
  return immutableJson({
    id: requiredString(definition.id, "agent id", {
      max: 140,
      pattern: AGENT_ID_PATTERN
    }),
    name: requiredString(definition.name, "agent name", { max: 160 }),
    roleId,
    personalityProfileId: personality.id,
    personalityProfileVersion: personality.version,
    personalityProfileDigest: personality.digest,
    status: enumValue(definition.status, "agent status", [
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
  constructor({
    roleRegistry,
    personalityRegistry = new PersonalityRegistry(),
    definitions = PILOT_AGENT_DEFINITIONS
  }) {
    if (
      !roleRegistry ||
      typeof roleRegistry.get !== "function" ||
      !personalityRegistry ||
      typeof personalityRegistry.resolveForRole !== "function"
    ) {
      throw new ValidationError(
        "Agent registry requires role and personality registries."
      );
    }
    if (!Array.isArray(definitions)) {
      throw new ValidationError("Agent definitions must be a list.");
    }
    this.roleRegistry = roleRegistry;
    this.personalityRegistry = personalityRegistry;
    this.agents = new Map();
    for (const definition of definitions) {
      const agent = normalizeDefinition(
        definition,
        roleRegistry,
        personalityRegistry
      );
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

  getOperatingProfile(agentId) {
    const agent = this.get(agentId);
    const role = this.roleRegistry.get(agent.roleId);
    const personality = this.personalityRegistry.resolveForRole(
      agent.personalityProfileId,
      agent.personalityProfileVersion,
      agent.roleId
    );
    if (personality.digest !== agent.personalityProfileDigest) {
      throw new AuthorizationError(
        `Agent ${agent.id} has a stale personality profile binding.`
      );
    }
    const unsigned = {
      schemaVersion: OPERATING_PROFILE_SCHEMA_VERSION,
      kind: "fdos-agent-operating-profile",
      agent: {
        id: agent.id,
        name: agent.name,
        roleId: agent.roleId
      },
      role: {
        id: role.id,
        name: role.name,
        department: role.department,
        communicationStyle: role.communicationStyle
      },
      personality,
      precedence: [...PERSONALITY_PRECEDENCE],
      invariants: [...PERSONALITY_INVARIANTS]
    };
    return immutableJson({
      ...unsigned,
      digest: digestObject(unsigned)
    });
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
