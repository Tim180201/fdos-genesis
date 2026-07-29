import {
  digestObject,
  immutableJson,
  jsonClone
} from "../kernel/canonical-json.js";
import {
  ConflictError,
  NotFoundError,
  PolicyError,
  ValidationError
} from "../kernel/errors.js";
import {
  assertPlainObject,
  enumValue,
  requiredString,
  uniqueStrings
} from "../kernel/validation.js";

const PERSONALITY_SCHEMA_VERSION = "1.0";
const PERSONALITY_ID_PATTERN =
  /^personality:[a-z][a-z0-9-]{1,63}:[a-z][a-z0-9-]{1,63}$/;
const ROLE_ID_PATTERN = /^[a-z][a-z0-9-]{1,63}$/;
const VERSION_PATTERN = /^[0-9]+\.[0-9]+\.[0-9]+(?:-[a-z0-9.-]+)?$/;
const PROFILE_KEYS = Object.freeze([
  "challengeStyle",
  "decisionStyle",
  "directness",
  "formality",
  "humor",
  "id",
  "name",
  "pace",
  "roleId",
  "traits",
  "verbosity",
  "version",
  "warmth"
]);
const ALLOWED_TRAITS = Object.freeze([
  "calm",
  "creative",
  "curious",
  "decisive",
  "diplomatic",
  "empathetic",
  "energetic",
  "methodical",
  "pragmatic",
  "precise",
  "protective",
  "skeptical"
]);

export const PERSONALITY_PRECEDENCE = Object.freeze([
  "fdos-ai-constitution",
  "agent-constitution",
  "role-definition",
  "task-policy-and-human-direction",
  "personality-profile"
]);

export const PERSONALITY_INVARIANTS = Object.freeze([
  "personality_never_grants_authority",
  "personality_never_changes_role_or_capabilities",
  "personality_never_weakens_evidence_or_truthfulness",
  "personality_never_bypasses_data_scope_or_approval",
  "personality_never_becomes_organizational_memory"
]);

export const PILOT_PERSONALITY_DEFINITIONS = Object.freeze([
  {
    id: "personality:chief-of-staff:executive-steward",
    version: "1.0.0-experimental",
    name: "Executive Steward",
    roleId: "chief-of-staff",
    traits: ["calm", "curious", "decisive", "diplomatic"],
    warmth: "warm",
    directness: "direct",
    formality: "professional",
    verbosity: "concise",
    humor: "light",
    pace: "balanced",
    challengeStyle: "evidence-led",
    decisionStyle: "recommendation-first"
  },
  {
    id: "personality:operations:reliability-guardian",
    version: "1.0.0-experimental",
    name: "Reliability Guardian",
    roleId: "operations",
    traits: ["methodical", "pragmatic", "protective", "skeptical"],
    warmth: "balanced",
    directness: "direct",
    formality: "professional",
    verbosity: "balanced",
    humor: "light",
    pace: "deliberate",
    challengeStyle: "evidence-led",
    decisionStyle: "recommendation-first"
  },
  {
    id: "personality:marketing:audience-builder",
    version: "1.0.0-experimental",
    name: "Audience Builder",
    roleId: "marketing",
    traits: ["creative", "empathetic", "energetic", "precise"],
    warmth: "warm",
    directness: "measured",
    formality: "conversational",
    verbosity: "balanced",
    humor: "light",
    pace: "energetic",
    challengeStyle: "question-led",
    decisionStyle: "options-first"
  }
]);

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

function normalizeProfile(definition) {
  exactKeys(definition, PROFILE_KEYS, "personality profile");
  const roleId = requiredString(
    definition.roleId,
    "personality role id",
    {
      max: 64,
      pattern: ROLE_ID_PATTERN
    }
  );
  const traits = uniqueStrings(
    definition.traits,
    "personality traits",
    {
      maximum: 6,
      pattern: /^[a-z][a-z-]{1,63}$/
    }
  ).sort();
  if (
    traits.length < 3 ||
    traits.some((trait) => !ALLOWED_TRAITS.includes(trait))
  ) {
    throw new PolicyError(
      "Personality traits must use three to six approved descriptors."
    );
  }
  const unsigned = {
    schemaVersion: PERSONALITY_SCHEMA_VERSION,
    id: requiredString(definition.id, "personality profile id", {
      max: 160,
      pattern: PERSONALITY_ID_PATTERN
    }),
    version: requiredString(
      definition.version,
      "personality profile version",
      {
        max: 80,
        pattern: VERSION_PATTERN
      }
    ),
    name: requiredString(definition.name, "personality profile name", {
      max: 120,
      pattern: /^[A-Za-z][A-Za-z0-9 -]{1,119}$/
    }),
    roleId,
    traits,
    warmth: enumValue(definition.warmth, "personality warmth", [
      "reserved",
      "balanced",
      "warm"
    ]),
    directness: enumValue(
      definition.directness,
      "personality directness",
      ["measured", "direct"]
    ),
    formality: enumValue(
      definition.formality,
      "personality formality",
      ["professional", "conversational"]
    ),
    verbosity: enumValue(
      definition.verbosity,
      "personality verbosity",
      ["concise", "balanced", "detailed"]
    ),
    humor: enumValue(definition.humor, "personality humor", [
      "none",
      "light",
      "playful"
    ]),
    pace: enumValue(definition.pace, "personality pace", [
      "deliberate",
      "balanced",
      "energetic"
    ]),
    challengeStyle: enumValue(
      definition.challengeStyle,
      "personality challenge style",
      ["question-led", "evidence-led", "direct"]
    ),
    decisionStyle: enumValue(
      definition.decisionStyle,
      "personality decision style",
      ["options-first", "recommendation-first", "consensus-seeking"]
    )
  };
  return immutableJson({
    ...unsigned,
    digest: digestObject(unsigned)
  });
}

function profileKey(id, version) {
  return `${id}@${version}`;
}

export class PersonalityRegistry {
  constructor(definitions = PILOT_PERSONALITY_DEFINITIONS) {
    if (!Array.isArray(definitions)) {
      throw new ValidationError(
        "Personality profile definitions must be a list."
      );
    }
    this.profiles = new Map();
    for (const definition of definitions) {
      const profile = normalizeProfile(definition);
      const key = profileKey(profile.id, profile.version);
      if (this.profiles.has(key)) {
        throw new ConflictError(`Duplicate personality profile: ${key}.`);
      }
      this.profiles.set(key, profile);
    }
  }

  get(id, version) {
    const normalizedId = requiredString(id, "personality profile id", {
      max: 160,
      pattern: PERSONALITY_ID_PATTERN
    });
    const normalizedVersion = requiredString(
      version,
      "personality profile version",
      {
        max: 80,
        pattern: VERSION_PATTERN
      }
    );
    const profile = this.profiles.get(
      profileKey(normalizedId, normalizedVersion)
    );
    if (!profile) {
      throw new NotFoundError(
        `Unknown personality profile: ${normalizedId}@${normalizedVersion}.`
      );
    }
    return jsonClone(profile);
  }

  resolveForRole(id, version, roleId) {
    const profile = this.get(id, version);
    if (profile.roleId !== roleId) {
      throw new PolicyError(
        `Personality profile ${profile.id} is not assigned to role ${roleId}.`
      );
    }
    return profile;
  }

  list() {
    return [...this.profiles.values()].map(jsonClone);
  }
}

export const personalityIdPattern = PERSONALITY_ID_PATTERN;
