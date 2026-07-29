# FDOS Runtime

Status: Experimental Reference Implementation Candidate  
Validation Level: Level 1  
Production Status: Not Production Ready

FDOS Runtime is a small executable kernel for testing whether FDOS can safely
coordinate specialized AI roles as one organizational system.

The first slice implements coordination infrastructure, not autonomous model
calls. Callers supply the work results; the runtime governs who may act, in
which order, within which information scope and under which approval.

## Implemented Scope

- separate Chief of Staff, Operations and Marketing role definitions;
- individually attributable and revocable agent instances assigned to roles;
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
- Slack, Teams, email, calendar, CRM, GitHub or MCP execution;
- publication, contracts, payments, deletions and personnel decisions;
- A3 and A4 execution;
- restricted-data storage;
- unattended operation.

## Quick Start

Requirements: Node.js 20 or newer.

```bash
cd 02_Reference_Implementations/FDOS_Runtime
npm test
npm run demo
```

The demo creates a new local run below `.runtime/`, executes only internal
preparation steps and prints a content-minimized evidence bundle.

Read-only reference verification is explicit and prints no document content:

```bash
node src/cli.js reference-snapshot taptime /absolute/path/to/taptime
node src/cli.js reference-snapshot company-ai /absolute/path/to/company-ai-platform
```

## Architecture

- `src/kernel/` — canonical serialization, identifiers and event integrity;
- `src/domain/` — roles, action intents, policy and workflow definitions;
- `src/runtime/` — event-sourced coordination, approvals and memory;
- `src/integrations/` — disabled-by-default, read-only reference boundaries;
- `src/pilot/` — the three-role reference workflow;
- `test/` — unit, security and end-to-end verification.

See:

- `docs/ARCHITECTURE.md`
- `docs/AGENT_AND_ROLE_MODEL.md`
- `docs/SECURITY_MODEL.md`
- `docs/PILOT_WORKFLOW.md`
- `docs/REFERENCE_INTAKE.md`

## Important Boundary

Passing tests proves behavior only inside the local process-leased experiment.
It does not prove production identity, infrastructure, connector or tenant
security.
