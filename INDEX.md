# FDOS Genesis Repository Index

Status: Active  
Repository Baseline: v3.12.0 Clean LTS  
Consolidation: Architecture Consolidation R2.8

## Active Areas

```text
00_Specification/              FDOS Core specification, vocabulary and architecture model
01_AI/                         AI Constitution, Agent Constitutions and Collaboration Standard
02_Reference_Implementations/  Reusable implementations of FDOS concepts
03_Projects/                   Project references and validation targets
04_Evidence/                   Evidence packages and validation artifacts
05_Knowledge/                  Organizational knowledge assets and evolution rules
06_Learning/                   Organizational learning system and learning lifecycle
Archive/                       Historical or deprecated material
```

## Recommended Reading Order

1. `README.md`
2. `INDEX.md`
3. `00_Specification/FDOS_Architecture_Map.md`
4. `00_Specification/Organizational_Vocabulary.md`
5. `00_Specification/Organizational_Object_Model.md`
6. `01_AI/04_AI_Collaboration_Standard.md`
7. `06_Learning/README.md`
8. `05_Knowledge/Knowledge_Governance_and_Evolution.md`

## Current Architectural Status

FDOS Core: Stable LTS  
AI Layer: Draft complete  
Learning Layer: Foundation active  
Operational Mode: Project Validation

## Active Experimental Validation

| Area | Artifact | Status |
|---|---|---|
| Reference Implementation | `02_Reference_Implementations/FDOS_Runtime/` | Level 1 — Experimental |
| Project | `03_Projects/Company_OS_Pilot/` | Technical slice passed; human review pending |
| Evidence | `04_Evidence/fdos-runtime/EV-FDOS-RUNTIME-PILOT-001.md` | Evidence Item |
| Evidence | `04_Evidence/fdos-runtime/EV-FDOS-REFERENCE-INTAKE-002.md` | Evidence Item |
| Knowledge | `05_Knowledge/Cross_Project_Patterns/KP-006_Approval_Must_Bind_Exact_Action_Intent.md` | Candidate |
| Knowledge | `05_Knowledge/Cross_Project_Patterns/KP-007_External_Knowledge_Requires_Exact_Source_Binding.md` | Candidate |
| Knowledge | `05_Knowledge/Cross_Project_Patterns/KP-008_Nontransactional_Event_Store_Requires_Exclusive_Ownership.md` | Candidate |

No item in this table is an FDOS Core standard.

## Active Principle

Reality before Architecture.  
Evidence before Expansion.  
Stable Core.  
Small Core.

## Repository Rule

The repository shall remain understandable without requiring historical ZIP context.

Historical versions may be archived, but the active baseline must remain clear and directly usable.

## Consolidation Rule

Canonical definitions belong in `00_Specification/Organizational_Vocabulary.md` and `00_Specification/Organizational_Object_Model.md`.

Specialized documents should reference canonical definitions instead of redefining them.
