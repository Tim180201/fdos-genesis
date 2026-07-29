# KP-008 — A Non-Transactional Event Store Requires Exclusive Ownership

Status: Knowledge Candidate  
Source Projects: Company AI, FDOS Company OS Pilot  
Validation Level: Level 1 — Experimental application

## Observation

In-process promise serialization prevents duplicate mutations only inside one
process. Two processes can still derive the same next sequence/hash and append
conflicting events to a local JSONL store.

Company AI uses a work-run lease to prevent parallel queue runners. The FDOS
pilot applies exclusive ownership to the complete local event-store runtime.

## Candidate Rule

Until a transactional event store exists:

- exactly one process should own a writable local store;
- ownership must be acquired atomically;
- ownership must carry a unique identifier, process identity and expiry;
- release must match the exact ownership identifier;
- stale recovery must require both expiry and a dead owner;
- malformed ownership state must fail closed;
- a closed owner must reject later mutations.

## Limit

A filesystem lease is a Level 1 safety control. It does not provide
transactions across multiple events, distributed consensus, fencing tokens,
tenant isolation or hostile-host protection.

## Experimental Follow-Up

Technical Slice 4 added a local SQLite transaction for authenticated commands.
The lease remains necessary because the adapter does not provide distributed
worker fencing or protect against a non-cooperating host process.

## Evidence

- Company AI `src/run-lease.js` at commit `feb1000ea362…`
- `04_Evidence/fdos-runtime/EV-FDOS-REFERENCE-INTAKE-002.md`
- `04_Evidence/fdos-runtime/EV-FDOS-TRANSACTIONAL-PERSISTENCE-004.md`

## Next Validation

Validate concurrent worker claims, fencing, durable outbox behavior and
idempotent completion across multiple processes.
