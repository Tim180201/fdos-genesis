# Evidence Record — TapTime Extended Domain Breadth Before Closing a Core Behavior Gap

Status: Evidence Item
Project: TapTime
Date: 2026-07-08
Source Repository: Tim180201/taptime

## Observation

TapTime's own Product Principles document (`ADO/01_Architecture/Product_Principles.md`) states the product's defining behavior as Principle 1: "One Tap. One Decision." A named, open item in the repository — "Finding F-01," the rule for what a second scan of the same NFC tag means (stop vs. a new start) — has remained unresolved since early in the Development Sprint sequence and is still open as of Development Sprint 015. The project's own `Product_Readiness_Assessment.md` (2026-07-07) describes the consequence directly: without F-01, "the Business Engine can only ever 'start' a session, never coherently 'stop' one, which is a direct gap against Product Principle 1... for any session longer than a single scan."

In the period this finding remained open, the project completed Development Sprints 011 through 015: a real Android NFC hardware adapter (DT-016, still not validated on physical hardware), and a full Organization/Membership domain with roles, repositories and authorization (DT-017 through DT-022) — new breadth extending outward from a core interaction loop that, by the project's own account, does not yet fully work for more than one scan.

Separately, the newly added Organization/Membership domain sits on top of a persistence layer (`JsonFileStore`, DT-015) that Development Sprint 010's own closure documentation describes as having "no concurrency/locking or atomic-write protection, by explicit, documented design choice for this sprint only" — i.e. explicitly single-writer. A multi-user, multi-role authorization model was built on a storage layer not yet designed to support concurrent multi-user writes.

## Evidence

- `ADO/02_Development/EP-007_Development_Tasks.md`: F-01 referenced as an open gate on DT-004/DT-005's "stop"/"pending" outcomes, still unresolved at DT-022 (most recent Development Task at time of review).
- `ADO/05_Evidence/Product_Readiness_Assessment.md`, Section 1 ("Engineering Readiness"): explicitly names F-01 as "the one open item in this category with a direct, visible product consequence... if a real customer is shown the product before it is resolved," and recommends "High" priority, "before any pilot customer is shown the product" — yet five further Development Sprints (011–015) proceeded on other scope without resolving it.
- `ADO/02_Development/Development_Sprint_010_Plan.md` / DT-015 closure: `JsonFileStore` explicitly documented as lacking concurrency protection "for this sprint only," followed two sprints later by a multi-user Organization/Membership domain (DT-017–DT-022) built on the same store.

## FDOS Classification

Type: Project Evidence
Confidence: Low (single project, single observation; sequencing judgment, not a measured metric)
Scope: Potentially cross-project (work-sequencing risk is a general engineering-management concern, not TapTime-specific)
Core Impact: None

## Recommendation

Not a recommendation to halt breadth-first work in general — extending Organization/Membership in parallel with an open core-behavior finding may be a deliberate, reasonable Technical Lead choice (e.g. if F-01 requires a Human Architect product decision that was not yet available, and other engineering-ready work existed in the meantime). Recommended project action: make such sequencing decisions explicit in the Decision Log when they occur (i.e. state why breadth work proceeded ahead of a known, prioritized, blocking core-behavior finding), so the sequencing choice is visibly a decision rather than a byproduct of decision inertia.

## FDOS Learning

A project can have excellent traceability of *what* was built and *why* each individual piece is correct, while still lacking traceability of *why the work was sequenced in this order* relative to its own previously stated priorities. This is a distinct gap from status/reality drift (CPE-001/KP-002): the documentation was accurate throughout, but the prioritization implied by the sequence of completed work was never reconciled against the project's own stated "High priority, before any pilot customer" recommendation.

See `05_Knowledge/Cross_Project_Patterns/KP-005_Sequencing_Decisions_Require_Explicit_Rationale.md` for the resulting Knowledge Candidate.

No FDOS Core change is required or proposed by this evidence record alone.
