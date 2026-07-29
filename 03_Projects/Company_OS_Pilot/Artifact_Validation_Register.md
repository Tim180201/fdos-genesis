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
| Ed25519 Invocation Context and verifier | Tested | Level 1 — Experimental | `EV-FDOS-AUTHENTICATED-INVOCATION-003` | Pending | Not ready |
| Persistent one-time Invocation ledger | Tested | Level 1 — Experimental | `EV-FDOS-AUTHENTICATED-INVOCATION-003` | Pending | Not ready |
| Authenticated Runtime Gateway | Tested | Level 1 — Experimental | `EV-FDOS-AUTHENTICATED-INVOCATION-003` | Pending | Not ready |
| Authenticated three-role workflow | Tested | Level 1 — Experimental | `EV-FDOS-AUTHENTICATED-INVOCATION-003` | Pending | Not ready |
| SQLite event and transaction store | Tested | Level 1 — Experimental | `EV-FDOS-TRANSACTIONAL-PERSISTENCE-004` | Pending | Not ready |
| Atomic authenticated command boundary | Tested | Level 1 — Experimental | `EV-FDOS-TRANSACTIONAL-PERSISTENCE-004` | Pending | Not ready |
| Crash rollback and transaction rehydration | Tested | Level 1 — Experimental | `EV-FDOS-TRANSACTIONAL-PERSISTENCE-004` | Pending | Not ready |
| Fail-closed persistence-format selection | Tested | Level 1 — Experimental | `EV-FDOS-TRANSACTIONAL-PERSISTENCE-004` | Pending | Not ready |
| Dry-run Connector Contract Registry | Tested | Level 1 — Experimental | `EV-FDOS-CONNECTOR-OUTBOX-005` | Pending | Not ready |
| Immutable Delivery Intent and durable Outbox | Tested | Level 1 — Experimental | `EV-FDOS-CONNECTOR-OUTBOX-005` | Pending | Not ready |
| Connector claim lease and fencing state | Tested locally | Level 1 — Experimental | `EV-FDOS-CONNECTOR-OUTBOX-005` | Pending | Not distributed |
| Human uncertainty resolution | Tested in dry-run | Level 1 — Experimental | `EV-FDOS-CONNECTOR-OUTBOX-005` | Pending | Not service-validated |
| Content-minimized delivery evidence | Tested in dry-run | Level 1 — Experimental | `EV-FDOS-CONNECTOR-OUTBOX-005` | Pending | Not independently signed |
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
