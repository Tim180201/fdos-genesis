# Governed Agent Personality Model

Status: Experimental Design

Validation Level: Level 1

Production Status: Not Production Ready

Related Decision:
`../../../00_Specification/ADR/ADR-0047_Governed_Agent_Personality_Profile_Experiment.md`

## Purpose

Give each concrete Agent Instance a recognizable way of communicating and
working without turning personality into authority or an unbounded prompt.

FDOS separates three layers:

```text
Role Definition
  -> stable responsibility, capabilities and mandatory communication rules

Agent Instance
  -> attributable, revocable runtime identity assigned to one role

Personality Profile
  -> versioned non-authoritative expression of style within that role
```

## Constitutional Precedence

The effective order is fixed:

1. FDOS AI Constitution;
2. applicable Agent Constitution;
3. Role Definition;
4. task policy and authorized human direction;
5. Personality Profile.

A profile cannot override a higher layer. Conflicts are resolved by ignoring
the personality preference, not by weakening the governing instruction.

## Closed Profile Schema

The Level 1 profile contains only:

- exact profile ID, semantic version, role binding and digest;
- three to six approved descriptive traits;
- bounded enums for warmth, directness, formality, verbosity and humor;
- bounded enums for pace, challenge style and decision style.

It cannot contain:

- capabilities or permissions;
- tool or connector access;
- memory scopes;
- approval rules;
- a system prompt;
- arbitrary executable instructions;
- model or provider settings.

Unexpected fields fail closed. Changing any accepted field changes the
profile digest.

## Pilot Personalities

| Agent role | Profile | Character |
|---|---|---|
| Chief of Staff | Executive Steward | calm, curious, decisive and diplomatic; concise recommendation-first communication |
| Operations | Reliability Guardian | methodical, pragmatic, protective and skeptical; deliberate evidence-led challenge |
| Marketing | Audience Builder | creative, empathetic, energetic and precise; warm audience-aware exploration |

The names describe profiles, not human identities. Human Governance may later
approve distinct display names or additional instance-specific profiles.

## Runtime Binding

Every pilot Agent Instance binds:

- exact profile ID;
- exact profile version;
- exact profile digest;
- one compatible Role Definition.

The authenticated `agent.profile` command returns only the calling active
Agent Instance's resolved Operating Profile. There is no caller-selected agent
ID and no cross-agent profile lookup through this command.

The Operating Profile combines:

- minimal Agent Instance identity;
- role name, department and mandatory communication style;
- the exact Personality Profile;
- fixed precedence and safety invariants;
- one digest over the complete resolved profile.

The lower-level runtime path remains denied for this guarded read.

## Fixed Safety Invariants

The runtime supplies these invariants independently of profile content:

- personality never grants authority;
- personality never changes role or capabilities;
- personality never weakens evidence or truthfulness;
- personality never bypasses data scope or approval;
- personality never becomes organizational memory.

These statements are not editable Personality Profile fields.

## Current Limit

No model provider is connected. Tests prove profile validation, binding,
authentication and content addressing; they do not prove that a model
expressed the intended personality consistently or safely.

Before model execution, a separate gate must bind the resolved Operating
Profile digest into every model request and output evidence, test instruction
precedence and prompt injection, measure style consistency and confirm that
personality does not alter factual or authorization behavior.
