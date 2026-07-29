# ADR-0049 — Darwin Network and Write Sandbox Experiment

Status: Implemented for Experiment; Human Review Pending; Not Accepted into
FDOS Core

Decision Date: 2026-07-29

Decision Owner: Human Governance

Validation Level: Level 1 — Experimental

Related Decisions:

- `ADR-0043_FDOS_Runtime_Level_1_Experiment.md`
- `ADR-0044_Authenticated_Invocation_Boundary_Experiment.md`
- `ADR-0045_Transactional_Authenticated_Command_Experiment.md`
- `ADR-0046_Connector_Contract_and_Durable_Outbox_Experiment.md`
- `ADR-0048_Process_Separated_Dry_Run_Worker_Experiment.md`

Subsequent Decisions:

- `ADR-0050_Signed_Worker_Source_Artifact_Experiment.md`
- `ADR-0051_Deterministic_Signed_Worker_Package_Experiment.md`

## Decision

The Level 1 dry-run worker may have one optional Darwin-only launch mode that
uses the fixed `/usr/bin/sandbox-exec` binary and a fixed policy denying
`network*` and `file-write*`.

The mode is admitted only as platform-specific evidence. It is not the
portable production sandbox, does not authorize a networked connector and
does not change the Connector Contract's `networkAccess: false`,
`externalEffects: false` boundary.

## Context

ADR-0048 intentionally distinguished process separation from technical
network isolation. The next safe question is whether FDOS can:

- require a concrete isolation provider rather than infer safety from process
  topology;
- bind the exact provider policy to one worker request;
- make the child prove denial at execution time;
- fail closed when the selected launcher is bypassed;
- preserve durable uncertainty without recording false success.

The local Darwin host exposes `sandbox-exec`, and manual probes showed the
selected profile denying loopback listen/connect and filesystem write-open
with permission errors. Apple's local manual marks the interface deprecated,
so the result is deliberately constrained to Level 1 learning.

## Fixed Policy

The only admitted profile is:

```text
(version 1)(allow default)(deny network*)(deny file-write*)
```

The profile prevents the tested acquisition of network and filesystem-write
resources while permitting the inherited standard-I/O protocol.

It does not claim to restrict filesystem reads, CPU, memory, process creation,
inherited descriptors, every syscall, same-account inspection or a privileged
host attacker.

## Provider Trust Rule

Required mode must fail closed unless:

- the platform is Darwin;
- `/usr/bin/sandbox-exec` is a regular non-symbolic-link file;
- it is owned by UID 0 and not group- or world-writable;
- its size is inside the fixed bound and its complete bytes are readable.

The provider binds the launcher bytes, exact profile and complete policy by
SHA-256. The worker request carries the exact provider identifier and policy
digest. There is no silent fallback to direct launch.

These checks detect local drift; they do not constitute signed package,
kernel, boot-chain or hostile-root attestation.

## Enforcement-Attestation Rule

Parent configuration alone may never set an enforcement flag.

After exact request verification, the child must observe `EPERM` or `EACCES`
for:

1. loopback socket listen;
2. loopback socket connect;
3. opening `/dev/null` for writing.

Only then may it report:

```text
networkIsolationEnforced:          true
networkIsolationProbe:             socket_listen_and_connect_denied
filesystemWriteIsolationEnforced:  true
filesystemWriteIsolationProbe:     dev_null_write_open_denied
```

The response must bind those fields to the exact request provider and policy
digest. Missing, false, substituted, malformed or tampered values fail closed.
The result digest includes the complete verified boundary.

This is an application-observed denial proof. It is not independently signed
workload or kernel attestation.

## Bypass and Failure Rule

A test-only bypass keeps the request marked as requiring the Darwin provider
but starts the worker directly.

If any denied operation succeeds, returns another error or times out, the
child exits non-zero and the parent rejects the execution. The Outbox remains
`claimed`. After lease expiry, only Human Governance may reconcile it to
`uncertain`.

No rejected or ambiguous worker run records simulation success, triggers
automatic retry or widens authority.

## Portability and Deprecation Rule

The adapter shall:

- report the interface as deprecated;
- report `productionReady: false`;
- fail closed outside Darwin;
- remain optional while process-only tests stay portable;
- be replaceable behind the isolation contract.

FDOS shall not make a production dependency on `sandbox-exec` without a new
decision and independent validation of a supported platform mechanism.

## Expected Evidence

The experiment should demonstrate or falsify:

- fixed launcher ownership/mode/byte inspection;
- exact profile and policy digests;
- exact request/response isolation binding;
- positive listen, connect and write-open denial observations;
- rejection of missing, false and tampered attestation;
- rejection when required sandbox launch is deliberately bypassed;
- no accepted outcome on sandbox failure;
- human-only uncertainty reconciliation after claim expiry;
- unchanged no-network/no-effect Connector Contract;
- full regression of prior Company OS Pilot controls.

## Consequences

Positive:

- FDOS can distinguish requested, observed and accepted isolation state;
- policy identity is content-addressed instead of described informally;
- an execution cannot claim enforcement merely because the parent selected a
  mode or supplied environment variables;
- failure reuses the existing durable claim/uncertainty governance;
- the provider contract exposes a replaceable seam for a future supported
  sandbox.

Negative:

- the interface is deprecated and Darwin-specific;
- the profile leaves reads and general resources available;
- child probes cover selected operations, not every possible network or write
  path;
- the worker and host still share one trusted account;
- ADR-0051 verifies a signed package before module evaluation, but launcher,
  bootstrap, runtime and deployment remain mutable and are not independently
  attested;
- the response and probe result are not independently authenticated;
- trusted-host and privileged-attacker risks remain;
- behavior is validated only on the recorded local host/runtime.

## Promotion Rule

This decision authorizes no real connector.

One real read-only connector requires a separate decision and evidence for:

- a supported container, VM or platform sandbox;
- explicit outbound destination allowlisting and DNS/TLS policy;
- filesystem read restrictions and CPU, memory, process and time budgets;
- independently authenticated workload identity and signed response;
- immutable packaged worker artifact and externally protected deployment chain;
- secrets-vault controls;
- service-specific schemas, idempotency, rate and cost policy;
- monitoring, incident response and Human Governance approval.

Write, publish, send, payment, personnel and destructive operations remain
outside the gate.
