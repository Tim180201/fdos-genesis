# Company OS Pilot — Project Status

Status: Technical Slice 7 Passed / Human Review Pending
Date: 2026-07-29  
Validation Level: Level 1 — Experimental

## Current Goal

Deliver and verify a process-separated, exact and fail-closed connector
simulation worker without enabling network access, an external effect or an
operating-system sandbox claim.

## Current Phase

Level 1 process-separated Connector Worker evidence review.

## Exit Criteria

- [x] reference runtime implemented;
- [x] security boundaries tested;
- [x] pilot workflow completed end to end;
- [x] evidence item recorded;
- [x] limitations documented;
- [x] TapTime and Company AI bound as read-only Git references;
- [x] source-backed knowledge kept in Human-reviewed candidate state;
- [x] concurrent ownership of one local event store rejected;
- [x] reference-adoption and artifact-validation records created;
- [x] Human Governance authorized the authenticated-invocation slice;
- [x] signed command, scope, time and replay controls implemented;
- [x] authenticated pilot completed without an external action;
- [x] Human Governance authorized the transactional-persistence slice;
- [x] authenticated Invocation acceptance and internal effects joined locally;
- [x] crash, rollback, restart, tamper and format-selection behavior tested;
- [x] transactional persistence ADR, operations guide and evidence prepared;
- [x] dry-run Connector Contract and active Connector Instance implemented;
- [x] task-bound Delivery Intent and durable idempotent Outbox implemented;
- [x] claim lease, fencing, retries and uncertainty state machine tested;
- [x] connector principal restricted to claim and outcome commands;
- [x] no-network Outbox demo completed with no external effect;
- [x] ADR, security model, operations guide and Evidence 005 prepared;
- [x] separate role-compatible Personality Profiles implemented;
- [x] closed profile schema excludes authority and arbitrary prompt fields;
- [x] exact profile version and digest bound to each Agent Instance;
- [x] authenticated self-only Operating Profile command implemented;
- [x] fixed precedence and personality safety invariants documented;
- [x] ADR, security model and Evidence 006 prepared;
- [x] exact expiring worker request/response protocol implemented;
- [x] Outbox demo simulation moved to a separate shell-free child process;
- [x] runtime, database, signing key and parent environment withheld from the
      child protocol;
- [x] worker response accepted only after exact binding and clean exit;
- [x] crash-before-response, response-then-crash and timeout paths tested;
- [x] rejected worker execution preserves the claim for human uncertainty
      reconciliation;
- [x] lack of OS network/resource isolation reported explicitly;
- [x] ADR, security model, operations guide and Evidence 007 prepared;
- [ ] Human Governance reviewed Technical Slices 3–7 evidence.

## Verified Result

- 116 of 116 tests passed;
- four workflow tasks completed;
- Chief of Staff, Operations and Marketing participated;
- 14 signed invocations accepted in 14 committed local transactions;
- 29 authenticated pilot audit events verified;
- every Invocation-attributed pilot event shared its acceptance transaction;
- process exit and unexpected implementation failure left no partial events;
- recognized business failure consumed its Invocation with typed evidence;
- event-content and transaction-metadata tampering were rejected;
- non-empty JSONL was not migrated implicitly;
- sequential, concurrent and post-restart replay rejected;
- signature, command, organization, audience and time tampering rejected;
- 947 TapTime and 97 Company AI tracked entries were manifest-bound;
- 39 allowlisted reference files were byte- and evidence-verified;
- a second runtime owner was rejected;
- no external action executed.
- one dry-run delivery prepared from a claimed Operations task;
- exactly one registered Connector Instance claim succeeded;
- the no-network demo completed two tasks with 12 signed Invocations, 12
  committed transactions and 22 verified events;
- the delivery ended `simulated` with `externalEffect: none`;
- concurrent claims, stale contracts, raw result fields and connector
  overreach were denied;
- expired claims entered durable uncertainty, could be detected without a
  live worker and could not auto-retry;
- workflow completion evidence included a content-minimized delivery
  projection without raw connector parameters;
- Chief of Staff, Operations and Marketing resolved three distinct
  content-addressed Personality Profiles;
- personality schema smuggling, invalid traits and cross-role binding were
  rejected;
- authenticated agents could read only their own server-resolved Operating
  Profile;
- no model call occurred and no claim of expressed personality is made;
- one exact claimed delivery was transferred to a separate local process;
- the child returned a response binding request, delivery, fencing claim,
  Connector Instance, completion time and digest-only outcome;
- normal process execution completed the existing authenticated Outbox demo
  with the same 12 Invocations, 12 transactions and 22 events;
- crash before output, valid output followed by crash and hang timeout were
  rejected without recording an outcome;
- abandoned failed-process claims reconciled only to `uncertain` after expiry;
- `networkIsolationEnforced` remained false and no real service was contacted.

See `Validation_Report.md`,
`Validation_Report_003_Authenticated_Invocation.md`,
`Validation_Report_004_Transactional_Persistence.md`,
`Validation_Report_005_Connector_Outbox.md`,
`Validation_Report_006_Agent_Personality.md`,
`Validation_Report_007_Process_Separated_Worker.md`,
`Reference_Adoption_Assessment.md` and the evidence records under
`../../04_Evidence/fdos-runtime/`.

## External Action Status

Disabled. A process-separated local simulation path is enabled with
`networkAccess: false`, `externalEffects: false` and
`networkIsolationEnforced: false`.

Process separation is not an operating-system sandbox and authorizes no real
connector.

Personality is configuration only. No model provider is connected.

## Reference Repository Status

Read-only. No files, Git state, dependencies, tests, builds or external systems
were changed in TapTime or Company AI.

## Core Impact

None.
