# Company OS Pilot — Validation Report 005

Status: Technical Slice 5 Passed / Human Review Pending

Date: 2026-07-29

Validation Level: Level 1 — Experimental

## Outcome

FDOS now has a deny-by-default Connector Contract, immutable task-bound
Delivery Intent and durable Outbox with idempotent preparation, Connector
Instance claims, leases, fencing, bounded retries and explicit uncertainty
review.

The implementation and demo enforce:

- `networkAccess: false`;
- `externalEffects: false`;
- A0/A1 only;
- public/internal data only;
- `externalEffect: none` for every worker outcome.

No external API, connector service, model provider, product repository or
communication system was invoked.

## Acceptance Matrix

| Criterion | Result | Evidence |
|---|---|---|
| Complete automated suite | Passed, 106/106 | `../../04_Evidence/fdos-runtime/EV-FDOS-CONNECTOR-OUTBOX-005.md` |
| Focused Connector/Outbox suite | Passed, 14/14 | `test/connector-outbox.test.js` |
| Existing three-role pilot regression | Passed | authenticated four-task demo test |
| No-network Outbox demo | Passed | `npm run demo:outbox`; focused demo test |
| Closed contract admission | Passed | network/effect/high-risk/secret-field denial tests |
| Task and role binding | Passed | only claimed task owner with exact capability prepared work |
| Immutable Delivery Intent | Passed | task, contract, operation, target, parameters and digests verified |
| Idempotent preparation | Passed | same request returned existing delivery; changed request conflicted |
| Connector principal isolation | Passed | only claim/outcome accepted; general reads denied |
| Connector instance isolation | Passed | secondary and unknown instances denied |
| Concurrent claim fencing | Passed | exactly one of two claims succeeded |
| Content-minimized outcomes | Passed | digest/typed evidence accepted; raw response/error fields denied |
| Failed retry governance | Passed | human only; attempt budget enforced |
| Lease expiry | Passed | durable uncertainty plus same-transaction failure evidence |
| Abandoned expired claim | Passed | Human Governance reconciled it without a live worker |
| Uncertain automatic retry | Rejected | human evidence resolution required |
| Restart and idempotency | Passed | prepared and resolved state rehydrated |
| Contract drift | Rejected | stale delivery could not be claimed or reinterpreted |
| Task lifecycle bypass | Rejected | contracted task required exactly one completed dry-run delivery |
| Evidence projection | Passed | delivery identity and outcome digests exported without raw parameters |
| Lower-level runtime path | Rejected | outbox requires active authenticated transaction |
| External actions | Absent | contract, status, demo and tests |
| Real connector assurance | Not established | explicitly out of scope |

## Test Quality

- 106 tests passed.
- 90.38% line coverage.
- 78.67% branch coverage.
- 91.17% function coverage.
- `connector-contract.js` reached 88.80% line, 84.76% branch and 100%
  function coverage.
- `delivery-intent.js` reached 93.63% line, 72.50% branch and 100% function
  coverage.
- `state.js` reached 94.45% line, 78.38% branch and 100% function coverage.

Coverage supports implementation review. It is not a connector, network,
distributed-systems or production-security audit.

## Demonstrated Dry-Run Result

```text
workflow tasks:              2 completed
accepted Invocations:        12
committed transactions:      12
verified audit events:       22
Outbox deliveries:           1
delivery attempt:            1
delivery status:             simulated
evidence delivery records:   1, content-minimized
network access:              false
external effect:             none
recoveryRequired:            false
```

Chief of Staff bounded the work. Operations claimed the A1 task and prepared
the Delivery Intent. The registered Connector Instance claimed that exact
delivery and recorded only a simulated result digest. Operations then
completed the task.

The existing Chief of Staff, Operations and Marketing four-task pilot also
remained green.

## Open Findings

1. No real connector, service API, network or sandbox was exercised.
2. The local Connector Instance registration is not production workload
   identity, attestation or revocation.
3. One process-leased SQLite store and local clock are not distributed
   fencing.
4. Exact request parameters are stored unencrypted; field-name checks cannot
   detect every secret value.
5. No isolated worker process, package/API boundary or operating-system
   sandbox exists.
6. No service-specific idempotency, reconciliation or external reference was
   tested.
7. No egress allowlist, TLS policy, DNS control, secret vault, rate limit,
   timeout or cost budget exists.
8. Direct lower-level runtime access remains an architectural bypass risk
   outside the guarded Outbox methods.
9. `node:sqlite` remains an evolving synchronous dependency.
10. Evidence exports and the event chain are not independently signed.
11. Human operational review and incident procedures remain absent.
12. Dry-run success does not imply that read-only, write or communication
    connectors are safe.

## Decision Request

Human Governance may accept Technical Slice 5 only as Level 1 evidence for:

- task-bound external-work preparation;
- durable local idempotency and claim ownership;
- content-minimized dry-run outcomes;
- explicit uncertainty before retry.

The next candidate must be a separately authorized, isolated, authenticated
read-only sandbox connector with service-specific schemas, egress/secrets
controls, budgets, crash injection and operational review.

This report authorizes no networked connector, write, publication, message,
deployment, production operation or FDOS Core promotion.
