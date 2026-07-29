# ADR-0050 — Signed Worker Source Artifact Experiment

Status: Superseded for Live Worker Execution by ADR-0051; Historical
Experimental Evidence Retained; Not Accepted into FDOS Core

Decision Date: 2026-07-29

Decision Owner: Human Governance

Validation Level: Level 1 — Experimental

Related Decisions:

- `ADR-0043_FDOS_Runtime_Level_1_Experiment.md`
- `ADR-0046_Connector_Contract_and_Durable_Outbox_Experiment.md`
- `ADR-0048_Process_Separated_Dry_Run_Worker_Experiment.md`
- `ADR-0049_Darwin_Network_and_Write_Sandbox_Experiment.md`

Superseded By:

- `ADR-0051_Deterministic_Signed_Worker_Package_Experiment.md`

## Decision

Every Level 1 dry-run worker launch shall fail closed unless the parent can
reconstruct one exact, closed source artifact and verify an Ed25519 release
attestation for that artifact against configured local public trust.

The worker request shall bind the verified release identity. The child shall
reconstruct the same local artifact and return an exact observation that its
local source digest matched the request. The response and result digest shall
bind that observation.

This decision authorizes source-integrity evidence only. It does not authorize
a real connector, immutable deployment package, independent workload identity
or production supply-chain claim.

## Context

ADR-0048 fixed the entry point but explicitly left worker packaging unsigned.
ADR-0049 then bound the optional Darwin isolation launcher and policy while
leaving the Node.js worker and deployment trust open.

Before considering a real read-only connector, FDOS needs to distinguish:

- a path that happens to contain JavaScript;
- an exact allowed module graph;
- a locally trusted release statement for exact source bytes;
- the source observed by the launched child;
- an immutable package and independently attested workload, which remain
  future gates.

## Artifact Rule

The experimental artifact has fixed identity:

```text
artifact:   worker:connector-dry-run
version:    1.0.0-experimental
entrypoint: src/workers/dry-run-connector-worker.js
```

Its policy lists every admitted relative JavaScript source. Inspection must:

- reject symbolic-link, non-directory or group/world-writable runtime and
  source directories;
- open every fixed file without following a final symbolic link;
- require a regular, non-empty, owner-controlled file inside fixed size
  bounds;
- reject group/world-writable files and unstable metadata during the read;
- decode the complete bytes as UTF-8 and record size plus SHA-256;
- require the exact per-file relative and Node.js built-in import set;
- reject source comments, dynamic loading, dynamic code construction,
  CommonJS `require`, bare package imports and non-fixed relative specifiers;
- reject imports outside the allowlist;
- prove every listed source is reachable from the fixed entry point;
- canonicalize the sorted file records into one artifact digest.

The import inspection is a conservative policy for this exact known source
graph. It is not a general JavaScript parser or package-security analyzer.

## Release Trust Rule

The release attestation binds:

- schema and algorithm;
- issuer and key identifiers;
- artifact identifier and version;
- exact artifact digest;
- issue time;
- Ed25519 signature.

The verifier receives only public trust material. The private key used for the
recorded local release is not stored in FDOS.

Unexpected fields, malformed identities, duplicate trust keys, an unknown
key, changed issuer, changed artifact digest or invalid signature fail closed.

This is a repository-local experimental trust root. There is no protected
release service, hardware key custody, expiry, revocation, transparency log or
independent deployment trust.

## Execution-Binding Rule

The parent shall inspect and verify the artifact before every spawn. Worker
protocol version 1.2 binds:

- artifact identifier and version;
- artifact digest;
- release-attestation digest;
- issuer identifier;
- key identifier.

After request verification, the child independently reconstructs the local
source artifact. It proceeds only when identifier, version and digest equal
the request binding. Its response sets `localDigestMatched: true` and repeats
the exact release binding. The parent rejects any mismatch before recording
an Outbox outcome.

The child verifies its local digest against a request whose release the parent
already verified. It does not independently establish the parent, issuer or
signature.

## Failure Rule

Unavailable, mutable, linked, undeclared, changed or incorrectly signed source
must produce no worker result.

A test-only artifact-binding mismatch is sent to the real child. The child
must exit non-zero, the parent must report an untrusted exit and the Outbox
must remain `claimed`. After claim expiry, only Human Governance may reconcile
the delivery to `uncertain`.

No artifact failure authorizes fallback, automatic retry or weaker trust.

## Honest Mutability Rule

Content addressing and signing do not make a development worktree immutable.

The parent inspection and child observation are separated by process launch,
and JavaScript modules execute before the child can run its observation.
A malicious same-account actor able to change source or trust configuration
during that interval may defeat this Level 1 mechanism. Owner-writable source,
the Node.js executable, built-in modules and the host remain trusted.

Promotion therefore still requires an immutable packaged artifact, atomic
deployment reference, supported sandbox, protected trust root and
independently authenticated workload.

## Expected Evidence

The experiment should demonstrate or falsify:

- exact closed and reachable source graph;
- file, directory, symbolic-link, size, permission and stable-read checks;
- deterministic per-file and complete artifact digests;
- valid Ed25519 release verification;
- rejection of changed source, signature, trust and schema;
- exact request/response release binding;
- child-side local digest match;
- child rejection of a deliberately changed request binding;
- unchanged claimed Outbox state and human-only uncertainty reconciliation;
- complete regression of prior Company OS Pilot controls.

## Consequences

Positive:

- a worker path alone is no longer accepted as release identity;
- every admitted source byte is content-addressed;
- the allowed module graph is explicit and closed;
- release identity crosses the process boundary exactly;
- common accidental drift and mismatched launch state fail closed;
- no release private key enters source control or the child protocol.

Negative:

- the trust root and attestation are shipped in the same mutable repository;
- source remains owner-writable and is not atomically locked across launch;
- the child observation occurs after module loading;
- no Node.js binary, built-in module or dependency provenance is covered;
- no release-key rotation, revocation or expiry service exists;
- worker response and identity remain locally inferred, not independently
  signed or remotely attested.

## Promotion Rule

This decision authorizes no real connector and no FDOS Core promotion.

One read-only external connector still requires a separate decision for
immutable packaging, supported OS/container/VM isolation, destination
allowlisting, workload identity, protected release and secret keys,
service-specific schemas and idempotency, monitoring, incident response,
independent review and Human Governance approval.

Write, publish, send, payment, personnel and destructive operations remain
outside the gate.
