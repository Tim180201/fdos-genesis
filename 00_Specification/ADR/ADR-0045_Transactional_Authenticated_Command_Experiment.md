# ADR-0045 — Transactional Authenticated Command Experiment

Status: Accepted for Experiment; Not Accepted into FDOS Core

Decision Date: 2026-07-29

Decision Owner: Human Governance

Validation Level: Level 1 — Experimental

Related Decisions:

- `ADR-0043_FDOS_Runtime_Level_1_Experiment.md`
- `ADR-0044_Authenticated_Invocation_Boundary_Experiment.md`

## Decision

The authenticated FDOS Runtime experiment shall persist each accepted
Invocation and all resulting internal command events as one local SQLite
transaction.

`AuthenticatedRuntimeGateway` requires the transactional store. The legacy
JSONL event log remains available only for the lower-level reference and
compatibility test surface.

The runtime shall not migrate a non-empty store implicitly. A persistence
format change requires a separately reviewed and explicit migration.

## Context

Technical Slice 3 consumed an Invocation before dispatch so replay could not
repeat an uncertain command. Its JSONL event log could still crash after
durably accepting the Invocation but before recording the corresponding
business transition.

That gap was acceptable only while the runtime had no model provider,
connector or external effect. It had to be narrowed before any integration
experiment.

Company AI supplied the useful reference direction: transactional claims and
worker ownership. TapTime supplied the verification discipline: crash,
tamper, restart and omitted-check evidence must be explicit. FDOS adopts the
control principles without copying either product architecture.

## Experimental Mechanism

The Level 1 implementation shall:

1. use one file-backed SQLite database per runtime directory;
2. retain the exclusive runtime-directory process lease;
3. identify the database with an application ID, user version and exact
   metadata;
4. use strict event, transaction and metadata tables;
5. use `BEGIN IMMEDIATE`, full synchronous durability and rollback journaling;
6. record a unique transaction ID in every event produced by an authenticated
   command;
7. include that transaction ID in the event hash;
8. keep each transaction's events contiguous in the global hash chain;
9. bind transaction metadata to its event count, sequence range and head hash;
10. verify database integrity, event content, hash links and transaction
    metadata before rehydration;
11. reject empty, nested, stale or out-of-context transaction writes;
12. expose transaction identity in content-minimized workflow evidence.

The adapter uses Node.js `node:sqlite` synchronously. The package therefore
requires Node.js 22.13 or newer. The API remains an evolving platform
dependency and is not treated as a production-readiness signal.

## Authenticated Command Unit

The transaction boundary is:

```text
BEGIN IMMEDIATE
  identity.invocation.accepted
  zero or more intended internal command transitions
  identity.invocation.execution-failed, when failure is expected and recordable
COMMIT
```

On success, Invocation acceptance and every resulting internal event commit
together.

On a recognized validation, authorization, conflict, not-found or policy
failure after acceptance:

- the Invocation remains consumed;
- any deliberate internal transition already produced by evaluating the
  command remains durable;
- a content-minimized execution-failure event is committed in the same
  transaction;
- raw error text is not stored; only its digest and typed code are retained.

This rule is necessary for time-driven state such as approval expiry. An
expired approval must become durably expired even though the attempted grant
is denied.

An invalid envelope, signature, scope, time window, principal or replay fails
before a new acceptance event. Its empty transaction attempt rolls back.

On an integrity or unexpected implementation failure before commit, the whole
local transaction rolls back and runtime state is rehydrated from committed
events. The Invocation is not consumed.

A persistence failure during finalization can make commit acknowledgement
uncertain. The adapter attempts rollback and reloads visible state. It reports
`rolled-back` only when rollback completed; otherwise the outcome remains
`uncertain`. A caller must stop, reopen cleanly and inspect audit/replay state.
It must never assume rollback from a persistence error alone.

That retry rule is safe only while the command cannot have an external side
effect. A connector requires an outbox, idempotency and uncertain-outcome
review before it may use this path.

## Persistence Selection and Migration

The runtime accepts `jsonl`, `sqlite` or `auto` selection.

- Authenticated operation requires explicit `sqlite`.
- `auto` reopens the one existing non-empty format.
- Two non-empty formats fail closed.
- Requesting a different format beside a non-empty store fails closed.
- No bytes are copied, transformed or deleted automatically.

This experiment deliberately provides no migration command. Migration needs
its own backup, source/target digest, count, ordering, rollback and human
acceptance evidence.

## Expected Evidence

The experiment should demonstrate or falsify:

- one authenticated command produces one committed transaction group;
- all Invocation-attributed events share acceptance transaction and
  correlation identifiers;
- expected command failure is durable and consumes the Invocation;
- unexpected pre-commit failure rolls back both acceptance and internal
  effects;
- finalization failure behavior remains explicit as an unvalidated operational
  recovery path;
- process termination during a pre-commit transaction leaves no partial
  events;
- restart reconstructs only committed state;
- event or transaction-metadata tampering fails closed;
- JSONL data is never migrated implicitly;
- the three-role pilot still completes with no external action.

## Consequences

Positive:

- the accepted-without-command-event crash window is removed for local
  internal authenticated commands;
- replay state and command state now share one durability boundary;
- transaction grouping is independently inspectable in audit evidence;
- format ambiguity and silent migration fail closed.

Negative:

- synchronous SQLite work can block the Node.js event loop;
- the implementation depends on an evolving Node.js built-in API;
- one local file and process lease are not distributed coordination;
- database confidentiality, backup, recovery, retention and key management
  remain unsolved;
- expected failure semantics must distinguish deliberate state transitions
  from implementation faults.

## Promotion Rule

Passing the local transaction tests does not establish production
persistence.

Promotion requires at least:

- a supported database/runtime dependency decision;
- encrypted storage and secrets handling;
- backup, restore and disaster-recovery validation;
- schema migration and rollback procedures;
- load, quota and denial-of-service controls;
- multi-process or distributed fencing;
- an outbox and idempotency model for external effects;
- operational observability and incident procedures;
- independent review and Human Governance approval.
