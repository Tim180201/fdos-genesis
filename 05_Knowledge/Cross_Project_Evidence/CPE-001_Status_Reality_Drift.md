# CPE-001 — Status/Reality Drift Under Explicit Governance

Status: Cross-Project Evidence
Source Projects: frogs. Zeiterfassung, TapTime

## Purpose

Record that the same organizational failure mode — documented project status diverging from verifiable repository reality — has now been observed independently in two FDOS projects, each with different governance maturity and different tooling.

## Evidence Lifecycle Position

Project Observation → Project Evidence → **Cross-Project Evidence** → Knowledge Candidate → Pattern Candidate → FDOS Core (if justified)

## Linked Project Evidence

- `04_Evidence/frogs/EV-FROGS-STATUS-SECURITY-DOC-CONSOLIDATION.md` — frogs project: status and security documentation contradicted each other across README, Project ADO, audit documentation and implementation status notes; project status was RC-blocked while some documents described implemented fixes without equivalent runtime validation.
- `04_Evidence/taptime/EV-TAPTIME-STATUS-REALITY-DRIFT.md` — TapTime project: `README.md` and `Project_Status.md` remained frozen at an early-sprint status through ten completed Development Sprints; Risk Register left unchanged despite contradicting evidence; declared Git workflow (protected `main`, mandatory PR review) not practiced; the project's own EP-008 synchronization documents repeatedly self-report "Decision Log staleness" as a recurring, not one-time, finding.

## Observation

Both projects independently produced the same shape of failure, despite:

- different technology stacks and team sizes,
- different stages of FDOS/ADO adoption maturity,
- explicit, documented rules in both projects requiring authoritative, centralized status (frogs already treats "Project_Status.md as single authoritative source" as a recommended fix; TapTime already runs a Decision Log intended to serve that purpose).

In both cases, the rule "keep one authoritative status source" existed in principle, but the specific artifacts read first by humans and agents (README, top-level status headers) were not mechanically kept in sync with the authoritative source, and no automated check existed to catch the divergence.

## FDOS Classification

Type: Cross-Project Evidence
Confidence: Medium (per Knowledge Confidence Model: source documented in both cases, impact described, at least one review occurred in each; not yet reviewed by a designated Knowledge Owner, so not yet "High")
Scope: Cross-Project
Core Impact: None (descriptive only, per Cross-Project Evidence rule — this does not introduce a new FDOS standard)

## Recommendation

Elevate to Knowledge Candidate for organizational review: see `05_Knowledge/Cross_Project_Patterns/KP-002_Status_Reality_Drift_Requires_Automated_Verification.md`.

Do not promote directly to FDOS Core. Per `00_Specification/Governance/Evidence_Governance_Minimum.md`, only validated evidence may influence the FDOS Core, and per the Knowledge Confidence Model, Medium confidence requires further review and reuse evidence before it can become "Validated."

## Rule Compliance

This record is descriptive, not normative, per `05_Knowledge/Cross_Project_Evidence/README.md`. It introduces no new FDOS standard.
