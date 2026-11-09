# Release Evidence Alpha — Target Architecture

Status: Planning Baseline
Date: 2026-11-09
Architecture Style: Modular Monolith plus Local Verifier

## Architecture Goal

Create the smallest architecture that can prove evidence applicability and
human authority for one release candidate without building a replacement for
GitHub, CI or existing coding agents.

## System Context

```text
Human Governance
      │ objectives and approvals
      ▼
FDOS CLI / GitHub Check
      │
      ▼
Workflow and Work-Order Coordinator
      │
      ├── Technical Lead Agent Adapter
      ├── Programmer Agent Adapter
      └── Reviewer Agent Adapter
      │
      ▼
Context Projection and Evidence Registry
      │
      ├── trusted Git reader
      ├── GitHub/Actions adapter
      └── policy and decision registry
      │
      ▼
Deterministic Eligibility and Approval Engine
      │
      ├── Audit/Event Store
      └── JSON/HTML Dossier Generator
```

## Architectural Principles

1. Deterministic gate, optional intelligence.
2. Exact subjects and revisions, never floating references.
3. Authority and evidence remain separate.
4. Unknown is a first-class blocking state.
5. Least privilege and minimal retained data.
6. Typed artifacts instead of ungoverned agent chat.
7. One supported stack before additional integrations.
8. Modular boundaries without premature distributed systems.
9. Existing systems execute work; FDOS verifies and coordinates it.
10. Every status must be reconstructable from retained events and evidence.

## Logical Modules

### Change Registry

Owns immutable Change Revisions, Decision Revisions, acceptance criteria and
required evidence declarations.

### Work-Order Coordinator

Creates role-bound Work Orders, enforces dependencies and budgets, records
claims and completions, and prevents unauthorized delegation.

### Agent Adapter Boundary

Assembles a closed request for a configured agent runner and validates a typed
response. Model/provider details remain outside the domain model. A human may
perform the same Work Order without changing release semantics.

### Context Projection

Resolves the exact versioned documents and evidence allowed for one role and
Work Order. It retains provenance and classification and prevents sensitivity
downgrade through handoff.

### Git Source Verifier

Reconstructs trusted commit-to-tree-to-path-to-mode-to-blob relationships
from the repository. It does not accept a caller-asserted path/blob pair as
proof.

### GitHub/CI Adapter

Imports webhook and API observations using minimal permissions, verifies
signatures, deduplicates delivery IDs and periodically reconciles important
state. It stores bounded evidence and references rather than large logs.

### Evidence Registry

Stores typed evidence with exact subject, producer, source revision,
observation time, integrity state, freshness rule and provenance.

### Eligibility Engine

Evaluates deterministic policy over evidence. It produces findings and a
decision trace but performs no deployment or merge.

### Approval Engine

Binds Human Governance approval to the exact candidate baseline, policy,
findings state and expiration. Approval is single-use and rechecked in the
same durable transition as final authorization.

### Audit and Replay

Records attributable, content-minimized events and reconstructs accepted
state after restart. Local hash chaining detects accidental or local logical
tampering but is not represented as hostile-host protection.

### Dossier Generator

Produces canonical JSON and deterministic HTML from the same accepted state.
It never upgrades evidence authority through presentation.

## Domain Objects

| Object | Purpose | Identity rule |
|---|---|---|
| Workspace | Administrative and data boundary | Stable ID; no implicit cross-workspace access |
| Repository | Admitted source repository | Provider ID plus immutable installation binding |
| ChangeRevision | Requested outcome and criteria | New revision for every material change |
| DecisionRevision | Applicable human decision | Exact revision and authority required |
| WorkOrder | Bounded assigned work | Digest binds scope, role, inputs and budget |
| AgentRun | One attributable execution | Exact agent, role, adapter and request digest |
| Artifact | Code/build/document output | Content-addressed identity |
| Evidence | Observation about a subject | Exact subject, producer and provenance |
| Finding | Explainable failed or uncertain rule | Stable rule ID plus subject |
| Approval | Human authority for an exact intent | Expiring, single-use exact-baseline digest |
| ReleaseCandidate | Candidate being evaluated | Commit plus optional artifact and policy baseline |
| AuditEvent | Accepted state transition | Ordered, attributable and replayable |

These objects are experimental implementation objects. They do not redefine
the canonical FDOS Organizational Object Model.

## Independent Status Axes

One overloaded `status` field is prohibited. The minimum independent axes
are:

- **Evidence:** missing, observed, verified, stale, invalid, unknown;
- **Implementation:** planned, active, completed, superseded, failed;
- **Review:** not-requested, pending, changes-requested, accepted;
- **Approval:** not-required, pending, valid, expired, consumed, revoked;
- **Release:** draft, ineligible, eligible, authorized, published, withdrawn.

Transitions on one axis do not silently imply another.

## Baseline Identity

The release baseline digest shall cover at least:

- Change Revision;
- applicable Decision Revisions;
- Work Order and acceptance profile;
- repository and commit;
- optional artifact digest;
- required evidence policy;
- verifier and canonicalization format version;
- unresolved findings set.

Any authority-relevant change creates a different baseline and invalidates an
approval for the old baseline.

## Canonicalization

Canonicalization is a security format, not an implementation detail.

- every canonical format has an explicit version;
- own properties, including unusual property names, cannot disappear;
- unsupported values and cycles fail explicitly;
- migration never silently rewrites historical digests;
- property-based and adversarial tests cover collision boundaries;
- signatures state the canonical format version they cover.

## Persistence Direction

The internal Alpha may continue with a single controlled SQLite owner. Before
a hosted pilot, the design shall move to a supported relational database with
schema migrations, backup/restore, tenant boundaries and operational
monitoring.

No graph database, vector database or distributed workflow engine is required
for the Alpha. Relationships are explicit typed relational edges.

## GitHub Permission Direction

Request only permissions required to:

- read repository metadata and admitted content;
- read pull requests, reviews and checks;
- read GitHub Actions metadata;
- publish an FDOS check result;
- receive signed webhooks.

Writing source, merging pull requests, changing branch protection, managing
secrets and triggering deployment remain out of scope.

## Agent Scaling Direction

The first workflow has one instance per agent role. Multiple Programmers may
be added only after FDOS can prove:

- non-overlapping or explicitly coordinated Work Orders;
- isolated branches/worktrees;
- declared interface dependencies;
- deterministic merge order;
- independent review of the combined candidate;
- no privilege increase through delegation.

## Evolution Boundary

Only measured needs may justify later components such as a web dashboard,
PostgreSQL service, more CI adapters, artifact attestations, Slack/Teams or
MCP. No such component is pre-authorized by this architecture.
