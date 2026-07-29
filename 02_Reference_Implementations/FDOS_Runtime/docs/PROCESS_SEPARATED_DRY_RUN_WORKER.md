# Process-Separated Dry-Run Worker

Status: Experimental No-Effect Boundary

Validation Level: Level 1

Production Status: Not Production Ready

Related Decisions:

- `../../../00_Specification/ADR/ADR-0048_Process_Separated_Dry_Run_Worker_Experiment.md`
- `../../../00_Specification/ADR/ADR-0049_Darwin_Network_and_Write_Sandbox_Experiment.md`
- `../../../00_Specification/ADR/ADR-0050_Signed_Worker_Source_Artifact_Experiment.md`
- `../../../00_Specification/ADR/ADR-0051_Deterministic_Signed_Worker_Package_Experiment.md`

## Purpose

Move the bounded connector simulation out of the FDOS controller process
without enabling a networked connector or external effect.

This boundary tests process lifecycle, exact request/response binding and
fail-closed acknowledgement handling. Process separation itself is not an
operating-system sandbox. A separate optional Darwin mode wraps the process in
one explicitly limited OS deny policy, described in
`DARWIN_SANDBOXED_DRY_RUN_WORKER.md`.

## Boundary

```text
authenticated Operations command
  -> immutable Delivery Intent
  -> durable Outbox preparation
  -> authenticated Connector Instance claim
  -> read canonical worker package
  -> verify package, source graph, Ed25519 release and trust pin
  -> exact, expiring worker package, release and isolation binding
       │
       ▼
     separate Node.js verifier bootstrap
       -> direct process-only mode; or
       -> Darwin sandbox-exec network/write-deny mode
       -> independently reverify package, release and trust pin
       -> load exact verified modules into memory
       -> evaluate fixed packaged entry point
       -> verify exact request and no-effect contract
       -> match exact package and release binding
       -> when required, prove socket and write-open denial
       -> compute digest-only simulation outcome
       -> emit one exact response
       │
       ▼
  -> parent verifies response and clean process exit
  -> authenticated Connector Instance outcome command
  -> durable simulated delivery
```

The controller retains the gateway, runtime, SQLite store, Invocation
Authority and Connector principal. The child receives none of those objects
or private keys. It receives one request over standard input and can return
only one protocol response over standard output.

## Process Launch Contract

`ProcessSeparatedDryRunWorker`:

- reads one canonical, separately transportable worker package before every
  launch;
- rejects linked, non-regular, wrong-owner, group/world-writable, oversized,
  unstable, non-UTF-8 or noncanonical package input;
- reconstructs every module digest and the complete source artifact;
- rejects comments, dynamic loading/code, packages, added built-ins,
  duplicate/undeclared, escaping or unreachable package imports;
- verifies the complete package against its Ed25519 release attestation and
  exact trust-anchor digest pin;
- launches the current absolute Node.js executable and fixed verifier
  bootstrap only after parent preflight succeeds;
- supplies the package path and one bounded public release envelope;
- requires the bootstrap to repeat package, release and trust verification
  before evaluating the fixed entry point from verified in-memory modules;
- uses `shell: false`;
- opens only explicit standard-input, standard-output and standard-error
  pipes;
- does not forward the parent environment;
- supplies only the fixed fault-test selector, exact isolation
  provider/policy digest and locale/timezone values;
- explicitly disables child V8 coverage-file output in required no-write mode
  so test instrumentation cannot request a forbidden write at process exit;
- uses a fixed working directory;
- enforces a 50–5,000 ms parent-side timeout;
- caps request, standard-output and standard-error bytes;
- terminates a timed-out or output-overflow process with `SIGKILL`.

These are application controls. In the default `process-only` mode they do not
prevent a compromised child from using operating-system resources available
to the same host account.

The optional `darwin-sandbox-exec-required` mode launches through a fixed
root-owned Apple binary and exact profile that denies `network*` and
`file-write*`. The provider fails closed off Darwin or when launcher trust
checks fail. The child must observe kernel denial for listen, connect and
write-open probes before returning a positive execution attestation. This
deprecated Apple interface remains a bounded experiment, not the production
isolation design.

## Exact Protocol

### Request

The content-addressed request binds:

- schema and request kind;
- request, delivery and active fencing-claim IDs;
- exact Connector Instance ID;
- issue and expiry timestamps;
- `mode: dry_run`;
- `networkAccess: false`;
- `externalEffects: false`;
- whether technical isolation is required plus exact provider and policy
  digest;
- exact artifact ID, version, source digest, release-attestation digest,
  issuer and key ID;
- exact package ID, version, complete digest and trust-anchor digest;
- the complete verified Delivery Intent;
- the request digest.

The validity window cannot exceed five minutes and the parent shortens it to
the earlier of its worker budget or the active claim expiry.

### Response

The content-addressed response binds:

