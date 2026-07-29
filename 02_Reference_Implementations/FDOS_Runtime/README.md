# FDOS Runtime

Status: Experimental Reference Implementation Candidate  
Validation Level: Level 1  
Production Status: Not Production Ready

FDOS Runtime is a small executable kernel for testing whether FDOS can safely
coordinate specialized AI roles as one organizational system.

The current slices implement coordination, authenticated invocation, a
no-network connector Outbox and a process-separated digest-only simulation
worker. On Darwin, one optional experimental mode additionally denies network
socket operations and new filesystem writes through the operating system and
requires in-worker denial probes before accepting a result. The runtime still
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
- a shell-free child process with a minimal environment, bounded input/output
  and hard timeout;
- an optional Darwin-only, fail-closed `sandbox-exec` launch that binds the
  inspected root-owned launcher and exact deny policy by SHA-256;
- child-side listen, connect and filesystem write-open denial probes whose
  exact attestation is bound into the request, response and result digest;
- clean-exit acknowledgement plus crash-before-response,
  response-then-crash, hang and sandbox-bypass fault tests;
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
`externalEffect: none`.

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

Read-only reference verification is explicit and prints no document content:

```bash
node src/cli.js reference-snapshot taptime /absolute/path/to/taptime
node src/cli.js reference-snapshot company-ai /absolute/path/to/company-ai-platform
```

## Architecture

- `src/kernel/` — canonical serialization, identifiers and event integrity;
- `src/identity/` — signed Invocation Contexts and public-key verification;
- `src/domain/` — roles, personality profiles, action and delivery intents,
  connector contracts, policy and workflow definitions;
- `src/runtime/` — authenticated gateway, coordination, approvals and memory;
- `src/integrations/` — read-only reference and process-worker boundaries;
- `src/workers/` — closed dry-run protocol and separate simulation entry
  point;
- `src/pilot/` — the three-role reference workflow;
- `test/` — unit, security and end-to-end verification.

See:

- `docs/ARCHITECTURE.md`
- `docs/AUTHENTICATED_INVOCATIONS.md`
- `docs/TRANSACTIONAL_PERSISTENCE.md`
- `docs/CONNECTOR_OUTBOX.md`
- `docs/PROCESS_SEPARATED_DRY_RUN_WORKER.md`
- `docs/DARWIN_SANDBOXED_DRY_RUN_WORKER.md`
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
or tenant security.
