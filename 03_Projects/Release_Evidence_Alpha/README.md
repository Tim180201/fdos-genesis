# FDOS Release Evidence Alpha

Status: Active Experiment — Gate G1 Accepted, G2 Active
Owner: Human Governance
Accepted ADR: `../../00_Specification/ADR/ADR-0055_Release_Evidence_Alpha_Experiment.md`
Reference Implementation: `../../02_Reference_Implementations/FDOS_Runtime/`
Validation Level: Level 1 — Experimental
Planning Date: 2026-11-09
Repository Baseline: `7e3960c088f15d2640a7717bcae0366b9d3cd0ec`

## Purpose

This project defines and validates the smallest credible product path from the
experimental FDOS Runtime to a useful software-development control tool.

The Alpha does not attempt to build a complete autonomous company. It tests
whether FDOS can provide a trustworthy release-evidence layer underneath a
controlled software-agent team.

## Product Statement

FDOS Release Evidence connects the exact requirement, decision, work order,
code revision, tests, review and human approval for one release candidate. It
blocks missing, invalid or stale evidence and creates a portable dossier that
explains why the candidate is or is not releasable.

## Alpha Workflow

```text
Human objective
  → Technical Lead specification and work order
  → Human approval of exact work order
  → Programmer implementation
  → independent Reviewer assessment
  → GitHub Actions evidence
  → deterministic FDOS verification
  → Human release approval
  → JSON/HTML release dossier
```

If an applicable requirement, decision, policy, commit or artifact changes,
FDOS must invalidate the affected evidence and approval until the required
work is repeated.

## Plan 0 Documents

| Document | Purpose |
|---|---|
| `Product_Decision.md` | Product, customer, value and commercial hypotheses |
| `Alpha_Scope.md` | Exact supported workflow and explicit non-goals |
| `Target_Architecture.md` | Components, domain objects and trust boundaries |
| `Security_and_Threat_Model.md` | Assets, threats, invariants and repair gates |
| `Delivery_Plan.md` | Work packages, sequence, gates and eight-week plan |
| `Acceptance_Matrix.md` | Testable acceptance and required evidence |
| `Risk_Register.md` | Active product, technical and operational risks |
| `Decision_Log.md` | Project-level decisions and rationale |
| `Project_Status.md` | Current verified state and next action |
| `Gate_G1_Review.md` | Human/independent acceptance checklist for the Phase 0 evidence |

## Operating Rules

1. Reality before architecture.
2. Evidence before product claims.
3. Unknown evidence blocks authorization.
4. LLM output is never release authority.
5. Agents receive task-scoped context, not unrestricted memory.
6. No agent approves its own work.
7. Human Governance retains release and external-action authority.
8. One supported stack is completed before breadth is added.
9. Every material decision, risk and limitation remains visible.
10. This project does not expand the FDOS Core.

## Current State

- Product direction documented.
- Alpha boundaries documented.
- Architecture and security plan documented.
- Human Governance accepted Plan 0 and authorized Phase 0 on 2026-11-09.
- Commit `d51f8ce` implements the Phase 0 confidentiality, Git binding,
  canonicalization and OCI fixture repairs.
- Evidence item `EV-FDOS-PHASE0-INTEGRITY-014` records 159 passing tests,
  coverage, migration boundaries and remaining non-claims.
- Human Governance accepted REA-AC-001 through REA-AC-007, closed Gate G1 and
  authorized bounded G2 deterministic domain work on 2026-11-09.
- External actions and customer-system mutations remain disabled.

## Next Gate

Gate G2 requires accepted Release Evidence domain contracts, deterministic
verification, adverse fixtures and exact approval evidence. GitHub and agent
integration remain outside the current authorization.
