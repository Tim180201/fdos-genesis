# Release Evidence Alpha — Scope

Status: Planning Baseline
Date: 2026-11-09
Owner: Human Governance

## Alpha Outcome

The Alpha is complete only when one real FDOS change can move from a
human-defined objective through Technical Lead, Programmer, Reviewer, CI,
deterministic evidence verification and exact human release approval into a
reproducible release dossier.

The Alpha is not complete merely because isolated APIs, prompts or tests
exist.

## Supported Product Stack

| Area | Alpha choice |
|---|---|
| Source control | One GitHub repository |
| Change branch | One branch or isolated worktree per approved Work Order |
| CI | GitHub Actions |
| Change definition | One versioned repository file format |
| Release candidate | One commit plus optional content-addressed artifact |
| Approval | Exact, expiring, single-use Human Governance approval |
| Evidence output | Canonical JSON plus human-readable HTML |
| Runtime | Existing FDOS Runtime, selectively repaired and extended |
| Persistence | Local experimental relational/event storage |
| UI | CLI and GitHub Check first; no standalone product dashboard required |
| LLM access | One bounded provider/runner adapter; not required by the gate |

## Required Functional Slice

### 1. Change Definition

One immutable Change Revision contains:

- stable change identifier;
- revision identifier and schema version;
- problem statement;
- acceptance criteria;
- applicable decision revisions;
- required evidence types;
- repository and branch constraints;
- applicable policy profile;
- classification and owning scope.

Changing any authority-bearing field creates a new revision. It never edits an
approved revision in place.

### 2. Technical Lead Work Order

The Technical Lead proposes a Work Order that binds:

- exact Change Revision;
- implementation scope and non-goals;
- allowed repositories, paths and tools;
- expected outputs;
- acceptance and test plan;
- dependencies and ordering;
- information projection;
- cost and time budget.

Human Governance approves the exact Work Order digest before implementation.

### 3. Programmer Execution

The Programmer receives only the approved Work Order and its task-scoped
context. The Programmer may create code and test changes inside the admitted
branch/worktree but cannot:

- change its role or policy;
- broaden the Work Order;
- approve its own work;
- publish, deploy or merge to a protected branch;
- access production credentials;
- mark evidence as verified.

### 4. Independent Review

The Reviewer receives the exact requirement revision, decision revisions,
Work Order, diff, test evidence and relevant policies independently. The
Reviewer produces typed findings with severity, location, rationale and
disposition.

The Reviewer cannot silently modify the implementation. Any repair returns to
a Programmer step and creates new implementation evidence.

### 5. Evidence Intake

The verifier imports or derives:

- trusted Git commit, tree, paths, modes and blobs;
- pull-request identity and exact head SHA;
- review state and reviewer identity;
- GitHub Actions workflow/run/job identity;
- check conclusion and test-result digest;
- optional artifact identity and provenance;
- policy version and verifier version.

Raw logs and large build artifacts remain with their system of origin unless
a specific bounded excerpt is required.

### 6. Eligibility and Authorization

Eligibility and authorization are separate:

```text
eligible =
  subject_matches
  AND producer_trusted
  AND integrity_valid
  AND required_evidence_complete
  AND policy_passed
  AND freshness_valid

authorized =
  eligible
  AND exact_human_approval_valid
```

Unknown, missing, invalid or stale evidence cannot be treated as passing.

### 7. Dossier

The dossier includes:

- release-candidate identity;
- applicable Change and Decision Revisions;
- Work Order and agent-run identities;
- commit, review, CI and test evidence;
- findings and resolved findings;
- eligibility and authorization status;
- human approvals;
- policy and verifier versions;
- source references and digests;
- audit sequence and generation time;
- limitations and unknowns.

The canonical JSON is authoritative. HTML is a deterministic presentation of
the same retained facts.

## Agent and Document Access Scope

All agents may reference the shared project truth, but no agent receives every
document by default.

The Context Projection service selects documents by:

- exact Work Order;
- role and capability;
- owning project and repository;
- classification ceiling;
- declared purpose;
- current revision;
- explicit transfer or declassification authority.

Every agent output cites the source revision used. A later source revision
does not rewrite the historical run; it may make the run stale.

## Non-Functional Requirements

- fail closed on integrity, authority or applicability uncertainty;
- deterministic decisions for identical canonical inputs;
- versioned schemas and canonicalization;
- reproducible dossier output, excluding explicitly declared timestamps;
- least-privilege GitHub permissions;
- idempotent webhook processing and periodic reconciliation;
- no secrets in evidence, prompts, audit events or dossiers;
- complete attribution of human and agent actions;
- measured model, infrastructure and support cost;
- restart-safe retained state for every accepted decision.

## Explicit Non-Goals

- general conversational project management;
- permanent unrestricted agent memory;
- arbitrary agent-to-agent delegation;
- multi-tenant SaaS operation during the internal Alpha;
- generic integrations marketplace;
- automatic code merge or deployment;
- replacement for GitHub, CI, coding agents or artifact storage;
- compliance certification or legal assurance;
- all-company organizational design;
- autonomous finance, HR, legal, sales or marketing activity.

## Internal Alpha Definition of Done

The Alpha is done when every mandatory item in `Acceptance_Matrix.md` is
accepted and the status document records:

- exact repository commit;
- supported environment;
- test and build commands;
- passing and excluded test counts;
- three completed real changes;
- measured dossier time and comparison baseline;
- known limitations;
- Human Governance go/no-go decision.
