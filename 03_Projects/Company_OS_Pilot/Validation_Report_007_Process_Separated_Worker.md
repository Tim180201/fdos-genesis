# Company OS Pilot — Validation Report 007

Status: Technical Slice 7 Passed / Human Review Pending

Date: 2026-07-29

Validation Level: Level 1 — Experimental

## Outcome

FDOS now runs the Connector Outbox demo's digest-only simulation in a separate
local child process.

The child receives one exact claimed Delivery Intent through a closed,
content-addressed and expiring protocol. It receives no runtime object,
database handle or signing key. The parent accepts a response only after exact
verification and clean process exit.

This result proves a local process and acknowledgement boundary. It does not
prove an operating-system network/resource sandbox, independently
authenticated worker or real connector.

## Acceptance Matrix

| Criterion | Result | Evidence |
|---|---|---|
| Complete automated suite | Passed, 116/116 | `../../04_Evidence/fdos-runtime/EV-FDOS-PROCESS-WORKER-007.md` |
| Focused new worker cases | Passed, 6/6 | `test/process-separated-worker.test.js` |
| Process-separated happy path | Passed | child returned exact digest-only result; run completed |
| Exact Delivery Intent | Passed | complete intent verified inside request |
| Delivery and claim fencing | Passed | request/response bind delivery, claim and Connector Instance |
| Closed request/response shapes | Passed | unexpected raw fields rejected |
| Request validity | Passed | bounded TTL and expired request rejected |
| No-effect boundary | Passed | only `simulated` plus `externalEffect: none` accepted |
| Asserted sandbox | Rejected | `networkIsolationEnforced: true` failed verification |
| Shell use | Disabled in source | fixed `shell: false` launch |
| Parent environment forwarding | Disabled in source | explicit minimal child environment; no dynamic secret-probe test |
| Runtime/database/key delegation | Absent by construction | standard-I/O request only; child import graph has no runtime/gateway/signer |
| Crash before response | Rejected | no outcome recorded; claim remained active |
| Valid response then crash | Rejected | clean exit is required |
| Hang | Terminated and rejected | 50 ms fault-test timeout |
| Failed-process reconciliation | Passed | Human Governance moved expired claim only to `uncertain` |
| Authenticated Outbox demo | Passed | 12 Invocations, 12 transactions, 22 valid events |
| Content minimization | Passed | worker result/evidence excluded raw parameters |
| Existing runtime controls | Passed | complete prior regression remained green |
| Enforced network isolation | Not established | explicit false status; no OS/container control |
| Real service connector | Not exercised | no networked adapter exists |

## Test Quality

- 116 tests passed.
- 90.77% line coverage.
- 78.86% branch coverage.
- 90.88% function coverage.
- `process-separated-dry-run-worker.js` reached 79.22% line, 79.63% branch
  and 88.24% function coverage.
- `dry-run-worker-protocol.js` reached 90.32% line, 74.63% branch and 100%
  function coverage.
- the child entry point reached 79.57% line, 33.33% branch and 57.14%
  function coverage.

Coverage supports implementation review. It is not proof of host isolation,
absence of every possible network syscall, workload identity or production
fault tolerance.

## Verified Flow

```text
Operations task claim
  -> durable Delivery Intent
  -> authenticated Connector claim
  -> exact worker request
  -> separate child validation and simulation
  -> exact response plus clean exit
  -> authenticated outcome recording
  -> task and workflow completion
```

The process-worker result contains:

- request, delivery, claim and connector IDs;
- request and response digests;
- completion time;
- normalized digest-only outcome;
- explicit process and isolation boundary.

Its result digest binds the request, intent/operation digests, completion time
and worker boundary.

## Fault Results

| Injected condition | Parent result | Durable Outbox result |
|---|---|---|
| crash before response | `WORKER_EXIT_UNTRUSTED` | remains `claimed` |
| valid response then crash | `WORKER_EXIT_UNTRUSTED` | remains `claimed` |
| hang | `WORKER_TIMEOUT` | remains `claimed` |
| lease expires after rejection | no inferred result | human reconciliation to `uncertain` |

No fault path recorded simulation success or triggered automatic retry.

## Open Findings

1. The child runs under the same trusted local operating-system account.
2. No OS, container or infrastructure egress rule blocks network access.
3. No filesystem, CPU, memory, process-count or syscall sandbox exists.
4. The child response is digested but not independently signed.
5. The worker has no production workload identity, attestation or revocation.
6. The worker file is a fixed regular non-symlink source file but not a signed
   immutable package; hostile-host replacement remains possible.
7. Parent-environment non-forwarding is source-verified but was not tested with
   a secret sentinel.
8. The child receives exact internal parameters; same-account inspection and
   semantic-secret detection remain host risks.
9. No real service schema, DNS, TLS, rate, cost, concurrency or idempotency
   behavior was exercised.
10. No process output-overflow or spawn-failure fault mode was injected.
11. One controller and local SQLite remain non-distributed fencing.
12. No independent CI, security review or Human Governance acceptance exists.

## Decision Request

Human Governance may accept Technical Slice 7 only as Level 1 evidence for:

- a separate local simulation process;
- exact request/response and active-claim binding;
- content-minimized outcome handling;
- fail-closed clean-exit, crash and timeout semantics;
- reuse of durable uncertainty after worker acknowledgement failure.

Before one real read-only connector, FDOS must separately validate enforced
egress/resource isolation, workload identity, signed artifacts, secret
handling, service-specific contracts/idempotency, observability and operations.

This report authorizes no networked connector, OS-sandbox claim, model call,
write, publication, message, payment, personnel action, deletion, production
operation or FDOS Core promotion.
