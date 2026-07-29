# Company OS Pilot — Artifact Validation Register

Status: Active Project Register / Human Review Pending  
Date: 2026-07-29

## Purpose

Separate artifact existence, automated testing, human review and FDOS maturity.

## Project Evidence States

| State | Meaning |
|---|---|
| Draft | artifact exists but has not completed its selected local checks |
| Tested | selected local verification passed on a recorded source state |
| Human Reviewed | Human Governance reviewed the evidence and limitations |
| Retired | artifact is no longer an active pilot candidate |

These states do not replace FDOS Validation Levels. `Tested` is not a Core
promotion and not a production approval.

## Register

| Artifact | Project state | FDOS level | Evidence | Human review | Production |
|---|---|---|---|---|---|
| Three-role workflow runtime | Tested | Level 1 — Experimental | `EV-FDOS-RUNTIME-PILOT-001` | Pending | Not ready |
| Git reference snapshot adapter | Tested | Level 1 — Experimental | `EV-FDOS-REFERENCE-INTAKE-002` | Pending | Not ready |
| Content-minimized document evidence | Tested | Level 1 — Experimental | `EV-FDOS-REFERENCE-INTAKE-002` | Pending | Not ready |
| Evidence-bound Memory Candidate bridge | Tested | Level 1 — Experimental | `EV-FDOS-REFERENCE-INTAKE-002` | Pending | Not ready |
| Runtime directory lease | Tested | Level 1 — Experimental | `EV-FDOS-REFERENCE-INTAKE-002` | Pending | Not ready |
| TapTime/Company AI adoption assessment | Tested as documentation/evidence | Level 1 — Experimental | exact reference manifests | Pending | Not applicable |

## Promotion Rule

An artifact may move to `Human Reviewed` only after Human Governance reviews:

- exact source/evidence binding;
- open findings and limitations;
- omitted checks;
- whether the stated conclusion is narrower than the evidence;
- the next bounded experiment.

Promotion beyond FDOS Level 1 remains governed by
`../../00_Specification/Governance/FDOS_Validation_Levels.md`.
