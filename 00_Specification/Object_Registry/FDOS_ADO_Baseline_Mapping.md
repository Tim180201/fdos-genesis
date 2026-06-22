# FDOS ADO Baseline Mapping

Status: Released  
Version: 3.5

## Purpose

Define the baseline semantic mapping between FDOS Object IDs and ADO Reference Implementation object families.

| FDOS Object ID | ADO Object Family | Relationship |
|---|---|---|
| `FDOS-CONSTITUTION` | `ADO-OVR` | ADO overview and principles |
| `FDOS-REFERENCE-IMPLEMENTATION` | `ADO-OVR` | ADO reference profile |
| `FDOS-CAP-001` | `ADO-ART / ADO-WF` | Decision, risk, governance and workflow artifacts |
| `FDOS-CAP-002` | `ADO-KN` | Knowledge flow and learning artifacts |
| `FDOS-CAP-003` | `ADO-KN / ADO-TRC` | Evidence and memory-related artifacts |
| `FDOS-CAP-004` | `ADO-QUAL / ADO-CONF` | Quality, conformance and architecture-facing review artifacts |
| `FDOS-WORKFLOW-SPEC` | `ADO-WF / ADO-TPL` | Workflow and template artifacts |
| `FDOS-META-MODEL` | `ADO-TRC` | Semantic metadata and object mapping |
| `FDOS-TRACEABILITY` | `ADO-TRC` | Traceability matrix, impact analysis and semantic registry |
| `FDOS-REFERENCE-VALIDATION` | `ADO-CONF` | Conformance framework and project validation checklist |

## Rule

Every reusable ADO artifact must reference at least one FDOS Object ID.
