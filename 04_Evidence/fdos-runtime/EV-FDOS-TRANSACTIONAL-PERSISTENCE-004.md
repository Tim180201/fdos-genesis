# Evidence Record — Transactional Authenticated Persistence

Status: Evidence Item / Human Review Required

Project: FDOS Company OS Pilot

Date: 2026-07-29

Confidence: Medium for tested local behavior; Low for production fitness

FDOS Validation Level: Level 1 — Experimental

Core Impact: None

## 1. Purpose

Record executable evidence that the FDOS experimental runtime can commit
authenticated Invocation acceptance and resulting internal command events as
one local transaction, recover without partial events and preserve its
fail-closed migration and audit boundaries.

This record does not claim production database or external-effect atomicity.

## 2. Evaluated Source

Change baseline:

- FDOS commit:
  `5eb93c831f070a201a1e1763a944b2ea728df519`
- FDOS tree:
  `c7921ca0ef36f2c36cdd7c3d4e0f6aeb597ffd79`

The complete 44-file runtime candidate is bound by:

- manifest:
  `EV-FDOS-TRANSACTIONAL-PERSISTENCE-004_Source_Manifest.sha256`
- manifest digest:
  `sha256:972a7a463cb081626ba4bcaf9c99c37420b7552594e938398fd062b3a80d5d91`

Test environment:

- runtime package: `@fdos/runtime-reference@0.4.0-experimental`
- Node.js: `v24.17.0`
- operating system kernel: `Darwin 25.5.0 arm64`

Compatibility outside this exact environment was not independently exercised.
The package requires Node.js 22.13 or newer because that release exposed
`node:sqlite` without an enabling flag. The API remains experimental or
release-candidate depending on the Node.js line.

Official dependency references:

- <https://nodejs.org/download/release/v22.13.0/docs/api/sqlite.html>
- <https://nodejs.org/download/release/v24.18.0/docs/api/sqlite.html>
- <https://nodejs.org/download/release/v26.2.0/docs/api/sqlite.html>

## 3. Implemented Boundary

### Store identity and schema

The authenticated runtime stores events in `events.sqlite`.

The adapter:

- pre-creates a regular `0600` file and rejects a symbolic-link path;
- disables extension loading and double-quoted string literals;
- enables foreign keys;
- uses strict metadata, transaction and event tables;
- binds exact application ID, user version, store kind and schema version;
- uses rollback-journal mode and `synchronous = FULL`;
- retains the exclusive runtime-directory lease.

On open it runs SQLite quick-check and then verifies exact store identity,
canonical event JSON, indexed event columns, the global SHA-256 hash chain and
transaction metadata.

### Transaction-bound events

Each authenticated command uses `BEGIN IMMEDIATE`.

After identity verification, `identity.invocation.accepted` and every
Invocation-attributed internal event receive one transaction ID. The ID is
included in canonical event content and therefore in the event hash.

Transaction records bind:

- start and commit time;
- event count;
- first and last sequence;
- transaction head hash.

Transaction event groups must be contiguous. Empty, nested, stale and
out-of-context transaction writes fail closed.

### Failure semantics

After acceptance, recognized validation, authorization, conflict, not-found
and policy failures commit:

- the accepted Invocation;
- any deliberate internal transition already produced;
- `identity.invocation.execution-failed`.

Failure evidence contains typed code, error class, operation, command digest,
failure time and a digest of the message. Raw error text is not persisted.

The approval-expiry test demonstrates the intentional case: expiry and failure
commit together while no grant event exists.

Integrity and unexpected implementation failures before commit roll back
acceptance and all internal events, then rehydrate state from committed
history. A child-process termination during a live pre-commit transaction
likewise reopened with no partial event or transaction.

If transaction finalization fails, the adapter attempts rollback, reloads
visible state and reports `rolled-back` only after confirmed rollback;
otherwise the outcome is explicitly uncertain and requires a clean reopen.
This branch is implemented but was not fault-injected in this evidence run.

This fatal-retry behavior assumes no external effect. All connectors remain
disabled.

### Persistence selection

Authenticated open requires SQLite.

