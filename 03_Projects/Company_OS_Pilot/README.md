# FDOS Company OS Pilot

Status: Active Experiment  
Owner: Human Governance  
Reference Implementation: `../../02_Reference_Implementations/FDOS_Runtime/`  
Validation Level: Level 1

## Objective

Validate a safe, modular foundation for a future software-company operating
system with a small pilot:

- Chief of Staff coordinates;
- Operations assesses delivery readiness;
- Marketing prepares internal communication;
- Human Governance retains external authority.

## In Scope

- one versioned end-to-end workflow;
- role and capability enforcement;
- task ordering and explicit information transfer;
- bounded handovers;
- human approval mechanics;
- department-specific and company memory;
- exact, allowlisted read-only Git reference evidence;
- Human-reviewed, evidence-bound knowledge candidates;
- exclusive ownership of the local event store;
- Ed25519-signed, short-lived Invocation Contexts;
- exact organization, audience, principal, operation and command binding;
- server-side Agent Registry role derivation;
- separate, versioned Personality Profiles bound to exact Agent Instances;
- fixed constitutional precedence and non-authoritative personality
  invariants;
- authenticated self-only Agent Operating Profile resolution;
- persistent one-time Invocation consumption across restarts;
- a deny-by-default authenticated command gateway;
- one local SQLite transaction per authenticated command;
- shared transaction attribution for Invocation acceptance and internal events;
- crash rollback and transaction-aware restart verification;
- fail-closed persistence selection without implicit JSONL migration;
- dry-run Connector Contract and active Connector Instance registry;
- immutable task-bound Delivery Intents and durable Outbox;
- idempotent preparation, claim leases and fencing IDs;
- exact, expiring worker requests and digest-only responses;
- a closed, content-addressed worker source graph as deterministic package
  build input;
- one canonical separately transportable worker package with exact module,
  artifact and package digests;
- detached Ed25519 signing with an exact public trust-descriptor digest pin;
- parent and bootstrap release verification before packaged module evaluation;
- exact package/release identity in protocol 1.3 plus verified-memory
  evaluation observation;
- process-separated local connector simulation with bounded I/O and timeout;
- optional Darwin-only network and filesystem-write denial with exact
  launcher/policy digest and in-worker denial probes;
- fail-closed crash and acknowledgement handling;
- Human Governance retry, cancellation and uncertainty resolution;
- tamper-evident audit events;
- automated tests and evidence export.

## Out of Scope

- autonomous software changes;
- product-repository writes;
- production operation;
- real model calls;
- model-level personality expression or behavioral evaluation;
- networked Slack, Teams, email, CRM, GitHub or MCP connectors;
- production identity provider, key custody or revocation;
- exposure of the lower-level runtime to untrusted callers;
- distributed replay protection, multi-process worker fencing or transactions;
- supported portable OS/container/infrastructure worker isolation;
- filesystem-read, CPU, memory, process-count and general syscall isolation;
- independently attested worker identity, immutable deployment storage or
  externally protected release trust;
- external-effect transaction or service-side idempotency;
- database migration, backup, restore or encryption;
- production support for the evolving synchronous `node:sqlite` dependency;
- writes, builds or tests in TapTime or Company AI;
- legal, financial, personnel, publication or deletion actions.

## Acceptance Gate

The pilot is technically complete when:

1. the entire automated test suite passes;
2. the authenticated deterministic demo completes all four steps;
3. every demo command carries a verified one-time Invocation Context;
4. each accepted Invocation and its internal events share one committed
   transaction;
5. unauthorized access, signature/command tampering, invocation replay,
   approval replay, persistence tampering and partial crash writes are
   rejected;
6. an evidence record documents results and limitations;
7. the connector dry-run demonstrates one task-bound delivery, one fenced
   claim and one digest-only simulated outcome;
8. lease expiry enters durable uncertainty and cannot auto-retry;
9. no connector/service network request or external effect occurs; only the
   bounded local isolation probes are admitted;
10. each pilot Agent Instance resolves one exact role-compatible Personality
    Profile that contains no authority-bearing or arbitrary prompt fields;
11. profile lookup is authenticated and self-only;
12. the connector simulation runs in a separate process without receiving the
    runtime, database or signing key;
13. a crash, post-response crash or timeout records no successful outcome and
    can reconcile only to uncertainty after claim expiry;
14. process separation alone is never represented as an enforced network
    sandbox;
15. a Darwin-required run reports network/write enforcement only after exact
    listen, connect and write-open denial probes;
16. a bypassed or missing sandbox records no outcome and may reconcile only
    through Human Governance;
17. every worker launch verifies the exact signed package, source artifact and
    trust pin in both parent and bootstrap;
18. the fixed entry point evaluates only from the bootstrap-verified in-memory
    package modules;
19. changed package, signature, trust pin, import graph, path or request
    binding fails closed without an Outbox outcome;
20. no change occurred outside the FDOS repository.

## Reference Assessment

- `Reference_Adoption_Assessment.md`
- `Change_Impact_and_Verification_Profile.md`
- `Artifact_Validation_Register.md`

Technical completion is not production approval and not Core promotion.
