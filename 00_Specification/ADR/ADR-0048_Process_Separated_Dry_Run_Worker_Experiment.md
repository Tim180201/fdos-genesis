# ADR-0048 — Process-Separated Dry-Run Worker Experiment

Status: Implemented for Experiment; Human Review Pending; Not Accepted into FDOS Core

Decision Date: 2026-07-29

Decision Owner: Human Governance

Validation Level: Level 1 — Experimental

Related Decisions:

- `ADR-0043_FDOS_Runtime_Level_1_Experiment.md`
- `ADR-0044_Authenticated_Invocation_Boundary_Experiment.md`
- `ADR-0045_Transactional_Authenticated_Command_Experiment.md`
- `ADR-0046_Connector_Contract_and_Durable_Outbox_Experiment.md`
- `ADR-0047_Governed_Agent_Personality_Profile_Experiment.md`

Subsequent Decision:

- `ADR-0049_Darwin_Network_and_Write_Sandbox_Experiment.md`

## Decision

The Level 1 Connector Outbox demo shall execute its digest-only simulation in
a separate local child process through a closed, content-addressed and
expiring request/response protocol.

This decision authorizes process-lifecycle evidence only. It does not
authorize network access, an external service, an operating-system sandbox or
an externally visible effect.

## Context

ADR-0046 deliberately stopped before an isolated worker. Its in-process demo
proved contract, durable intent, fencing and uncertainty semantics but could
not exercise worker crash or acknowledgement boundaries.

Company AI supplied the useful worker-ownership and lease direction. TapTime
supplied the discipline of distinguishing implemented checks from declared
intent. FDOS applies those lessons locally without changing either reference
repository.

## Process Rule

The parent shall:

- keep the runtime, database and local signing key out of the child;
- launch a fixed regular worker file without a shell;
- avoid forwarding the parent environment;
- bound request, output, error and execution time;
- terminate over-budget work;
- accept only one exact response after clean exit code zero and empty standard
  error.

The child receives one already claimed Delivery Intent. It cannot claim,
record, retry, approve or resolve work.

## Protocol Rule

The request must bind:

- exact request, delivery, fencing claim and Connector Instance;
- exact complete Delivery Intent;
- issue and expiry;
- dry-run, no-network and no-effect policy;
- canonical digest.

The response must bind the exact request digest and identifiers, complete
within the validity window and contain only a normalized digest-based
`simulated` outcome with `externalEffect: none`.

Unexpected fields, changed digests, changed claims, asserted external effects
or an asserted network sandbox fail closed.

## Failure Rule

A crash before response, response followed by non-zero exit, timeout, output
overflow, malformed response or binding failure is not success.

No rejected worker execution changes the durable Outbox. The claim remains
active until its lease expires. Human Governance may then reconcile it only
to `uncertain`. Automatic retry remains prohibited.

## Honest Isolation Rule

Process separation is not an operating-system security boundary.

The process-only experiment must report:

```text
processSeparated:         true
networkAccess:            false
externalEffects:          false
networkIsolationEnforced: false
```

The first value is implemented process topology. The next two are the admitted
contract and current worker implementation. The final value records that no
OS, container or infrastructure egress control was applied to that
process-only execution.

ADR-0049 later authorizes a separate optional Darwin-required mode to report
positive network/write isolation only after exact policy binding and runtime
denial probes. It does not change the false reporting required by this ADR for
process separation alone.

## Expected Evidence

The experiment should demonstrate or falsify:

- exact request, claim, connector, intent and time binding;
- content-minimized result projection;
- rejection of protocol field and digest tampering;
- separate child lifecycle with no shell or parent environment forwarding;
- clean-exit acknowledgement;
- crash before response;
- valid response followed by crash;
- parent timeout and forced termination;
- unchanged claimed Outbox state after worker rejection;
- human-only expired-claim reconciliation to uncertainty;
- complete regression of the existing Company OS Pilot.

## Consequences

Positive:

- connector simulation no longer executes inside the FDOS controller process;
- the child has no runtime object, database handle or signing key;
- protocol and lifecycle boundaries are exact and testable;
- crash ambiguity exercises the already durable uncertainty model.

Negative:

- the child runs under the same trusted host account;
- no network, filesystem, CPU or memory sandbox is enforced;
- the worker response is digested but not independently signed;
- the fixed worker path is checked locally but not backed by signed immutable
  packaging;
- the parent still records the child result through an experimental local
  Connector identity;
- process boundaries increase operational and timeout complexity.

## Promotion Rule

This decision authorizes no real connector.

One read-only external sandbox requires a separate decision for enforced
egress, resource isolation, workload identity, signed artifacts, secrets,
service-specific schemas and idempotency, monitoring, incident handling and
Human Governance approval.

Write, publish, send, payment, personnel and destructive operations remain
outside the gate.
