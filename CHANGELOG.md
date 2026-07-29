# CHANGELOG

## Unreleased — FDOS Runtime Level 1 Experiment

- Added ADR-0043 authorizing a bounded FDOS Runtime Reference Implementation
  experiment without changing the FDOS Core.
- Added ADR-0044 authorizing an authenticated Invocation boundary experiment
  before any model provider or connector.
- Added ADR-0045 authorizing a local transactional authenticated-command
  experiment without promoting persistence into FDOS Core.
- Added ADR-0046 for a dry-run Connector Contract and durable Outbox
  experiment without enabling a networked connector.
- Added ADR-0047 for governed, non-authoritative Agent Personality Profiles
  without enabling a model provider.
- Added ADR-0048 for a process-separated, digest-only Connector simulation
  without claiming an operating-system sandbox or enabling a service.
- Added the runtime experiment boundary for A0–A4 action governance, data
  scopes, repository ownership and production limitations.
- Added `02_Reference_Implementations/FDOS_Runtime/` with:
  - separate Role Definitions and Agent Instances;
  - distinct versioned, content-addressed Personality Profiles with closed
    traits and style fields;
  - fixed constitutional precedence and personality safety invariants;
  - authenticated self-only Agent Operating Profile resolution;
  - capability and memory-scope enforcement;
  - immutable Action Intents;
  - exact, expiring and single-use A2 approvals;
  - A3/A4 execution blocking;
  - versioned acyclic workflows;
  - bounded handovers;
  - human-reviewed memory candidates;
  - exact Git-bound read-only reference snapshots;
  - content-minimized reference evidence for Memory Candidates;
  - exclusive local runtime-directory ownership;
  - Ed25519-signed, short-lived Invocation Contexts;
  - exact organization, audience, principal, operation and command binding;
  - public-key trust configuration with bounded key-rotation overlap;
  - server-side Agent Registry role derivation;
  - persistent one-time replay protection across runtime restarts;
  - a deny-by-default authenticated command gateway;
  - Invocation/correlation attribution for resulting audit events;
  - a strict local SQLite event and transaction schema;
  - one transaction for authenticated Invocation acceptance and internal
    command effects;
  - typed, content-minimized post-acceptance failure evidence;
  - rollback and rehydration on integrity, persistence and unexpected failure;
  - transaction-aware hash-chain and metadata verification;
  - crash recovery and stale/out-of-context write denial;
  - fail-closed persistence-format selection without implicit JSONL migration;
  - content-addressed dry-run Connector Contracts and registered Connector
    Instances;
  - immutable task-bound Delivery Intents and durable idempotent Outbox
    preparation;
  - connector claim leases, fencing identifiers and bounded attempts;
  - digest-only simulated outcomes and typed failed/uncertain outcomes;
  - Human Governance expired-claim reconciliation, retry, cancellation and
    uncertainty resolution;
  - stale-contract, concurrent-claim and Connector principal isolation;
  - an exact, expiring worker request/response protocol bound to the active
    delivery, fencing claim, connector and complete Delivery Intent;
  - a fixed shell-free child process with minimal environment, bounded
    standard I/O and hard timeout;
  - exact clean-exit acknowledgement and digest-only execution evidence;
  - crash-before-response, response-then-crash and hang fault injection;
  - claim preservation plus Human Governance uncertainty reconciliation after
    rejected worker execution;
  - explicit `networkIsolationEnforced: false` reporting;
  - append-only hash-chained audit events;
  - content-minimized task and delivery evidence export.
- Added the Chief of Staff, Operations and Marketing software-change-readiness
  pilot under `03_Projects/Company_OS_Pilot/`.
- Added an initial 49-test three-role slice, expanded it to 63 tests for
  reference intake/provenance/runtime ownership, and then to 79 tests for the
  authenticated Invocation boundary and gateway lifecycle. The transactional
  slice expanded the suite to 92 tests; the Connector Outbox slice expands it
  to 106 tests; the Agent Personality slice expands it to 110 tests; the
  process-separated worker slice expands it to 116 tests.
- Recorded 90.83% line, 77.73% branch and 90.48% function coverage for the
  authenticated candidate.
- Recorded 90.16% line, 78.04% branch and 90.56% function coverage for the
  transactional candidate; finalization-fault injection remains explicitly
  out of scope.
- Recorded 90.38% line, 78.67% branch and 91.17% function coverage for the
  Connector Outbox candidate.
- Recorded 90.88% line, 79.13% branch and 91.22% function coverage for the
  Agent Personality candidate.
- Recorded 90.77% line, 78.86% branch and 90.88% function coverage for the
  process-separated worker candidate.
- Added Evidence Item `EV-FDOS-RUNTIME-PILOT-001` and its SHA-256 source
  manifest.
