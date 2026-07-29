# FDOS Runtime Security Model

Status: Experimental Threat Model  
Validation Level: Level 1

## Protected Assets

- human authority;
- task intent and ordering;
- approval meaning;
- company and department information;
- audit integrity;
- workflow evidence;
- separation between preparation and external execution.

## Trust Assumptions

The Level 1 runtime assumes:

- one trusted local operating-system account;
- one trusted controller process holding the exact runtime-directory lease;
- one local SQLite database opened only by that controller;
- one short-lived child simulation process running under the same trusted
  account and Node.js installation;
- one canonical worker package plus repository-local public trust descriptor,
  trust-anchor pin and release attestation whose private signing key is not
  stored in FDOS;
- one fresh parent challenge and bootstrap-created response key per worker
  launch, whose private key remains in child-process memory;
- for the optional Darwin experiment, a trusted local kernel and fixed
  root-owned `/usr/bin/sandbox-exec` launcher;
- trusted bootstrap registration of the Invocation Verifier public keys;
- safe in-memory custody of the ephemeral local demo signing key;
- the host and Node.js runtime are not compromised.

These assumptions are unacceptable for production and must be replaced by
an independent identity provider, protected key custody, service boundaries
and infrastructure controls.

At the authenticated gateway, a caller cannot provide a role. The signed
principal contains only its type and identifier. The runtime resolves an Agent
Instance in its registry and derives the effective role from that assignment.

The lower-level runtime remains an internal reference-kernel and test API.
Providing it directly to an untrusted integration would bypass the
authenticated gateway and is prohibited.

## Primary Controls

| Threat | Control |
|---|---|
| Agent exceeds role | Registered instance-to-role binding, capability and ownership checks |
| Principal or command is altered | Ed25519 signature and exact canonical command digest |
| Invocation crosses organization | Exact organization and audience binding |
| Invocation is replayed | Persistent one-time Invocation ID consumption |
| Process exits between acceptance and internal effects | One local SQLite command transaction; uncommitted events roll back |
| Agent claims another role | Signed ID only; Agent Registry derives the immutable role assignment |
| Personality changes authority | Separate closed schema; fixed lowest precedence; no capability, tool, memory or approval fields |
| Agent reads another personality binding | `agent.profile` has no target field and resolves only the signed active instance |
| Persona configuration becomes prompt injection | No arbitrary prompt/instruction field; unexpected fields fail closed |
| Expired invocation is used | Short validity window with fail-closed time checks |
| Cross-department disclosure | Scope-specific read policy |
| Approval reused for changed action | Exact action-intent digest |
| Approval replay | Single-use consumption |
| Stale approval | Expiration check |
| Risk under-classified | Registered minimum risk; higher value wins |
| Unknown action | Deny by default |
| Material external action | A3/A4 blocked |
| Audit event altered | SHA-256 hash chain verified on open and on demand |
| Unreviewed memory becomes truth | Candidate/review lifecycle |
| Hidden workflow mutation | Definition digest bound to every run |
| Unbounded agent delegation | Depth and root-handover limits |
| Mutable reference worktree becomes evidence | Exact commit/tree/blob binding and stable-status check |
| Untracked source content enters context | Never read; count only |
| Two local runtime writers | Exclusive runtime-directory lease |
| Event transaction metadata is altered | Canonical event/column comparison plus transaction count, range and head verification |
| Persistence format changes silently | Non-empty format conflict; explicit migration required |
| Source evidence becomes memory automatically | Candidate state plus Human Governance review |
| Agent invents connector authority | Active task ownership, closed Connector Contract and exact capability binding |
| Connector reads unrelated runtime state | Connector principals limited to claim and outcome commands |
| Two workers claim one delivery | Serialized claim transition, bounded lease and fencing claim ID |
| Contract changes after preparation | Exact contract and operation digests; stale binding denied |
| Duplicate preparation | Scoped durable idempotency digest; changed request conflicts |
| Claim outcome is unknown | Durable uncertain state; no automatic retry; human evidence resolution |
| Connector response leaks raw data | Closed outcome shapes containing typed fields and digests only |
| Dry-run accidentally performs an effect | Contract requires network false, external effects false and outcome `externalEffect: none` |
| Child changes delivery or fencing claim | Exact request and response digests bind delivery, claim, connector and full Delivery Intent |
| Child emits a result and then crashes | Result accepted only after clean exit code zero and empty standard error |
| Child hangs or floods output | Parent timeout, byte limits and forced termination |
| Child receives parent secrets or runtime authority | No runtime/database/key object; minimal non-inherited environment; standard-I/O protocol only |
| Worker execution bytes change before launch | Canonical package, exact module/source/package digests, closed graph and parent Ed25519 release verification before every spawn |
| Child package differs from parent-verified release | Bootstrap independently repeats package, signature and trust-pin verification before module evaluation; protocol 1.4 requires an exact observation |
| Worker response is substituted or replayed | Fresh 256-bit parent challenge, fresh one-use Ed25519 session key and exact session/request/response/package signature binding |
| Valid signature claims another durable session | Parent cross-compares authenticated session evidence with every response-bound observation field |
| Generic connector outcome is mistaken for verified worker execution | Distinct `outbox.record-worker-outcome` command; generic command rejects receipts; replay verifies exact Invocation operation |
| Verified worker history loses transient checks after restart | Closed self-digested receipt reconstructs the protocol response and persists package/session/isolation checks with authenticated command metadata |
| Receipt is moved to another claim or result | Runtime and event replay bind Delivery, claim, attempt, Connector, intent, request window and result digest |
| Public release key is silently replaced | Verification requires the exact SHA-256 pin of the selected public trust descriptor |
| Package signature is mistaken for immutable deployment | Explicit repository-fixture and mutable-bootstrap status; no real connector; immutable deployment storage remains a promotion gate |
| Process separation is mistaken for a sandbox | Process-only mode reports both isolation flags false; exact Darwin-required executions must pass kernel-denial probes |
| Sandbox selection is confused with enforcement | Request binds provider/policy digest; child listen/connect/write-open probes must pass before true flags are accepted |
| Required Darwin policy is bypassed | Test-only direct-launch fault is rejected by the child probes; no outcome is recorded |
| Sandbox launcher or policy drifts | Fixed root-owned non-writable launcher is byte-digested; fixed profile and complete policy are content-addressed |
| Deprecated platform experiment is mistaken for production | Provider and documentation declare deprecated interface, Darwin-only support and `productionReady: false`; real connectors remain blocked |