- the exact request, delivery, claim and connector IDs;
- the exact request digest;
- completion time inside the request validity window;
- one normalized `simulated` outcome;
- `externalEffect: none`;
- a result digest binding the request digest, intent/operation digests,
  completion time and declared worker boundary rather than raw result content;
- the declared worker boundary, including exact isolation provider, policy
  digest and denial-probe identifiers;
- the exact package and source-artifact release binding;
- `packageDigestMatched: true`,
  `releaseSignatureVerifiedByBootstrap: true` and
  `evaluatedFromVerifiedMemory: true` child observations;
- the response digest.

The default process-only boundary contains
`networkIsolationEnforced: false` and
`filesystemWriteIsolationEnforced: false`. A response asserting either
control against a process-only request is rejected.

The Darwin-required boundary is accepted only when it reports both controls
as true, binds the request's exact provider/policy digest and contains the
fixed successful denial-probe identifiers. Missing, false, substituted or
tampered attestations fail closed. The attestation is a child observation
bound by canonical digests; it is not an independently signed workload
attestation.

## Acknowledgement Rule

Output is accepted only when all conditions hold:

1. the process did not time out or exceed an output limit;
2. no spawn error occurred;
3. the process exited normally with code zero;
4. standard error is empty;
5. standard output contains exactly one JSON line;
6. the response has the exact closed shape and digest;
7. every request, delivery, claim, connector and time binding matches;
8. any required isolation provider, policy digest and denial probes match
   exactly;
9. the bootstrap-observed package, artifact, attestation and trust pin match
   the parent-verified release binding;
10. the response proves the fixed entry point was evaluated from the verified
    in-memory module set.

A valid-looking response followed by a non-zero process exit is not accepted.
This prevents the parent from interpreting a partially acknowledged or
post-response crash as success.

## Failure and Uncertainty

The test worker supports bounded fault injection for:

- crash before response;
- valid response followed by crash;
- hang until parent timeout;
- a deliberately changed package digest in the otherwise exact request;
- a deliberately changed bootstrap trust-anchor pin after valid parent
  preflight;
- a deliberate sandbox-launch bypass while the request still requires the
  Darwin policy.

All paths reject the worker result. They do not mutate Outbox state.
The durable delivery remains `claimed` until its lease expires. Human
Governance may then reconcile the abandoned claim to `uncertain`; it may not
infer success, failure or retry automatically.

Error details contain reason codes and diagnostic digests, not raw worker
standard output, standard error, parameters or responses.

## Demonstrated Non-Authority

The worker:

- cannot call the lower-level runtime because it is not passed;
- cannot open the SQLite store through the worker protocol;
- cannot sign an Invocation because no private key is passed;
- cannot access a worker release private key because the package-release API
  accepts detached signatures only and no private key is stored or passed;
- cannot change the Delivery Intent;
- cannot select another connector or claim;
- cannot return raw response content;
- cannot record its own outcome in FDOS;
- cannot authorize retry or resolve uncertainty.

The parent-side demo still uses an ephemeral local authority to record the
verified result as the registered Connector Instance. The child response
itself is not independently signed or workload-attested. Positive Darwin
probe results therefore demonstrate the behavior of the launched local
process, not an independently established worker identity.

## Explicit Non-Claims

This boundary does not establish:

- portable, production-grade network denial or outbound allowlisting;
- filesystem read, CPU, memory, process-count or general syscall isolation;
- container, VM or tenant isolation;
- independently authenticated worker identity;
- immutable package storage or protected deployment trust; ADR-0051 packages
  and verifies exact bytes but the repository fixture remains owner-writable;
- protection against compromise of the mutable bootstrap, verifier, Node.js
  runtime or repository-local pilot trust pin;
- protection against a compromised host account or Node.js runtime;
- secret-vault integration;
- a real service API, DNS, TLS, rate, cost or service-idempotency control;
- distributed worker fencing;
- production monitoring or incident response.

`processSeparated: true` means only that the simulation ran in another local
process. `evaluatedFromVerifiedMemory: true` means the package bootstrap
verified the release before evaluating the admitted module strings; it is not
remote attestation or sandbox proof. Only the exact Darwin-required execution
that completed all denial probes may report the two enforced-isolation flags
as true. The default mode must report them as false.

## Promotion Gate

Before one real read-only sandbox connector, FDOS still requires:

- a supported OS-, container- or infrastructure-enforced outbound policy;
- filesystem read and resource restrictions;
- production workload identity, response authentication and revocation;
- immutable deployment storage and externally protected release trust;
- secret-vault and no-secret-persistence controls;
- service-specific request/response schemas and idempotency;
- rate, cost, concurrency and observability budgets;
- independent security review and an operational runbook;
- Human Governance approval for the exact connector and environment.

No write, publish, message, payment, personnel or destructive connector is
authorized by this experiment.
