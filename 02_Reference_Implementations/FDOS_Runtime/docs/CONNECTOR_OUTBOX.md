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

The outbox stores normalized parameters because a future isolated worker needs
an exact request. The contract limits their names, types and size. Restricted
or secret material remains prohibited; credential-looking field names fail
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
```

The demo completes a two-task Chief of Staff and Operations workflow, prepares
one delivery, claims it as the registered connector and records a simulated
digest-only result. Workflow evidence includes a content-minimized delivery
projection and does not expose the exact connector parameters.

Expected invariant:

```text
network access:      false
external effect:     none
delivery status:     simulated
```

## Promotion Gate for One Read-Only Sandbox

A real read-only connector still requires:

- isolated worker process and package/API boundary;
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
