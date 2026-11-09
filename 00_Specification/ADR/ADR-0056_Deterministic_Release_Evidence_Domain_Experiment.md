# ADR-0056 — Deterministic Release Evidence Domain Experiment

Status: Proposed G2 Implementation Candidate; Human Review Required
Date: 2026-11-09
Decision Owner: Human Governance
Implementation Owner: Technical Lead / Codex
Validation Level: Level 1 — Experimental
Core Impact: None

## Context

ADR-0055 and the Human Governance decision of 2026-11-09 closed Gate G1 and
authorized bounded G2 development of the deterministic Release Evidence domain
and verifier.

The existing FDOS Runtime contains reusable canonicalization, approvals,
hash-chained events and transactional SQLite persistence. It does not contain
the exact revision, evidence, baseline, eligibility and atomic release
authorization model required by the Release Evidence Alpha.

An LLM-generated summary or a mutable status field cannot safely decide
release eligibility. The G2 candidate needs an explicit deterministic model
whose accepted state can be reproduced after restart.

## Proposed Decision

Admit a versioned experimental Release Evidence domain inside the existing
FDOS Runtime, with:

- immutable Change and Decision Revisions;
- content-addressed Work Orders, Release Candidates and Baselines;
- exact Evidence, Finding, Policy, Approval and Approval Consumption objects;
- independent evidence, implementation, review, approval and release axes;
- typed exact-revision relationships;
- deterministic eligibility evaluation with unknown-as-blocking behavior;
- evaluation reproduction from retained inputs before authorization;
- one content-addressed Release Authorization joining approval consumption and
  final status successors;
- deterministic replay through domain events retained by the existing SQLite
  audit store;
- one durable transaction for final approval check and consumption.

The authoritative eligibility engine is ordinary deterministic code. An LLM
may later propose work or explain findings but may not set eligibility,
authority or release status directly.

## Consequences

### Positive

- Every release decision binds exact immutable inputs.
- Requirement, source, artifact, policy, verifier or findings changes produce
  another baseline.
- Unknown integrity, freshness, producer or authority fails closed.
- Approval reuse is rejected after process restart.
- Atomic rollback prevents a checked-but-unrecorded or recorded-but-unchecked
  authorization state.
- The experiment reuses the existing Runtime and SQLite owner rather than
  creating another platform.

### Costs and Limitations

- The contract is intentionally strict and verbose.
- The local operating-system account remains trusted.
- Policies and domain schemas have no production migration tooling.
- GitHub/CI intake, role-bound agent execution and dossiers are not included.
- G2 remains open until evidence is independently reviewed and WP3's dossier
  portion is completed or explicitly re-gated.

## Alternatives Rejected

### One mutable release record

Rejected because concurrent concerns and historical authority would collapse
into a status field that cannot explain which exact revision was approved.

### LLM-based eligibility judgment

Rejected because stochastic output cannot provide deterministic replay or a
security boundary.

### Approval stored separately from finalization

Rejected because a crash between validation and consumption permits ambiguity
or replay.

### New database or microservice

Rejected for G2 because the controlled SQLite owner already provides the
transaction and restart semantics needed by the internal experiment.

## Reversibility

All implementation remains under the Level 1 Runtime reference
implementation. Events use a distinct audit type, schemas are explicitly
versioned and no FDOS Core object is changed. The slice can be revised,
removed or extracted without a Core migration.

## Acceptance

This ADR records the implementation candidate, not its acceptance. Human
Governance or an explicitly independent reviewer must review the linked G2
evidence before changing this ADR to Accepted or closing Gate G2.
