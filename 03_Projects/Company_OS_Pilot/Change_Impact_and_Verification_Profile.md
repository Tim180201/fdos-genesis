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
  `359af997a3a66a52d764b4b8d261835abd200080`
- FDOS tree:
  `7885821e241b8e24c58165a8a01fb21cf7aac2c4`
- the Connector Contract and durable-Outbox slice is evaluated as the change
  from that transactional-persistence baseline;
- external references are bound separately in
  `Reference_Adoption_Assessment.md`.

Changed boundaries:

- closed Connector Contract and active Connector Instance registries;
- A0/A1 no-network/no-effect admission rules and typed parameter schemas;
- immutable task-bound Delivery Intent and scoped idempotency;
- authenticated Connector principal command separation;
- durable Outbox preparation, claim, fencing, lease and attempt state;
- digest-only simulated, typed failed and uncertain outcomes;
- Human Governance retry, cancellation and uncertainty resolution;
- stale-contract, concurrent-claim and lower-level-runtime denial;
- no-network connector dry-run workflow and CLI demo;
- project ADR, security, risk, knowledge and evidence.

Risk class: R3.

Rationale:

- connector contracts and parameters define future external authority;
- claim fencing and uncertainty determine whether later effects could be
  duplicated;
- Connector principal isolation changes authorization;
- durable idempotency, leases and outcomes change recovery and audit
  contracts.

Selected verification and result:

- V0: exact FDOS status/diff, `git diff --check`, navigation, unsupported-claim
  review and source-manifest verification passed;
- V1: connector, delivery-intent, gateway and demo syntax checks plus 14
  focused Outbox tests passed;
- V2: contract admission, task/role binding, parameter closure, idempotency,
  concurrent claims, connector isolation, lease expiry, retry budget,
  uncertainty resolution, restart, contract drift and tamper paths passed;
- V3: complete 106-test runtime regression, coverage, authenticated
  three-role demo, no-network Outbox demo and final scope review passed;
- V4: not claimed; no independent exact-commit CI evidence is attached;
- V5: not applicable and not authorized; no physical or external operation.

Checks intentionally not run:

- no tests/builds in TapTime or Company AI, because both are read-only
  references and their repository instructions prohibit or do not authorize
  write-producing execution;
- no external API/model/connector test, because the contract enforces
  `networkAccess: false` and `externalEffects: false`;
- no production, deployment, legal or physical gate.

Evidence carried forward:

- `EV-FDOS-RUNTIME-PILOT-001` remains the evidence record for the original
  49-test three-role slice;
- `EV-FDOS-REFERENCE-INTAKE-002` remains the evidence record for reference
  intake and single-writer persistence;
- `EV-FDOS-AUTHENTICATED-INVOCATION-003` remains the identity-boundary record;
- `EV-FDOS-TRANSACTIONAL-PERSISTENCE-004` remains the local transaction record;
- this slice is bound separately in `EV-FDOS-CONNECTOR-OUTBOX-005`.

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
