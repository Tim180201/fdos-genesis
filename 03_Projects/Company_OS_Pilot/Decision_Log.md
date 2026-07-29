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
