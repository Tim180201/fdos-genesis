# Evidence Record — Darwin Network/Write Sandbox Experiment

Status: Evidence Item / Human Review Required

Project: FDOS Company OS Pilot

Date: 2026-07-29

Confidence: High for the recorded local provider/protocol/probe behavior;
Low for portability, complete resource isolation, workload identity or real
connector fitness

FDOS Validation Level: Level 1 — Experimental

Core Impact: None

## 1. Purpose

Record executable evidence that FDOS can require one exact operating-system
isolation policy for its process-separated no-effect worker, observe selected
network/write denial inside the child and reject a missing or bypassed policy
without recording false success.

This record does not claim a portable production sandbox or authorize a real
connector.

## 2. Evaluated Source

Change baseline:

- FDOS commit:
  `371551e5fbd5de55c09dd46dd9b42dd9d00a7e9c`
- FDOS tree:
  `215bbbb78e1ab98f608ee1ddf57012ea43871282`

The complete 61-file runtime candidate is bound by:

- manifest:
  `EV-FDOS-DARWIN-SANDBOX-008_Source_Manifest.sha256`
- manifest digest:
  `sha256:511dbf8125b26e7ddd3c0fd89b54af6afef3e2f0f6c9bc3fe31506b6a205cc`

Test environment:

- runtime package: `@fdos/runtime-reference@0.8.0-experimental`
- Node.js: `v26.3.1`
- macOS: `26.5.1`, build `25F80`
- operating-system kernel: `Darwin 25.5.0 arm64`

Compatibility outside this exact environment was not independently
exercised.

## 3. Provider and Policy Binding

### Fixed launcher

The provider accepts only:

```text
path:    /usr/bin/sandbox-exec
size:    102560 bytes
uid/gid: 0/0
mode:    0755
digest:  sha256:8857d087219f0f39d3e3c163e5d0a0aed690cc22f34b50c7eee3d74f93e69688
```

It rejects a non-Darwin platform, unavailable launcher, symbolic link,
non-file, empty/oversized file, non-root ownership, group/world writability or
inconsistent complete read.

### Fixed profile

```text
(version 1)(allow default)(deny network*)(deny file-write*)
```

Bindings:

```text
provider:
  darwin-sandbox-exec-network-write-deny-v1
profile digest:
  sha256:a8fe16e5c5d6d1343677b772957456ba95e928a6f0c9650568f2d23dedd19eb3
complete policy digest:
  sha256:113ab35b7ab6f92f8bcc3dce2116bbc10487955c4822dc59912b89bf0ce3fd81
```

The request carries the exact provider and complete policy digest. The
response and final worker result must bind those exact values.

The local manual reports `sandbox-exec` as deprecated and recommends App
Sandbox for application developers. The provider correspondingly reports
`deprecatedPlatformInterface: true` and `productionReady: false`.

## 4. Runtime Enforcement Observation

The child first verifies:

- the canonical request and validity window;
- the no-network/no-effect Delivery Intent;
- equality between request isolation binding and the minimal environment.

Required mode then attempts:

1. loopback listen;
2. loopback connect;
3. opening `/dev/null` for writing.

Each must return `EPERM` or `EACCES`. Only after all three observations may
the worker response report:

```text
networkIsolationEnforced:          true
networkIsolationProbe:             socket_listen_and_connect_denied
filesystemWriteIsolationEnforced:  true
filesystemWriteIsolationProbe:     dev_null_write_open_denied
```

The complete boundary enters the canonical response digest and digest-only
simulation result.

Configuration alone cannot create this positive boundary. The default
process-only path reports both enforcement flags false and both probes
`not_run`.

## 5. Verification

### Static and complete regression

```text
npm run check
tests 120
pass 120
fail 0
skipped 0
```

### Coverage

```text
npm run coverage
tests 120
pass 120
fail 0

line coverage:     90.12%
branch coverage:   78.97%
function coverage: 90.27%

network-isolation-contract.js:
line coverage:     89.26%
branch coverage:   80.00%
function coverage: 80.00%

darwin-sandbox-exec-network-write-deny.js:
line coverage:     88.11%
branch coverage:   60.00%
function coverage: 100.00%

process-separated-dry-run-worker.js:
line coverage:     83.09%
branch coverage:   84.06%
function coverage: 88.89%

dry-run-worker-protocol.js:
line coverage:     91.36%
branch coverage:   80.00%
function coverage: 100.00%

dry-run-connector-worker.js:
line coverage:     49.36%
branch coverage:   31.82%
function coverage: 46.15%
```

