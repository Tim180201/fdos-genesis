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
  ├── Scoped Memory
  ├── Git Reference Evidence
  └── Evidence Projection
        │
        ▼
Hash-Chained Event Log
        │
        ▼
Exclusive Runtime Directory Lease
```

## Design Decisions

### Event-first state

Every material transition is appended as an event. Runtime state is rebuilt
from verified events when the process opens.

This provides traceability and deterministic recovery within the limits of one
local process.

The local store has one exclusive process owner. The lease prevents a second
cooperating runtime from rehydrating stale state and appending a competing
sequence. It does not make a multi-event transition transactional.

### Authenticated invocation boundary

Every untrusted command must enter through the authenticated gateway. A
configured public-key verifier checks the Ed25519 signature, issuer, audience,
organization, principal, exact operation, canonical command digest and
validity window.

The runtime consumes the Invocation ID in the event log before dispatch.
Replays therefore remain denied after restart. A failed business command also
consumes its Invocation ID.

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

## Persistence

Events are stored as JSON Lines with:

- monotonic sequence number,
- event identifier,
- timestamp,
- actor,
- Invocation and correlation attribution where authenticated,
- subject,
- payload,
- previous event hash,
- current event hash.

The runtime verifies the complete chain before rehydration. File permissions
are restricted to the local account where supported.

## Future Extension Points

These are not implemented:

- production identity-provider federation and revocation;
- transactional database event store;
- message bus and durable queues;
- model-provider adapter;
- connector registry and isolated executors;
- secrets vault;
- policy-as-code service;
- observability and incident operations.

Each extension requires its own evidence and governance decision.
