# Company OS Pilot — Decision Log

Status: Active

## PILOT-DEC-001 — Runtime Location

Date: 2026-07-29  
Decision: Implement only inside `fdos-genesis`, separated into Reference
Implementation and Project layers.  
Rationale: Preserve repository ownership and the FDOS separation policy.

## PILOT-DEC-002 — Internal-Only First Slice

Date: 2026-07-29  
Decision: Implement coordination and governance before model or connector
execution.  
Rationale: Authorization, evidence and failure behavior must exist before
external side effects are introduced.

## PILOT-DEC-003 — Event-Sourced Audit

Date: 2026-07-29  
Decision: Persist material transitions in an append-only SHA-256 hash chain.  
Rationale: A normal mutable log cannot demonstrate whether historical events
were changed.

## PILOT-DEC-004 — Approval Binding

Date: 2026-07-29  
Decision: Bind A2 approval to the complete canonical action intent and consume
it once.  
Rationale: Approval of a task label alone can be replayed after the target or
parameters change.

## PILOT-DEC-005 — A3/A4 Fail Closed

Date: 2026-07-29  
Decision: Block material external and destructive actions in Level 1, even
when a human asks the local runtime to approve them.  
Rationale: Production identity, connector isolation and operational controls do
not yet exist.

## PILOT-DEC-006 — Role Definition versus Agent Instance

Date: 2026-07-29  
Decision: Assign tasks and permissions to stable Role Definitions while
attributing claims, results and events to registered Agent Instances.  
Rationale: A role describes organizational responsibility. An agent instance is
a replaceable and revocable runtime identity. Conflating them would prevent
safe multi-instance operation and weaken auditability.

## PILOT-DEC-007 — Exact Git Reference Binding

Date: 2026-07-29  
Decision: Read an approved external repository only through a fixed source
policy and bind commit, tree, complete tracked manifest and exact document
blob.  
Rationale: A path allowlist alone cannot prove which mutable worktree state
produced a later knowledge claim.

## PILOT-DEC-008 — Reference Knowledge Remains a Candidate

Date: 2026-07-29  
Decision: A valid source-evidence digest may accompany a Memory Candidate but
may never promote it automatically.  
Rationale: Byte integrity proves provenance, not semantic correctness,
authority, scope or current validity.

## PILOT-DEC-009 — Exclusive Local Runtime Ownership

Date: 2026-07-29  
Decision: One process lease owns one Level 1 event-store directory. A second
runtime must fail closed.  
Rationale: In-process serialization cannot prevent two processes from
rehydrating the same head and appending competing event sequences.

## PILOT-DEC-010 — Selective Reference Adoption

Date: 2026-07-29  
Decision: Reuse Company AI runtime controls and TapTime evidence/governance
patterns selectively; do not copy either repository wholesale.  
Rationale: FDOS needs reusable organizational controls, not product-specific
code, duplicated ADO or premature connectors.

## PILOT-DEC-011 — Authenticated Gateway Before Integrations

Date: 2026-07-29

Decision: Models, connectors and other untrusted callers may access the
experimental runtime only through an authenticated command gateway.

Rationale: Giving an integration the lower-level runtime object would allow it
to submit caller-asserted actor identities and bypass the new trust boundary.

## PILOT-DEC-012 — Identity Without Role Claims

Date: 2026-07-29

Decision: A signed agent principal binds only the Agent Instance identifier.
FDOS derives the role and lifecycle status from the Agent Registry.

Rationale: Cryptographically signing a caller-selected role would authenticate
the claim's origin but would not prove that the principal currently owns that
role.

## PILOT-DEC-013 — Persistent One-Time Invocation

Date: 2026-07-29

Decision: Consume a verified Invocation ID in the event log before dispatch
and reject its reuse after success, failure, concurrency or restart.

Rationale: In-memory replay caches disappear on restart and consuming only
after success permits duplicate execution after an uncertain outcome.

## PILOT-DEC-014 — Local Signer Is Test Infrastructure

Date: 2026-07-29

Decision: Use an ephemeral Ed25519 signer only for the local experiment and
give the runtime verifier public trust material only.

Rationale: This proves signature and claim enforcement without pretending that
local key generation authenticates a production human or workload.

## PILOT-DEC-015 — One Local Transaction per Authenticated Command

Date: 2026-07-29

Decision: Persist Invocation acceptance and every resulting internal command
event in one SQLite transaction with a shared transaction ID.

Rationale: Replay prevention and business state must not diverge when the
process stops between acceptance and internal command persistence.

## PILOT-DEC-016 — Typed Failure Semantics

Date: 2026-07-29

Decision: A recognized post-acceptance business failure consumes the
Invocation and commits deliberate internal transitions plus content-minimized
failure evidence. Integrity and unexpected pre-commit failures roll the whole
local transaction back. A finalization failure reports confirmed rollback or
an uncertain outcome and requires a clean reopen.

Rationale: Approval expiry must remain durable when a late decision is denied,
while implementation faults must not leave partial internal state.

This distinction is authorized only while external effects remain disabled.

## PILOT-DEC-017 — No Implicit Persistence Migration

Date: 2026-07-29

Decision: Detect the sole non-empty JSONL or SQLite format when explicitly
requested, but reject format switches and dual non-empty stores. Provide no
automatic migration in this slice.

Rationale: Silent conversion would make source, target, rollback and evidence
state ambiguous.

## PILOT-DEC-018 — Node SQLite Remains an Experimental Dependency

Date: 2026-07-29

Decision: Use synchronous built-in `node:sqlite` for the bounded Level 1
adapter, require Node.js 22.13 or newer and record the exact tested runtime
version.

Rationale: It avoids an added package supply-chain dependency and provides the
needed local transaction primitive, but its evolving stability and blocking
API prevent any production-support claim.
