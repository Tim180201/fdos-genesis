# Evidence Record — Deterministic Release Evidence Domain Candidate

Status: Evidence Item / Human Review Required

Project: FDOS Release Evidence Alpha

Date: 2026-11-09

Confidence: High for the recorded local domain invariants, deterministic
evaluation and SQLite replay tests; Low for real producer identity, human
authentication, external GitHub/CI intake, tenant isolation, production
operation or commercial value

FDOS Validation Level: Level 1 — Experimental

Core Impact: None

## 1. Purpose

Record the implementation and verification evidence for the G2 Release
Evidence domain candidate authorized after Gate G1.

This evidence covers immutable revisions, exact baselines, evidence and
finding contracts, independent status axes, deterministic eligibility, exact
approvals, single-use consumption, atomic durable authorization and replay.

It does not close Gate G2. The deterministic JSON/HTML dossier, real GitHub/CI
producer verification, controlled agent workflow and independent acceptance
remain incomplete.

## 2. Evaluated Source

Implementation commit:

```text
468b572941e982db4752d450abb0dfa367bf891e
```

Implementation tree:

```text
311dafb5052de64337e21193c7617300102a297c
```

The implementation consists of the primary G2 commit `5b2431a` and the
supplemental host-independent OCI fixture correction `468b572`.

The complete 105-file Runtime candidate is bound by:

- manifest:
  `EV-FDOS-RELEASE-EVIDENCE-G2-015_Source_Manifest.sha256`;
- manifest SHA-256:
  `877c04325a443b74b1f10c32affc4a505d2b03e7ae0ad84f8d702ffd3f9e984b`.

The evidence record is committed separately so its manifest binds an already
immutable source tree.

## 3. Recorded Environments

Primary pinned verification:

```text
runtime package: @fdos/runtime-reference@0.15.0-experimental
Node.js:         v26.3.1
npm:             11.16.0
SQLite:          3.53.2 through node:sqlite
Git:             2.54.0
macOS:           26.5.1, build 25F80
architecture:    arm64
```

Additional supported-range verification:

```text
Node.js:         v22.23.0
npm:             10.9.8
SQLite:          3.51.3 through node:sqlite
```

Node.js 22 emits the platform's expected experimental `node:sqlite` warning.
No warning was treated as evidence of production support.

## 4. Implemented Domain

The candidate adds schema version `1.0` contracts for:

- immutable Change and Decision Revisions;
- exact Work Orders, Release Candidates and Release Baselines;
- Evidence, Finding, Policy, Approval and Approval Consumption;
- five independent status axes and one-axis successors;
- typed exact-object relationships;
- deterministic Eligibility Evaluations;
- content-addressed Release Authorizations;
- ordered domain events and deterministic replay;
- a transactional coordinator over the existing SQLite audit store.

Every authority-bearing object is closed-shape, immutable and
content-addressed through canonical JSON v2. The Release Baseline covers the
Change, Decisions, Work Order, repository, commit, tree, optional artifact,
policy, verifier, canonical format and unresolved findings.

## 5. Deterministic and Fail-Closed Rules

Eligibility verifies one exact workspace and candidate graph before applying
evidence requirements. It checks:

- Change, Decision, Work Order, policy and verifier digests;
- decision applicability, outcome, validity and admitted authority;
- Change-required evidence types against policy requirements;
- exact acceptance-criterion coverage;
- the one admitted candidate repository and bounded paths;
- evidence type, exact subject, admitted producer, integrity, observation
  time, freshness and minimum count.

Missing, invalid, stale, unknown, untrusted-producer and subject-mismatch
conditions cannot produce `eligible: true`.

Before final authorization, `verifyReleaseEvaluationAgainst` reruns the
evaluation from the retained candidate, change, decisions, work order, policy
and evidence. A structurally valid caller-created `eligible: true` object is
therefore insufficient at the durable boundary.

## 6. Approval and Durable Authorization

Work-order approval binds the complete Work Order and policy. Changed scope,
role, context, tools, paths, outputs, budget or policy is rejected.

Release approval binds the exact baseline, action, policy, unresolved-finding
set and validity interval. Both approval types require a human ID admitted by
the exact versioned policy.

Final authorization requires the independent states:

```text
evidence       verified
implementation completed
review         accepted
approval       valid
release        eligible
```

One content-addressed Authorization then contains:

- exact Evaluation, Baseline, Policy and Approval digests;
- one Approval Consumption;
- `approval: valid → consumed`;
- `release: eligible → authorized`;
- exact actor and timestamp.

The coordinator writes that Authorization as one SQLite transaction. Ordinary
object or status events cannot inject Approval Consumption or an authorized
state. An eligible status requires a recorded eligible Evaluation.

## 7. Adversarial Verification

The suite contains 31 named adverse applicability fixtures, including:

- missing and wrong evidence types;
- wrong subject digest, ID and kind;
- untrusted producer;
- invalid, observed-only and unknown integrity;
- stale, unknown and future evidence time;
- cross-workspace and extra-field evidence;
- tampered evidence, candidate and policy;
- candidate mismatch for Change, Decisions, Work Order, policy and verifier;
- expired, rejected, unadmitted and inapplicable Decision authority;
- Change policy/Decision omissions;
- Work Order acceptance-profile mismatch;
- candidate repository outside the Work Order.

