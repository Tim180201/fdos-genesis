# Cross-Project Registry

Status: Canonical Registry

## Purpose

The Cross-Project Registry is the central index for organizational learning across FDOS projects.

It links cross-project evidence, knowledge candidates and future pattern candidates without promoting them prematurely into the FDOS Core.

## Workflow

Project
→ Project Evidence
→ Cross-Project Evidence
→ Knowledge Candidate
→ Pattern Candidate
→ FDOS Core

## Registry

| ID | Type | Source Projects | Status | Next Step |
|----|------|-----------------|--------|-----------|
| KP-001 | Knowledge Candidate | TapTime; FDOS Company OS Pilot (experimental application only) | Candidate (with Known Limitation and experimental implementation note) | Validate in an additional independent project, specifically for multi-operator role separation |
| CPE-001 | Cross-Project Evidence | frogs, TapTime | Evidence | Knowledge Owner review of KP-002 |
| KP-002 | Knowledge Candidate | frogs, TapTime | Candidate | Knowledge Owner review; consider lightweight non-Core verification capability |
| KP-003 | Knowledge Candidate | TapTime | Candidate | Validate in additional projects handling regulated personal data |
| KP-004 | Knowledge Candidate | TapTime | Candidate | Validate in additional projects; track diagnosis-vs-remediation gap explicitly |
| KP-005 | Knowledge Candidate | TapTime | Candidate | Validate in additional projects; check Decision Logs for sequencing rationale |
| KP-006 | Knowledge Candidate | FDOS Company OS Pilot | Candidate / Level 1 experiment | Human review; validate exact intent binding with a sandboxed connector and an independent project |
| KP-007 | Knowledge Candidate | TapTime, Company AI, FDOS Company OS Pilot | Candidate / Level 1 experiment | Human review; validate exact source binding through an authenticated read-only connector |
| KP-008 | Knowledge Candidate | Company AI, FDOS Company OS Pilot | Candidate / Level 1 experiment | Human review; validate multi-process worker fencing and durable outbox behavior |
| KP-009 | Knowledge Candidate | Company AI, FDOS Company OS Pilot | Candidate / Level 1 experiment | Human review; validate independent identity, revocation and atomic external-outcome handling through a read-only sandboxed connector |
| KP-010 | Knowledge Candidate | Company AI, FDOS Company OS Pilot | Candidate / Level 1 experiment | Human review; validate durable outbox, multi-worker fencing and uncertain outcomes through a read-only sandboxed connector |
| KP-011 | Knowledge Candidate | Company AI, TapTime, FDOS Company OS Pilot | Candidate / Level 1 dry-run experiment | Human review; validate one isolated authenticated read-only connector with service-specific idempotency, egress, secrets and crash evidence |

## Governance

Registry entries are descriptive.

Promotion decisions remain subject to FDOS governance and require sufficient cross-project evidence.
