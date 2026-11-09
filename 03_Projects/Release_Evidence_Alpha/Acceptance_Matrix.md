# Release Evidence Alpha — Acceptance Matrix

Status: Planning Baseline
Date: 2026-11-09
Rule: Every mandatory item requires reproducible evidence, not a narrative
claim.

## Status Vocabulary

- `Planned` — requirement exists; no accepted evidence.
- `Implemented` — implementation exists; independent acceptance pending.
- `Accepted` — required evidence reviewed and linked.
- `Blocked` — prerequisite or defect prevents acceptance.
- `Excluded` — explicitly outside the Alpha and approved as such.

All items below begin as `Planned` unless stated otherwise in
`Project_Status.md`.

## Integrity and Security

| ID | Mandatory acceptance | Required evidence | Gate |
|---|---|---|---|
| REA-AC-001 | Confidential data cannot enter a lower-classified task through direct or multi-hop handoff | Regression and adverse transfer tests | G1 |
| REA-AC-002 | Declassification requires an independent authorized record | Positive/negative declassification tests | G1 |
| REA-AC-003 | Git evidence reconstructs commit, tree, path, mode and blob from trusted repository data | Valid fixture and path/blob substitution rejection | G1 |
| REA-AC-004 | Canonicalization preserves every supported own property, including `__proto__`, or rejects input explicitly | Unit, property and collision regression tests | G1 |
| REA-AC-005 | Canonical format version participates in every affected digest/signature contract | Contract and migration tests | G1 |
| REA-AC-006 | OCI launcher tests use a controlled fixture and enforce both sides of the size limit | Boundary tests independent of host Node binary | G1 |
| REA-AC-007 | Supported test suite is green in the pinned environment | Complete command log and counts | G1 |
| REA-AC-008 | Unknown integrity, producer, freshness or authority state blocks authorization | Adversarial rule tests | G2 |
| REA-AC-009 | No adverse fixture produces false eligible or authorized | At least 20 reviewed adverse fixtures | G2 |
| REA-AC-010 | Secrets and restricted data are rejected from prompts, evidence, events and dossiers | Schema and redaction tests | G3 |

## Release Evidence Domain

| ID | Mandatory acceptance | Required evidence | Gate |
|---|---|---|---|
| REA-AC-011 | Material Change edits create a new immutable Change Revision | Domain transition tests | G2 |
| REA-AC-012 | Release baseline binds change, decisions, work order, commit/artifact, policy, verifier and findings | Digest mutation matrix | G2 |
| REA-AC-013 | Evidence carries exact subject, producer, provenance, integrity and freshness state | Schema/validation tests | G2 |
| REA-AC-014 | Evidence, implementation, review, approval and release statuses remain independent | State-transition tests | G2 |
| REA-AC-015 | Requirement revision invalidates dependent tests/review/approval at unchanged HEAD | End-to-end stale-evidence scenario | G3 |
| REA-AC-016 | Commit, policy or artifact change invalidates mismatched evidence | Mutation matrix | G3 |
| REA-AC-017 | Missing, invalid, stale and unknown findings have distinct codes and remediation | Golden output tests | G3 |

## Approval and Governance

| ID | Mandatory acceptance | Required evidence | Gate |
|---|---|---|---|
| REA-AC-018 | Work Order approval binds the exact scope, role, context, tools and budget | Changed-field rejection matrix | G2 |
| REA-AC-019 | Release approval binds exact baseline, action, policy, findings and expiration | Changed-field rejection matrix | G2 |
| REA-AC-020 | Approval is single-use and cannot be replayed after restart | Replay test | G2 |
| REA-AC-021 | Approval check and final consumption are one durable transition | Failure-injection and restart test | G2 |
| REA-AC-022 | A3/A4 and unknown external actions remain blocked | Authorization tests | G3 |

## Agent Roles and Context