- Added Evidence Item `EV-FDOS-REFERENCE-INTAKE-002` and its SHA-256 source
  manifest, a TapTime/Company AI adoption assessment, project Change-Impact
  profile and Artifact Validation Register.
- Added Evidence Item `EV-FDOS-AUTHENTICATED-INVOCATION-003`, its SHA-256
  source manifest and Validation Report 003.
- Added Evidence Item `EV-FDOS-TRANSACTIONAL-PERSISTENCE-004`, its SHA-256
  source manifest and Validation Report 004.
- Added Evidence Item `EV-FDOS-CONNECTOR-OUTBOX-005`, its SHA-256 source
  manifest and Validation Report 005.
- Added Evidence Item `EV-FDOS-AGENT-PERSONALITY-006`, its SHA-256 source
  manifest and Validation Report 006.
- Added Evidence Item `EV-FDOS-PROCESS-WORKER-007`, its SHA-256 source
  manifest and Validation Report 007.
- Added Knowledge Candidate KP-006 for exact Action Intent approval binding.
- Added Knowledge Candidates KP-007 for exact external-source binding and
  KP-008 for exclusive ownership before transactional persistence.
- Added Knowledge Candidate KP-009 for verified Invocation identity before
  authorization.
- Added Knowledge Candidate KP-010 for one durable transaction joining
  authenticated command state.
- Added Knowledge Candidate KP-011 for durable external-work intent and
  explicit uncertainty before retry.
- Applied KP-001 Role-versus-Agent-Instance separation in the experiment
  without changing its candidate status.
- No FDOS Core capability, canonical object or release version was added.


## v3.5
- Added FDOS Object Registry.
- Added FDOS Object Naming Standard.
- Added FDOS ADO Baseline Mapping.
- Added FDOS Object Relationship Model.
- Added Object Registry Integration Review.
- Updated roadmap for validation phase.


## v3.6
- Added Reality Before Architecture Principle.
- Added Architecture Admission Policy.
- Added Organizational Knowledge Lifecycle.
- Added FDOS Core Metrics.
- Added FDOS Version Management Standard.
- Added Executive Architecture Review v3.6.
- Added ADR-0036 and ADR-0037.
- Deferred Business Architecture, additional Core Capabilities and further main structure expansion.


## v3.7
- Added FDOS Charter.
- Added Repository Hygiene Standard.
- Added Reference Implementation Separation Policy.
- Added Knowledge Confidence Model.
- Added Metrics Automation Model.
- Added Executive Architecture Review v3.7.
- Added ADR-0038, ADR-0039 and ADR-0040.
- Reaffirmed that ADO belongs outside projects as Reference Implementation.
- Rejected new main folders and Business Architecture expansion without project evidence.


## v3.8 LTS
- Declared FDOS Genesis v3.8 as Long-Term Stable architecture baseline.
- Added Core Stability Policy.
- Added FDOS Validation Levels.
- Added Transition to Operations Plan.
- Added Charter Addendum: FDOS exists to serve products, customers and organizations — never itself.
- Added Executive Architecture Review v3.8 LTS.
- Added ADR-0041 and ADR-0042.
- Froze FDOS Core against speculative architecture growth.

## v3.8.1 LTS
- Added Core Change Evaluation Standard.
- Added Minimum Evidence Governance.

## v3.8.2 LTS (Draft)
- Added AI Constitution draft (Chapter 1: Purpose).

## v3.8.3 Draft
- Added AI Constitution Chapter 02 (Mission).

## v3.8.4 Draft
- Added AI Constitution Chapter 03 (Scope).

## v3.8.6 Draft
- Added AI Constitution Chapter 05 (Authority).

## v3.8.8 Draft
- Added AI Constitution Chapter 07 (Knowledge Principles).

## v3.8.9 Draft
- Added AI Constitution Chapter 08 (Collaboration Principles).

## v3.9.0 Draft
- Added AI Constitution Chapter 09 (Constitutional Failure Principles).

## v3.9.1 Draft
- Added AI Constitution Chapter 10 (Constitutional Commitment).

## v3.9.2 Draft
- Added AI Constitution Chapter 11 (Constitutional Governance).

## v3.9.3 Draft
- Added Development Agent Constitution Chapter 01 (Purpose).

## v3.9.4 Draft
- Added Development Agent Constitution Chapter 02 (Mission).

## v3.9.5 Draft
- Added Development Agent Constitution Chapter 03 (Responsibilities).

## v3.9.6 Draft
- Added Development Agent Constitution Chapter 04 (Authority).

## v3.9.7 Draft
- Added Development Agent Constitution Chapter 05 (Operating Principles).

## v3.9.8 Draft
- Added Development Agent Constitution Chapter 06 (Development Decision Model).

## v3.9.9 Draft
- Added Development Agent Constitution Chapter 07 (Knowledge Responsibilities).

## v3.10.0 Draft
- Added Development Agent Constitution Chapter 08 (Constitutional Boundaries).