Required no-write mode clears the child V8 coverage destination. Otherwise
Node's test harness attempts a coverage artifact write at child exit, which
the policy correctly denies. Process-only runs remain the source of child-file
coverage. Coverage does not prove syscall completeness or production
isolation.

### Focused behavior

Ten process-worker cases passed, including:

- exact request/response, claim, intent, validity and digest binding;
- missing and false required attestation rejection;
- network-probe and filesystem-probe tampering rejection;
- root-owned launcher/profile/policy inspection;
- positive Darwin listen/connect/write-open denial;
- deliberate required-sandbox direct-launch bypass rejection;
- successful process-only simulation with false isolation flags;
- crash-before-response, response-then-crash and timeout rejection;
- invalid construction/clock and expired-claim rejection.

The deliberate bypass produced no accepted response and no Outbox outcome.
After controlled claim expiry, Human Governance reconciled only to
`uncertain`.

### End-to-end demos

```text
npm run demo
run status:             completed
tasks:                  4 completed
accepted Invocations:   14
committed transactions: 14
verified audit events:  29
external actions:       false
```

```text
npm run demo:outbox
run status:                       completed
delivery status:                  simulated
process separated:                true
network isolation enforced:       false
filesystem-write isolation:       false
external effect:                  none
accepted Invocations:             12
committed transactions:           12
verified audit events:            22
```

```text
npm run demo:sandbox
run status:                       completed
delivery status:                  simulated
process separated:                true
network isolation enforced:       true
network probe:                    socket_listen_and_connect_denied
filesystem-write isolation:       true
filesystem-write probe:           dev_null_write_open_denied
policy digest:                    sha256:113ab35b7ab6f92f8bcc3dce2116bbc10487955c4822dc59912b89bf0ce3fd81
external effect:                  none
accepted Invocations:             12
committed transactions:           12
verified audit events:            22
```

No service adapter or real external request exists. The sandbox experiment
uses bounded local denial probes only.

### Source-manifest verification

From `02_Reference_Implementations/FDOS_Runtime/`:

```text
shasum -a 256 -c \
  ../../04_Evidence/fdos-runtime/EV-FDOS-DARWIN-SANDBOX-008_Source_Manifest.sha256
61 files OK
```

## 6. Failure Discovered During Verification

The first complete coverage attempt failed the positive sandbox case with:

```text
EPERM: Failed to write file .../node-coverage-.../coverage-....json
```

This was expected policy behavior, not a weakened denial. Node's coverage
harness had instrumented the child and attempted to persist its artifact
during exit. The parent already supplied a minimal explicit environment; the
required no-write launch now additionally clears that child coverage
destination.

No write permission was added. A targeted coverage rerun and the complete
120-test coverage run then passed.

## 7. Negative Evidence and Limits

This evidence does not prove:

- a supported or portable production sandbox;
- outbound destination allowlisting, DNS or TLS policy;
- filesystem read isolation;
- CPU, memory, process-count/creation or general syscall isolation;
- denial through every possible network or write API;
- restriction of already inherited standard-I/O descriptors;
- protection from a compromised same-account host, kernel or Node runtime;
- independently signed worker response or workload attestation;
- signed immutable Node/worker artifact or trusted deployment chain;
- hostile-root, boot-chain or remote attestation defense;
- secret-vault behavior;
- a real API/model/connector;
- service idempotency, rate, cost or concurrency controls;
- compatibility or fail-closed execution on a second operating system;
- independent CI, penetration test, security review or human acceptance;
- production readiness.

The profile uses `allow default` and denies only the named operation classes.
The three probes demonstrate selected observed behavior, not exhaustive kernel
policy coverage.

## 8. Interpretation

Supported conclusion:

> On the recorded Darwin host and source manifest, FDOS can bind one exact
> deprecated network/write-denial policy to a no-effect worker request,
> observe listen/connect/write-open denial inside the child and reject a
> deliberately bypassed required launch without recording false success or
> automatically retrying.

Unsupported conclusions:

- the worker is generally or portably sandboxed;
- the worker cannot read same-account files;
- every network/write mechanism is impossible;
- the worker or host is independently attested;
- any GitHub, document, Slack, Teams, MCP or other service connector works;
- the pattern is production ready or an FDOS Core standard.

## 9. Governance

All implementation and documentation changes are confined to `fdos-genesis`.
TapTime and Company AI remain unchanged read-only references.

This Evidence Record supports Human Governance review of Technical Slice 8. It
authorizes no model call, real networked connector, external action,
production operation, FDOS Core change or knowledge promotion.
