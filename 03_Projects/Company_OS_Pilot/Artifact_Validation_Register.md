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
| Closed Personality Profile Registry | Tested | Level 1 — Experimental | `EV-FDOS-AGENT-PERSONALITY-006` | Pending | Not model-validated |
| Agent Operating Profile self-read | Tested | Level 1 — Experimental | `EV-FDOS-AGENT-PERSONALITY-006` | Pending | Not model-validated |
| Exact dry-run worker protocol | Tested | Level 1 — Experimental | `EV-FDOS-PROCESS-WORKER-007` | Pending | No real connector |
| Process-separated connector simulation | Tested locally | Level 1 — Experimental | `EV-FDOS-PROCESS-WORKER-007` | Pending | Process-only mode not sandboxed |
| Crash/timeout acknowledgement handling | Tested with fault injection | Level 1 — Experimental | `EV-FDOS-PROCESS-WORKER-007` | Pending | Not independently attested |
| Darwin network/write-deny provider | Tested on recorded Darwin host | Level 1 — Experimental | `EV-FDOS-DARWIN-SANDBOX-008` | Pending | Deprecated / not portable |
| Exact isolation policy and worker attestation protocol | Tested | Level 1 — Experimental | `EV-FDOS-DARWIN-SANDBOX-008` | Pending | Not independently signed |
| Listen/connect/write-open denial probes | Tested on recorded Darwin host | Level 1 — Experimental | `EV-FDOS-DARWIN-SANDBOX-008` | Pending | Selected operations only |
| Required-sandbox bypass rejection | Tested with fault injection | Level 1 — Experimental | `EV-FDOS-DARWIN-SANDBOX-008` | Pending | Host compromise out of scope |
| Closed worker source graph and artifact digest | Tested | Level 1 — Experimental | `EV-FDOS-WORKER-ARTIFACT-009` | Pending | Mutable development source |
| Ed25519 worker release attestation | Tested with local trust | Level 1 — Experimental | `EV-FDOS-WORKER-ARTIFACT-009` | Pending | No protected release service |
| Parent/child artifact protocol binding | Tested with fault injection | Level 1 — Experimental | `EV-FDOS-WORKER-ARTIFACT-009` | Pending | Child observation occurs after module load |
| Source/signature/trust/path tamper rejection | Tested locally | Level 1 — Experimental | `EV-FDOS-WORKER-ARTIFACT-009` | Pending | Same-account race remains |
| Deterministic canonical worker package | Tested | Level 1 — Experimental | `EV-FDOS-WORKER-PACKAGE-010` | Pending | Repository file is not immutable deployment |
| Detached package signing boundary | Tested locally | Level 1 — Experimental | `EV-FDOS-WORKER-PACKAGE-010` | Pending | No HSM/KMS custody connected |
| Exact public trust-anchor digest pin | Tested | Level 1 — Experimental | `EV-FDOS-WORKER-PACKAGE-010` | Pending | Pilot pin remains repository-local |
| Parent/bootstrap package verification | Tested with fault injection | Level 1 — Experimental | `EV-FDOS-WORKER-PACKAGE-010` | Pending | Bootstrap/verifier remain host TCB |
| Verified-memory package evaluation | Tested locally | Level 1 — Experimental | `EV-FDOS-WORKER-PACKAGE-010` | Pending | Experimental VM loader / no workload identity |
| Ephemeral challenge-bound workload session | Tested locally | Level 1 — Experimental | `EV-FDOS-WORKLOAD-SESSION-011` | Pending | Bootstrap self-issues identity |
| Canonical Ed25519 worker-response envelope | Tested with fault injection | Level 1 — Experimental | `EV-FDOS-WORKLOAD-SESSION-011` | Pending | No external attestation or transport |
| Response/result session cross-binding | Tested with valid-signature confusion fault | Level 1 — Experimental | `EV-FDOS-WORKLOAD-SESSION-011` | Pending | Mutable parent/bootstrap remain TCB |
| Non-exported one-use session-key boundary | Tested by API and output inspection | Level 1 — Experimental | `EV-FDOS-WORKLOAD-SESSION-011` | Pending | No secure erasure or host-memory protection |
| Closed Verified Worker Receipt | Tested locally | Level 1 — Experimental | `EV-FDOS-WORKER-RECEIPT-012` | Pending | Local parent assertion / full envelope omitted |
| Receipt protocol-response reconstruction | Tested with digest and shape tampering | Level 1 — Experimental | `EV-FDOS-WORKER-RECEIPT-012` | Pending | Does not reconstruct the signed envelope |
| Authenticated receipt-backed outcome command | Tested with command separation and claim binding | Level 1 — Experimental | `EV-FDOS-WORKER-RECEIPT-012` | Pending | Connector key custody remains local |
| Durable receipt and Invocation evidence projection | Tested across SQLite restart | Level 1 — Experimental | `EV-FDOS-WORKER-RECEIPT-012` | Pending | Not independently signed audit evidence |
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
