# Deterministic Release Evidence Domain

Status: G2 Implementation Candidate — Human Review Required
Runtime Version: `0.15.0-experimental`
Schema Version: `1.0`
Validation Level: Level 1 — Experimental
Core Impact: None

## Purpose

This slice models and verifies one exact software release candidate without
using an LLM as an authority. It implements the bounded G2 domain and approval
path authorized by Human Governance for the Release Evidence Alpha.

It does not connect GitHub, execute an agent, merge code, deploy software or
produce the final JSON/HTML dossier. Those remain later work packages and
gates.

## Security Rules

1. Every authority-bearing object is closed-shape, immutable and
   content-addressed with FDOS canonical JSON v2.
2. Change and Decision edits create successor revisions; history is never
   rewritten.
3. A Release Baseline binds the exact Change Revision, Decision Revisions,
   Work Order, repository, commit, tree, optional artifact, policy, verifier,
   canonical format and unresolved findings.
4. Evidence identifies its exact subject, producer identity, provenance,
   integrity state, freshness state, classification and owning scope.
5. Missing, invalid, stale, unknown, untrusted-producer and subject-mismatch
   conditions block eligibility.
6. Decision and approval authority must be admitted by the exact policy.
7. Evidence, implementation, review, approval and release status are separate
   axes. One transition changes exactly one axis.
8. Eligibility is reproduced from recorded exact inputs before authorization;
   a caller-supplied `eligible: true` object is insufficient.
9. Release approval binds the exact baseline, policy, unresolved-findings set,
   action and validity window.
10. Final authorization consumes approval once and advances approval and
    release axes inside one durable SQLite transaction.
11. Unknown state never becomes success through presentation, replay or
    restart.

## Domain Objects

| Object | Identity and authority rule |
|---|---|
| Change Revision | Stable `changeId`; monotonically increasing revision; exact predecessor digest |
| Decision Revision | Stable `decisionId`; human authority; effective/expiry window; exact predecessor digest |
| Work Order | Digest covers role, scope, non-goals, repositories, paths, tools, outputs, tests, context and budget |
| Release Candidate | Digest covers exact source commit/tree, artifact, Change, Decisions, Work Order, policy and verifier |
| Release Baseline | Candidate binding plus the exact unresolved-finding digest set |
| Evidence | Exact subject, producer, provenance, observation, integrity and freshness metadata; no raw log payload |
| Finding | Stable rule, code, subject, evidence digests, remediation and open state |
| Approval | Human, expiring, exact-intent and single-use |
| Approval Consumption | Exact approval, action intent, subject, actor and time |
| Release Status Revision | One-axis successor with exact predecessor digest |
| Relationship | Typed edge between compatible exact object references |
| Policy | Versioned requirements plus admitted decision/work-order/release authorities |
| Evaluation | Deterministic result, findings, evidence digests and exact baseline |
| Authorization | Evaluation, baseline, policy, approval, consumption and both final status successors |
| Domain Event | Ordered, attributable and hash-chained replay input |

## Independent Status Axes

- Evidence: `missing`, `observed`, `verified`, `stale`, `invalid`, `unknown`
- Implementation: `planned`, `active`, `completed`, `superseded`, `failed`
- Review: `not-requested`, `pending`, `changes-requested`, `accepted`
- Approval: `not-required`, `pending`, `valid`, `expired`, `consumed`, `revoked`
- Release: `draft`, `ineligible`, `eligible`, `authorized`, `published`,
  `withdrawn`

Initial status is fixed to the least-authoritative values. Arbitrary initial
states are not accepted. Final authorization requires `verified`,
`completed`, `accepted`, `valid` and `eligible`, then records separate
`approval → consumed` and `release → authorized` successors.

## Deterministic Evaluation

`evaluateReleaseEligibility` accepts only exact domain objects and an explicit
evaluation timestamp. It validates workspace, revision, policy, verifier,
decision applicability, decision authority and decision validity before
evaluating evidence requirements.

For every requirement, it checks:

1. required evidence type exists;
2. evidence subject equals an admitted exact revision;
3. producer identity digest is admitted;
4. integrity is verified;
5. evidence is not from the future;
6. freshness is known and current;
7. the minimum verified count is met.

`verifyReleaseEvaluationAgainst` reruns the same evaluation over the recorded
candidate, change, decisions, work order, policy and evidence. Authorization
requires the reproduced digest to equal the retained Evaluation digest.

## Approval and Atomic Finalization

Work-order approval binds the complete Work Order digest and policy digest.
Changing scope, role, context, tools, paths, outputs or budget produces another
digest and rejects the old approval.

Release approval binds:

- action `authorize-release`;
- Work Order digest;
- Release Baseline digest;
- policy digest;
- digest of the exact unresolved-findings set;
- activation and expiry timestamps;
- human approver identity.

`ReleaseEvidenceCoordinator.authorizeRelease` performs deterministic
reverification, authority admission, approval validation, single-use
consumption and final status changes in one SQLite transaction. The durable
audit event contains the complete content-addressed Authorization object.
Rollback leaves neither consumption nor authorization visible. Replay after a
restart reconstructs the consumed approval and rejects reuse.

## Replay and Persistence

The Release Evidence domain has its own ordered digest chain embedded in the
existing SQLite audit store. Replay rejects:

- broken sequence or predecessor digests;
- duplicate event IDs;
- cross-workspace objects;
- conflicting stable identities;
- relationships to unrecorded objects;
- status transitions without an exact predecessor;
- authorization whose evaluation inputs are absent;
- a second consumption of the same approval.

The local operating-system account and SQLite owner remain trusted. Hash
chaining detects logical or accidental mutation; it is not hostile-host
protection.

## Migration and Reversibility

The Release Evidence schema begins at `1.0`. There is no historical domain
state to migrate in this experiment.

- Unknown schema or canonical-format versions fail closed.
- Historical digests are never silently rewritten.
- A future incompatible contract requires a new schema version and an
  explicit read/migration decision.
- The new modules are isolated under the experimental Runtime and can be
  removed without changing the FDOS Core.
- The durable coordinator stores Release Evidence events under the distinct
  audit type `release-evidence.domain-event`; unrelated Runtime events remain
  intact if the experiment is retired.

## Verification

The G2 candidate includes:

- material Change/Decision revision tests;
- a baseline digest mutation matrix;
- exact Evidence schema and state tests;
- independent one-axis transition tests;
- typed relationship and replay tests;
- Work Order and Release Approval mutation matrices;
- 31 named adverse applicability fixtures;
- unknown decision and release-approval authority rejection;
- injected durable-append failure with rollback;
- successful restart reconstruction;
- approval replay rejection after restart.

The implementation author may record these controls as `Implemented`. Only
Human Governance or an explicitly independent reviewer may mark the G2
acceptance criteria `Accepted` or close Gate G2.

## Non-Claims

- No external repository or CI system is connected.
- No GitHub identity, webhook or workflow admission is implemented.
- No production credential custody, tenancy, backup or recovery is claimed.
- No agent-role enforcement or real model execution is part of this slice.
- No dossier renderer is implemented yet.
- No production readiness, customer value or commercial demand follows from
  passing local tests.
