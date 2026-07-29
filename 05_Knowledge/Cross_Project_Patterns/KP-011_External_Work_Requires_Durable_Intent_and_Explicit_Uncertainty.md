# KP-011 — External Work Requires Durable Intent and Explicit Uncertainty

Status: Knowledge Candidate

Source Projects: Company AI, TapTime, FDOS Company OS Pilot

Validation Level: Level 1 — Dry-run experimental application

## Observation

A local transaction can prove that FDOS prepared work, but it cannot prove
that another system received or completed it. Retrying an unacknowledged
operation may duplicate an effect; assuming success may lose work.

Company AI highlighted durable worker ownership and uncertain outcomes.
TapTime highlighted exact evidence and status-reality drift. The FDOS pilot
combined those controls in a no-network dry-run.

## Candidate Rule

Before external work:

- bind a closed connector contract and exact connector instance;
- create an immutable Delivery Intent from an authorized task Action Intent;
- persist the intent and idempotency scope before worker access;
- claim through a bounded lease and fencing identifier;
- accept results only from the owning connector and active claim;
- minimize durable result/error content to typed fields and digests;
- treat an expired or ambiguous claim as uncertain;
- prohibit automatic retry from uncertainty;
- require explicit evidence and Human Governance resolution;
- treat contract drift as a new request, never as reinterpretation.

## Limit

The experiment simulated a read-only connector with `networkAccess: false` and
`externalEffects: false`. It used one process-leased SQLite store and a local
clock. It does not validate a network, service API, secret, multi-worker
deployment, distributed fence or real external idempotency guarantee.

## Evidence

- `00_Specification/ADR/ADR-0046_Connector_Contract_and_Durable_Outbox_Experiment.md`
- `02_Reference_Implementations/FDOS_Runtime/docs/CONNECTOR_OUTBOX.md`
- `04_Evidence/fdos-runtime/EV-FDOS-CONNECTOR-OUTBOX-005.md`
- Company AI and TapTime bindings in
  `03_Projects/Company_OS_Pilot/Reference_Adoption_Assessment.md`

## Next Validation

Validate one isolated, authenticated read-only sandbox connector with
service-specific schemas, egress/secrets controls, crash injection and an
independent operational review. Do not infer write safety from that result.
