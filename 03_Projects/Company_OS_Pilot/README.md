# FDOS Company OS Pilot

Status: Active Experiment  
Owner: Human Governance  
Reference Implementation: `../../02_Reference_Implementations/FDOS_Runtime/`  
Validation Level: Level 1

## Objective

Validate a safe, modular foundation for a future software-company operating
system with a small pilot:

- Chief of Staff coordinates;
- Operations assesses delivery readiness;
- Marketing prepares internal communication;
- Human Governance retains external authority.

## In Scope

- one versioned end-to-end workflow;
- role and capability enforcement;
- task ordering and explicit information transfer;
- bounded handovers;
- human approval mechanics;
- department-specific and company memory;
- exact, allowlisted read-only Git reference evidence;
- Human-reviewed, evidence-bound knowledge candidates;
- exclusive ownership of the local event store;
- tamper-evident audit events;
- automated tests and evidence export.

## Out of Scope

- autonomous software changes;
- product-repository writes;
- production operation;
- real model calls;
- real Slack, Teams, email, CRM or MCP connectors;
- writes, builds or tests in TapTime or Company AI;
- legal, financial, personnel, publication or deletion actions.

## Acceptance Gate

The pilot is technically complete when:

1. the entire automated test suite passes;
2. the deterministic demo completes all four steps;
3. unauthorized access, approval replay and audit tampering are rejected;
4. an evidence record documents results and limitations;
5. no change occurred outside the FDOS repository.

## Reference Assessment

- `Reference_Adoption_Assessment.md`
- `Change_Impact_and_Verification_Profile.md`
- `Artifact_Validation_Register.md`

Technical completion is not production approval and not Core promotion.