## v3.10.1 Draft
- Added Development Agent Constitution Chapter 09 (Failure & Recovery Principles).

## v3.10.2 Draft
- Completed Development Agent Constitution.

## v3.10.3 Draft
- Added Research Agent Constitution Chapter 01 (Purpose).

## v3.10.4 Draft
- Added Research Agent Constitution Chapter 02 (Mission).

## v3.10.5 Draft
- Added Research Agent Constitution Chapter 03 (Responsibilities).

## v3.10.6 Draft
- Added Research Agent Constitution Chapter 04 (Authority).

## v3.10.7 Draft
- Added Research Agent Constitution Chapter 05 (Operating Principles).

## v3.10.8 Draft
- Added Research Agent Constitution Chapter 06 (Research Decision Model).

## v3.10.9 Draft
- Added Research Agent Constitution Chapter 07 (Knowledge Evolution Responsibilities).

## v3.11.0 Draft
- Added Research Agent Constitution Chapter 08 (Constitutional Boundaries).

## v3.11.1 Draft
- Added Research Agent Constitution Chapter 09 (Failure & Recovery Principles).

## v3.11.2 Draft
- Completed Research Agent Constitution.

## v3.11.3 Draft
- Added AI Collaboration Standard Chapter 01 (Purpose).

## v3.11.4 Draft
- Added AI Collaboration Standard Chapter 02 (Collaboration Model).

## v3.11.5 Draft
- Added AI Collaboration Standard Chapter 03 (Information Flow).

## v3.11.6 Draft
- Added AI Collaboration Standard Chapter 04 (Collaboration Lifecycle).

## v3.11.7 Draft
- Added AI Collaboration Standard Chapter 05 (Collaboration Principles).

## v3.11.8 Draft
- Added AI Collaboration Standard Chapter 06 (Collaboration Quality).

## v3.11.9 Draft
- Completed AI Collaboration Standard.

## v3.12.0 Clean LTS
- Synchronized repository README with current Clean LTS baseline.
- Added repository index.
- Added repository cleanup report.
- Added FDOS Object Library.
- Added FDOS Core Object Definitions.
- Preserved Core stability and avoided new capabilities.
- Confirmed frogs status/security documentation issue as project evidence, not Core change.

## Architecture Consolidation R2.8
- Consolidated `06_Learning/README.md` into the Learning area entry point and navigation document.
- Updated `INDEX.md` with Learning area, recommended reading order and consolidation rule.
- Updated `00_Specification/FDOS_Architecture_Map.md` with canonical references and closed-loop architecture framing.
- Preserved all existing project compatibility and avoided new concepts or capabilities.

## v3.12.2 Draft — TapTime Knowledge Intake (Sprint 011–015 Follow-up)
- Added two further Project Evidence records for TapTime under `04_Evidence/taptime/`: status drift persisting unchanged through Development Sprint 015 despite the project's own "Critical"-priority self-diagnosis, and a depth-before-breadth sequencing observation (Organization/Membership domain built while Finding F-01, a core product-behavior decision, remained open).
- Added Knowledge Candidates `KP-004_Diagnosis_Without_Remediation.md` (diagnosis quality and remediation follow-through are separate capabilities) and `KP-005_Sequencing_Decisions_Require_Explicit_Rationale.md` (work-sequencing choices need the same explicit rationale as content decisions).
- Updated `05_Knowledge/Cross_Project_Registry.md` with KP-004 and KP-005.
- All items remain at Evidence/Candidate confidence pending Knowledge Owner review, per Evidence Governance Minimum.
- No FDOS Core change. No new capability created. No `FDOS-*` identifiers assigned.

## v3.12.1 Draft — TapTime Knowledge Intake
- Added three Project Evidence records for TapTime under `04_Evidence/taptime/`: status/reality drift, single-operator role separation, and a regulated-data compliance checkpoint gap.
- Added `05_Knowledge/Cross_Project_Evidence/CPE-001_Status_Reality_Drift.md`, linking the existing frogs status/security evidence with the new TapTime evidence as two independent occurrences of the same failure mode.
- Added Knowledge Candidates `KP-002_Status_Reality_Drift_Requires_Automated_Verification.md` and `KP-003_Regulated_Data_Compliance_Guardrail.md`.
- Amended `KP-001_Role_vs_Agent_Instance.md` with a Known Limitation section (single-operator evidence from the same source project).
- Updated `05_Knowledge/Cross_Project_Registry.md` with CPE-001, KP-002 and KP-003.
- Evidence and reasoning: see the linked evidence and knowledge-candidate documents. Per Evidence Governance Minimum, none of this is Validated Evidence yet; all items remain at Evidence/Candidate confidence pending Knowledge Owner review.
- No FDOS Core change. No new capability created. No Object ID Registry entry added (no `FDOS-*` identifiers were assigned).
