# Process-Separated Dry-Run Worker

Status: Experimental No-Effect Boundary

Validation Level: Level 1

Production Status: Not Production Ready

Related Decision:
`../../../00_Specification/ADR/ADR-0048_Process_Separated_Dry_Run_Worker_Experiment.md`

## Purpose

Move the bounded connector simulation out of the FDOS controller process
without enabling a networked connector or external effect.

This slice tests process lifecycle, exact request/response binding and
fail-closed acknowledgement handling. It is not an operating-system sandbox.

## Boundary

```text
authenticated Operations command
  -> immutable Delivery Intent
  -> durable Outbox preparation
  -> authenticated Connector Instance claim
  -> exact, expiring worker request
       │
       ▼
     separate Node.js child process
       -> verify exact request and no-effect contract
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

- launches the current absolute Node.js executable and one fixed worker file;
- rejects a symbolic-link, non-file, empty or oversized worker entry point;
- uses `shell: false`;
- opens only explicit standard-input, standard-output and standard-error
  pipes;
- does not forward the parent environment;
- supplies only the fixed fault-test selector and locale/timezone values;
- uses a fixed working directory;
- enforces a 50–5,000 ms parent-side timeout;
- caps request, standard-output and standard-error bytes;
- terminates a timed-out or output-overflow process with `SIGKILL`.

These are application controls. They do not prevent a compromised child from
using operating-system resources available to the same host account.

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
- the declared worker boundary;
- the response digest.

The declared boundary contains
`networkIsolationEnforced: false`. A worker response claiming that network
isolation was enforced is rejected because this experiment has no such
control.

## Acknowledgement Rule

Output is accepted only when all conditions hold:

1. the process did not time out or exceed an output limit;
2. no spawn error occurred;
3. the process exited normally with code zero;
4. standard error is empty;
5. standard output contains exactly one JSON line;
6. the response has the exact closed shape and digest;
7. every request, delivery, claim, connector and time binding matches.

A valid-looking response followed by a non-zero process exit is not accepted.
This prevents the parent from interpreting a partially acknowledged or
post-response crash as success.

## Failure and Uncertainty

The test worker supports bounded fault injection for:

- crash before response;
- valid response followed by crash;
- hang until parent timeout.

All three paths reject the worker result. They do not mutate Outbox state.
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
- cannot change the Delivery Intent;
- cannot select another connector or claim;
- cannot return raw response content;
- cannot record its own outcome in FDOS;
- cannot authorize retry or resolve uncertainty.

The parent-side demo still uses an ephemeral local authority to record the
verified result as the registered Connector Instance. The child response
itself is not independently signed or workload-attested.

## Explicit Non-Claims

This slice does not establish:

- operating-system network denial or egress filtering;
- filesystem, CPU or memory sandboxing;
- container, VM or tenant isolation;
- independently authenticated worker identity;
- signed or immutable worker packaging;
- protection against a compromised host account or Node.js runtime;
- secret-vault integration;
- a real service API, DNS, TLS, rate, cost or service-idempotency control;
- distributed worker fencing;
- production monitoring or incident response.

`processSeparated: true` means only that the simulation ran in another local
process. It must never be reported as `networkIsolationEnforced: true`.

## Promotion Gate

Before one real read-only sandbox connector, FDOS still requires:

- OS-, container- or infrastructure-enforced outbound allowlisting;
- filesystem and resource restrictions;
- production workload identity, response authentication and revocation;
- signed, immutable worker artifact verification;
- secret-vault and no-secret-persistence controls;
- service-specific request/response schemas and idempotency;
- rate, cost, concurrency and observability budgets;
- independent security review and an operational runbook;
- Human Governance approval for the exact connector and environment.

No write, publish, message, payment, personnel or destructive connector is
authorized by this experiment.
