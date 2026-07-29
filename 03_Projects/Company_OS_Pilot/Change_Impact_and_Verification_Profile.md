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
| R3 | identity, authorization, persistence, evidence, secrets, connector, isolation or release-critical behavior |

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
  `7b531814979e2f050bd542d2548e4a85c47073c5`
- FDOS tree:
  `83b2063ebd73a6561b719d52d3a7e240d6ee9b86`
- the OCI Workload Admission slice is evaluated as the change from that
  durable verified-worker-receipt baseline;
- external TapTime and Company AI references remain unchanged and bound
  separately in `Reference_Adoption_Assessment.md`.

Changed boundaries:

- runtime package version `0.13.0-experimental`;
- one closed self-digested OCI Workload Policy;
- exact named manifest digest and supported Linux platform binding;
- fixed non-root worker command, working directory and environment-name
  allowlist;
- exact no-network, read-only-root, no-host-access, no-privilege, seccomp and
  resource policy;
- local Docker provider requiring an absolute launcher and explicit Unix
  socket;
- resolved launcher path, complete SHA-256, size, ownership and mode
  observation;
- Docker server API 1.49+, Linux, architecture, cgroup-v2 and built-in-seccomp
  admission;
- exact image RepoDigest, platform, user, workdir, command, layered rootfs,
  absent volume/port and bounded image-environment admission;
- self-digested runtime and image observations;
- deterministic hardened launch-template reconstruction;
- preflight binding of complete policy, runtime, image and template;
- fixed false execution, observation, external-attestation and production
  claims;
- bounded shell-free default Docker command runner with no parent environment;
- adversarial policy, runtime, image, command and template paths;
- real local Docker launcher inspection and daemon-unavailable negative
  evidence;
- architecture, security, operations, risk, decision, validation and evidence
  documentation.

Unchanged boundaries:

- the OCI provider is not integrated into `ProcessSeparatedDryRunWorker`;
- no Docker/Colima daemon was started;
- no image was built, pulled, pushed, signed or inspected live;
- no container was created or executed;
- worker protocol remains version 1.4;
- canonical worker package remains version 2 and source artifact version 3;
- package, artifact, release-attestation and trust-anchor digests are
  unchanged;
- Connector network access and external effects remain disabled;
- no new Invocation operation, runtime event or action authority was added.

Risk class: R3.

Rationale:

- the policy and template define a future isolation boundary;
- an incomplete admission could let a mutable image, root command, host mount,
  network mode or weakened resource control masquerade as safe execution;
- a preflight artifact could be mistaken for actual kernel enforcement;
- the local Docker launcher/socket/daemon and image store remain trusted;
- execution is explicitly disabled, so this slice changes no external-action
  authority.

Selected verification and result:

- V0: exact FDOS status/diff, local Docker/Colima capability discovery,
  official/local CLI option review, unsupported-claim review, private-material
  search, unchanged package comparison and source-manifest verification
  selected;
- V1: policy, provider and public-export syntax plus 13 focused OCI cases
  passed;
- V2: tag/digest confusion, privilege, network, mount, device, capability,
  seccomp, root, swap, PID, tmpfs, runtime capability, image config,
  environment, command output, template, cross-architecture and false-claim
  adversarial paths passed;
- V3: complete 153-test regression, 91.57% line / 79.29% branch / 92.84%
  function coverage, real bounded command fixture, actual launcher inspection,
  daemon-unavailable fail-closed probe, unchanged package verification and
  final scope review passed locally;
- V4: not claimed; no independent exact-commit CI evidence is attached;
- V5: not claimed and not authorized; no host daemon start, real image,
  container, registry, external workload identity, security review, physical
  or operational validation occurred.

Focused coverage:

```text
oci-workload-policy.js
line coverage:     98.22%
branch coverage:   92.75%
function coverage: 100.00%

docker-oci-workload-provider.js
line coverage:     92.01%
branch coverage:   78.69%
function coverage: 91.84%
```

Checks intentionally not run:

- no Docker/Colima daemon startup because it would mutate host state outside
  the authorized FDOS repository;
- no image build/pull/push/sign/scan because no approved base digest,
  registry, provenance authority or live runtime exists;
- no live image inspection or container launch;
- no in-container network, read-only-root, user, capability, seccomp, mount,
  PID, memory, CPU or timeout/cleanup conformance probes;
- no OCI integration with worker protocol, Outbox or durable receipt;
- no tests/builds in TapTime or Company AI;
- no external model, API, connector, DNS or TLS request was made by the FDOS
  runtime; official standards/tool documentation was reviewed separately;
- no external workload identity, registry trust, HSM/KMS, revocation,
  transparency or trusted-time service;
- no production deployment, independent security review or Human Governance
  acceptance.

Failures and retries:

- the first focused run passed 9 of 12 tests; a launch-template validation
  block had been inserted into the image normalizer and was moved to the
  correct closed template boundary;
- the first real command-runner fixture resolved macOS `/var` through
  `/private/var`; the assertion was corrected to compare the filesystem
  `realpath` already recorded by the provider;
- the initial minimum API assumption was raised from 1.44 to 1.49 after
  verifying that platform-bound `docker image inspect` requires API 1.49;
- image environment and healthcheck/core-dump paths were hardened before
  final regression;
- final option review found Docker's documented `--rm`/`--restart` conflict;
  the explicit restart flag was removed while the default `no` policy and
  required automatic cleanup flag were retained;
- final verifier review added exact-string, runtime-architecture,
  executable-mode, registry/socket and equal-open-file-limit rejection;
- one attempted leaf-symlink consistency rule then failed 152/153 because
  macOS may resolve an ancestor `/var` link while the requested file itself is
  regular; that invalid inference was removed while the resolved-path binding
  remained;
- focused tests then passed 13/13 and the complete suite passed 153/153;
- actual Docker runtime admission failed closed as expected because the daemon
  was unavailable;
- no private key or credential was generated, changed, printed or stored.

Evidence carried forward:

- `EV-FDOS-RUNTIME-PILOT-001` through
  `EV-FDOS-WORKER-RECEIPT-012` remain historical bounded evidence;
- this slice is bound separately in `EV-FDOS-OCI-ADMISSION-013`;
- worker package v2, artifact v3, protocol 1.4 and receipt evidence remain
  unchanged.

Remaining risks:

- positive runtime/image admission is fixture-backed, not live-host evidence;
- the installed Docker CLI is user-owned and no daemon was admitted;
- a future Unix socket/daemon and local image store remain trusted;
- a RepoDigest is content identity, not protected signature or provenance;
- launch-template construction is not enforcement evidence;
- no reproducible FDOS image exists;
- environment transfer, container timeout/kill/cleanup and orphan handling are
  not implemented;
- worker response and receipt do not bind an outer OCI boundary;
- no external workload identity, registry transparency, trusted time or
  revocation exists.

Next required gate:

- separately authorized supported local/CI OCI runtime;
- reproducible multi-platform image from a digest-pinned base;
- protected image signature/provenance, SBOM and vulnerability policy;
- live inside/outside conformance probes for every declared control;
- deterministic per-launch environment, name, timeout, kill, wait and cleanup;
- exact outer-boundary observation in worker response and durable receipt;
- externally rooted workload identity and replay/revocation;
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
authorize CI, host-service startup, image operations, deployment or
production work.