## Data Classification

- `public` — no organizational confidentiality.
- `internal` — available only inside authorized company scopes.
- `confidential` — available only to the owning department and Chief of Staff.
- `restricted` — rejected by the Level 1 runtime.

The event log is not encrypted. Confidential data is therefore suitable only
for controlled local experimentation on a trusted host.

## Approval Semantics

An approval authorizes one task attempt for one exact action intent until one
specific expiration time.

Approval does not authorize:

- a different target;
- changed parameters;
- a different action type;
- a retry;
- a second execution;
- an A3 or A4 action.

## Safe Failure

Integrity, authorization, classification and approval errors fail closed. The
runtime never downgrades the action or silently continues.

Recognized business failures consume the Invocation and commit typed,
content-minimized failure evidence with any deliberate internal transition.
Integrity and unexpected implementation failures before commit roll back the
whole local transaction and rehydrate state. A finalization failure reloads
visible state and reports confirmed rollback or an uncertain outcome. The
runtime must stop and reopen before a retry decision.

This rollback policy does not authorize external effects. The new Outbox
provides durable intent and uncertainty semantics only; its contracts enforce
dry-run, no network and no external effect.

The separate worker does not expand that authority. A rejected worker result
does not change the Outbox. The claim later becomes eligible only for
Human-Governance reconciliation to uncertainty. Successful Darwin denial
probes still produce only a local digest-only simulation.

## Known Gaps

- the ephemeral Invocation signer does not prove a real human identity;
- public-key bootstrap and host process remain trusted;
- there is no online key revocation or identity-provider federation;
- internal direct-runtime access can bypass the authenticated gateway;
- the transaction covers only local SQLite state, not an external system;
- filesystem access by the host account bypasses runtime read policy;
- no encryption at rest;
- no schema migration, backup/restore or disaster-recovery procedure;
- the synchronous `node:sqlite` API can block the event loop and remains an
  evolving dependency;
- process lease and SQLite are not distributed fencing;
- no distributed transaction, broker or distributed worker fencing;
- local Git and its operating-system account are trusted;
- reference evidence is content-addressed but not independently signed;
- process-only simulation has no OS isolation;
- the optional Darwin profile enforces tested `network*` and `file-write*`
  denials only; it is deprecated, platform-specific and does not restrict
  reads, CPU, memory, process creation, inherited descriptors or every syscall;
- the local denial probes are child observations; the response session signs
  them but does not independently attest the kernel or workload;
- the worker package has a local Ed25519 release attestation and pinned public
  trust-descriptor digest, but both fixture and pin are in the same mutable
  repository and have no protected custody, expiry, revocation or
  transparency service;
- the child bootstrap verifies package and release before evaluating packaged
  modules, but the bootstrap and verifier themselves remain mutable trusted
  host code;
- Node.js VM modules are experimental and provide loading, not isolation;
- caller-provided release configuration does not prove protected external
  custody;
- worker responses are authenticated to fresh bootstrap-created keys, but the
  Node.js executable, built-ins, bootstrap and workload identity are not
  independently signed or attested;
- no secure session-key erasure, host-memory confidentiality, certificate
  chain, revocation or durable network replay ledger exists;
- the durable worker receipt omits the full envelope, public key and
  signature; it is authenticated by the local Connector Invocation and is not
  an independently signed or remotely attested execution proof;
- a compromised parent, host account or Connector signing key can fabricate
  locally consistent receipt assertions;
- no real connector, production outbound allowlist or secret vault;
- no model-level personality, precedence or prompt-injection evaluation;
- Operating Profile digests are not yet bound into model-output evidence;
- no denial-of-service protection;
- no production retention or privacy-deletion process.

These limitations must remain visible in every evidence or readiness claim.
