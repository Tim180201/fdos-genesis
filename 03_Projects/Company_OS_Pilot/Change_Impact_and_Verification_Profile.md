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
  `5eb93c831f070a201a1e1763a944b2ea728df519`
- FDOS tree:
  `c7921ca0ef36f2c36cdd7c3d4e0f6aeb597ffd79`
- the transactional-persistence slice is evaluated as the change from that
  authenticated-invocation baseline;
- external references are bound separately in
  `Reference_Adoption_Assessment.md`.

Changed boundaries:

- synchronous local SQLite event and transaction schema;
- authenticated Invocation-plus-command transaction orchestration;
- recognized business-failure evidence and fatal rollback semantics;
- transaction identity in canonical events and evidence references;
- event-chain and transaction-metadata rehydration checks;
- crash recovery, stale-context and out-of-context append controls;
- persistence auto-detection and implicit-migration denial;
- Node.js runtime requirement and dependency-maturity boundary;
- pilot, tests, governance, risks, knowledge and evidence.

Risk class: R3.

Rationale:

- persistence determines whether replay and business state can diverge;
- rollback and recognized-failure classification affect durable execution
  semantics;
- schema, migration and runtime dependency choices are security and recovery
  boundaries;
- transaction identity changes audit and evidence contracts.

Selected verification and result:

- V0: exact FDOS status/diff, `git diff --check`, navigation, unsupported-claim
  review and source-manifest verification passed;
- V1: 29 focused SQLite/authenticated-command tests and syntax checks passed;
- V2: commit, empty/nested-context denial, savepoint rollback, process exit,
  fatal rollback, recognized business failure, approval expiry, restart,
  replay, event tamper, transaction-metadata tamper and format-selection paths
  passed;
- V3: complete 92-test runtime regression, coverage, authenticated deterministic
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
- `EV-FDOS-AUTHENTICATED-INVOCATION-003` remains the identity-boundary record;
- transactional behavior is bound separately in
  `EV-FDOS-TRANSACTIONAL-PERSISTENCE-004`.

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
