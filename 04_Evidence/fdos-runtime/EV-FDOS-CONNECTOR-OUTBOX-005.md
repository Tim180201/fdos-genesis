# Evidence Record — Connector Contract and Durable Outbox

Status: Evidence Item / Human Review Required

Project: FDOS Company OS Pilot

Date: 2026-07-29

Confidence: Medium for tested local dry-run behavior; Low for real connector
or production fitness

FDOS Validation Level: Level 1 — Experimental

Core Impact: None

## 1. Purpose

Record executable evidence that the FDOS experimental runtime can bind future
connector work to an authorized task, persist one immutable idempotent
Delivery Intent, fence one registered worker claim and make ambiguous outcomes
require Human Governance.

This record does not claim that any external service was contacted or that a
real connector is safe.

## 2. Evaluated Source

Change baseline:

- FDOS commit:
  `359af997a3a66a52d764b4b8d261835abd200080`
- FDOS tree:
  `7885821e241b8e24c58165a8a01fb21cf7aac2c4`

The complete 50-file runtime candidate is bound by:

- manifest:
  `EV-FDOS-CONNECTOR-OUTBOX-005_Source_Manifest.sha256`
- manifest digest:
  `sha256:3a7a45606c6feedb50500ac8af2b7031ead5862276c4846abfe2482e1a5a2a48`

Test environment:

- runtime package: `@fdos/runtime-reference@0.5.0-experimental`
- Node.js: `v24.17.0`
- operating system kernel: `Darwin 25.5.0 arm64`

Compatibility outside this exact environment was not independently exercised.

## 3. Implemented Boundary

### Closed Connector Contract

The registry requires an exact contract and active Connector Instance.

The current admission policy accepts only:

- dry-run execution;
- no network;
- no external effects;
- A0/A1 operations;
- public/internal sensitivity;
- closed Action Catalog operations and capabilities;
- exact typed parameter fields;
- one to three attempts.

Credential-like parameter field names, unexpected fields, unknown actions,
high risk, confidential/restricted data, network access and external effects
fail closed.

### Task-bound Delivery Intent

Preparation requires an active task claimed by the requesting Agent Instance.
The role must hold the exact connector operation capability.

The immutable intent binds:

- task, run, attempt, owner role and Action Intent digest;
- Connector Instance, contract version/digest and operation digest;
- action type, capability, risk, sensitivity and target;
- normalized parameters and parameter digest;
- requester and timestamp;
- scoped idempotency, request and complete intent digests.

Repeating the same logical request returns the existing delivery. Reusing the
key with different content or current contract binding fails.

### Durable claim and outcome

A registered Connector Instance may invoke only claim and outcome commands.
It cannot read tasks, memory, approvals, general Outbox state, audit or
evidence.

Each claim binds:

- exact connector owner;
- unique fencing claim ID;
- attempt number;
- claim and lease-expiry time.

Concurrent claim commands serialize. Only one transition can win.

The current outcome contract accepts:

- `simulated` plus result digest;
- `failed` plus typed code, message digest and retryability;
- `uncertain` plus reason code and evidence digest.

All require `externalEffect: none`. Raw response and error fields are denied.

### Human-controlled recovery

Only Human Governance may:

- retry a failed delivery within its attempt budget;
- cancel prepared or failed work;
- reconcile an abandoned claim after its lease has expired;
- resolve uncertainty with a reason and exact evidence digest.

Lease expiry becomes durable uncertainty and cannot auto-retry. A late result
attempt records claim expiry and typed command failure in the same local
transaction.

## 4. Verification

### Static and complete regression

```text
npm run check
tests 106
pass 106
fail 0
skipped 0
```

### Coverage

```text
npm run coverage
line coverage:     90.38%
branch coverage:   78.67%
function coverage: 91.17%

connector-contract.js:
line coverage:     88.80%
branch coverage:   84.76%
function coverage: 100.00%

delivery-intent.js:
line coverage:     93.63%
branch coverage:   72.50%
function coverage: 100.00%

state.js:
line coverage:     94.45%
branch coverage:   78.38%
function coverage: 100.00%
```

Coverage supports review but is not a network, service API, distributed worker
or production-security audit.

### Focused boundary suite

Fourteen Connector/Outbox tests passed, covering:

- contract immutability and forbidden network/effect/high-risk fields;
- malformed, duplicate, inactive and out-of-contract registry use;
- task, role, target, parameter and contract binding;
- idempotent duplicate and changed-request conflict;
- raw lower-level runtime denial;
- Connector principal and instance isolation;
- concurrent claim fencing;
- raw outcome-field rejection;
- failed retry and attempt budget;
- claim lease expiry to uncertainty;
- Human Governance reconciliation of an expired claim without a live worker;
- explicit Human Governance resolution;
- task/delivery lifecycle bypass denial;
- restart, resolved-state rehydration and stale-contract denial;
- independent intent/outcome tamper checks;
- the no-network end-to-end demo and content-minimized delivery evidence.

### Authenticated Outbox demo

```text
identity mode:          authenticated-invocation
persistence:            sqlite schema 1.0
run status:             completed
workflow tasks:         2
accepted Invocations:   12
committed transactions: 12
audit events:           22
delivery status:        simulated
delivery attempt:       1
evidence deliveries:    1, content-minimized
network access:         false
external effect:        none
audit chain valid:      true
recoveryRequired:       false
```

The original authenticated Chief of Staff, Operations and Marketing pilot also
passed in the complete regression.

### Source-manifest verification

From `02_Reference_Implementations/FDOS_Runtime/`:

```text
shasum -a 256 -c \
  ../../04_Evidence/fdos-runtime/EV-FDOS-CONNECTOR-OUTBOX-005_Source_Manifest.sha256
50 files OK
```

## 5. Negative Evidence and Limits

This evidence does not prove:

- a real GitHub, document, Slack, Teams, MCP or other connector;
- network, DNS, TLS, proxy or egress security;
- workload identity, attestation, online revocation or secret custody;
- isolated worker process, container or operating-system sandbox;
- service-specific schema compatibility or external idempotency;
- distributed claim fencing, queue delivery or multi-host recovery;
- safe writes, messages, publication or destructive actions;
- encryption of Outbox parameters at rest;
- semantic detection of secrets placed in otherwise allowed string fields;
- rate, cost, timeout, quota or denial-of-service controls;
- external reconciliation after an uncertain service outcome;
- production backup, restore, migration or disaster recovery;
- independent audit, signed evidence or operational incident response.

The demo's `simulated` status means only that the local dry-run state machine
accepted a digest-only result. It is not evidence of service delivery.

## 6. Interpretation

Supported conclusion:

> Within the bound local Level 1 source, FDOS can durably prepare one exact
> no-network connector request from an authorized task, fence a registered
> dry-run worker claim, reject duplicate or drifting authority and require
> human evidence before resolving an ambiguous outcome.

Unsupported conclusions:

- FDOS has a working external connector;
- a local transaction includes an external service;
- retries are safe for a real service;
- a read-only sandbox is already authorized;
- write, communication or destructive actions may be enabled;
- the pattern is validated FDOS Core knowledge.

## 7. Governance

All implementation and documentation changes are confined to `fdos-genesis`.
TapTime and Company AI remain independent read-only references.

This Evidence Record supports Human Governance review of Technical Slice 5. It
authorizes no networked connector, external action, deployment, FDOS Core
change or knowledge promotion.
