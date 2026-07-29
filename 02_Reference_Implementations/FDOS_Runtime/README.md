# FDOS Runtime

Status: Experimental Reference Implementation Candidate  
Validation Level: Level 1  
Production Status: Not Production Ready

FDOS Runtime is a small executable kernel for testing whether FDOS can safely
coordinate specialized AI roles as one organizational system.

The current slices implement coordination, authenticated invocation, a
no-network connector Outbox and a process-separated digest-only simulation
worker. The live worker now launches from a deterministic package only after
the parent and child bootstrap independently verify its complete digest,
closed source graph, Ed25519 release and pinned public trust anchor. The fixed
entry point is then evaluated from the verified in-memory module strings. For
every launch, the parent creates a fresh random challenge and the verified
bootstrap creates a fresh one-use Ed25519 response key. Protocol 1.4
authenticates the exact session, request, response and package binding. After
clean exit, a closed Verified Worker Receipt retains the minimized request,
response, package, session and isolation evidence through a distinct
authenticated Connector command. On
Darwin, one optional experimental mode additionally denies
network socket operations and new filesystem writes through the operating
system and requires in-worker denial probes before accepting a result. The
next portable boundary is now represented by a closed OCI policy plus a
fail-closed local Docker runtime/image preflight and hardened launch template.
No container is executed or authorized by that preflight. The runtime still
contains no autonomous model call, real connector or external execution.
Callers supply all substantive work results; FDOS governs who may act, in
which order, within which information scope and under which approval.

## Implemented Scope

- separate Chief of Staff, Operations and Marketing role definitions;
- individually attributable and revocable agent instances assigned to roles;
- distinct versioned, content-addressed and non-authoritative Personality
  Profiles for each pilot agent;
- authenticated self-only Agent Operating Profile resolution;
- Ed25519-signed, organization- and command-bound Invocation Contexts;
- persistent one-time replay protection across runtime restarts;
- exact authenticated-command schemas and correlation attribution;
- local SQLite transactions joining Invocation acceptance and internal command
  events;
- transaction-aware hash-chain and metadata verification across restart;
- fail-closed persistence-format selection without implicit JSONL migration;
- deny-by-default, content-addressed dry-run Connector Contracts;
- immutable, task-bound Delivery Intents and durable idempotent preparation;
- registered Connector Instance identity with claim leases and fencing IDs;
- an exact, expiring worker request/response protocol bound to the active
  Connector claim;
- a fixed, closed and reachable 13-file worker source graph with directory,
  file, permission, UTF-8, stable-read and import-policy checks;
- deterministic canonical packaging of the exact 13 admitted UTF-8 modules;
- separate source-artifact and complete worker-package SHA-256 bindings;
- a detached Ed25519 package-release API that accepts no private key;
- an exact public trust-descriptor digest pin;
- independent parent and bootstrap release verification before package module
  evaluation;
- exact package, artifact, attestation, trust and random session-challenge
  binding in worker protocol 1.4;
- verified in-memory package evaluation without source-directory extraction;
- a fresh bootstrap-generated Ed25519 key pair for every launch, with the
  private key retained only by a one-use in-process signing closure;
- one canonical authenticated response envelope binding complete session,
  request and response digests;
- exact parent cross-verification between the authenticated session and the
  minimized session observation in the response/result digest;
- a self-digested Verified Worker Receipt that reconstructs the exact protocol
  response without retaining parameters, challenge, public key or signature;
- a distinct authenticated `outbox.record-worker-outcome` command that binds
  the receipt to the active Delivery, claim, attempt, intent and result;
- durable receipt replay validation and content-minimized Invocation
  authentication metadata in workflow evidence;
- a closed digest-pinned OCI Workload Policy for the fixed pilot worker;
- local Docker launcher, Unix-socket runtime and image admission requiring
  API 1.49+, Linux, cgroup v2, built-in seccomp, exact image configuration and
  an exact hardened launch template;
- explicit OCI preflight non-claims:
  `executionAuthorized: false`, `executionObserved: false`,
  `workloadIdentityExternallyAttested: false` and
  `productionReady: false`;
- a shell-free child process with a minimal environment, bounded input/output
  and hard timeout;
- an optional Darwin-only, fail-closed `sandbox-exec` launch that binds the
  inspected root-owned launcher and exact deny policy by SHA-256;
- child-side listen, connect and filesystem write-open denial probes whose
  exact attestation is bound into the request, response and result digest;
- clean-exit acknowledgement plus crash-before-response,
  response-then-crash, hang, bootstrap-release-mismatch,
  package-binding-mismatch, session-challenge-mismatch,
  response-signature-mismatch, session-observation-mismatch and
  sandbox-bypass fault tests;
- failed retry, cancellation and uncertainty resolution under Human
  Governance;
- content-minimized simulated, failed and uncertain connector outcomes;
- capability-based authorization;
- versioned workflow definitions and acyclic dependency validation;
- immutable action intents with canonical SHA-256 bindings;
- deny-by-default action catalogue;
- A0–A4 action policy;
- exact, expiring and single-use A2 approvals;
- explicit workflow task handovers;
- bounded dynamic specialist handovers;
- company and department memory candidates with human review;
- exact Git-bound read-only reference snapshots;
- content-minimized source evidence for memory candidates;
- exclusive, process-leased ownership of each local event store;
- append-only, hash-chained audit events;
- evidence-bundle export without raw task content;
- deterministic end-to-end pilot and security tests.

## Intentionally Disabled