| ID | Mandatory acceptance | Required evidence | Gate |
|---|---|---|---|
| REA-AC-023 | Role derives from registered Agent Instance, not caller claim | Conflicting-role test | G3 |
| REA-AC-024 | Technical Lead output conforms to a closed Work Order contract | Contract tests and one real output | G3 |
| REA-AC-025 | Programmer cannot widen scope, approve or publish | Capability denial tests | G3 |
| REA-AC-026 | Reviewer is independent of the implementation identity and cannot silently modify code | Identity and write-denial tests | G3 |
| REA-AC-027 | Changes requested return to a new implementation step and invalidate prior review | End-to-end review loop | G3 |
| REA-AC-028 | Context Projection contains only admitted exact revisions and records inclusion reason | Projection snapshot and access tests | G3 |
| REA-AC-029 | Personality changes no capability, tool, context or approval field | Profile mutation tests | G3 |
| REA-AC-030 | Model/provider failure records failure or unknown, never success | Timeout/malformed-output tests | G3 |

## GitHub and CI

| ID | Mandatory acceptance | Required evidence | Gate |
|---|---|---|---|
| REA-AC-031 | Pull request and check evidence bind the exact repository and head SHA | Integration fixtures | G3 |
| REA-AC-032 | Only admitted workflow and producer identities satisfy required CI evidence | Wrong-workflow/fork tests | G3 |
| REA-AC-033 | Forged and duplicate webhooks do not change accepted state | Signature and deduplication tests | G3 |
| REA-AC-034 | Reconciliation corrects missed webhook observations without inferring authorization | Reconciliation scenario | G4 |
| REA-AC-035 | GitHub permissions remain read-minimal except FDOS check publication | Reviewed permission manifest | G4 |
| REA-AC-036 | Source writes, merge and deployment remain impossible through the Alpha adapter | Capability and integration review | G4 |

## Dossier, Audit and Reproducibility

| ID | Mandatory acceptance | Required evidence | Gate |
|---|---|---|---|
| REA-AC-037 | Canonical JSON contains every decision input, finding, approval and limitation | Schema and golden-file review | G3 |
| REA-AC-038 | HTML is derived from the same retained state and cannot upgrade authority | JSON/HTML comparison test | G3 |
| REA-AC-039 | Accepted state and dossier reproduce after restart | Restart/replay test | G3 |
| REA-AC-040 | Identical accepted inputs produce identical semantic dossier content | Reproducibility test | G3 |
| REA-AC-041 | Every accepted agent and human action is attributable | Audit query and trace review | G3 |
| REA-AC-042 | Dossier generation completes within two minutes for the Alpha fixture | Timed run | G4 |

## Product Validation

| ID | Mandatory acceptance | Required evidence | Gate |
|---|---|---|---|
| REA-AC-043 | Three real FDOS changes complete the full workflow | Three reviewed dossiers | G4 |
| REA-AC-044 | At least one useful stale-evidence condition is detected | Before/after comparison | G4 |
| REA-AC-045 | Internal evidence-collection time improves by at least 50% against recorded baseline | Timed comparison | G4 |
| REA-AC-046 | Known false blocks and operator interventions are recorded | Measurement log | G4 |
| REA-AC-047 | Supported setup path is documented and repeatable | Clean-environment setup test | G4 |
| REA-AC-048 | Remaining security gaps and unsupported claims are explicit | Human security review | G4 |

## External Pilot Gates

These items are not required for the internal Alpha, but all are mandatory
before a customer repository is connected.

| ID | Mandatory acceptance | Required evidence | Gate |
|---|---|---|---|
| REA-AC-049 | Production-capable human/service identity and credential lifecycle | Security design and tests | G5 |
| REA-AC-050 | Tenant-bound data access and deletion/retention behavior | Isolation and lifecycle tests | G5 |
| REA-AC-051 | Backup and restore succeed in a clean environment | Restore evidence | G5 |
| REA-AC-052 | Median setup is at most 60 minutes without custom development | Pilot measurements | G5 |
| REA-AC-053 | At least two teams pay for a bounded pilot after qualified demonstrations | Signed commercial evidence | G5 |
| REA-AC-054 | Direct gross margin is at least 75% with support valued honestly | Cost ledger | G6 |
| REA-AC-055 | At least five teams use and pay across two billing periods | Billing and usage evidence | G6 |

## Acceptance Authority

Implementation authors may attach evidence but cannot mark their own mandatory
item `Accepted`. Human Governance or an explicitly independent reviewer owns
acceptance. Commercial evidence shall not be fabricated, simulated or
substituted with expressions of interest.
