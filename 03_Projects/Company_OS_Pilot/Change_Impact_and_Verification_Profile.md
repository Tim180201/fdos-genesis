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
  `cfc793097e2e8ac8ccd81014a4faa03180479b5f`
- FDOS tree:
  `b1fad6e6a0df56542add1c38207d414bb5db402f`
- the signed worker source-artifact slice is evaluated as the change from that
  Darwin sandbox baseline;
- external references are bound separately in
  `Reference_Adoption_Assessment.md`.

Changed boundaries:

- fixed artifact identity, version, entry point and 12-file source policy;
- trusted runtime/source directory and descriptor-based file inspection;
- fixed file and total byte limits, UTF-8 decoding, permission checks and
  stable metadata across each read;
- conservative exact static ESM graph closure with comments, dynamic code,
  package, added built-in, escaping, duplicate, unlisted and unreachable
  source rejection;
- deterministic per-file SHA-256 plus canonical complete artifact digest;
- exact Ed25519 release-attestation and public-trust schemas;
- repository-local pilot release trust with no stored private key;
- parent artifact reconstruction and release verification before every spawn;
- worker protocol version 1.2 binding artifact, attestation, issuer and key;
- child reconstruction of the local source artifact and exact digest match;
- response and result-digest binding of the child artifact observation;
- deliberate artifact-binding mismatch fault and rejected child response;
- preservation of the durable claim followed by human-only uncertainty after
  artifact mismatch;
- source, signature, trust, schema, permission, import and symlink tamper tests;
- artifact identity in both process-only and Darwin demo output;
- architecture, identity, security, release, risk and evidence documentation.

Risk class: R3.

Rationale:

- release verification controls which source may execute near a future
  connector boundary;
- a false signature, incomplete graph or confused artifact binding would
  create a material supply-chain and execution-identity error;
- the source, trust root and child still run under one mutable trusted account;
- the experiment remains dry-run and changes no external-effect authority.

Selected verification and result:

- V0: exact FDOS status/diff, `git diff --check`, navigation,
  unsupported-claim review and source-manifest verification passed;
- V1: artifact domain, inspector, release, protocol, child, process client and
  CLI syntax checks plus 15 focused artifact/process-worker cases passed;
- V2: exact source graph, directory/file/symlink/permission checks, source and
  signature tampering, foreign trust, unexpected fields, undeclared imports,
  exact request/response binding, child mismatch rejection, unchanged Outbox
  and human-only uncertainty reconciliation passed;
- V3: complete 125-test runtime regression, 90.26% line / 79.04% branch /
  90.82% function coverage, internal/outbox/sandbox demos and final scope
  review passed;
- V4: not claimed; no independent exact-commit CI evidence is attached;
- V5: not claimed and not authorized; no immutable build/deployment,
  independent security review, real service, physical or external operation
  was exercised.

Checks intentionally not run:

- no tests/builds in TapTime or Company AI, because both are read-only
  references and their repository instructions prohibit or do not authorize
  write-producing execution;
- no external API/model/connector test, because the contract enforces
  `networkAccess: false` and `externalEffects: false`;
- no immutable packaging, external release service, HSM/key-vault, expiry,
  revocation, transparency log or atomic deployment test;
- no same-account malicious race, independently authenticated worker, signed
  response, Node.js provenance, boot-chain or remote-attestation test;
- no supported container/VM sandbox, destination allowlist, filesystem-read or
  CPU/memory/process isolation test;
- no model personality/quality evaluation, because no model adapter exists;
- no production, deployment, legal or physical gate.

Failures and retries:

- the first focused run correctly rejected the previously embedded release
  after artifact-domain hardening changed a signed source byte;
- the inspector was further hardened to use descriptor reads, final-component
  no-follow behavior, trusted directory checks and stable metadata;
- the ambiguous observation name `selfVerified` was replaced with the narrower
  `localDigestMatched`;
- only after the artifact source stabilized was a new ephemeral local key used
  to issue the final recorded attestation; its private key was discarded;
- targeted tests, complete static/regression checks, coverage and all demos
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
- this slice is bound separately in `EV-FDOS-WORKER-ARTIFACT-009`.

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
