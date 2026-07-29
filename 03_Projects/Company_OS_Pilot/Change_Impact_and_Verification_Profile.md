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
  `60a66b171bf4134607b2014c79f18d0c2e62dd86`
- FDOS tree:
  `aae3f92260537c26a11344c3942034e355412b87`
- the authenticated-invocation slice is evaluated as the change from that
  published baseline;
- external references are bound separately in
  `Reference_Adoption_Assessment.md`.

Changed boundaries:

- signed Invocation Context creation and verification;
- public-key trust-store configuration and bounded key rotation;
- exact principal, organization, audience, operation, command and time binding;
- persistent one-time Invocation consumption;
- authenticated command dispatch and lower-level runtime isolation rule;
- Agent Registry role derivation;
- Invocation/correlation attribution in audit and exported evidence;
- authenticated pilot, tests, governance, risks, knowledge and evidence.

Risk class: R3.

Rationale:

- identity establishes the premise for every later authorization decision;
- replay handling and event rehydration affect durable execution semantics;
- gateway bypass and trust-root bootstrap are security boundaries;
- accepted identity metadata affects audit and evidence contracts.

Selected verification and result:

- V0: exact FDOS status/diff, `git diff --check`, navigation, unsupported-claim
  review and source-manifest verification passed;
- V1: 16 focused authenticated-invocation tests and syntax checks passed;
- V2: signature/claim/command tamper, time window, wrong organization/audience,
  unknown key, role injection, connector identity, request smuggling, failed
  command, sequential/concurrent/restart replay, handoff, retry/cancellation
  and A2 approval paths passed;
- V3: complete 79-test runtime regression, coverage, authenticated deterministic
  demo and final scope review passed;
- V4: not claimed; no independent exact-commit CI evidence is attached;
- V5: not applicable and not authorized; no physical or external operation.

Checks intentionally not run:

- no tests/builds in TapTime or Company AI, because both are read-only
  references and their repository instructions prohibit or do not authorize
  write-producing execution;
- no external API/model/connector test, because external integrations remain
  disabled;
- no production, deployment, legal or physical gate.

Evidence carried forward:

- `EV-FDOS-RUNTIME-PILOT-001` remains the evidence record for the original
  49-test three-role slice;
- `EV-FDOS-REFERENCE-INTAKE-002` remains the evidence record for reference
  intake and single-writer persistence;
- authenticated-invocation behavior is bound separately in
  `EV-FDOS-AUTHENTICATED-INVOCATION-003`.

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
