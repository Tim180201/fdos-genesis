# Connector Contract and Durable Outbox

Status: Experimental Dry-Run Design

Validation Level: Level 1

Production Status: Not Production Ready

Related Decision:
`../../../00_Specification/ADR/ADR-0046_Connector_Contract_and_Durable_Outbox_Experiment.md`

## Purpose

Create the smallest safe bridge between governed FDOS tasks and future
external adapters.

This slice records and simulates connector work. It does not open a network,
call GitHub, Slack, Teams, MCP or any other service, or perform an external
effect.

## Boundary

```text
claimed FDOS task
  -> exact Action Intent
  -> active Connector Contract and Instance
  -> immutable Delivery Intent
  -> durable Outbox record
  -> authenticated connector claim with lease and fencing ID
  -> exact expiring request to a separate local dry-run process
  -> exact digest-only response accepted only after clean exit
  -> content-minimized dry-run outcome
  -> success, failure or Human Governance uncertainty review
```

Outbox commands are accepted only through `AuthenticatedRuntimeGateway` and
the transactional SQLite path. Calling the lower-level runtime directly is
denied even when a caller invents Invocation-looking attribution.

## Connector Contract

Every contract is deny-by-default and content-addressed. The current
experimental validator requires:

- `executionMode: dry_run`;
- `networkAccess: false`;
- `externalEffects: false`;
- only A0 or A1 operations;
- only public or internal sensitivity;
- a closed action type from the Action Catalog;
- an exact capability and target prefix;
- an exact typed parameter schema;
- one to three attempts;
- no credential-like field names.

An active Connector Instance binds one exact contract ID, version and digest.
Changing contract content changes the digest. A previously prepared delivery
cannot be claimed under the changed contract.

The pilot contract permits only
`repository.metadata.read` through
`connector:reference:primary`. It still performs no repository access.

## Delivery Intent

Preparation requires an active task claimed by the requesting Agent Instance.
The agent's role must hold the operation capability.

The immutable intent binds:

- connector instance, contract version and contract digest;
- operation ID, operation digest, action type and capability;
- task, run, attempt, owner role and Action Intent digest;
- exact target;
- normalized parameters and parameter digest;
- requesting Agent Instance and time;
- request digest;
- scoped idempotency digest;
- complete intent digest.

The outbox stores normalized parameters because the separate worker needs an
exact request. The contract limits their names, types and size. Restricted or
secret material remains prohibited; credential-looking field names fail
closed.

## Idempotency

An idempotency key is scoped to requesting agent, connector and operation.

- Repeating the same logical request returns the existing delivery.
- Reusing the key with different task, parameters, operation or current
  contract binding fails with a conflict.
- The binding survives restart because it is reconstructed from verified
  events.

Idempotency prevents duplicate preparation. It does not prove that a future
external service deduplicated a request; that requires service-specific
idempotency evidence before a real adapter is enabled.

## Identity and Authority

| Principal | Allowed outbox authority |
|---|---|
| Active Agent Instance | Prepare from its claimed task; inspect only task-authorized deliveries |
| Registered Connector Instance | Claim only a delivery bound to its own instance; record only the active claim outcome |
| Human Governance | Inspect, reconcile an expired abandoned claim, authorize failed retry, cancel prepared/failed work and resolve uncertainty |

Connector principals cannot read tasks, memory, approvals, general outbox
lists or the audit trail. They can invoke only `outbox.claim` and
`outbox.record-outcome`.

Every claim has:

- a unique fencing claim ID;
- exact connector owner;
- monotonic delivery attempt;
- claim and expiry timestamps;
- a maximum five-minute lease.

Concurrent claims serialize; exactly one can win.

## State Machine

```text
prepared ──connector claim──> claimed
claimed ──dry-run result──> simulated
claimed ──typed failure──> failed
failed ──human retry, budget available──> prepared
prepared|failed ──human cancel──> cancelled
claimed ──uncertain result or expired lease──> uncertain
uncertain ──human evidence review──> simulated|failed|cancelled
```

