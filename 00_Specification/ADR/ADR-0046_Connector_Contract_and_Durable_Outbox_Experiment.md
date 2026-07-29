# ADR-0046 — Connector Contract and Durable Outbox Experiment

Status: Implemented for Experiment; Human Review Pending; Not Accepted into FDOS Core

Decision Date: 2026-07-29

Decision Owner: Human Governance

Validation Level: Level 1 — Experimental

Related Decisions:

- `ADR-0043_FDOS_Runtime_Level_1_Experiment.md`
- `ADR-0044_Authenticated_Invocation_Boundary_Experiment.md`
- `ADR-0045_Transactional_Authenticated_Command_Experiment.md`

## Decision

The FDOS Runtime experiment shall introduce a deny-by-default Connector
Contract, immutable Delivery Intent and durable Outbox before any external
adapter is enabled.

The implemented slice is dry-run only:

- network access is false;
- external effects are false;
- only A0/A1 operations are admitted;
- no GitHub, Slack, Teams, MCP or other service is called.

## Context

Technical Slice 4 joined Invocation replay state and internal command state in
one local transaction. A local transaction cannot also commit an external
system outcome.

Company AI supplied the relevant control direction: durable work claims,
worker ownership, leases and uncertain outcomes. TapTime supplied the
verification discipline: contract drift, negative evidence and omitted
operational checks must stay explicit. FDOS adopts those principles without
copying either product architecture or enabling either repository.

## Contract Rule

A Connector Contract must bind:

- exact ID, version and digest;
- closed Action Catalog operation and required capability;
- target prefix, risk and sensitivity;
- exact typed request fields;
- execution mode, network and effect policy;
- bounded attempt budget.

The Level 1 registry admits only dry-run, no-network, no-effect A0/A1
contracts. Credential-like parameter fields and confidential/restricted data
are rejected.

An active Connector Instance binds one exact contract digest. Contract drift
strands an old prepared delivery for review instead of silently reinterpreting
it.

## Delivery Rule

An agent may prepare a delivery only from a task it currently owns and has
claimed. The Delivery Intent binds the task Action Intent, connector,
contract, operation, target, normalized parameters, requester, idempotency
scope and content digests.

The preparation event and signed Invocation acceptance share one SQLite
transaction.

## Worker Rule

A registered Connector Instance may:

- claim only a delivery addressed to that exact instance;
- hold one bounded lease and unique fencing claim ID;
- record an outcome only for that active claim.

It may not read tasks, memory, approvals, audit or arbitrary outbox entries.

Concurrent claims serialize. Claim expiry enters `uncertain`; it never
automatically retries.

## Outcome Rule

The experiment accepts only:

- `simulated` with a result digest;
- `failed` with typed content-minimized evidence;
- `uncertain` with a reason and evidence digest.

Every outcome must declare `externalEffect: none`. Raw responses and raw
errors are rejected.

Expired-claim reconciliation, failed retry, cancellation and uncertainty
resolution remain Human Governance commands. Reconciliation detects
uncertainty but does not decide the outcome. Attempt budgets are enforced
across restart.

## Expected Evidence

The experiment should demonstrate or falsify:

- exact contract and task-to-intent binding;
- idempotent preparation and conflicting-key denial;
- one winning claim under concurrency;
- connector-instance isolation;
- result fencing by claim and lease;
- lease expiry to durable uncertainty;
- abandoned expired-claim reconciliation without a live worker;
- no retry before human uncertainty resolution;
- human-only retry/cancel/resolve authority;
- contracted-task completion only after one exact simulated delivery;
- restart reconstruction and contract-drift denial;
- content-minimized outcomes and delivery evidence;
- complete regression of the three-role pilot;
- no network access or external effect.

## Consequences

Positive:

- FDOS gains a reusable external-work boundary without granting external
  authority;
- local work preparation, claim ownership and uncertainty become inspectable;
- connector principals receive a much narrower surface than agents or humans;
- contract drift and duplicate preparation fail closed.

Negative:

- exact parameters exist in the local event store and therefore require strict
  classification and later encryption;
- one SQLite process is not distributed worker fencing;
- lease time depends on the trusted local clock;
- dry-run success does not validate a service API, network or sandbox;
- direct access to the lower-level runtime remains a package-boundary risk.

## Promotion Rule

This decision authorizes no real connector.

One authenticated read-only sandbox requires a separate decision covering:

- isolated execution;
- workload identity and revocation;
- egress and secret controls;
- service-specific schemas, rate/cost budgets and idempotency;
- crash and acknowledgement fault injection;
- monitoring, incident handling and independent review.

Any write or externally visible action remains outside that gate and requires
its own approval and evidence.
