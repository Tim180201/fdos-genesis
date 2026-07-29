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
  `371551e5fbd5de55c09dd46dd9b42dd9d00a7e9c`
- FDOS tree:
  `215bbbb78e1ab98f608ee1ddf57012ea43871282`
- the Darwin sandbox slice is evaluated as the change from that
  process-separated worker baseline;
- external references are bound separately in
  `Reference_Adoption_Assessment.md`.

Changed boundaries:

- exact network-isolation provider contract with process-only and
  Darwin-required bindings;
- worker protocol version 1.1 binding exact provider and policy digest;
- fixed root-owned `/usr/bin/sandbox-exec` inspection and SHA-256 binding;
- exact profile denying `network*` and `file-write*`;
- child-side loopback listen/connect and filesystem write-open denial probes;
- positive network/write flags accepted only after exact probe attestation;
- required-mode fail-closed behavior off Darwin or on launcher failure;
- deliberate direct-launch bypass fault and rejected child response;
- preservation of the durable claim followed by human-only uncertainty after
  sandbox failure;
- explicit clearing of required-mode child V8 coverage-file output;
- default process-only behavior retaining false isolation flags;
- new `sandbox-demo` command with no networked service or external effect;
- architecture, identity, security, risk and evidence documentation.

Risk class: R3.

Rationale:

- isolation reporting affects whether a future worker could be admitted near
  a connector boundary;
- a false positive or silent fallback would create a material security error;
- the child still receives exact internal Delivery Intent parameters and runs
  under the same account;
- the selected OS interface is deprecated and platform-specific;
- the experiment remains dry-run and changes no external-effect authority.

Selected verification and result:

- V0: exact FDOS status/diff, `git diff --check`, navigation,
  unsupported-claim review and source-manifest verification passed;
- V1: isolation contract, provider, protocol, child, process client and CLI
  syntax checks plus ten focused process-worker cases passed;
- V2: launcher ownership/mode/byte inspection, profile/policy digests, exact
  request/response binding, listen/connect/write-open denial, missing/false
  and tampered attestations, direct-launch bypass, unchanged Outbox and
  human-only uncertainty reconciliation passed on the recorded Darwin host;
- V3: complete 120-test runtime regression, 90.12% line / 78.97% branch /
  90.27% function coverage, internal/outbox/sandbox demos and final scope
  review passed;
- V4: not claimed; no independent exact-commit CI evidence is attached;
- V5: not claimed and not authorized; no second platform, independent
  security review, real service, deployment, physical or external operation
  was exercised.

Checks intentionally not run:

- no tests/builds in TapTime or Company AI, because both are read-only
  references and their repository instructions prohibit or do not authorize
  write-producing execution;
- no external API/model/connector test, because the contract enforces
  `networkAccess: false` and `externalEffects: false`;
- no non-Darwin execution, supported container/VM sandbox, destination
  allowlist, filesystem-read or CPU/memory/process isolation test;
- no independently authenticated worker, signed artifact or kernel
  attestation test;
- no model personality/quality evaluation, because no model adapter exists;
- no production, deployment, legal or physical gate.

Failures and retries:

- the first full coverage run failed the positive sandbox case because Node's
  coverage harness attempted to write its child artifact and the no-write
  profile correctly returned `EPERM`;
- required mode was changed to clear the child coverage destination without
  widening the sandbox;
- the targeted and complete coverage runs then passed; process-only worker
  runs continue to supply child-source coverage.

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
- this slice is bound separately in `EV-FDOS-DARWIN-SANDBOX-008`.

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
