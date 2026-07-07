# KP-002 — Status/Reality Drift Requires Automated Verification, Not Only Written Rules

Status: Knowledge Candidate
Source Projects: frogs. Zeiterfassung, TapTime
Derived From: `05_Knowledge/Cross_Project_Evidence/CPE-001_Status_Reality_Drift.md`

## Purpose

Capture the organizational observation that written rules requiring a single authoritative status source are not sufficient by themselves to prevent status/reality drift; the specific artifacts read first (README, top-level status headers) must be included in an automated or otherwise enforced verification loop.

## Observation

Two independent FDOS projects (frogs, TapTime), each with documented rules intended to keep project status authoritative and centralized, both independently developed drift between top-level status documents and verifiable repository reality (commit history, test results, Decision Log entries). In both cases the drift was later self-identified through manual review, not prevented at the time it occurred.

## Evidence Status

Validated in two independent projects. Not yet reviewed by a designated Knowledge Owner. Per the Knowledge Confidence Model this places the observation at "Medium" confidence, one step below what is required to treat it as Validated Knowledge.

## Organizational Insight

- A written rule ("maintain one authoritative status source") reduces but does not eliminate drift risk when compliance is manual.
- Drift concentrates specifically in the artifacts consulted first (README, top-level status headers), even when a more detailed and more current record exists elsewhere in the same repository (Decision Log, Project ADO).
- Projects with more manually-maintained status surfaces (README, Project_Status, Risk Register, CONTRIBUTING policy claims) show more opportunities for drift than projects with fewer, more automated ones.
- Self-detection of drift (as both frogs and TapTime demonstrate) is possible but reactive; it did not prevent recurrence within the same project.

## Recommendation

Treat this as a Cross-Project Knowledge Candidate until reviewed by a Knowledge Owner and, if confirmed, considered by the Architecture Board for a possible lightweight capability (e.g. an optional, non-Core reference check that compares a project's declared top-level status against its Decision Log / commit history and flags divergence). This recommendation is a suggestion for governance review, not a proposal to create a new FDOS Core capability; capability creation remains subject to `00_Specification/Object_Registry/FDOS_Object_Naming_Standard.md` and Architecture Board approval.

## Governance

Do not promote to FDOS Core until confirmed by additional independent projects and formally reviewed by a Knowledge Owner, per `00_Specification/Knowledge/Organizational_Knowledge_Lifecycle.md` and `00_Specification/Knowledge/Knowledge_Confidence_Model.md`.
