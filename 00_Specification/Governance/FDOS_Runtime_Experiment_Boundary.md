# FDOS Runtime Experiment Boundary

Status: Active Experiment Control Record  
Authorized: 2026-07-29  
Validation Level: Level 1 — Experimental  
Related Decision: `../ADR/ADR-0043_FDOS_Runtime_Level_1_Experiment.md`

## Purpose

Keep the FDOS Runtime experiment useful, reversible and constitutionally
separate from the stable FDOS Core.

## Authority Boundary

Human Governance retains all strategic, legal, financial, personnel and
publication authority.

The runtime may coordinate bounded internal preparation work. It may not infer
authority from technical capability or from the absence of an explicit denial.

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
- deterministic state transitions,
- role checks,
- approval binding,
- a tamper-evident local audit chain.

It does not yet provide:

- authenticated network identities,
- encryption key management,
- transactional or distributed multi-process concurrency,
- database transactions,
- tenant isolation,
- secret management,
- connector sandboxing,
- incident response,
- backup and disaster recovery,
- production observability.

## Stop Conditions

Execution must stop safely when:

- an action type is unknown;
- an action is classified below its registered minimum;
- a capability is missing;
- a task or approval intent changed;
- approval expired or was already used;
- a data scope is not authorized;
- the event chain fails integrity verification;
- another process owns the runtime directory;
- a reference source changes during capture or has tracked worktree drift;
- reference evidence is missing, malformed or digest-invalid;
- required workflow evidence is missing.
