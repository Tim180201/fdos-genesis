# Company OS Pilot — Change Impact and Verification Profile

Status: Active Project Control / Not FDOS Core  
Date: 2026-07-29  
Source Pattern: TapTime AVS-001, adapted for this experiment

## Purpose

Apply risk-adaptive verification to the Company OS Pilot while preserving the
released `FDOS_Validation_Levels.md` unchanged.

FDOS Validation Levels describe maturity over time. The project-local R/V
profile below describes how one implementation change is verified.

## Risk Classes

| Class | Meaning |
|---|---|
| R0 | non-executable documentation with no runtime or policy effect |
| R1 | isolated low-risk implementation |
| R2 | public contract, adapter or cross-component boundary |
| R3 | identity, authorization, persistence, evidence, secrets, connector or release-critical behavior |

Uncertainty selects the higher class.

## Verification Levels

| Level | Project meaning |
|---|---|
| V0 | exact scope, diff, whitespace, references and unsupported-claim check |
| V1 | focused regression and static checks |
| V2 | complete affected-boundary tests, including adversarial paths |
| V3 | complete local candidate regression and final scope review |
| V4 | exact committed-head CI on an independent runner |
| V5 | separately authorized human, physical or operational validation |

V4 and V5 cannot be claimed for an uncommitted local experiment.

## Current Change-Impact Record

Baseline commit/tree:

- FDOS commit:
  `0533afb37ea12523e9e5c6ce0556f967ab5c0d6d`
- FDOS tree:
  `20e68c484d4516cbbed1dd03c05cce1ab7ff9059`
- the governed Agent Personality Profile slice is evaluated as the change
  from that Connector-Outbox baseline;
- external references are bound separately in
  `Reference_Adoption_Assessment.md`.

Changed boundaries:

- closed, versioned and content-addressed Personality Profile registry;
- three distinct pilot profiles with exact compatible-role binding;
- Agent Instance profile ID, version and digest binding;
- fixed constitutional precedence and non-authoritative safety invariants;
- authenticated self-only `agent.profile` command;
- rejection of schema smuggling, invalid traits, cross-role binding, human
  access and lower-level-runtime bypass;
- architecture, identity, security, risk and evidence documentation.

Risk class: R2.

Rationale:

- the Operating Profile is a future model-context contract;
- bad precedence could let personality alter higher-authority instructions;
- the self-read operation changes the authenticated public command surface;
- no persistence, capability or external-effect semantics change.

Selected verification and result:

- V0: exact FDOS status/diff, `git diff --check`, navigation, unsupported-claim
  review and source-manifest verification passed;
- V1: personality, agent-registry, gateway and runtime syntax checks plus four
  focused personality tests passed;
- V2: exact schema, digest drift, trait allowlist, role compatibility,
  self-only access, payload closure and lower-level-runtime denial passed;
- V3: complete 110-test runtime regression, coverage and final scope review
  passed;
- V4: not claimed; no independent exact-commit CI evidence is attached;
- V5: not applicable and not authorized; no physical or external operation.

Checks intentionally not run:

- no tests/builds in TapTime or Company AI, because both are read-only
  references and their repository instructions prohibit or do not authorize
  write-producing execution;
- no external API/model/connector test, because the contract enforces
  `networkAccess: false` and `externalEffects: false`;
- no model personality/quality evaluation, because no model adapter exists;
- no production, deployment, legal or physical gate.

Evidence carried forward:

- `EV-FDOS-RUNTIME-PILOT-001` remains the evidence record for the original
  49-test three-role slice;
- `EV-FDOS-REFERENCE-INTAKE-002` remains the evidence record for reference
  intake and single-writer persistence;
- `EV-FDOS-AUTHENTICATED-INVOCATION-003` remains the identity-boundary record;
- `EV-FDOS-TRANSACTIONAL-PERSISTENCE-004` remains the local transaction record;
- `EV-FDOS-CONNECTOR-OUTBOX-005` remains the external-work-boundary record;
- this slice is bound separately in `EV-FDOS-AGENT-PERSONALITY-006`.

## Required Completion Report

Every future executable pilot change should report:

```text
Baseline commit/tree:
Changed boundaries:
Risk class:
V0:
V1:
V2:
V3:
V4:
V5:
Carried evidence:
Checks not run and reason:
Failures/retries:
Remaining risks:
Next required gate:
```

## Governance

This profile is a project application of a reference pattern. It does not
promote TapTime AVS-001 into FDOS Core, redefine FDOS validation maturity or
authorize CI, deployment or production work.
