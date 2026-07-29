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
  `a566463fe083816f842c389128b77e93111bd520`
- FDOS tree:
  `35bb09ea86ce97594dde4389d7ca41b3af75ad22`
- the authenticated workload-session slice is evaluated as the change from
  that verified-worker-package baseline;
- external references are bound separately in
  `Reference_Adoption_Assessment.md`.

Changed boundaries:

- fixed package version 2, artifact version 3, entry point and 13-module
  identities;
- one closed workload-session, observation, signature-statement and response-
  envelope contract;
- canonical 32-byte base64url challenge and 64-byte Ed25519 signature rules;
- cryptographically random parent challenge generated for every launch;
- protocol version 1.4 request binding of challenge plus complete package,
  artifact, attestation, trust, issuer and key identity;
- bootstrap challenge intake and deletion before packaged code evaluates;
- fresh Ed25519 key-pair generation only after bootstrap release verification;
- public-key fingerprint-derived session key ID;
- private session key retained only inside a one-use bootstrap closure;
- complete public session binding of challenge and verified package;
- canonical signature statement binding session, request and response digests;
- canonical authenticated response envelope with exact envelope digest;
- response/result-digest binding of minimized key, session, challenge and
  package-binding digests;
- parent verification of envelope canonicalization, session, package and
  signature before protocol-result acceptance;
- field-by-field parent cross-comparison of authenticated session evidence and
  durable response observation;
- stable result exposure of verification digests/booleans without public key,
  signature, raw challenge or private key;
- deliberate challenge mismatch, invalid signature and valid-signature
  session-observation mismatch faults;
- preservation of the durable claim followed by human-only uncertainty after
  every new fault;
- package rebuild/release rotation for the changed admitted source graph;
- process-only and Darwin demo output for the authenticated session;
- architecture, security, protocol, package, risk, decision and evidence
  documentation.

Risk class: R3.

Rationale:

- workload-session verification controls whether one child response may become
  durable connector outcome evidence;
- a predictable/reused challenge, exported key, incomplete signature statement
  or confused session binding would create a material acknowledgement and
  execution-identity error;
- package, parent, bootstrap, verifier, session issuer and pilot trust still
  run under one mutable trusted account;
- the experiment remains dry-run and changes no external-effect authority.

Selected verification and result:

- V0: exact FDOS status/diff, `git diff --check`, navigation,
  unsupported-claim review, private-material search, package reproducibility
  and source-manifest verification passed;
- V1: workload-session contract, bootstrap authority, protocol, packaged
  worker, process client and CLI syntax checks plus 30 focused
  artifact/package/process/session cases passed;
- V2: canonical challenge/key/signature/envelope validation, content and
  signature tampering, cross-challenge/package replay, second-sign denial,
  real-child challenge/signature/session-confusion rejection, exact result
  cross-binding, unchanged Outbox and human-only uncertainty reconciliation
  passed;
- V3: complete 140-test runtime regression, 91.09% line / 79.04% branch /
  92.32% function coverage, internal/outbox/sandbox demos, deterministic
  13-module package rebuild and final scope review passed;
- V4: not claimed; no independent exact-commit CI evidence is attached;
- V5: not claimed and not authorized; no immutable deployment, external
  workload-identity issuer, protected session memory, independent security
  review, real service, physical or external operation was exercised.

Checks intentionally not run:

- no tests/builds in TapTime or Company AI, because both are read-only
  references and their repository instructions prohibit or do not authorize
  write-producing execution;
- no external API/model/connector test, because the contract enforces
  `networkAccess: false` and `externalEffects: false`;
- no container image or OCI runtime test; the installed local daemon was not
  running and starting a host service would exceed the FDOS-repository-only
  mutation scope;
- no immutable object/image storage, external release or workload-identity
  service, HSM/KMS, expiry, revocation, transparency log or atomic deployment
  test;
- no hostile bootstrap/verifier replacement, Node.js provenance, boot-chain,
  process-memory inspection, secure-erasure or remote-attestation test;
- no supported container/VM sandbox, destination allowlist, filesystem-read or
  CPU/memory/process isolation test;
- no model personality/quality evaluation, because no model adapter exists;
- no production, deployment, legal or physical gate.

Failures and retries:

- the first session implementation authenticated the transient envelope but
  did not bind minimized session identity into the durable result digest;
- the protocol was strengthened with a session observation and exact parent
  cross-comparison before candidate validation;
- integration tests then rejected the expected stale package because it still
  contained the pre-observation source graph;
- the package was rebuilt and the obsolete ephemeral release key/signature
  discarded;
- a separate valid-signature session-observation confusion fault was added,
  which changed packaged bytes again; the interim package release was
  intentionally discarded and regenerated;
- no release or session private key was printed, stored or committed;
- focused tests, complete static/regression checks, coverage and all three
  demos then passed.

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
- `EV-FDOS-PROCESS-WORKER-007` remains the process/acknowledgement record;
- `EV-FDOS-DARWIN-SANDBOX-008` remains the OS denial record;
- `EV-FDOS-WORKER-ARTIFACT-009` remains the signed mutable-source record;
- `EV-FDOS-WORKER-PACKAGE-010` remains the deterministic package record;
- this slice is bound separately in `EV-FDOS-WORKLOAD-SESSION-011`.

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
