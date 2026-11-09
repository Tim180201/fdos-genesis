# Release Evidence Alpha — Security and Threat Model

Status: Phase 0 Controls Implemented — G1 Review Pending
Date: 2026-11-09
Validation Level: Level 1 — Experimental

## Security Objective

FDOS must not report a release candidate as authorized unless every required
piece of evidence applies to the exact candidate, comes from an admitted
producer, passes integrity and freshness checks, and is covered by a valid
human approval for the same baseline.

Availability loss may block a release. It must never create a false approval.

## Protected Assets

- Human Governance authority;
- requirement and decision meaning;
- Work Order scope and budgets;
- source and artifact identity;
- test, review and CI evidence applicability;
- confidential project information;
- agent identity and role separation;
- approval uniqueness and exact intent;
- audit and dossier integrity;
- GitHub credentials and webhook secrets;
- truthful product and readiness claims.

## Trust Assumptions for the Internal Alpha

- one trusted local operator and host account;
- one controlled FDOS process owns local persistence;
- the admitted local Git repository and executable are not compromised;
- GitHub and GitHub Actions provider identities are trusted only through
  verified API/webhook observations;
- Human Governance identity remains locally configured and experimental;
- agent providers are untrusted for release decisions;
- agent output may be incorrect, malicious or prompt-injected;
- no customer secrets or production credentials enter the Alpha.

These assumptions are insufficient for a hosted or customer-facing service.

## Non-Negotiable Invariants

1. Unknown evidence never passes.
2. An agent cannot assign or widen its own authority.
3. A Programmer cannot approve its implementation.
4. A Reviewer finding cannot be silently removed by the reviewed agent.
5. Approval binds one exact baseline and one action intent.
6. A material source revision invalidates dependent evidence.
7. Classification cannot decrease through handoff.
8. Caller assertions never replace trusted Git reconstruction.
9. Canonicalization never silently drops supported input information.
10. LLM output never changes release state without deterministic validation.
11. External action remains disabled unless a separate gate explicitly
    authorizes the exact effect.
12. Every accepted state transition is attributable and replayable.

## Phase 0 Findings and Repair State

The 2026-11-09 review reported the following defects at repository baseline
`7e3960c088f15d2640a7717bcae0366b9d3cd0ec`. The three security conditions
were reproduced with adverse tests. The OCI failure was environment-dependent
and did not fail on the recorded small Node binary, but its fixture dependency
was confirmed and removed.

| ID | Condition | Implemented Phase 0 control | Acceptance state |
|---|---|---|---|
| REA-SEC-001 | Confidential source content can be copied into a lower-classified handoff/task | Free-form dynamic handoffs are same-department only; direct and multi-hop transfer tests | Implemented; G1 review pending |
| REA-SEC-002 | Controlled Git snapshot input can assert a false path/blob association | Trusted Git reconstructs commit, tree, full manifest and exact path/object tuple before read | Implemented; G1 review pending |
| REA-SEC-003 | Canonical JSON can lose an own `__proto__` property | Canonical JSON v2 preserves own data, rejects ambiguous shapes and domain-separates integrity bytes | Implemented; G1 review pending |
| REA-TEST-001 | OCI tests depend on the size of the host Node.js binary fixture | Controlled launcher fixture plus exact 64 MiB and 64 MiB + 1 boundary tests; limit unchanged | Implemented; G1 review pending |

Evidence is recorded in `EV-FDOS-PHASE0-INTEGRITY-014`. No GitHub integration,
agent automation or external pilot precedes Human Governance acceptance of
Gate G1.

## Threats and Controls

