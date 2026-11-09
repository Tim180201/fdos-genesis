# Release Evidence Alpha — Decision Log

Status: Active
Owner: Human Governance

## REA-DEC-001 — Continue Through a Narrow Product Experiment

Date: 2026-11-09

Decision: Continue FDOS as a bounded Release Evidence experiment rather than
immediately building a complete autonomous company platform.

Rationale: The repository contains reusable governance and runtime concepts,
but no sellable control center or proven broad competitive advantage.

## REA-DEC-002 — Extend FDOS Instead of Starting a New Repository

Date: 2026-11-09

Decision: Plan and implement the internal Alpha inside the FDOS repository,
reusing selected Runtime modules and replacing unsafe contracts where needed.

Rationale: Approvals, events, roles, evidence and audit are valuable starting
assets. A clean rewrite would discard evidence and could reproduce the same
errors. A later public CLI or SDK may be extracted after boundaries are
proven.

## REA-DEC-003 — Do Not Expand the FDOS Core

Date: 2026-11-09

Decision: Treat Release Evidence as a Level 1 Project and Reference
Implementation experiment with no automatic Core impact.

Rationale: FDOS governance requires real evidence before architecture or Core
expansion.

## REA-DEC-004 — Build a Deterministic Release Gate

Date: 2026-11-09

Decision: LLMs may prepare, implement, review and summarize, but deterministic
code decides evidence eligibility and approval applicability.

Rationale: Release authority must be reproducible, testable and independent
of probabilistic model output.

## REA-DEC-005 — Use a Modular Monolith and Local Verifier

Date: 2026-11-09

Decision: Use explicit modules inside one deployable/runtime boundary for the
Alpha. Do not introduce microservices, graph storage, vector memory or a
distributed workflow engine.

Rationale: These systems add operations and failure modes without proving the
first product outcome.

## REA-DEC-006 — Support One GitHub Stack First

Date: 2026-11-09

Decision: Support GitHub and GitHub Actions only for the first product path.

Rationale: One narrow stack is necessary to measure setup, correctness and
support cost. Breadth before depth would hide product failure behind
integration work.

## REA-DEC-007 — Model Technical Lead, Programmer and Reviewer Separately

Date: 2026-11-09

Decision: Define separate roles, agent identities, permissions, context and
output contracts for Technical Lead, Programmer and Reviewer.

Rationale: Clear separation enables attribution, least privilege and
independent review. A Programmer cannot approve its own implementation.

## REA-DEC-008 — Share Organizational Truth Through Context Projections

Date: 2026-11-09

Decision: Agents use one versioned project truth, but receive only exact
task-scoped projections rather than unrestricted document or memory access.

Rationale: Shared truth is required for collaboration; unrestricted access is
incompatible with least privilege and confidentiality.

## REA-DEC-009 — Repair Integrity Before Adding Product Features

Date: 2026-11-09

Decision: Reproduce and fix the three reported security defects and the OCI
fixture issue before GitHub integration or agent automation.

Rationale: New features cannot compensate for untrustworthy evidence,
canonicalization or information transfer.

## REA-DEC-010 — Separate Evidence, Approval and Release Status

Date: 2026-11-09

Decision: Use independent status axes for evidence, implementation, review,
approval and release.

Rationale: A green test does not imply approval, and an approval does not
prove that evidence is current.

## REA-DEC-011 — Store Bounded Evidence, Not Entire External Systems

Date: 2026-11-09

Decision: Retain references, identities, digests, typed results and bounded
excerpts. Leave large logs, repositories and artifacts with their original
systems unless exact retention is required.

Rationale: Data minimization reduces security, storage and support cost while
preserving verification.

## REA-DEC-012 — Keep External Effects Disabled During Internal Alpha

Date: 2026-11-09

Decision: The internal Alpha cannot merge, deploy, publish, pay, delete or
mutate a customer system. Human Governance retains all external authority.

Rationale: The Alpha validates evidence and coordination, not autonomous
operations.

## REA-DEC-013 — Validate With Working Software Before Outreach

Date: 2026-11-09

Decision: Do not conduct abstract market conversations before G3. After one
working internal vertical slice, demonstrate the exact stale-evidence case and
compare real workflows.

Rationale: The product should be evaluated against a concrete result while
avoiding months of isolated building.

## REA-DEC-014 — Test a Paid, Bounded Pilot

Date: 2026-11-09

Decision: Treat EUR 1,500–3,000 pilot/setup and EUR 199 monthly continuation
as explicit price hypotheses. Exclude custom connectors and unlimited agent
work.

Rationale: A paid bounded offer tests value and covers onboarding more
honestly than a free open-ended pilot. Price acceptance remains unproven.

## REA-DEC-015 — Use Predeclared Stop Criteria

Date: 2026-11-09

Decision: Stop, narrow or retire commercial expansion when integrity, utility,
setup, payment, renewal or margin gates fail.

Rationale: The large FDOS vision must not justify continued investment after
the narrow product hypothesis is falsified.

## REA-DEC-016 — Personality Never Carries Authority

Date: 2026-11-09

Decision: Preserve distinct Personality Profiles for communication style only;
they cannot modify tools, capabilities, memory, policy or approvals.

Rationale: Agents may have recognizable personalities without turning persona
configuration into an authority or prompt-injection channel.
