# Company OS Pilot — Validation Report 004

Status: Technical Slice 4 Passed / Human Review Pending

Date: 2026-07-29

Validation Level: Level 1 — Experimental

## Outcome

The authenticated Chief of Staff, Operations and Marketing pilot now commits
each accepted Invocation and its resulting internal events as one local SQLite
transaction.

The tested adapter recovered from process termination without partial events,
rolled back unexpected implementation failures, preserved typed business
failures, verified transaction metadata across restart and refused implicit
JSONL migration.

No model provider, connector, external communication, product repository or
deployment was invoked.

## Acceptance Matrix

| Criterion | Result | Evidence |
|---|---|---|
| Complete automated suite | Passed, 92/92 | `../../04_Evidence/fdos-runtime/EV-FDOS-TRANSACTIONAL-PERSISTENCE-004.md` |
| Focused persistence/authenticated suite | Passed, 29/29 | SQLite and authenticated-invocation tests |
| Authenticated four-step pilot | Passed | `npm run demo`; end-to-end test |
| One transaction per accepted pilot command | Passed locally | 14 accepted Invocations; 14 committed transactions |
| Invocation-event transaction binding | Passed locally | full pilot audit grouping assertion |
| Recognized business failure | Passed locally | acceptance plus typed failure committed; replay denied |
| Approval-expiry failure semantics | Passed locally | expiry and failure share transaction; grant absent |
| Unexpected implementation failure | Passed locally | acceptance, workflow and events rolled back |
| Process exit before commit | Passed locally | reopened store contained zero partial events/transactions |
| Restart and auto format detection | Passed locally | committed SQLite state rehydrated without migration |
| Event-content tamper | Rejected | canonical event/column and hash verification |
| Transaction-metadata/store-version tamper | Rejected | count and schema identity verification |
| Stale, nested and out-of-context writes | Rejected | transaction-context tests |
| Symbolic-link database path | Rejected | target remained unchanged |
| Non-empty JSONL migration | Rejected | no SQLite file created |
| Two non-empty formats | Rejected | selection failed before open |
| Evidence transaction attribution | Passed locally | workflow evidence contains transaction IDs |
| External actions | Absent | gateway command allowlist and demo |
| Production persistence assurance | Not established | explicitly out of scope |

## Test Quality

- 92 tests passed.
- 90.16% line coverage.
- 78.04% branch coverage.
- 90.56% function coverage.
- `sqlite-event-store.js` reached 83.19% line, 74.19% branch and 89.47%
  function coverage.

Coverage is supporting implementation evidence. It is not a SQLite audit,
durability certification or production-security claim.

## Demonstrated Pilot Result

- four workflow tasks completed;
- Chief of Staff, Operations and Marketing participated;
- 14 authenticated Invocations were accepted;
- 14 local transactions committed;
- every Invocation-attributed event shared its acceptance transaction and
  correlation ID;
- the final runtime audit contained 29 valid hash-chained events;
- the evidence export contained the 28 events present at export time;
- one later authenticated memory read produced event 29;
- no external action executed.

The evidence export itself is generated inside its authenticated transaction.
Its embedded persistence status distinguishes the active transaction from the
already committed count.

## Open Findings

1. `node:sqlite` remains an evolving, release-candidate API in the tested
   Node.js line.
2. Its synchronous calls can block the event loop; load and contention were
   not tested.
3. One local process lease and file do not provide distributed worker fencing.
4. No encryption, schema migration, backup, restore, disaster recovery,
   retention or privacy-deletion procedure exists.
5. No transaction spans an external system; outbox, idempotency and
   uncertain-outcome handling are absent.
6. The local signer still is not a production identity provider.
7. The host process, local filesystem and trust bootstrap remain trusted.
8. Direct lower-level runtime access remains an architectural bypass risk.
9. Evidence exports are hash-bound but not independently signed.
10. Commit-acknowledgement and reload failures were not fault-injected.
11. No connector, model provider or real organizational workload was
    validated.

## Decision Request

Human Governance may accept Technical Slice 4 as Level 1 evidence that one
local authenticated internal command can have atomic replay and state
persistence.

The next bounded experiment should specify, while keeping execution disabled:

- a connector command contract;
- a durable outbox;
- idempotency and deduplication;
- delivery states and retries;
- uncertain-outcome Human Governance review;
- a read-only sandbox acceptance plan.

This report authorizes no connector execution, external action, production
deployment or FDOS Core promotion.
