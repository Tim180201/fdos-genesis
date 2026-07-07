# KP-003 — Regulated-Data Products Need a Proactive Compliance Checkpoint at Scope Definition

Status: Knowledge Candidate
Source Project: TapTime
Derived From: `04_Evidence/taptime/EV-TAPTIME-REGULATED-DATA-COMPLIANCE-GAP.md`

## Purpose

Capture the organizational observation that existing FDOS-aligned engineering standards can already reference "legal, compliance or audit requirements" as a review trigger, while still leaving a gap at the point where product scope is first decided for a product handling regulated personal data.

## Observation

TapTime processes employee working-time data for SMB customers, primarily in a German/EU context. Its Feature Blueprint Standard already lists "legal, compliance or audit requirements" as a trigger for re-reviewing an approved Blueprint, but no equivalent question is required at the point where product scope is first locked (its ADR-0003 "Product Scope v1"). As a result, a product whose core purpose is processing regulated employment data reached an approved v1 scope without an explicit compliance/legal impact statement anywhere in its ADO.

## Evidence Status

Validated in one project. Not yet reviewed by additional FDOS projects.

## Organizational Insight

- Recognizing compliance vocabulary in a standard (as a review trigger) is not the same as requiring it to be answered at the moment scope is first defined.
- Regulated-data exposure (personal, employment, health, financial, biometric) is foreseeable at scope-definition time; treating it only as a later re-review trigger defers a risk that was already knowable.
- This is a structural/process gap, not specific to TapTime's domain — any FDOS project whose first ADR or Feature Blueprint defines scope involving such data categories could reproduce the same gap.

## Recommendation

Treat this as a Cross-Project Knowledge Candidate until validated by additional FDOS projects that handle regulated personal data. If confirmed, a future candidate pattern would be: any ADR or Feature Blueprint that defines or changes product scope must include an explicit "regulated data in scope: yes/no/not yet assessed" field, rather than surfacing compliance only as a later review trigger. This is offered as a recommendation for governance review, not as a proposed FDOS Core standard.

## Governance

Do not promote to FDOS Core until confirmed by multiple independent projects and formally reviewed by a Knowledge Owner, per `00_Specification/Knowledge/Organizational_Knowledge_Lifecycle.md` and `00_Specification/Knowledge/Knowledge_Confidence_Model.md`.
