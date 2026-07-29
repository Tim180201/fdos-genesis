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
  `205302dc8613e54a0f9df977b24ed2e5b8ffd087`
- FDOS tree:
  `4b918e6de912ddfa22994b7df9d63d7258fbcf9d`
- the verified worker-package slice is evaluated as the change from that
  signed-source-artifact baseline;
- external references are bound separately in
  `Reference_Adoption_Assessment.md`.

Changed boundaries:

- fixed package, artifact, entry-point and 12-module identities;
- deterministic canonical JSON package containing exact UTF-8 module strings;
- separate per-module, source-artifact and complete-package SHA-256 bindings;
- exact module ordering, byte limits and source-artifact reconstruction;
- canonical package-file, stable descriptor, owner, permission and no-follow
  checks;
- closed static ESM graph enforcement against package contents;
- detached package-attestation request and signature attachment with no
  private-key parameter;
- exact Ed25519 public trust descriptor and trust-anchor digest pin;
- repository-local pilot package release with no stored private key;
- caller-provided release-configuration seam without custody claim;
- parent package, graph, signature and trust-pin verification before spawn;
- fixed child verifier bootstrap and bounded public release envelope;
- independent bootstrap package/release verification before module evaluation;
- exact in-memory VM-module loader with fixed relative and built-in imports;
- worker protocol version 1.3 binding package, artifact, attestation, trust
  anchor, issuer and key;
- response and result-digest binding of verified-memory package observation;
- deliberate bootstrap trust mismatch and request package mismatch faults;
- preservation of the durable claim followed by human-only uncertainty after
  either mismatch;
- package, signature, trust, schema, canonicalization, permission, import and
  symlink tamper tests;
- package identity in both process-only and Darwin demo output;
- architecture, security, package, release, risk and evidence documentation.

Risk class: R3.

Rationale:

- package and release verification control which bytes may execute near a
  future
  connector boundary;
- a false signature, incomplete package or confused trust binding would
  create a material supply-chain and execution-identity error;
- package, parent, bootstrap, verifier and pilot trust still run under one
  mutable trusted account;
- the experiment remains dry-run and changes no external-effect authority.

Selected verification and result:

- V0: exact FDOS status/diff, `git diff --check`, navigation,
  unsupported-claim review, package reproducibility and source-manifest
  verification passed;
- V1: package identity, contract, release, file inspector, builder, bootstrap,
  protocol, process client and CLI syntax checks plus 22 focused
  artifact/package/process-worker cases passed;
- V2: exact source graph, package canonicalization, file/symlink/permission
  checks, content and signature tampering, trust-pin mismatch, unexpected
  fields, undeclared imports, exact request/response binding, bootstrap and
  worker mismatch rejection, unchanged Outbox and human-only uncertainty
  reconciliation passed;
- V3: complete 132-test runtime regression, 90.77% line / 78.85% branch /
  92.15% function coverage, internal/outbox/sandbox demos, deterministic
  package rebuild and final scope review passed;
- V4: not claimed; no independent exact-commit CI evidence is attached;
- V5: not claimed and not authorized; no immutable deployment, protected
  signer, independent security review, real service, physical or external
  operation was exercised.

Checks intentionally not run:

- no tests/builds in TapTime or Company AI, because both are read-only
  references and their repository instructions prohibit or do not authorize
  write-producing execution;
- no external API/model/connector test, because the contract enforces
  `networkAccess: false` and `externalEffects: false`;
- no immutable object/image storage, external release service, HSM/KMS,
  expiry, revocation, transparency log or atomic deployment test;
- no hostile bootstrap/verifier replacement, independently authenticated
  worker, signed response, Node.js provenance, boot-chain or remote-attestation
  test;
- no supported container/VM sandbox, destination allowlist, filesystem-read or
  CPU/memory/process isolation test;
- no model personality/quality evaluation, because no model adapter exists;
- no production, deployment, legal or physical gate.

Failures and retries:

- the initial packaged end-to-end demo rejected its response because
  observation-only booleans were passed into the exact package-binding
  normalizer;
- the comparison was narrowed to the exact binding projection while keeping
  observation fields separately mandatory;
- because that protocol correction changed admitted source bytes, the first
  generated package and ephemeral signature were intentionally discarded;
- after the admitted source stabilized, the package was rebuilt and signed
  with a new ephemeral key; the private key was discarded;
- a deliberately wrong trust pin was added as a separate bootstrap-preload
  fault, proving rejection before package module evaluation;
- focused tests, complete static/regression checks, coverage and all demos
  then passed.

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
- this slice is bound separately in `EV-FDOS-WORKER-PACKAGE-010`.

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
