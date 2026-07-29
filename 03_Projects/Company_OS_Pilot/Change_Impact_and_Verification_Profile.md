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
  `7f41f37bf28a020e7b50ddf56a071d29ce14e0ec`
- FDOS tree:
  `9be0e624ebeff9662bf2f0bbf08e2910e291a1f3`
- the process-separated dry-run worker slice is evaluated as the change from
  that governed Personality Profile baseline;
- external references are bound separately in
  `Reference_Adoption_Assessment.md`.

Changed boundaries:

- exact, closed and content-addressed worker request/response protocol;
- active delivery, fencing claim, Connector Instance, Delivery Intent and
  validity-window binding;
- fixed process entry point, no shell, minimal non-inherited environment and
  explicit standard-I/O boundary;
- parent-side timeout and request/output/error byte limits;
- digest-only result binding request, completion time and worker boundary;
- clean-exit acknowledgement and rejection of post-response crash;
- crash-before-response, post-response-crash and hang fault injection;
- preservation of the durable claim followed by human-only uncertainty
  reconciliation;
- explicit `networkIsolationEnforced: false` non-claim;
- architecture, identity, security, risk and evidence documentation.

Risk class: R3.

Rationale:

- the worker crosses a process and connector boundary;
- acknowledgement handling affects whether external work could later be
  considered complete or uncertain;
- the child receives exact internal Delivery Intent parameters;
- false network-isolation claims would create a material security error;
- the experiment remains dry-run and changes no external-effect authority.

Selected verification and result:

- V0: exact FDOS status/diff, `git diff --check`, navigation, unsupported-claim
  review and source-manifest verification passed;
- V1: worker protocol, child entry point, process client, pilot and CLI syntax
  checks plus six focused new worker cases passed;
- V2: exact protocol shape/digests, claim/time binding, raw-field rejection,
  asserted-sandbox rejection, clean execution, crash-before-response,
  post-response crash, timeout and human uncertainty reconciliation passed;
- V3: complete 116-test runtime regression, coverage, both local demos and
  final scope review passed;
- V4: not claimed; no independent exact-commit CI evidence is attached;
- V5: not claimed and not authorized; no OS sandbox, network, service,
  physical or external operation was exercised.

Checks intentionally not run:

- no tests/builds in TapTime or Company AI, because both are read-only
  references and their repository instructions prohibit or do not authorize
  write-producing execution;
- no external API/model/connector test, because the contract enforces
  `networkAccess: false` and `externalEffects: false`;
- no OS/container sandbox or egress-control test, because none is implemented;
- no independently authenticated or signed worker-artifact test;
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
- `EV-FDOS-AGENT-PERSONALITY-006` remains the non-authoritative personality
  record;
- this slice is bound separately in `EV-FDOS-PROCESS-WORKER-007`.

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