There is no automatic retry after uncertainty. An expired claim is treated as
unknown, even in the dry-run, because a future real worker may have completed
work after losing its local acknowledgement path.

Human Governance can durably detect an expired abandoned claim even when the
worker never returns. This detection moves the delivery only to `uncertain`;
it does not decide the outcome.

The current outcome contract stores only:

- explicit `externalEffect: none`;
- a result digest for simulation;
- or typed error/reason codes, message/evidence digests and retryability.

Raw connector responses and raw errors are rejected.

## Process Worker

The demo now sends the active claimed delivery to a separate local Node.js
process. The request binds the full Delivery Intent, delivery, fencing claim,
Connector Instance, short validity window and parent-verified worker release.
The response binds that exact request, includes the bootstrap-observed package
and trust verification and may contain only a digest-based simulated outcome.

The parent uses no shell, forwards no parent environment, limits input/output,
enforces a timeout, verifies the canonical package, closed worker source graph,
local Ed25519 release and exact trust-anchor pin, and requires clean exit code
zero with empty standard error. The bootstrap repeats release verification
before evaluating the packaged modules from memory. A valid response followed
by a crash is rejected.

The child has no runtime object, database handle or signing key. It cannot
claim or record a delivery. The parent records an accepted result through the
existing authenticated Connector principal.

The default process-only path is not an OS sandbox and reports network and
filesystem-write isolation false.

On Darwin only, a separate experimental mode launches through a fixed
`sandbox-exec` profile that denies `network*` and `file-write*`. Its request
binds the inspected launcher/policy digest, and the child must prove listen,
connect and write-open denial before either enforcement flag can be true.
Missing or bypassed enforcement rejects the worker and records no outcome.

The interface is deprecated, the response is not independently signed and the
profile does not isolate filesystem reads or general resources. Package,
bootstrap, verifier and pilot trust pin remain mutable and repository-local.
See
`PROCESS_SEPARATED_DRY_RUN_WORKER.md` and
`DARWIN_SANDBOXED_DRY_RUN_WORKER.md`. Current package details and non-claims
are in `VERIFIED_WORKER_PACKAGE.md`; the source-only predecessor remains in
`SIGNED_WORKER_SOURCE_ARTIFACT.md`.

## Transaction Semantics

Each prepare, claim, outcome, expired-claim reconciliation, retry,
cancellation or resolution command joins:

- verified one-time Invocation acceptance;
- the outbox state event;
- any typed execution-failure evidence;

in one local SQLite transaction.

The database transaction does not include an external system. This slice makes
that limitation explicit by admitting only dry-run contracts.

## Demo

```bash
npm run demo:outbox
npm run demo:sandbox
```

The demo completes a two-task Chief of Staff and Operations workflow, prepares
one delivery, claims it as the registered connector, runs the simulation in a
separate child process and records the verified digest-only result. Workflow
evidence includes a content-minimized delivery projection and does not expose
the exact connector parameters.

Expected invariant:

```text
network access admitted:       false
external effect:               none
process separated:             true
process-only isolation flags:  false
Darwin sandbox demo flags:     true after exact denial probes
delivery status:               simulated
```

## Promotion Gate for One Read-Only Sandbox

A real read-only connector still requires:

- supported OS-, container- or infrastructure-enforced worker isolation and
  portable outbound allowlisting;
- independently authenticated worker identity, immutable deployment object
  and externally protected release trust;
- production workload identity and connector revocation;
- outbound network allowlist and DNS/TLS controls;
- secret-vault integration with no secret persistence in events;
- service-specific request/response schema and size limits;
- rate, cost, timeout and concurrency budgets;
- external idempotency or explicit non-repeatability classification;
- worker crash and acknowledgement fault injection;
- independent audit and operational runbook;
- Human Governance approval for the exact connector and environment.

Write, publish, send, payment, personnel and destructive operations remain
outside this gate.
