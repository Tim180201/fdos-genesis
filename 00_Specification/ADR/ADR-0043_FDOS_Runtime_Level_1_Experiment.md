# ADR-0043 — FDOS Runtime as a Level 1 Reference Implementation Experiment

Status: Accepted for Experiment; Not Accepted into FDOS Core  
Decision Date: 2026-07-29  
Decision Owner: Human Governance  
Validation Level: Level 1 — Experimental

## Decision

FDOS may implement a small, self-contained runtime under
`02_Reference_Implementations/FDOS_Runtime/`.

The runtime is a Reference Implementation Candidate. It is not part of the
FDOS Core, does not redefine the canonical object model and does not establish
new organizational standards.

The first validation project is maintained separately under
`03_Projects/Company_OS_Pilot/`.

## Context

FDOS defines a stable organizational architecture, an AI Constitution,
collaboration rules and an evidence lifecycle. The repository does not yet
contain an executable implementation that can test whether these concepts are
sufficient for a controlled multi-agent workflow.

Human Governance authorized implementation of a bounded pilot consisting of:

- Chief of Staff,
- Operations,
- Marketing,
- reusable role definitions separated from attributable agent instances,
- explicit tasks and handovers,
- role-scoped access,
- action-intent-bound approvals,
- controlled organizational memory,
- tamper-evident audit events,
- one fully tested internal workflow.

The existing Transition to Operations Plan rejects speculative platform-runtime
expansion. This decision does not override that rule. It authorizes a limited
experiment whose purpose is to generate the missing evidence.

## Boundaries

The experiment shall:

1. remain entirely inside the FDOS repository;
2. introduce no FDOS Core capability or canonical object identifier;
3. execute no network, email, publication, payment, contract, deletion,
   personnel or production action;
4. treat all external integrations as disabled;
5. use least privilege and deny unknown actions by default;
6. require a human decision for bounded A2 actions;
7. block A3 and A4 execution completely;
8. preserve traceability through an append-only, hash-chained event log;
9. keep long-term memory in candidate state until human review;
10. treat external repositories as exact, allowlisted read-only evidence
    sources only;
11. prevent concurrent ownership of the local event store;
12. record limitations and expected evidence explicitly.

## Expected Evidence

The experiment should demonstrate or falsify:

- deterministic workflow state transitions;
- explicit responsibility transfer between the three pilot roles;
- rejection of an agent instance claiming another role identity;
- rejection of cross-department data access;
- rejection of unknown or under-classified actions;
- exact binding of approval to action intent;
- one-time and time-bounded approval use;
- detection of audit-log tampering;
- controlled promotion of memory candidates;
- exact binding and content minimization of read-only source evidence;
- rejection of concurrent local runtime ownership;
- completion of the pilot workflow without external side effects.

## Consequences

Positive:

- FDOS concepts become executable and testable.
- Security boundaries can be evaluated before connectors are introduced.
- Project evidence can guide later architecture decisions.

Negative:

- A runtime introduces implementation and maintenance cost.
- A local process-leased implementation cannot prove production security,
  transactional consistency, distributed coordination or operational
  scalability.
- New runtime terms may be mistaken for Core objects unless their experimental
  status remains visible.

## Promotion Rule

No part of this experiment may become a Core standard solely because the tests
pass.

Promotion requires project evidence, limitations, review, and the validation
progression defined in `FDOS_Validation_Levels.md`.

## Reversibility

The experiment is isolated in the Reference Implementation and Project layers.
It can be revised or retired without changing the FDOS Core.