Every fixture either produces an explicit ineligible finding or throws a
typed validation, integrity or policy error. None produces eligible or
authorized state.

Additional mutation matrices cover:

- baseline Change, Decisions, Work Order, commit, tree, artifact, policy,
  verifier and findings;
- Work Order scope, role, context, tools, paths, outputs and budget;
- release baseline, action, policy, findings and expiration;
- forged initial status and multi-axis successor attempts;
- wrong, unrecorded and reversed typed relationships.

## 8. Failure Injection and Restart

The durable authorization test deliberately replaces the SQLite append with a
failing operation after authorization verification. The transaction rolls
back with:

- no Approval Consumption;
- no authorized status;
- unchanged audit event count.

After closing and reopening the store, the pre-authorization eligible state is
reconstructed. A subsequent valid authorization commits, survives another
restart and exposes exactly one consumed approval. Reusing the same approval
after restart is rejected and adds no audit event.

The existing SQLite suite additionally verifies transaction rollback,
uncommitted-process-exit recovery, hash-chain integrity and transaction
metadata integrity.

## 9. Complete Verification

Pinned static checks and complete suite:

```text
PATH=/opt/homebrew/bin:$PATH npm run check
tests:   202
passed:  202
failed:  0
skipped: 0
```

Pinned coverage run:

```text
PATH=/opt/homebrew/bin:$PATH npm run coverage
tests:   202
passed:  202
failed:  0

line coverage:     91.96%
branch coverage:   79.70%
function coverage: 93.47%
```

Supported-range verification:

```text
PATH=/Users/timbartz/.nvm/versions/node/v22.23.0/bin:$PATH npm run check
tests:   202
passed:  202
failed:  0
skipped: 0
```

Repository formatting verification before evidence commit:

```text
git diff --check
no findings
```

## 10. Supplemental OCI Fixture Finding

The first Node.js 22 cross-version run exposed that several OCI preflight
tests still used `process.execPath` through their shared provider helper. The
Node.js 22 binary was 112,928,848 bytes, above the unchanged 64 MiB launcher
limit, so those tests reproduced the host-size dependency previously believed
fully removed at Gate G1.

The production limit was not weakened. Commit `468b572` replaces the remaining
implicit host launcher with one controlled small executable fixture, keeps
separate exact-limit and limit-plus-one tests, and updates expectations to the
fixture's resolved path. The complete suite then passed on Node.js 22.23.0 and
the pinned Node.js 26.3.1.

This correction is recorded explicitly because the earlier Gate G1 evidence
overstated fixture independence. No external action or runtime production
behavior changed.

## 11. Acceptance Mapping

| Acceptance | Recorded implementation evidence | State |
|---|---|---|
| REA-AC-008 | Unknown integrity/freshness plus unadmitted producer, Decision and approval authority block | Implemented; review required |
| REA-AC-009 | 31 named adverse applicability fixtures; no false eligible/authorized result | Implemented; review required |
| REA-AC-011 | Immutable material Change/Decision successor tests and no-op rejection | Implemented; review required |
| REA-AC-012 | Baseline digest mutation matrix across every declared authority input | Implemented; review required |
| REA-AC-013 | Closed exact Evidence subject/producer/provenance/integrity/freshness tests | Implemented; review required |
| REA-AC-014 | One-axis transitions, fixed least-authoritative initial state and multi-axis rejection | Implemented; review required |
| REA-AC-018 | Work Order approval changed-field rejection matrix | Implemented; review required |
| REA-AC-019 | Release approval baseline/action/policy/findings/expiry rejection matrix | Implemented; review required |
| REA-AC-020 | Single-use approval rejected after durable restart | Implemented; review required |
| REA-AC-021 | Verification, consumption and final statuses in one transaction; injected rollback and restart | Implemented; review required |

Implementation authors do not mark these criteria `Accepted`. G2 remains
active pending independent review and completion or explicit re-scoping of the
remaining deterministic dossier work.

## 12. Limitations and Non-Claims

- Evidence producer identity is an admitted digest in the domain, but no real
  GitHub/CI signature, workflow identity or API reconciliation exists yet.
- Human authority is policy-admitted at the domain level, but the new
  coordinator is not yet connected to the Runtime's signed Invocation
  boundary. Content addressing is not a human signature.
- The operating-system account, local Git and single SQLite owner remain
  trusted.
- The implementation does not provide hostile-host protection,
  multi-tenancy, credential custody, backup/restore or retention/deletion.
- No Technical Lead, Programmer or Reviewer agent contract is connected to
  this domain yet.
- No canonical JSON/HTML release dossier is implemented.
- No GitHub App, webhook, customer repository, model provider, merge,
  publication or deployment is enabled.
- No external security review has occurred.
- Passing local tests do not demonstrate product demand, time savings,
  willingness to pay, support cost, renewal or competitive advantage.

## 13. Requested Human Review

Human Governance or an explicitly independent reviewer should:

1. review REA-AC-008, REA-AC-009, REA-AC-011 through REA-AC-014 and
   REA-AC-018 through REA-AC-021 against this source manifest;
2. accept or reject the deterministic domain/authorization sub-scope with
   exact findings;
3. keep Gate G2 open for the canonical dossier and remaining WP3 evidence,
   unless the gate is explicitly re-scoped;
4. authorize no GitHub installation, model execution, customer system or
   external action from this evidence alone.