| ID | Threat | Required control | Alpha evidence |
|---|---|---|---|
| REA-T-001 | Agent reads unrelated or more sensitive documents | Task-scoped Context Projection with classification ceiling | Positive and negative access tests |
| REA-T-002 | Handoff lowers sensitivity | Same-department-only dynamic handoff now; future cross-department projection requires independent declassification | Direct and multi-hop leakage regression |
| REA-T-003 | Agent claims another role | Server-side Agent Registry role derivation | Conflicting-role rejection test |
| REA-T-004 | Agent expands Work Order | Exact approved Work Order digest and path/tool allowlists | Changed-scope rejection test |
| REA-T-005 | Reviewer approves own code | Separate agent identity and implementation attribution | Self-review rejection test |
| REA-T-006 | Stale requirement retains green tests | Dependency links and revision-based freshness rules | Requirement-change stale case |
| REA-T-007 | Evidence belongs to another commit | Exact subject and Git relationship verification | Cross-commit substitution test |
| REA-T-008 | CI result comes from an untrusted producer | Admitted workflow/repository/issuer policy | Fork or wrong-workflow rejection |
| REA-T-009 | Webhook is forged or replayed | Signature, delivery deduplication and API reconciliation | Invalid/repeated delivery tests |
| REA-T-010 | Approval is replayed or moved | Exact baseline/action digest, expiry and single use | Replay and mismatch tests |
| REA-T-011 | Canonical digest collision through dropped data | Format-versioned canonicalizer and property tests | Adversarial corpus |
| REA-T-012 | Audit state is altered | Schema validation, replay verification and hash chain | Mutation/restart tests |
| REA-T-013 | Prompt injection changes policy | Separate instructions/data; closed outputs; deterministic policy | Malicious-document fixture |
| REA-T-014 | Dossier overstates assurance | Same authoritative state as JSON; explicit unknowns/limitations | Golden-file comparison |
| REA-T-015 | Secret enters evidence or prompt | Closed schemas, redaction, field denial and test fixtures | Secret-pattern and field tests |
| REA-T-016 | Concurrent agents overwrite work | Isolated worktrees and Work Order dependency rules | Conflict and ordering tests |
| REA-T-017 | Provider outage becomes approval | Unknown/blocking state; no inferred success | Timeout/outage tests |
| REA-T-018 | Human identity is fabricated locally | No production claim; external pilot requires real identity boundary | Documented gate and review |

## Data Classification and Provenance

The Alpha uses the existing FDOS classes:

- `public`;
- `internal`;
- `confidential`;
- `restricted` — rejected by the Level 1 runtime.

Every evidence or context item additionally carries:

- owning workspace and project;
- owning department or scope, if applicable;
- source object and revision;
- producer identity;
- collection mechanism;
- integrity state;
- permitted purposes;
- retention class.

Derived content inherits the maximum sensitivity of its inputs unless an
independent authorized declassification record states otherwise.

## Approval Model

An approval statement includes:

- human principal and verified authentication context;
- exact action intent;
- exact release-baseline digest;
- applicable policy version;
- unresolved-finding digest;
- issue time and expiration;
- one-use identifier;
- optional constraints.

Approval and final authorization shall be rechecked and consumed in one
durable transition. An approval does not authorize a changed candidate,
retry, second release or publication action.

## Agent Security Model

- Roles define stable responsibility and permissions.
- Agent Instances identify concrete participants.
- Personality Profiles affect communication only.
- Work Orders define temporary bounded authority.
- Context Projections define admitted information.
- Agent outputs remain claims until validated.

Technical Lead, Programmer and Reviewer prompts shall be assembled from
separate closed role contracts. No output field may carry new tools,
capabilities, approval authority or memory scope.

## GitHub Security Gate

Before a real external repository is connected, FDOS requires:

- minimal documented App permissions;
- installation/workspace binding;
- protected webhook secret storage and rotation;
- webhook signature and deduplication tests;
- credential redaction and log review;
- explicit data retention and deletion behavior;
- tenant-bound database queries;
- backup/restore test;
- incident and credential-revocation procedure;
- independent security review of the supported path.

## Safe Failure

Integrity, authority, classification, applicability and freshness uncertainty
fail closed. User-facing output distinguishes `missing`, `invalid`, `stale`
and `unknown`; it must not collapse them into a generic failure or silently
retry an uncertain external observation.

## Known Gaps During Planning

- reported defects are not yet reproduced in this project;
- no production human or workload identity exists;
- local host compromise remains outside the internal Alpha boundary;
- no production key custody, revocation or secret broker exists;
- no hosted tenant isolation, backup/restore or privacy lifecycle exists;
- no live GitHub App path has been validated;
- no real model-level prompt-injection evaluation exists;
- hash chaining is not independent tamper-proof storage;
- compliance and certification claims are explicitly unsupported.

Every validation report must repeat applicable gaps.
