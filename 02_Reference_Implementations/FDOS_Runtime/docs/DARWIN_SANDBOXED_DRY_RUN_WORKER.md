# Darwin-Sandboxed Dry-Run Worker

Status: Experimental Platform-Specific Security Evidence

Validation Level: Level 1

Production Status: Not Production Ready

Related Decision:
`../../../00_Specification/ADR/ADR-0049_Darwin_Network_and_Write_Sandbox_Experiment.md`

## Purpose

Test whether the existing no-effect Connector Outbox worker can run with
network socket operations and new filesystem writes denied by the local
operating system, while preventing FDOS from inferring enforcement from
configuration alone.

This is a Darwin-only experiment around Apple's deprecated
`/usr/bin/sandbox-exec` interface. It is not the portable production sandbox
architecture.

## Admitted Execution

The experimental profile is fixed in source:

```text
(version 1)(allow default)(deny network*)(deny file-write*)
```

It denies:

- creation/use of network resources covered by Darwin's `network*` sandbox
  operations;
- acquisition of new filesystem write access covered by `file-write*`.

It deliberately does not claim to deny:

- filesystem reads;
- CPU, memory or process creation;
- every syscall or device interaction;
- access through already inherited descriptors;
- same-account observation outside this worker;
- host, kernel or Node.js compromise.

The child inherits only standard input, output and error pipes. Those
pre-opened descriptors remain usable so the closed worker protocol can
operate. The parent passes no runtime object, SQLite handle, signer or
arbitrary file descriptor.

Required mode also clears the child `NODE_V8_COVERAGE` destination. Node's
test-coverage harness otherwise attempts to write a coverage artifact during
process exit, which the profile correctly denies. Process-only worker runs
remain available for child-source coverage; the positive Darwin execution is
validated through its protocol result and denial probes.

## Provider Inspection

`DarwinSandboxExecNetworkWriteDeny` accepts only the fixed
`/usr/bin/sandbox-exec` path and fails closed unless:

- the host reports Darwin;
- the path is a regular non-symbolic-link file;
- its size is non-zero and below the fixed limit;
- it is owned by UID 0;
- it is not group- or world-writable;
- the complete bytes can be read consistently.

The provider computes SHA-256 bindings for:

- the inspected launcher bytes;
- the fixed profile;
- the complete policy object.

The worker request carries the exact provider identifier and policy digest.
The response and final result must repeat that exact binding.

These checks reduce accidental launcher/profile drift. They are not signed
package verification, kernel attestation or protection from a privileged host
attacker. The metadata/read sequence also is not a general-purpose hostile
root race defense.

## Runtime Proof Rule

Configuration is never enough to set an enforcement flag.

After request verification and before simulation, the child must complete all
three probes:

1. bind/listen on loopback and observe `EPERM` or `EACCES`;
2. connect to loopback and observe `EPERM` or `EACCES`;
3. open `/dev/null` for writing and observe `EPERM` or `EACCES`.

An unexpected success, another error, timeout, changed environment binding or
missing probe aborts the worker. No outcome is recorded.

Only after all probes pass may the response contain:

```text
networkIsolationEnforced:          true
networkIsolationProbe:             socket_listen_and_connect_denied
filesystemWriteIsolationEnforced:  true
filesystemWriteIsolationProbe:     dev_null_write_open_denied
```

The protocol binds these values, the exact provider and the exact policy
digest into both response and simulated result digests. Parent-side
verification rejects substituted or downgraded values.

## Deliberate Bypass Test

The parent supports a test-only `sandbox-bypass` fault. It keeps the request
marked as requiring the Darwin provider but launches the worker directly.

The child then sees an unrestricted loopback listen or write-open rather than
a kernel denial, exits non-zero and emits no accepted response. The Outbox
delivery remains claimed. After lease expiry, only Human Governance can
reconcile it to `uncertain`.

This demonstrates that the positive flag is not derived merely from the
parent's selected mode or environment strings.

## Use

On a compatible Darwin host:

```bash
npm run demo:sandbox
```

The demo performs no service call and no external effect. It runs the
digest-only local Connector simulation and prints the policy digest and probe
status.

Off Darwin, or when the fixed launcher fails inspection, required sandbox
mode fails closed. There is no silent process-only fallback.

## Deprecation and Promotion Boundary

Apple marks `sandbox-exec` as deprecated and directs application developers
toward supported platform sandbox mechanisms. FDOS therefore treats this
adapter as disposable Level 1 evidence.

It may inform the next portable isolation contract, but it must not become a
production dependency without a separate supported-platform decision,
independent security review and operational validation.

Before a real read-only connector, FDOS still requires:

- a supported container, VM or platform sandbox with explicit outbound
  allowlisting;
- read restrictions and CPU, memory, process and time budgets;
- independently authenticated workload identity and response provenance;
- immutable worker packaging and trusted deployment beyond the
  repository-local signed source manifest;
- secret-vault delivery with no persistent secret leakage;
- service-specific schemas, TLS/DNS policy, rate/cost limits and idempotency;
- monitoring, incident response and Human Governance approval.

No model, GitHub, document, Slack, Teams, MCP or other network connector is
authorized by this experiment.
