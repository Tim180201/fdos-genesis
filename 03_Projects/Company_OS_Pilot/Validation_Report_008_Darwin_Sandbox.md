# Company OS Pilot — Validation Report 008

Status: Technical Slice 8 Passed / Human Review Pending

Date: 2026-07-29

Validation Level: Level 1 — Experimental

## Outcome

FDOS now has one optional Darwin-only launch provider that applies a fixed
operating-system profile denying `network*` and `file-write*` to the existing
no-effect Connector Outbox simulation worker.

The worker request binds the exact isolation provider and inspected policy
digest. The child may report enforcement only after loopback listen,
loopback connect and filesystem write-open each return a permission denial.
Missing, false, changed or bypassed enforcement records no outcome.

This result proves the selected operations under the recorded local
`sandbox-exec` invocation. It does not prove a portable production sandbox,
complete resource isolation, independent worker identity or real connector.

## Acceptance Matrix

| Criterion | Result | Evidence |
|---|---|---|
| Complete automated suite | Passed, 120/120 | `../../04_Evidence/fdos-runtime/EV-FDOS-DARWIN-SANDBOX-008.md` |
| Focused process-worker cases | Passed, 10/10 | `test/process-separated-worker.test.js` |
| Existing process-only mode | Passed | both isolation flags remained false |
| Darwin-only fail-closed provider | Passed on recorded host | non-Darwin path is policy-denied in source; not executed here |
| Launcher trust checks | Passed | fixed regular root-owned, non-group/world-writable 102,560-byte file |
| Launcher byte binding | Passed | SHA-256 recorded in Evidence 008 |
| Fixed profile binding | Passed | exact profile and profile digest recorded |
| Complete policy binding | Passed | request, response and result carry exact policy digest |
| Listen denial | Passed | child observed accepted permission denial |
| Connect denial | Passed | child observed accepted permission denial |
| Filesystem write-open denial | Passed | child could not open `/dev/null` for writing |
| Missing required attestation | Rejected | response construction failed closed |
| False required attestation | Rejected | response construction failed closed |
| Changed network probe | Rejected | exact response verification failed |
| Changed filesystem probe | Rejected | exact response verification failed |
| Required sandbox bypass | Rejected | direct launch caused child probe rejection |
| Failed bypass Outbox state | Passed | outcome absent; claim remained active |
| Failure reconciliation | Passed | after expiry, Human Governance moved only to `uncertain` |
| Sandbox end-to-end demo | Passed | 12 Invocations, 12 transactions, 22 valid events |
| No external effect | Passed | `simulated`, `externalEffect: none`; no service adapter exists |
| Production portability | Not established | Apple interface is deprecated and Darwin-specific |
| Complete resource sandbox | Not established | reads, CPU, memory, processes and general syscalls remain outside policy |

## Platform Binding

The positive execution was observed on:

```text
macOS:             26.5.1 (25F80)
kernel:            Darwin 25.5.0 arm64
Node.js:           v26.3.1
sandbox launcher:  /usr/bin/sandbox-exec
launcher size:     102560 bytes
launcher owner:    uid 0 / gid 0
launcher mode:     0755
```

The local manual labels `sandbox-exec` deprecated and directs application
developers to App Sandbox. Compatibility or equivalent behavior on another
host was not independently exercised.

## Test Quality

- 120 tests passed.
- 90.12% line coverage.
- 78.97% branch coverage.
- 90.27% function coverage.
- `network-isolation-contract.js` reached 89.26% line, 80.00% branch and
  80.00% function coverage.
- `darwin-sandbox-exec-network-write-deny.js` reached 88.11% line, 60.00%
  branch and 100.00% function coverage.
- `process-separated-dry-run-worker.js` reached 83.09% line, 84.06% branch and
  88.89% function coverage.
- `dry-run-worker-protocol.js` reached 91.36% line, 80.00% branch and 100.00%
  function coverage.
- the child entry point reached 49.36% line, 31.82% branch and 46.15% function
  coverage.

Required no-write mode deliberately disables child V8 coverage-file output.
The initial coverage run correctly failed because Node attempted a forbidden
coverage artifact write at child exit. FDOS then made the required-mode
environment explicitly clear that destination; the final coverage run passed.
Process-only executions still provide child-source coverage.

Coverage supports implementation review. It is not proof that every socket,
write or syscall path is denied.

## Verified Flow

```text
authenticated Connector claim
  -> inspect fixed Darwin launcher
  -> bind launcher/profile/policy SHA-256
  -> exact request requires that provider/policy
  -> sandbox-exec starts separate worker
  -> child verifies request and environment binding
  -> child observes listen denial
  -> child observes connect denial
  -> child observes filesystem write-open denial
  -> exact positive boundary enters response/result digest
  -> parent verifies response and clean exit
  -> authenticated digest-only outcome recording
```

The profile remains:

```text
(version 1)(allow default)(deny network*)(deny file-write*)
```

Inherited standard-I/O descriptors remain usable for the closed protocol.

## Fault Result

The deliberate `sandbox-bypass` test kept the request bound to the required
Darwin policy but launched Node directly. At least one operation was then not
denied by the OS policy, so the child rejected its own input and exited
non-zero.

The parent reported `WORKER_EXIT_UNTRUSTED`, stored no response or raw error
content, and did not mutate the Outbox. After controlled lease expiry, Human
Governance reconciled the delivery only to `uncertain`.

## Open Findings

1. `sandbox-exec` is deprecated and Darwin-specific.
2. The profile uses `allow default` and narrowly denies network and writes.
3. Filesystem reads remain available to the same-account child.
4. CPU, memory, process count/creation and general syscalls are not isolated.
5. Already inherited descriptors remain usable by design.
6. The listen/connect/write-open probes cover selected operations, not every
   possible kernel path.
7. The child report is digest-bound but not independently signed or remotely
   attested.
8. The Node executable, worker source and deployment are not signed immutable
   artifacts.
9. Launcher metadata/read checks are not a hostile-root or boot-chain defense.
10. The host account, local kernel and Node runtime remain trusted.
11. No secret vault, production workload identity or key revocation exists.
12. No real API, DNS, TLS, outbound destination, rate, cost or service
    idempotency behavior was exercised.
13. Non-Darwin fail-closed behavior is source-controlled but was not executed
    on a second platform.
14. No independent CI, security review or Human Governance acceptance exists.

## Decision Request

Human Governance may accept Technical Slice 8 only as Level 1 evidence for:

- an exact replaceable isolation-provider contract;
- fixed launcher/profile/policy content binding;
- application-observed Darwin denial for selected network/write operations;
- fail-closed required-mode and bypass behavior;
- preservation of durable uncertainty after isolation failure.

Before one real read-only connector, FDOS still needs a supported portable
sandbox, destination allowlisting, read/resource restrictions, independent
workload identity, signed immutable artifacts, secrets controls,
service-specific contracts/idempotency, monitoring and operations.

This report authorizes no model call, networked connector, write,
publication, message, payment, personnel action, deletion, production
operation or FDOS Core promotion.
