# Transactional Persistence

Status: Experimental Design

Validation Level: Level 1

Production Status: Not Production Ready

Related Decision:
`../../../00_Specification/ADR/ADR-0045_Transactional_Authenticated_Command_Experiment.md`

## Purpose

Join authenticated Invocation acceptance and its internal command effects in
one durable local transaction.

The adapter narrows one demonstrated crash window. It does not provide a
distributed database, an external-side-effect transaction or a production
storage service.

## Store Layout

The authenticated runtime writes `events.sqlite` in its leased runtime
directory.

The database contains:

- `fdos_metadata` — exact store kind and schema version;
- `fdos_transactions` — transaction start/commit time, event count, sequence
  range and head hash;
- `fdos_events` — canonical event JSON plus indexed sequence, ID, transaction
  ID and hash columns.

The database uses:

- strict tables;
- foreign-key enforcement;
- disabled extension loading;
- disabled double-quoted string literals;
- `PRAGMA application_id` and `PRAGMA user_version`;
- rollback-journal mode;
- `synchronous = FULL`;
- a `0600` regular database file.

The runtime directory still has one exact process lease. SQLite transactions
do not replace that ownership control.

## Authenticated Transaction Flow

```text
signed exact command
  -> BEGIN IMMEDIATE
  -> verify Invocation
  -> append identity.invocation.accepted
  -> execute internal command inside a savepoint boundary
  -> append resulting events
  -> COMMIT
  -> return result
```

Every event attributed to the Invocation carries the same:

- Invocation ID;
- correlation ID;
- transaction ID.

The transaction ID is part of canonical event content and therefore part of
the SHA-256 event hash. Transaction groups must remain contiguous.

## Failure Semantics

| Failure class | Invocation accepted durably | Intended internal transitions | Failure evidence | Retry same Invocation |
|---|---:|---:|---:|---:|
| Invalid envelope, signature, scope, time, principal or replay | No new acceptance | None | None | Only with a new valid Invocation; replay remains denied |
| Success | Yes | Committed | Not applicable | No |
| Post-acceptance validation, authorization, conflict, not-found or policy failure | Yes | Committed if deliberately produced | Same transaction | No |
| Integrity failure before commit | No | Rolled back | None from rolled-back transaction | Yes after diagnosis |
| Persistence/finalization failure | Rolled back or uncertain | Rolled back or uncertain | No new failure event | Stop; reopen and inspect audit/replay state |
| Unexpected implementation failure | No | Rolled back | None from rolled-back transaction | Yes after diagnosis |
| Process exits before commit | No | Rolled back by SQLite recovery | None | Yes after diagnosis |

Recognized post-acceptance business failures are content-minimized as
`identity.invocation.execution-failed`. The event records operation, command
digest, error code and type, failure time and a digest of the error message.
It does not persist raw error text.

Approval expiry is a deliberate state transition. When a human tries to grant
an already expired approval, expiry and failure evidence commit with that
Invocation while no grant event is written.

The rollback-and-retry behavior for unexpected failures assumes that no
external effect exists. Connectors remain disabled until an outbox,
idempotency key and uncertain-outcome workflow are separately implemented and
approved.

SQLite commit acknowledgement can itself fail. The adapter attempts rollback
and reloads visible state. It reports `rolled-back` only if rollback completed;
otherwise the outcome is `uncertain`. If reload also fails, it remains
uncertain. The runtime must be stopped and reopened cleanly before audit/replay
inspection. A persistence error alone is never evidence that the Invocation
can be retried safely.

## Open and Verification

Before state rehydration, the adapter checks:

1. the path is a regular file and not a symbolic link;
2. SQLite quick-check reports success;
3. application ID, user version and metadata match exactly;
4. stored columns exactly match canonical event JSON;
5. event sequence, previous hash and current hash are valid;
6. transaction IDs are structurally valid and contiguous;
7. every transaction record matches its event count, range and head hash;
8. every transactional event references a transaction record.

Event-content or transaction-metadata mismatch fails closed.

`npm run verify -- <directory>` selects the sole non-empty store format and
verifies the complete runtime state without migrating it.

## Persistence Status

The runtime reports:

- `kind` — `sqlite` or `jsonl`;
- `schemaVersion` — persistence schema version;
- `transactional` — adapter capability;
- `transactionCount` — visible transaction records, including the current
  transaction while one is active;
- `committedTransactionCount` — durable committed transaction records;
- `transactionActive` — whether the current process is inside a transaction;
- `recoveryRequired` — whether an uncertain rollback or reload failure has
  blocked all further writes until close and reopen.

An evidence export is itself executed inside an authenticated transaction.
Its embedded generation-time status therefore identifies the active
transaction separately from already committed transactions.

## Format and Migration Boundary

The legacy JSONL store remains readable for lower-level compatibility tests.
It is not accepted by `AuthenticatedRuntimeGateway`.

Selection rules are fail-closed:

- `sqlite` beside non-empty JSONL is rejected;
- `jsonl` beside non-empty SQLite is rejected;
- two non-empty formats are rejected;
- `auto` only detects and reopens the one non-empty format;
- no format is copied, renamed, transformed or deleted.

There is intentionally no migration command in this slice. Preserve or archive
an old experimental runtime directory and start a new SQLite directory.
Any later migration tool needs exact source and target manifests, event-count
and hash verification, backup, rollback and Human Governance acceptance.

## Node.js Dependency Boundary

The adapter uses the synchronous built-in `node:sqlite` API and requires
Node.js 22.13 or newer.

Node.js 22.13 documented the module as active development. Current Node.js 26
documentation describes it as a release candidate. FDOS therefore treats the
API as an experimental dependency and records the exact Node.js version in
each evidence run.

Official references:

- <https://nodejs.org/download/release/v22.13.0/docs/api/sqlite.html>
- <https://nodejs.org/download/release/v24.18.0/docs/api/sqlite.html>

The synchronous API can block the event loop. This Level 1 runtime serializes
commands and has no network ingress, but load and denial-of-service behavior
remain unvalidated.

## Known Limits

- no encryption at rest or external key management;
- no backup, point-in-time recovery or restore test;
- no explicit schema-upgrade or downgrade runner;
- no multi-host or distributed transaction;
- no external-effect transaction or outbox;
- no database authorization separate from the host account;
- no storage quota, retention or privacy-deletion process;
- no load, latency or contention benchmark;
- no independent SQLite or cryptographic audit;
- no compatibility evidence outside the recorded Node.js environment.
