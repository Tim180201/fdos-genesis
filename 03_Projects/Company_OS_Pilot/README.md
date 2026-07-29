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
- Ed25519-signed, short-lived Invocation Contexts;
- exact organization, audience, principal, operation and command binding;
- server-side Agent Registry role derivation;
- persistent one-time Invocation consumption across restarts;
- a deny-by-default authenticated command gateway;
- tamper-evident audit events;
- automated tests and evidence export.

## Out of Scope

- autonomous software changes;
- product-repository writes;
- production operation;
- real model calls;
- real Slack, Teams, email, CRM or MCP connectors;
- production identity provider, key custody or revocation;
- exposure of the lower-level runtime to untrusted callers;
- distributed replay protection or transactional command execution;
- writes, builds or tests in TapTime or Company AI;
- legal, financial, personnel, publication or deletion actions.

## Acceptance Gate

The pilot is technically complete when:

1. the entire automated test suite passes;
2. the authenticated deterministic demo completes all four steps;
3. every demo command carries a verified one-time Invocation Context;
4. unauthorized access, signature/command tampering, invocation replay,
   approval replay and audit tampering are rejected;
5. an evidence record documents results and limitations;
6. no change occurred outside the FDOS repository.

## Reference Assessment

- `Reference_Adoption_Assessment.md`
- `Change_Impact_and_Verification_Profile.md`
- `Artifact_Validation_Register.md`

Technical completion is not production approval and not Core promotion.
