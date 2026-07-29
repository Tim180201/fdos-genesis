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
  `73e6970019e123d13f34cda43c54106fedde8e31`
- FDOS tree:
  `7ff9394bba62350e61e5695e9f408b5e3bd30912`
- the durable Verified Worker Receipt slice is evaluated as the change from
  that authenticated workload-session baseline;
- external references remain bound separately in
  `Reference_Adoption_Assessment.md`.

Changed boundaries:

- runtime package version `0.12.0-experimental`;
- one closed, self-digested Verified Worker Receipt contract;
- minimized request, response, process, isolation, package, release, session
  and local parent-verification projections;
- independent reconstruction of the canonical protocol 1.4 worker-response
  digest from receipt fields;
- exact 30-second local parent/runtime clock-skew ceiling;
- new authenticated `outbox.record-worker-outcome` operation requiring a
  receipt;
- explicit separation from generic `outbox.record-outcome`, which rejects a
  receipt field;
- exact runtime binding to Delivery, fencing claim, attempt, Connector
  Instance, Delivery Intent, request window and result digest;
- event-replay verification of receipt schema, response digest, active claim
  and accepted Invocation operation;
- reconstructed delivery state retaining receipt and its Invocation ID;
- workflow evidence projection of the complete minimized receipt plus
  Connector Invocation command/envelope/receipt authentication digests;
- SQLite restart verification for receipt and evidence;
- adversarial raw-field, command-smuggling and wrong-attempt receipt paths;
- CLI output of receipt and authenticated command digests;
- architecture, security, process, Outbox, risk, decision and evidence
  documentation.

Unchanged boundaries:

- worker protocol remains version 1.4;
- canonical worker package remains version 2 and source artifact version 3;
- package, artifact, release attestation and trust-anchor digests are
  unchanged;
- the full authenticated workload envelope remains transient;
- connector network access and external effects remain disabled;
- uncertainty and retry authority remain Human Governance controls.

Risk class: R3.

Rationale:

- the receipt determines whether an accepted worker result can be represented
  as durable verified-worker evidence;
- incomplete binding could let one claim, result or generic Connector outcome
  masquerade as another verified execution;
- retaining raw parameters, public keys or signatures would violate the
  content-minimization boundary;
- receipt trust still terminates in the mutable parent and authenticated local
  Connector principal;
- the experiment remains no-network/no-effect and changes no external-action
  authority.

Selected verification and result:

- V0: exact FDOS status/diff, `git diff --check`, navigation,
  unsupported-claim review, private-material search, package-identity
  comparison and source-manifest verification selected;
- V1: receipt, Invocation, gateway, process integration, runtime, state, CLI
  and pilot syntax checks plus 29 focused Connector/worker cases passed;
- V2: response-digest reconstruction, closed schemas, extra raw-field
  rejection, wrong-attempt rejection, generic-command receipt rejection,
  active-claim preservation, exact authenticated operation binding and SQLite
  restart/evidence rehydration passed;
- V3: complete 140-test runtime regression, 91.30% line / 78.96% branch /
  92.72% function coverage, internal/outbox/sandbox demos and final scope
  review passed locally;
- V4: not claimed; no independent exact-commit CI evidence is attached;
- V5: not claimed and not authorized; no immutable deployment, external
  workload/audit authority, protected Connector custody, independent security
  review, real service, physical or external operation was exercised.

Receipt coverage:

```text
verified-worker-receipt.js
line coverage:     94.26%
branch coverage:   78.13%
function coverage: 100.00%
```

Checks intentionally not run:

- no tests/builds in TapTime or Company AI, because both remain read-only
  references outside the authorized mutation scope;
- no external API/model/connector test, because the contract enforces
  `networkAccess: false` and `externalEffects: false`;
- no container image or OCI runtime test; the installed local daemon remained
  unavailable and starting a host service would exceed the FDOS-repository-
  only mutation scope;
- no immutable object/image storage, external release, Connector-key or
  workload-identity service, HSM/KMS, expiry, revocation, transparency log,
  trusted timestamp or atomic deployment test;
- no hostile parent/bootstrap/verifier replacement, process-memory inspection,
  secure-erasure or remote-attestation test;
- no offline verification of the omitted full workload envelope;
- no supported container/VM sandbox, destination allowlist, filesystem-read or
  CPU/memory/process isolation test;
- no model personality/quality evaluation, because no model adapter exists;
- no production, deployment, legal or physical gate.

Failures and retries:

- the initial receipt binding required child completion to be no later than
  the runtime record clock; real child wall time can advance slightly beyond a
  controlled parent/runtime test clock;
- the rule was narrowed to keep exact request/claim windows while allowing a
  documented maximum 30-second parent/runtime skew;
- the first evidence projection call site passed no Invocation map during
  workflow finalization; both completion and explicit export now use the same
  authenticated projection;
- two test assertions initially treated synchronous command-shape rejection as
  asynchronous business failure; assertion modes were corrected without
  weakening runtime behavior;
- focused tests, complete static/regression checks, coverage and all three
  demos then passed;
- no package/release or session private key was generated, changed, printed or
  stored for this slice.

Evidence carried forward:

- `EV-FDOS-RUNTIME-PILOT-001` remains the original three-role record;
- `EV-FDOS-REFERENCE-INTAKE-002` remains the reference-intake record;
- `EV-FDOS-AUTHENTICATED-INVOCATION-003` remains the identity-boundary record;
- `EV-FDOS-TRANSACTIONAL-PERSISTENCE-004` remains the local transaction record;
- `EV-FDOS-CONNECTOR-OUTBOX-005` remains the external-work-boundary record;
- `EV-FDOS-AGENT-PERSONALITY-006` remains the personality record;
- `EV-FDOS-PROCESS-WORKER-007` remains the process/acknowledgement record;
- `EV-FDOS-DARWIN-SANDBOX-008` remains the platform-denial record;
- `EV-FDOS-WORKER-ARTIFACT-009` remains the signed-source record;
- `EV-FDOS-WORKER-PACKAGE-010` remains the deterministic package record;
- `EV-FDOS-WORKLOAD-SESSION-011` remains the authenticated-session record;
- this slice is bound separately in `EV-FDOS-WORKER-RECEIPT-012`.

Remaining risks:

- receipt verification is performed by the same mutable local parent that
  creates the receipt;
- the exact Connector command is authenticated, but Connector key custody is
  not externally protected;
- a compromised parent, Connector key, host or event-store owner remains
  inside the Level 1 trusted computing base;
- the omitted full envelope prevents offline workload-signature verification;
- no external workload/audit identity, revocation, transparency or trusted
  timestamp exists;
- process-only and deprecated Darwin isolation gaps remain unchanged.

Next required gate:

- supported immutable container or VM deployment;
- externally rooted workload identity and protected release/Connector custody;
- independently verifiable signed execution receipt or separately governed
  full-envelope retention;
- trusted time, replay/revocation and monitoring controls;
- portable outbound, read and resource isolation;
- independent security review and Human Governance decision.

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
