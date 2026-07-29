# FDOS Runtime Experiment Boundary

Status: Active Experiment Control Record  
Authorized: 2026-07-29  
Validation Level: Level 1 — Experimental  
Related Decision: `../ADR/ADR-0043_FDOS_Runtime_Level_1_Experiment.md`

Related Identity Decision:
`../ADR/ADR-0044_Authenticated_Invocation_Boundary_Experiment.md`

Related Persistence Decision:
`../ADR/ADR-0045_Transactional_Authenticated_Command_Experiment.md`

## Purpose

Keep the FDOS Runtime experiment useful, reversible and constitutionally
separate from the stable FDOS Core.

## Authority Boundary

Human Governance retains all strategic, legal, financial, personnel and
publication authority.

The runtime may coordinate bounded internal preparation work. It may not infer
authority from technical capability or from the absence of an explicit denial.

## Invocation Boundary

Untrusted commands must enter through the authenticated runtime gateway.

The gateway requires one signed Invocation Context bound to:

- an explicitly trusted issuer and public key;
- the FDOS runtime audience;
- one organization;
- one human or registered Agent Instance identifier;
- one exact operation and command digest;
- a short validity window;
- a unique one-time Invocation ID.

Caller-provided role claims are prohibited. FDOS derives an agent's role from
the Agent Registry after identity verification.

The local demo signing authority is experimental and may not be treated as a
production identity provider. Connector principals remain denied.

Every accepted command at this boundary requires the local SQLite adapter.
Invocation acceptance, internal command events and typed business-failure
evidence share one transaction ID and one commit.

## Execution Boundary

| Class | Meaning | Experimental Runtime |
|---|---|---|
| A0 | Read, analyze or synthesize | May execute with role authorization |
| A1 | Internal and reversible preparation | May execute with role authorization and audit |
| A2 | Bounded, reversible side effect | Requires an exact, unexpired, one-time human approval |
| A3 | Material external or privileged action | Blocked |
| A4 | Destructive, irreversible or governance-bypassing action | Blocked |

Email sending, publication, contract signing, payment execution, record
deletion and personnel decisions are A3 or A4 and remain blocked.

## Information Boundary

- Company memory is visible only to roles with company-memory access.
- Department memory is visible only to its department and the Chief of Staff.
- Cross-department task results are visible only through explicit workflow
  dependencies.
- Restricted information is rejected by this experiment.
- Confidential information is permitted only inside authorized scopes and
  remains subject to the local-storage limitations documented by the runtime.

## Integration Boundary

No Slack, Teams, email, calendar, CRM, GitHub, accounting or MCP connector is
enabled in this experiment.

A future connector must have:

- a registered action type,
- a least-privilege capability,
- an explicit target,
- idempotency behavior,
- an approval policy,
- result evidence,
- failure and retry semantics,
- a dedicated threat review.

The local SQLite transaction does not include a connector. Any connector also
requires a transactional outbox, idempotency key and explicit
uncertain-outcome review before activation.

## Persistence Boundary

- The authenticated gateway requires `events.sqlite`.
- The runtime keeps an exclusive process lease for the store directory.
- Database, event-chain and transaction metadata are verified before
  rehydration.
- A non-empty JSONL store is never migrated implicitly.
- Two non-empty persistence formats fail closed.
- Event-content or transaction-metadata mismatch fails closed.
- An unexpected pre-commit failure rolls the local command transaction back
  and rehydrates committed state.
- A finalization failure reports confirmed rollback or an uncertain outcome;
  callers must stop and reopen rather than assume an outcome.
- No migration, deletion or archival action is implemented.

The adapter uses synchronous `node:sqlite` and requires Node.js 22.13 or newer.
That API remains an evolving dependency and does not establish production
support.

## Repository Boundary

Implementation work for this experiment is restricted to
`fdos-genesis`.

Other product or platform repositories are evidence sources only when Human
Governance explicitly authorizes read access. They are never modified by this
experiment.

Approved reference intake must bind an exact committed source state, use an
explicit allowlist and exclude untracked content. Derived statements remain
Memory Candidates until Human Governance reviews their meaning, scope and
sensitivity.

## Production Boundary

This experiment is not production ready.

It provides:

- domain controls,
- local Ed25519-signed Invocation Context verification,
- persistent one-time invocation replay rejection,
- local atomic Invocation acceptance plus internal command-event persistence,
- crash rollback for uncommitted local command events,
- fail-closed persistence format and transaction-metadata verification,
- deterministic state transitions,
- role checks,
- approval binding,
- a tamper-evident local audit chain.

It does not yet provide:

- authenticated network identities,
- production identity-provider federation or key revocation,
- encryption key management,
- a supported production database or schema migration process,
- backup, restore or disaster recovery,
- distributed multi-process fencing or transactions,
- an outbox or atomic external-side-effect delivery,
- tenant isolation,
- secret management,
- connector sandboxing,
- incident response,
- backup and disaster recovery,
- production observability.

## Stop Conditions

Execution must stop safely when:

- an Invocation signature, issuer, audience or organization is invalid;
- an Invocation is expired, not active, replayed or command-mismatched;
- a caller attempts to provide a role inside authenticated identity claims;
- an action type is unknown;
- an action is classified below its registered minimum;
- a capability is missing;
- a task or approval intent changed;
- approval expired or was already used;
- a data scope is not authorized;
- the event chain fails integrity verification;
- SQLite identity, schema, canonical event content or transaction metadata is
  invalid;
- two non-empty persistence formats exist or a format change would require
  implicit migration;
- an append originates outside the active transaction context;
- another process owns the runtime directory;
- a reference source changes during capture or has tracked worktree drift;
- reference evidence is missing, malformed or digest-invalid;
- required workflow evidence is missing.
