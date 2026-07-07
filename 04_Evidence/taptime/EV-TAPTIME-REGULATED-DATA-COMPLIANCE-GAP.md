# Evidence Record — TapTime Regulated-Data Compliance Checkpoint Gap

Status: Evidence Item
Project: TapTime
Date: 2026-07-07
Source Repository: Tim180201/taptime

## Observation

TapTime's core product processes employee working-time data for small and medium-sized businesses, primarily in a German/EU context (Product Vision is written in German, target customers are "kleine und mittelständische Unternehmen"). Employee time-tracking data is regulated under multiple frameworks in that context (e.g. GDPR Art. 88 employment-context processing, German Arbeitszeitgesetz, and works-council co-determination rights under BetrVG §87 for the introduction of technical monitoring systems).

Across 80 reviewed Markdown files in the project's ADO (Product Vision, Product Principles, ADR-0001 through ADR-0007, ADR-0003 "Product Scope v1", Risk Register, Feature Blueprint FB-001), no document mentions data protection, employment law or works-council/co-determination considerations.

TapTime's own `ADO/01_Architecture/Feature_Blueprint_Standard.md` (Section 18, "Review Cadence") does list "legal, compliance or audit requirements" as one of the triggers requiring a Blueprint to be re-reviewed. This means the standard already recognizes compliance as a first-class review dimension — but only as a trigger for re-review after the fact. Nothing in the initial scope-defining artifact (ADR-0003) or the Risk Register requires an explicit compliance/legal impact statement before scope is locked, for a product whose stated purpose is processing regulated personal/employment data from the start.

## Evidence

- `ADO/01_Architecture/Product_Vision.md`, `ADO/01_Architecture/Product_Principles.md`, `ADO/01_Architecture/ADR/ADR-0003-product-scope-v1.md`: no mention of data protection, employment law or co-determination.
- `ADO/00_Core/Risk_Register.md`: five risks registered (device behavior, technical debt, stack lock-in, test coverage, Firebase security rules); none address regulatory/legal exposure.
- `ADO/01_Architecture/Feature_Blueprint_Standard.md`, Section 18: "legal, compliance or audit requirements" listed only as a later review trigger, not as an initial scope-gating question.

## FDOS Classification

Type: Project Evidence
Confidence: Low (single project, single observation)
Scope: Potentially cross-project (any FDOS project handling personal, employment, health, financial or biometric data would face the same structural gap)
Core Impact: None

## Recommendation

Do not propose a new FDOS Core capability from a single observation. Recommended project action for TapTime:

1. Add a compliance/legal review item to the Risk Register before further scope expansion (e.g. GDPR Art. 88, ArbZG, BetrVG §87 applicability for the German/EU target market).
2. Treat "regulated personal data in scope" as a mandatory field to answer (even if the answer is "not yet assessed") when an ADR defines or changes product scope, rather than only as a later re-review trigger.

## FDOS Learning

The Feature Blueprint Standard already contains the right vocabulary ("legal, compliance or audit requirements") but applies it reactively, not proactively. A candidate organizational pattern — not yet validated beyond this one observation — is that any FDOS project whose Product Scope decision (ADR or equivalent) involves personal, employment, health, financial or biometric data should be required to answer an explicit regulated-data question at that decision point, not only when something later changes.

See `05_Knowledge/Cross_Project_Patterns/KP-003_Regulated_Data_Compliance_Guardrail.md` for the resulting Knowledge Candidate.

No FDOS Core change is required or proposed by this evidence record alone.
