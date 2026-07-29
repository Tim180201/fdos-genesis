# ADR-0047 — Governed Agent Personality Profile Experiment

Status: Implemented for Experiment; Human Review Pending; Not Accepted into FDOS Core

Decision Date: 2026-07-29

Decision Owner: Human Governance

Validation Level: Level 1 — Experimental

Related Decisions:

- `ADR-0043_FDOS_Runtime_Level_1_Experiment.md`
- `ADR-0044_Authenticated_Invocation_Boundary_Experiment.md`

## Decision

The FDOS Runtime experiment shall give each pilot Agent Instance an exact,
versioned and content-addressed Personality Profile.

Personality is a non-authoritative presentation and working-style overlay. It
shall never define or modify role, capabilities, tools, data access, approval,
risk classification, evidence standards or organizational memory.

## Context

Role Definitions already carry a mandatory communication style, while Agent
Instances provide attributable runtime identities. The company-operating-
system vision also requires agents to feel distinct and recognizable.

Putting arbitrary persona prompts inside roles or agent records would mix
organizational authority with presentation style, create an injection surface
and make behavior drift difficult to audit.

The experiment therefore adds a separate object with narrower semantics.

## Profile Rule

A Personality Profile binds:

- exact ID, version, compatible role and digest;
- approved descriptive traits;
- closed communication-style enums;
- closed collaboration and decision-style enums.

Arbitrary instructions and authority-bearing fields are not part of the
schema. Unexpected fields fail closed.

## Precedence Rule

The precedence order is fixed:

```text
FDOS AI Constitution
  > Agent Constitution
  > Role Definition
  > task policy and authorized human direction
  > Personality Profile
```

Personality loses every conflict with a higher layer.

## Instance Rule

An Agent Instance binds one exact Personality Profile ID, version and digest.
The profile must be compatible with the instance's registered role.

Multiple Agent Instances holding the same role may later bind different
compatible profiles without receiving different authority.

## Access Rule

The authenticated `agent.profile` operation:

- derives the active Agent Instance from the signed principal;
- accepts no caller-selected target Agent Instance;
- returns the resolved profile only to that instance;
- requires the guarded authenticated transaction path.

Humans, connectors, inactive agents, payload smuggling and direct lower-level
runtime calls are denied by this self-read command. Governance inspection of
configuration remains an internal administrative concern, not agent
authority.

## Expected Evidence

The experiment should demonstrate or falsify:

- three distinct pilot personalities;
- exact profile schema and immutable digest;
- role-compatible Agent Instance binding;
- no capabilities, permissions, tools or arbitrary prompts in a profile;
- fixed constitutional precedence and safety invariants;
- authenticated self-only profile resolution;
- changed profile content producing a changed digest;
- complete regression of all existing runtime controls.

## Consequences

Positive:

- agents can become recognizable without changing organizational authority;
- future model prompts can bind an exact reviewed style object;
- profile drift becomes detectable;
- personality remains replaceable independently of role and identity.

Negative:

- current tests validate configuration, not model behavior;
- profile configuration remains trusted local bootstrap state;
- no localization, accessibility or user-preference evaluation exists;
- individual profile digests are not yet bound into task-output evidence;
- introducing personalities may encourage anthropomorphism or misplaced trust.

## Promotion Rule

This decision authorizes no model call and no claim of demonstrated agent
behavior.

Before personality is used by a model adapter, a separate decision must cover:

- deterministic prompt assembly and precedence;
- exact Operating Profile digest binding to request and output evidence;
- prompt-injection and role-confusion tests;
- style consistency and factual-quality evaluation;
- accessibility, localization and user override policy;
- transparent disclosure that the Agent Instance is artificial;
- Human Governance approval of every production profile.
