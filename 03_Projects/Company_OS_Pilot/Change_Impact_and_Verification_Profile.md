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

- FDOS commit: `09a1703defc4bcaf5590cc3aa4c9ed8339cd3994`
- implementation remains an uncommitted FDOS working-tree candidate;
- external references are bound separately in
  `Reference_Adoption_Assessment.md`.

Changed boundaries:

- read-only Git reference adapter;
- reference-source allowlists;
- content-minimized document evidence;
- evidence-bound Memory Candidates;
- exclusive runtime-directory lease and runtime close lifecycle;
- pilot documentation, risks, decisions, knowledge candidates and evidence.

Risk class: R3.

Rationale:

- source trust affects organizational knowledge;
- process ownership affects durable audit consistency;
- memory provenance and persistence are governance/security boundaries.

Selected verification:

- V0: exact FDOS status/diff, `git diff --check`, navigation and source-manifest
  verification;
- V1: focused reference-source, evidence and runtime-lease tests;
- V2: adversarial path, symlink, dirty-worktree, tamper, stale-lease,
  concurrent-owner and closed-runtime tests;
- V3: complete runtime test suite, coverage, deterministic demo, syntax checks
  and final scope review;
- V4: not available until a reviewed commit and CI run exist;
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
- new behavior is bound separately in
  `EV-FDOS-REFERENCE-INTAKE-002`.

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
