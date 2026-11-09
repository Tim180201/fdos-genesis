# Release Evidence Alpha — Delivery Plan

Status: Planning Baseline
Date: 2026-11-09
Planning Horizon: 6–8 weeks internal Alpha; external pilot is a later gate
Capacity Assumption: one experienced full-time engineer with bounded security
and product review

## Delivery Rule

Complete one trustworthy vertical slice before increasing integration breadth,
agent count or user-interface scope.

Every work package shall produce:

- an explicit requirement or repair finding;
- a small reviewable implementation change;
- automated verification;
- updated project status and risks;
- evidence of the result and its limitations.

## Gate Model

| Gate | Decision | Minimum result |
|---|---|---|
| G0 — Plan accepted | Start implementation? | ADR-0055 and Plan 0 reviewed by Human Governance |
| G1 — Integrity base | Build product features? | Reported defects reproduced and repaired; supported suite green |
| G2 — Deterministic verifier | Add agent automation? | Change/evidence/baseline model and 20 adverse cases fail closed |
| G3 — Internal vertical slice | Prepare external pilot? | One real complete FDOS change and useful stale-evidence demonstration |
| G4 — Internal Alpha | Invest in pilot hardening? | Three real changes, measured benefit, accepted security review |
| G5 — External pilot | Build repeatable service? | Paid use, bounded setup/support and no critical security gap |
| G6 — Sellable product | Scale distribution? | Five paying teams over two billing periods and observed margin target |

No later gate can compensate for a failed earlier gate with more features.

## Work Packages

### WP0 — Plan 0 and Baseline

Purpose: Establish one authoritative plan and reproducible starting point.

Deliverables:

- ADR-0055 proposal;
- project charter and product decision;
- scope, architecture and threat model;
- acceptance matrix, risk register and decision log;
- exact baseline commit and supported environment record;
- confirmed implementation budget and owner.

Exit: G0.

### WP1 — Integrity Repair

Purpose: Remove known blockers before product expansion.

Tasks:

1. independently reproduce REA-SEC-001 through REA-SEC-003;
2. add failing regression tests before changing behavior;
3. implement source classification and transfer authorization;
4. reconstruct Git commit/tree/path/mode/blob from trusted Git data;
5. introduce versioned safe canonicalization and migration rules;
6. replace the OCI host-binary fixture with a controlled fixture;
7. pin and document the supported test environment;
8. run the complete supported suite and record exclusions.

Exit: G1. No feature work is accepted while a critical repair is unresolved.

### WP2 — Release Evidence Domain

Purpose: Implement exact subjects, relationships and independent status axes.

Tasks:

- ChangeRevision and DecisionRevision schemas;
- WorkOrder and ReleaseCandidate baseline;
- Evidence, Finding and Approval schemas;
- versioned canonical formats;
- typed dependency and applicability relationships;
- state transitions and invariant tests;
- deterministic replay from retained events.

Exit: domain contract accepted and migration/reversibility documented.

### WP3 — Deterministic Verifier and Dossier

Purpose: Decide eligibility without an LLM.

Tasks:

- integrity, producer, completeness, policy and freshness rules;
- missing/invalid/stale/unknown findings;
- 20 or more adversarial applicability fixtures;
- exact approval baseline and atomic finalization;
- canonical JSON dossier;
- deterministic HTML rendering;
- golden-file and restart verification.

Exit: G2.

### WP4 — GitHub and CI Intake

Purpose: Use real GitHub and Actions evidence with minimal authority.

Tasks:

- local Git trusted reconstruction;
- one versioned change file format;
- read-only pull-request, review, check and workflow observations;
- webhook signature/deduplication contract;
- API reconciliation path;
- GitHub Check output;
- data-minimized evidence retention.

Internal fixtures precede any real installation. Source writes, merge and
deployment remain disabled.

### WP5 — Controlled Agent Workflow

Purpose: Execute the same governed flow with Technical Lead, Programmer and
Reviewer roles.

Tasks:

