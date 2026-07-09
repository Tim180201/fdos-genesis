# KP-005 — Work-Sequencing Choices Need the Same Explicit Rationale as Content Decisions

Status: Knowledge Candidate
Source Project: TapTime
Derived From: `04_Evidence/taptime/EV-TAPTIME-DEPTH-BEFORE-BREADTH.md`

## Purpose

Capture the organizational observation that a project can maintain excellent traceability for *what* was built and *why each piece is correct*, while having no equivalent traceability for *why work was sequenced in a given order* relative to the project's own previously stated priorities.

## Observation

TapTime's own readiness assessment named an open core-behavior finding (F-01, the duplicate-scan/stop rule) as "High priority... before any pilot customer," directly tied to the product's stated defining principle ("One Tap. One Decision."). Development continued for five further sprints on other, larger-scope work (a new Organization/Membership domain, a hardware adapter) without F-01 being resolved or the sequencing choice being recorded as a deliberate decision anywhere in the Decision Log. Separately, a multi-user authorization domain was built on top of a persistence layer explicitly documented as not yet supporting concurrent writes. Every individual Development Task in this sequence is well-justified on its own terms; the ordering between them is not.

## Evidence Status

Validated in one project, single observation.

## Organizational Insight

- Decision logs that record "what was built and why it is correct" do not automatically also record "why this was built now, ahead of a previously identified higher-priority item."
- Sequencing risk compounds silently: each individual task can pass its own review while the overall order quietly drifts away from the project's own stated priorities.
- Building a broader/more general capability (e.g. multi-tenant authorization) on top of a foundation explicitly scoped as narrower (e.g. single-writer local storage) is a specific, recognizable case of this pattern worth watching for directly.

## Recommendation

Treat this as a Cross-Project Knowledge Candidate until validated by additional FDOS projects. If confirmed, a future candidate pattern would be: when a Development Sprint or task proceeds while a previously identified higher-priority, blocking finding remains open, the Decision Log should record an explicit sequencing rationale (why this work, why now, why not the blocking item first) rather than only recording the content of the work done. This is offered as a recommendation for governance review, not as a proposed FDOS Core standard.

## Governance

Do not promote to FDOS Core until confirmed by multiple independent projects and formally reviewed by a Knowledge Owner, per `00_Specification/Knowledge/Organizational_Knowledge_Lifecycle.md` and `00_Specification/Knowledge/Knowledge_Confidence_Model.md`.
