# FDOS Runtime Architecture

Status: Experimental Design  
Validation Level: Level 1

## Objective

Provide the smallest reusable runtime that can test the FDOS company-operating-
system vision without granting external autonomy.

## Runtime Flow

```text
Human Governance
        │
        ▼
Signed Invocation Context
        │
        ▼
Authenticated Runtime Gateway
        │
        ▼
Workflow Definition Registry
        │
        ▼
FDOS Runtime
  ├── Role Registry
  ├── Agent Instance Registry
  ├── Policy Engine
  ├── Task State Machine
  ├── Approval State Machine
  ├── Connector Contract Registry
  ├── Durable Dry-Run Outbox
  ├── Scoped Memory
  ├── Git Reference Evidence
  └── Evidence Projection
        │
        ▼
Transactional SQLite Event Store
  └── Hash-Chained Transaction Groups
        │
        ▼
Exclusive Runtime Directory Lease
```

## Design Decisions

### Event-first state

Every material transition is appended as an event. Runtime state is rebuilt
from verified events when the process opens.

This provides traceability and deterministic recovery within the limits of one
local process and one file-backed database.

The local store has one exclusive process owner. The lease prevents a second
cooperating runtime from rehydrating stale state and appending a competing
sequence.

Authenticated commands use one SQLite transaction for Invocation acceptance
and all resulting internal events. Transaction identity is included in each
event hash. On open, the runtime verifies both the global event chain and each
transaction's count, sequence range and head hash.

### Authenticated invocation boundary

Every untrusted command must enter through the authenticated gateway. A
configured public-key verifier checks the Ed25519 signature, issuer, audience,
organization, principal, exact operation, canonical command digest and
validity window.

The runtime consumes the Invocation ID inside the same local transaction as
dispatch. Replays therefore remain denied after restart. A recognized business
failure also consumes its Invocation ID and records content-minimized failure
evidence in that transaction.

Integrity and unexpected implementation failures before commit roll back both
acceptance and internal effects. A finalization failure reloads authoritative
state and reports confirmed rollback or an uncertain outcome. Retrying the
same Invocation is permitted only after diagnosis and a clean reopen resolves
replay state. This is safe in the current experiment because Connector
Contracts enforce no network and no external effects.

The local demo signer is intentionally separate from the gateway object. The
runtime receives only a public trust descriptor. Production still requires an
independent identity provider and governed key custody.

### Immutable execution scope

Each task binds:

- action type,
- required capability,
- target,
- parameter digest,
- minimum risk class,
- sensitivity.

The canonical action-intent digest is recorded at task creation. Approval and
execution validate that exact digest.

### Role and agent-instance separation

A Role Definition owns stable responsibility, capabilities, department and
communication rules.

An Agent Instance is an individually attributable runtime identity assigned to
one Role Definition. Multiple active instances may share a role. Suspension or
retirement applies to the instance without redefining the role.

Tasks are assigned to roles. Claims, results, handovers and audit events are
attributed to the concrete agent instance.

### Definitions before runs

Workflow definitions are validated and content-addressed before a run starts.
A run stores the definition identifier, semantic version and digest so later
definition changes cannot silently alter an active run.

### Explicit information flow

Task results are private to the owning role by default. A downstream role may
read an upstream result only when the workflow definition declares the upstream
step as a dependency.

### Human-reviewed memory

Agents create Memory Candidates. Only an explicit human review promotes a
candidate into readable long-term organizational memory.

An external Git document may add content-minimized source evidence to a
candidate. Exact source binding does not bypass human semantic review.

### Exact reference state

The read-only reference adapter binds commit, tree and every tracked Git
object before reading an allowlisted document from its committed blob. It
never reads untracked content. A changing HEAD/status, tracked worktree drift,
symlink or invalid evidence fails closed.

### Connector work before connector execution

A dry-run Connector Contract closes operation, capability, target, risk,
sensitivity, parameters, retry budget, network policy and effect policy.

An agent may prepare an immutable Delivery Intent only from its claimed task.
The durable Outbox binds the task Action Intent, exact Connector Instance,
contract/operation digests, normalized parameters and scoped idempotency.

A signed Connector Instance can only claim its own delivery and report the
active fencing claim outcome. Lease expiry becomes uncertain. Retry,
cancellation and uncertainty resolution remain Human Governance actions.

No contract in this slice can open a network or record an external effect.

## State Machines

### Task

```text
blocked ──dependencies complete──> ready
ready ──claim──> in_progress
ready ──A2 approval needed──> waiting_approval
in_progress ──complete──> completed
in_progress ──fail──> failed
failed ──human retry──> ready
ready|blocked|waiting_approval ──human cancel──> cancelled
```

### Approval

```text
requested ──human grant──> granted ──task claim──> consumed
requested ──human deny──> denied
requested|granted ──time──> expired
```

### Memory

```text
candidate ──human accept──> accepted
candidate ──human reject──> rejected
```

### Invocation

```text
issued ──signature, scope and time valid──> accepted/consumed
issued ──invalid or expired──> denied
accepted/consumed ──any replay──> denied
```

### Connector Outbox

```text
prepared ──registered connector claim──> claimed
claimed ──digest-only dry-run result──> simulated
claimed ──typed failure──> failed ──human retry──> prepared
claimed ──uncertain/lease expiry──> uncertain
uncertain ──human evidence review──> simulated|failed|cancelled
prepared|failed ──human cancel──> cancelled
```

## Persistence

Authenticated events are stored in SQLite with:

- monotonic sequence number,
- event identifier,
- timestamp,
- actor,
- Invocation and correlation attribution where authenticated,
- transaction identifier,
- subject,
- payload,
- previous event hash,
- current event hash.

The runtime also records transaction start/commit metadata, event count,
sequence range and transaction head hash. It verifies database identity,
canonical event content, the complete chain and transaction metadata before
rehydration. File permissions are restricted to the local account.

The legacy JSONL adapter remains available only for lower-level compatibility
tests. Authenticated operation requires SQLite, and no non-empty store is
migrated implicitly.

See `TRANSACTIONAL_PERSISTENCE.md`.
See `CONNECTOR_OUTBOX.md` for the external-work boundary.

## Future Extension Points

These are not implemented:

- production identity-provider federation and revocation;
- supported production database and schema migration service;
- distributed fencing and multi-process worker claims;
- real read-only connector sandbox and service-specific idempotency;
- message bus and durable queues;
- model-provider adapter;
- isolated connector executors and network egress policy;
- secrets vault;
- policy-as-code service;
- observability and incident operations.

Each extension requires its own evidence and governance decision.