- closed role contracts and typed outputs;
- task-scoped Context Projection;
- human approval of the Technical Lead Work Order;
- one bounded Programmer adapter;
- independent Reviewer adapter and finding lifecycle;
- budget and usage events;
- explicit handback on changes requested;
- tests for self-approval, scope expansion and cross-role access.

Agent-adapter work is time-boxed. If the selected runner cannot be integrated
within two engineering days, import its result as a typed artifact and keep
the verifier work moving.

### WP6 — Internal Vertical Slice

Purpose: Dogfood FDOS on FDOS.

Required scenarios:

1. one normal approved change;
2. one requirement revision after green CI that makes evidence stale;
3. one failed review or policy condition that requires repair;
4. restart and reproduce each final dossier;
5. compare time and findings with GitHub/CI/templates alone.

Exit: G3 after the first complete change; G4 after three accepted changes.

### WP7 — Pilot Hardening

Purpose: Prepare a bounded paid external pilot only after G4.

Tasks:

- minimal GitHub App installation path;
- real identity and credential boundary;
- database tenant isolation;
- retention/deletion and data export;
- backup/restore and operational monitoring;
- support boundary and setup guide;
- billing outside the release decision path;
- independent security review.

This work is not part of the internal Alpha acceptance.

## Eight-Week Internal Plan

| Week | Focus | Required outcome | Gate |
|---|---|---|---|
| 1 | Baseline and defect reproduction | Plan accepted; REA-SEC-001..003 and OCI issue are executable regressions | Stop if findings cannot be safely reproduced or scoped |
| 2 | Integrity repairs and domain contracts | Repairs reviewed; canonical format and baseline objects versioned | G1 |
| 3 | Evidence verifier | Core rule engine and first adverse corpus | No agent automation before deterministic behavior |
| 4 | Staleness and dossier | Requirement-change invalidation; JSON/HTML dossier | G2 target |
| 5 | Agent roles and exact approval | Lead, Programmer, Reviewer flow with context boundaries | Adapter limited to two engineering days |
| 6 | Complete internal candidate | First real FDOS change from objective to dossier | G3 |
| 7 | Second/third dogfood changes | False-block repair, timing and native-tool comparison | No UI expansion without observed need |
| 8 | Alpha decision | Evidence package, risks, budget and go/no-go | G4 or stop/pivot |

Six weeks is the target for the functional vertical slice. Weeks seven and
eight validate repeatability and decide whether external hardening is
justified. Eight weeks is not a promise of production SaaS readiness.

## External Validation Timing

The project honors the product decision not to conduct abstract customer
conversations before a functioning system exists.

- Before G3: no sales claim and no automated outreach.
- After G3: show the working stale-evidence flow to a small number of matching
  teams and compare their current process.
- After G4 and security approval: offer a clearly priced, bounded pilot.

Feedback without a real workflow, price or repeated use is not treated as
commercial validation.

## Engineering Working Agreement

- Work only in the FDOS repository unless Human Governance changes scope.
- Use a dedicated branch and small intent-focused commits.
- Do not combine security-format migration with unrelated features.
- Add the failing test before each defect repair where practical.
- Update Decision Log, Risk Register and Project Status with material change.
- Record exact commands, environment and exclusions in validation evidence.
- Never raise a security limit merely to make a fixture pass.
- Keep external effects disabled throughout the internal Alpha.

## Budget and Scope Control

Planning assumption: 30–40 engineering days for repair, internal Alpha and
investment decision. Model and cloud spend remain capped and separately
measured. If available capacity is lower, scope is reduced; duration and
platform breadth do not silently expand.

## Stop and Pivot Rules

- Open critical integrity defect at G1: stop external product work.
- No full vertical slice by week 6: reduce to the local verifier only.
- No measurable improvement after three changes: stop commercial expansion.
- Native tools solve the same case with comparable effort: narrow or retire
  the product hypothesis.
- Setup exceeds two hours or needs custom connectors: narrow the target stack
  or explicitly operate as a service, not scalable SaaS.
- Fewer than two paid pilots after eight serious matching demonstrations:
  product/price is unconfirmed; do not compensate with more agent features.
- No repeated use after two billing periods: stop or redefine the problem.
