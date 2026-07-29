# FDOS Runtime

Status: Experimental Reference Implementation Candidate  
Validation Level: Level 1  
Production Status: Not Production Ready

FDOS Runtime is a small executable kernel for testing whether FDOS can safely
coordinate specialized AI roles as one organizational system.

The current slices implement coordination, authenticated invocation and a
no-network connector Outbox, not autonomous model calls or external execution.
Callers supply work results; the runtime governs who may act, in which order,
within which information scope and under which approval.

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
```

The demo creates an ephemeral local Ed25519 authority, gives the runtime only
its public trust descriptor, executes a fully authenticated internal workflow
below `.runtime/`, commits each command as one local SQLite transaction and
prints a content-minimized evidence bundle. It performs no external action.

The Outbox demo separately exercises contract binding, task-bound preparation,
connector claim and a digest-only simulated result. It opens no network and
records `externalEffect: none`.

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
- `src/integrations/` — disabled-by-default, read-only reference boundaries;
- `src/pilot/` — the three-role reference workflow;
- `test/` — unit, security and end-to-end verification.

See:

- `docs/ARCHITECTURE.md`
- `docs/AUTHENTICATED_INVOCATIONS.md`
- `docs/TRANSACTIONAL_PERSISTENCE.md`
- `docs/CONNECTOR_OUTBOX.md`
- `docs/AGENT_AND_ROLE_MODEL.md`
- `docs/AGENT_PERSONALITY_MODEL.md`
- `docs/SECURITY_MODEL.md`
- `docs/PILOT_WORKFLOW.md`
- `docs/REFERENCE_INTAKE.md`

## Important Boundary

Untrusted integrations must use `AuthenticatedRuntimeGateway`; the lower-level
runtime object is an internal reference-kernel and test surface. Passing tests
proves behavior only inside the local process-leased experiment. The ephemeral
demo signer is not a production identity provider and does not prove
infrastructure, networked connector, database-recovery or tenant security.
