# KP-010 — Authenticated Command State Requires One Durable Transaction

Status: Knowledge Candidate

Source Projects: Company AI, FDOS Company OS Pilot

Validation Level: Level 1 — Experimental application

## Observation

Durable replay protection alone can prevent duplicate execution while still
losing the intended state transition. If Invocation acceptance and internal
command effects use different commits, process failure can leave a consumed
Invocation with no recorded outcome.

Company AI identified transactional worker claims as the stronger target. The
FDOS pilot tested the narrower local rule by joining one-time Invocation
acceptance, internal transitions and typed failure evidence in one SQLite
transaction.

## Candidate Rule

For an authenticated command:

- bind one transaction ID to Invocation acceptance and every resulting
  internal event;
- include transaction identity in tamper-evident event content;
- verify transaction membership, contiguity, event count, sequence range and
  head hash before rehydration;
- commit recognized post-acceptance business failures with deliberate state
  transitions and content-minimized failure evidence;
- roll back integrity and unexpected pre-commit failures;
- report only confirmed rollback after finalization failure; otherwise stop
  and resolve the uncertain outcome by clean reopen and replay inspection;
- distinguish a local database transaction from external delivery;
- require outbox, idempotency and uncertain-outcome handling before any
  external side effect.

Persistence-format migration must be explicit, reversible and evidence-bound.

## Limit

The tested adapter is one synchronous `node:sqlite` connection protected by a
local process lease. It does not prove distributed fencing, external-effect
atomicity, supported production dependency lifecycle, encryption, migration,
backup, restore, load tolerance or disaster recovery.

## Evidence

- Company AI source assessment in
  `03_Projects/Company_OS_Pilot/Reference_Adoption_Assessment.md`
- `00_Specification/ADR/ADR-0045_Transactional_Authenticated_Command_Experiment.md`
- `04_Evidence/fdos-runtime/EV-FDOS-TRANSACTIONAL-PERSISTENCE-004.md`

## Next Validation

Validate the rule with a durable outbox and an authenticated read-only
sandboxed connector. Then test multi-worker fencing, crash recovery and
uncertain delivery without permitting an external write.