- LLM or agent-provider calls;
- networked Slack, Teams, email, calendar, CRM, GitHub or MCP execution;
- publication, contracts, payments, deletions and personnel decisions;
- A3 and A4 execution;
- restricted-data storage;
- Docker/Colima daemon start, image build/pull and container execution;
- unattended operation.

## Quick Start

Requirements: Node.js 22.13 or newer.

```bash
cd 02_Reference_Implementations/FDOS_Runtime
npm test
npm run demo
npm run demo:outbox
npm run demo:sandbox
```

The demo creates an ephemeral local Ed25519 authority, gives the runtime only
its public trust descriptor, executes a fully authenticated internal workflow
below `.runtime/`, commits each command as one local SQLite transaction and
prints a content-minimized evidence bundle. It performs no external action.

The Outbox demo separately exercises contract binding, task-bound preparation,
connector claim, process-separated digest-only simulation and authenticated
outcome recording. It performs no network operation and records
`externalEffect: none`. Before each launch, the parent verifies the signed
pilot worker package and pinned trust anchor. The child bootstrap repeats that
verification before evaluating the exact package modules from memory. It then
creates a fresh one-use response key. The parent accepts only the signed
challenge- and package-bound response envelope, constructs its minimized
receipt after clean exit and records it through the distinct authenticated
worker-outcome command.

The default process-only worker reports `networkIsolationEnforced: false`.
Process separation alone is not a sandbox.

On Darwin, `npm run demo:sandbox` launches the same no-effect worker through
Apple's deprecated `/usr/bin/sandbox-exec` interface with `network*` and
`file-write*` denied. A response is accepted only after socket listen, socket
connect and filesystem write-open attempts return a kernel denial. The result
may then report both isolation flags as true for that execution and exact
policy digest. This is Level 1 evidence for one local platform/profile, not a
production sandbox claim. It does not restrict reads, CPU, memory, process
creation or inherited standard-I/O descriptors and is unavailable off Darwin.

The built-in `node:sqlite` API is still an evolving Node.js dependency. This
candidate records exact runtime versions and makes no production-support
claim.

The OCI admission module is intentionally not a demo command. The recorded
host has a byte-inspected Docker CLI but no running Docker/Colima daemon and
no FDOS image. See `docs/OCI_WORKLOAD_ADMISSION.md` for the policy, provider,
tested launch template and the separately governed live-runtime gate.

Read-only reference verification is explicit and prints no document content:

```bash
node src/cli.js reference-snapshot taptime /absolute/path/to/taptime
node src/cli.js reference-snapshot company-ai /absolute/path/to/company-ai-platform
```

## Architecture

- `src/kernel/` — canonical serialization, identifiers and event integrity;
- `src/identity/` — signed Invocation Contexts and public-key verification;
- `src/domain/` — roles, personality profiles, action and delivery intents,
  connector contracts, worker package and release contracts, OCI workload
  policy, workflow definitions, plus the ephemeral workload-session and
  verified-worker-receipt contracts;
- `src/runtime/` — authenticated gateway, coordination, approvals and memory;
- `src/integrations/` — read-only reference, process-worker and local OCI
  admission boundaries;
- `src/workers/` — verifier bootstrap, closed dry-run protocol and packaged
  simulation entry point;
- `artifacts/worker-packages/` — generated canonical pilot package;
- `scripts/` — deterministic package build tooling;
- `src/pilot/` — the three-role reference workflow;
- `test/` — unit, security and end-to-end verification.

See:

- `docs/ARCHITECTURE.md`
- `docs/AUTHENTICATED_INVOCATIONS.md`
- `docs/TRANSACTIONAL_PERSISTENCE.md`
- `docs/CONNECTOR_OUTBOX.md`
- `docs/PROCESS_SEPARATED_DRY_RUN_WORKER.md`
- `docs/DARWIN_SANDBOXED_DRY_RUN_WORKER.md`
- `docs/SIGNED_WORKER_SOURCE_ARTIFACT.md`
- `docs/VERIFIED_WORKER_PACKAGE.md`
- `docs/AUTHENTICATED_WORKLOAD_SESSION.md`
- `docs/VERIFIED_WORKER_RECEIPT.md`
- `docs/OCI_WORKLOAD_ADMISSION.md`
- `docs/AGENT_AND_ROLE_MODEL.md`
- `docs/AGENT_PERSONALITY_MODEL.md`
- `docs/SECURITY_MODEL.md`
- `docs/PILOT_WORKFLOW.md`
- `docs/REFERENCE_INTAKE.md`

## Important Boundary

Untrusted integrations must use `AuthenticatedRuntimeGateway`; the lower-level
runtime object is an internal reference-kernel and test surface. Passing tests
proves behavior only inside the local process-leased experiment. The ephemeral
demo signer is not a production identity provider. The Darwin probe proves
only the tested local `sandbox-exec` policy invocation; it does not prove
portable infrastructure isolation, a networked connector, database recovery
or tenant security. The worker package is deterministic, signed and evaluated
from verified memory, but its file, bootstrap, verifier and pilot trust pin
remain mutable repository-local trusted components. It is not immutable
deployment, protected release-key custody or independent workload
attestation. The fresh session key authenticates possession of a key created
by that mutable bootstrap; it is not an externally issued workload identity.
The durable receipt is authenticated by the local Connector Invocation and
hash-chained event history; without the omitted full envelope it is not an
independently signed workload execution proof. The OCI preflight validates a
policy, locally reported runtime/image state and a launch template only. It
does not prove a live container, immutable registry, external image
provenance, enforced isolation or workload identity.
