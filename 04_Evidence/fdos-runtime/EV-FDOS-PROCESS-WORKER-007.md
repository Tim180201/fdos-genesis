# Evidence Record — Process-Separated Dry-Run Worker

Status: Evidence Item / Human Review Required

Project: FDOS Company OS Pilot

Date: 2026-07-29

Confidence: High for tested local protocol, process and acknowledgement
behavior; Low for OS isolation, worker identity or real connector fitness

FDOS Validation Level: Level 1 — Experimental

Core Impact: None

## 1. Purpose

Record executable evidence that FDOS can move its bounded Connector Outbox
simulation into a separate local process, bind the exact claimed delivery and
reject ambiguous worker acknowledgement without enabling an external effect.

This record does not claim enforced network isolation or a real connector.

## 2. Evaluated Source

Change baseline:

- FDOS commit:
  `7f41f37bf28a020e7b50ddf56a071d29ce14e0ec`
- FDOS tree:
  `9be0e624ebeff9662bf2f0bbf08e2910e291a1f3`

The complete 58-file runtime candidate is bound by:

- manifest:
  `EV-FDOS-PROCESS-WORKER-007_Source_Manifest.sha256`
- manifest digest:
  `sha256:a297eca6ad92d8d0d164cd696354495b8969c3931fdda3626c8419bd7f3f2673`

Test environment:

- runtime package: `@fdos/runtime-reference@0.7.0-experimental`
- Node.js: `v24.17.0`
- operating system kernel: `Darwin 25.5.0 arm64`

Compatibility outside this exact environment was not independently exercised.

## 3. Implemented Boundary

### Parent controller

The parent retains:

- authenticated gateway and runtime;
- SQLite store and directory lease;
- ephemeral local Invocation Authority;
- Connector principal and Outbox command access.

It launches the fixed worker entry without a shell, forwards no parent
environment, caps request/output/error bytes and enforces a bounded timeout.

### Child worker

The child receives only one canonical JSON request over standard input. It
receives no gateway, runtime, database handle or private signing key.

Its local source imports only canonical digest/validation and worker-protocol
modules. It verifies the request and emits one canonical response over
standard output.

This source boundary does not prevent a compromised same-account process from
using host resources.

### Exact protocol

The request binds:

- request, delivery and fencing-claim IDs;
- Connector Instance;
- issue and expiry;
- no-network/no-effect dry-run policy;
- complete verified Delivery Intent;
- canonical request digest.

The response binds the same identities and request digest, completes within
the validity window and contains only:

- one `simulated` outcome;
- `externalEffect: none`;
- a result digest binding request, intent/operation, completion and boundary;
- explicit `processSeparated: true`;
- explicit `networkIsolationEnforced: false`;
- canonical response digest.

### Parent acceptance

The parent accepts only:

- within-budget execution;
- normal code-zero exit;
- no standard error;
- exactly one JSON response line;
- closed response schema;
- exact digest, claim, connector, request and time binding.

Raw output/error content is not placed in thrown error details.

## 4. Verification

### Static and complete regression

```text
npm run check
tests 116
pass 116
fail 0
skipped 0
```

### Coverage

```text
npm run coverage
line coverage:     90.77%
branch coverage:   78.86%
function coverage: 90.88%

process-separated-dry-run-worker.js:
line coverage:     79.22%
branch coverage:   79.63%
function coverage: 88.24%

dry-run-worker-protocol.js:
line coverage:     90.32%
branch coverage:   74.63%
function coverage: 100.00%

dry-run-connector-worker.js:
line coverage:     79.57%
branch coverage:   33.33%
function coverage: 57.14%
```

### Focused behavior

Six new process-worker cases passed:

- exact request/response, intent, claim, validity and outcome binding;
- successful separate-process completion and durable content-minimized
  outcome recording;
- crash before response rejected;
- valid response followed by crash rejected;
- hang terminated by the parent timeout;
- invalid construction, clock and expired-claim use rejected.

Each injected runtime fault left the delivery `claimed`. After controlled lease
expiry, Human Governance reconciled it only to `uncertain`.

### End-to-end demo

```text
npm run demo:outbox
run status:                completed
delivery status:           simulated
process separated:         true
shell:                     false
network access admitted:   false
external effects admitted: false
network isolation enforced: false
accepted Invocations:      12
committed transactions:    12
verified audit events:     22
```

The existing authenticated internal workflow demo also remained successful.

### Source-manifest verification

From `02_Reference_Implementations/FDOS_Runtime/`:

```text
shasum -a 256 -c \
  ../../04_Evidence/fdos-runtime/EV-FDOS-PROCESS-WORKER-007_Source_Manifest.sha256
58 files OK
```

## 5. Negative Evidence and Limits

This evidence does not prove:

- OS-, container- or infrastructure-enforced network denial;
- filesystem, CPU, memory, process-count or syscall isolation;
- independent worker authentication or signed response;
- signed immutable worker packaging or host attestation;
- protection from a compromised host account or Node.js runtime;
- dynamic secret-sentinel proof of parent-environment non-forwarding;
- secret-vault behavior or semantic secret detection;
- a real service API, DNS, TLS or outbound allowlist;
- service idempotency, rate, cost or concurrency controls;
- distributed worker fencing or transactionality;
- spawn-error and output-overflow fault handling by execution test;
- independent CI, penetration testing, operations review or human acceptance;
- production readiness.

No absence-of-network claim is inferred from process separation. The candidate
explicitly reports `networkIsolationEnforced: false`.

## 6. Interpretation

Supported conclusion:

> Within the bound local Level 1 source, FDOS can execute one exact no-effect
> Connector simulation in a separate child process and reject crash, ambiguous
> post-response exit, timeout and protocol tampering without recording false
> success or automatically retrying.

Unsupported conclusions:

- the child is sandboxed;
- network access is technically impossible;
- the worker is independently authenticated;
- any GitHub, document, Slack, Teams, MCP or other service connector works;
- the pattern is production ready or an FDOS Core standard.

## 7. Governance

All implementation and documentation changes are confined to `fdos-genesis`.
TapTime and Company AI remain unchanged read-only references.

This Evidence Record supports Human Governance review of Technical Slice 7. It
authorizes no model call, networked connector, external action, production
operation, FDOS Core change or knowledge promotion.