The lower-level verifier can select `auto`, which only reopens the sole
non-empty existing format. The runtime rejects:

- SQLite beside non-empty JSONL;
- JSONL beside non-empty SQLite;
- two non-empty formats;
- non-regular persistence paths.

No migration, copy, deletion or archival command exists.

## 4. Verification

### Static and complete regression

```text
npm run check
tests 92
pass 92
fail 0
skipped 0
```

The command includes syntax checks for the CLI, identity verifier, Git
reference adapter, runtime lease, SQLite event store and authenticated
gateway.

### Coverage

```text
npm run coverage
line coverage:     90.16%
branch coverage:   78.04%
function coverage: 90.56%

sqlite-event-store.js:
line coverage:     83.19%
branch coverage:   74.19%
function coverage: 89.47%
```

Coverage supports implementation review. It is not a database audit,
durability certification or production-security claim.

### Focused boundary suite

Twenty authenticated-command tests and nine SQLite-store tests passed,
covering:

- successful multi-event commit and transaction attribution;
- persistent recognized failure and replay rejection;
- approval expiry plus failure in one transaction;
- fatal rollback of acceptance and workflow effects;
- process exit before commit;
- restart and persistence auto-detection;
- empty, nested, stale and out-of-context transaction denial;
- savepoint rollback;
- event-content, transaction-metadata and store-version tampering;
- symbolic-link path rejection without target modification;
- non-empty JSONL migration denial;
- dual non-empty format denial;
- full three-role transaction grouping.

### Authenticated pilot

```text
identity mode:             authenticated-invocation
persistence:               sqlite schema 1.0
run status:                completed
workflow tasks:            4
accepted Invocations:      14
committed transactions:    14
final audit events:        29
audit chain valid:         true
evidence events at export: 28
accepted memory items:     1
external actions:          false
```

The evidence export was generated inside transaction 13. Its generation-time
status reported 13 visible transaction records, 12 already committed and one
active. The export transaction and final memory-read transaction committed
afterward, producing the final 14/14 inactive status.
The normal final status also reported `recoveryRequired: false`.

### Source-manifest verification

From `02_Reference_Implementations/FDOS_Runtime/`:

```text
shasum -a 256 -c \
  ../../04_Evidence/fdos-runtime/EV-FDOS-TRANSACTIONAL-PERSISTENCE-004_Source_Manifest.sha256
44 files OK
```

## 5. Negative Evidence and Limits

This evidence does not prove:

- production SQLite support or dependency stability;
- compatibility outside Node.js `v24.17.0`;
- asynchronous or non-blocking database operation;
- distributed worker fencing, consensus or multi-host operation;
- atomicity with a connector or any external system;
- fault-injected commit-acknowledgement and reload failure recovery;
- outbox, idempotent delivery or uncertain-outcome recovery;
- encryption, database credentials or external key management;
- schema migration, downgrade, backup, restore or disaster recovery;
- storage quotas, retention or privacy deletion;
- hostile-host, filesystem-admin or supply-chain protection;
- production human/workload identity, revocation or federation;
- independently signed evidence exports;
- real workload, load, latency or contention fitness.

`synchronous = FULL` and a passing crash test narrow one local failure mode.
They are not a hardware durability guarantee.

## 6. Interpretation

Supported conclusion:

> Within the bound local Level 1 source, FDOS can commit one authenticated
> Invocation and its internal command events in one verified SQLite
> transaction, roll an uncommitted process failure back, preserve deliberate
> typed business failures and reject ambiguous persistence state.

Unsupported conclusions:

- FDOS has production-grade persistence;
- a transaction includes an external side effect;
- a connector, model provider or communication ingress may now be enabled;
- the runtime is safe for concurrent distributed workers;
- the persistence pattern is validated FDOS Core knowledge.

## 7. Governance

All implementation and documentation changes are confined to `fdos-genesis`.
TapTime and Company AI remain independent read-only references.

This Evidence Record supports Human Governance review of Technical Slice 4. It
authorizes no migration, external action, deployment, FDOS Core change or
knowledge promotion.
