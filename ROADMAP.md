# FDOS Roadmap

## Current Status

FDOS Genesis v3.8 LTS  
Architecture Baseline: Stable  
Mode: Operational Validation

Repository synchronization documents also identify a v3.12.0 Clean LTS
content baseline. Per the Version Consistency Rule, no new reference version is
declared here; Human Governance owns final version designation.

Experimental Track: FDOS Runtime Level 1, authorized by ADR-0043.

## Immediate Priorities

1. Human-review all four FDOS Company OS Pilot evidence records, the identity,
   transactional-persistence and recovery limitations, and the reference
   adoption assessment.
2. Validate ADO through frogs.
3. Continue TapTime using FDOS and ADO.
4. Capture evidence from real project work.
5. Build Evidence Packages.
6. Promote validated learnings into Organizational Memory.
7. Revise FDOS only when evidence proves need.

## Frozen Until Evidence

- new main architecture areas
- new Core Capabilities
- Business Architecture
- production Platform Runtime or Core platform expansion
- advanced AI architecture
- additional governance layers

The isolated Level 1 runtime experiment is a scoped evidence-generating
Reference Implementation under ADR-0043. It does not unfreeze the Core or
authorize production operation.

## Next Meaningful Milestone

First Project Validation Report:

```text
FDOS Genesis v3.8 LTS
→ ADO Reference Implementation v2.2
→ frogs. Project Assessment
→ Evidence Package
→ Targeted FDOS Revision
```

Parallel experimental gate:

```text
FDOS Runtime Level 1
→ Human Evidence Review
→ Authenticated Identity Experiment (technical slice passed)
→ Transactional Event-Store Adapter (technical slice passed)
→ Connector Contract, Outbox and Uncertain-Outcome Experiment
→ Authenticated Read-Only Sandboxed Connector
→ Single-Project Validation Decision
```
