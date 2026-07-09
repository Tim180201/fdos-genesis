# KP-004 — Repeated Self-Diagnosis Does Not Guarantee Remediation

Status: Knowledge Candidate
Source Project: TapTime
Derived From: `04_Evidence/taptime/EV-TAPTIME-STATUS-DRIFT-PERSISTS-SPRINT015.md`, `05_Knowledge/Cross_Project_Evidence/CPE-001_Status_Reality_Drift.md`

## Purpose

Capture the organizational observation that a project's ability to accurately *identify* a low-cost, high-value fix is a separate capability from its ability to *perform* that fix, and governance processes that only measure the former can create false confidence.

## Observation

TapTime independently and repeatedly identified the same low-cost fixes across multiple review artifacts over roughly one week: a stale README/status line, a stale Risk Register, and a missing CI pipeline explicitly rated "Critical" priority with "near-zero cost." None of these were resolved in that window, even though five further Development Sprints of other, larger-scope engineering work (a new domain, a hardware adapter) were completed in the same period. The project's own governance process (Decision Log, EP-008 synchronization, the Product Readiness Assessment) produced accurate, well-evidenced diagnosis each time — the diagnosis was not the failure. The failure, if any, is that accurate repeated diagnosis was not treated as a trigger for action.

## Evidence Status

Validated in one project, with two independent measurements one week apart showing no change in the identified gaps despite active development continuing in the same window.

## Organizational Insight

- Diagnosis quality and remediation follow-through are separate capabilities and should be tracked separately; a project can score well on one and poorly on the other.
- Low-cost, high-confidence, explicitly-prioritized fixes ("Critical," "near-zero cost") are not self-executing just because they are correctly identified and written down.
- Repeated documentation of the same gap across multiple review cycles, without remediation, is itself a distinct signal worth surfacing — separate from the original gap it describes — because it suggests the review process has no mechanism to convert findings into scheduled work.

## Recommendation

Treat this as a Cross-Project Knowledge Candidate until validated by additional FDOS projects. If confirmed, a future candidate pattern would be: any finding that reappears unresolved across two or more review artifacts (Decision Log entries, evidence records, readiness assessments) should be automatically flagged for mandatory disposition (fix, explicitly defer with a reason and owner, or explicitly accept as a permanent risk) rather than simply re-stated. This is offered as a recommendation for governance review, not as a proposed FDOS Core standard.

## Governance

Do not promote to FDOS Core until confirmed by multiple independent projects and formally reviewed by a Knowledge Owner, per `00_Specification/Knowledge/Organizational_Knowledge_Lifecycle.md` and `00_Specification/Knowledge/Knowledge_Confidence_Model.md`.
