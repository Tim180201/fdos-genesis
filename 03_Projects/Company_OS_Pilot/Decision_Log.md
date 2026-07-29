# Company OS Pilot — Decision Log

Status: Active

## PILOT-DEC-001 — Runtime Location

Date: 2026-07-29  
Decision: Implement only inside `fdos-genesis`, separated into Reference
Implementation and Project layers.  
Rationale: Preserve repository ownership and the FDOS separation policy.

## PILOT-DEC-002 — Internal-Only First Slice

Date: 2026-07-29  
Decision: Implement coordination and governance before model or connector
execution.  
Rationale: Authorization, evidence and failure behavior must exist before
external side effects are introduced.

## PILOT-DEC-003 — Event-Sourced Audit

Date: 2026-07-29  
Decision: Persist material transitions in an append-only SHA-256 hash chain.  
Rationale: A normal mutable log cannot demonstrate whether historical events
were changed.

## PILOT-DEC-004 — Approval Binding

Date: 2026-07-29  
Decision: Bind A2 approval to the complete canonical action intent and consume
it once.  
Rationale: Approval of a task label alone can be replayed after the target or
parameters change.

## PILOT-DEC-005 — A3/A4 Fail Closed

Date: 2026-07-29  
Decision: Block material external and destructive actions in Level 1, even
when a human asks the local runtime to approve them.  
Rationale: Production identity, connector isolation and operational controls do
not yet exist.

## PILOT-DEC-006 — Role Definition versus Agent Instance

Date: 2026-07-29  
Decision: Assign tasks and permissions to stable Role Definitions while
attributing claims, results and events to registered Agent Instances.  
Rationale: A role describes organizational responsibility. An agent instance is
a replaceable and revocable runtime identity. Conflating them would prevent
safe multi-instance operation and weaken auditability.

## PILOT-DEC-007 — Exact Git Reference Binding

Date: 2026-07-29  
Decision: Read an approved external repository only through a fixed source
policy and bind commit, tree, complete tracked manifest and exact document
blob.  
Rationale: A path allowlist alone cannot prove which mutable worktree state
produced a later knowledge claim.

## PILOT-DEC-008 — Reference Knowledge Remains a Candidate

Date: 2026-07-29  
Decision: A valid source-evidence digest may accompany a Memory Candidate but
may never promote it automatically.  
Rationale: Byte integrity proves provenance, not semantic correctness,
authority, scope or current validity.

## PILOT-DEC-009 — Exclusive Local Runtime Ownership

Date: 2026-07-29  
Decision: One process lease owns one Level 1 event-store directory. A second
runtime must fail closed.  
Rationale: In-process serialization cannot prevent two processes from
rehydrating the same head and appending competing event sequences.

## PILOT-DEC-010 — Selective Reference Adoption

Date: 2026-07-29  
Decision: Reuse Company AI runtime controls and TapTime evidence/governance
patterns selectively; do not copy either repository wholesale.  
Rationale: FDOS needs reusable organizational controls, not product-specific
code, duplicated ADO or premature connectors.

## PILOT-DEC-011 — Authenticated Gateway Before Integrations

Date: 2026-07-29

Decision: Models, connectors and other untrusted callers may access the
experimental runtime only through an authenticated command gateway.

Rationale: Giving an integration the lower-level runtime object would allow it
to submit caller-asserted actor identities and bypass the new trust boundary.

## PILOT-DEC-012 — Identity Without Role Claims

Date: 2026-07-29

Decision: A signed agent principal binds only the Agent Instance identifier.
FDOS derives the role and lifecycle status from the Agent Registry.

Rationale: Cryptographically signing a caller-selected role would authenticate
the claim's origin but would not prove that the principal currently owns that
role.

## PILOT-DEC-013 — Persistent One-Time Invocation

Date: 2026-07-29

Decision: Consume a verified Invocation ID in the event log before dispatch
and reject its reuse after success, failure, concurrency or restart.

Rationale: In-memory replay caches disappear on restart and consuming only
after success permits duplicate execution after an uncertain outcome.

## PILOT-DEC-014 — Local Signer Is Test Infrastructure

Date: 2026-07-29

Decision: Use an ephemeral Ed25519 signer only for the local experiment and
give the runtime verifier public trust material only.

Rationale: This proves signature and claim enforcement without pretending that
local key generation authenticates a production human or workload.

## PILOT-DEC-015 — One Local Transaction per Authenticated Command

Date: 2026-07-29

Decision: Persist Invocation acceptance and every resulting internal command
event in one SQLite transaction with a shared transaction ID.

Rationale: Replay prevention and business state must not diverge when the
process stops between acceptance and internal command persistence.

## PILOT-DEC-016 — Typed Failure Semantics

Date: 2026-07-29

Decision: A recognized post-acceptance business failure consumes the
Invocation and commits deliberate internal transitions plus content-minimized
failure evidence. Integrity and unexpected pre-commit failures roll the whole
local transaction back. A finalization failure reports confirmed rollback or
an uncertain outcome and requires a clean reopen.

Rationale: Approval expiry must remain durable when a late decision is denied,
while implementation faults must not leave partial internal state.

This distinction is authorized only while external effects remain disabled.

## PILOT-DEC-017 — No Implicit Persistence Migration

Date: 2026-07-29

Decision: Detect the sole non-empty JSONL or SQLite format when explicitly
requested, but reject format switches and dual non-empty stores. Provide no
automatic migration in this slice.

Rationale: Silent conversion would make source, target, rollback and evidence
state ambiguous.

## PILOT-DEC-018 — Node SQLite Remains an Experimental Dependency

Date: 2026-07-29

Decision: Use synchronous built-in `node:sqlite` for the bounded Level 1
adapter, require Node.js 22.13 or newer and record the exact tested runtime
version.

Rationale: It avoids an added package supply-chain dependency and provides the
needed local transaction primitive, but its evolving stability and blocking
API prevent any production-support claim.

## PILOT-DEC-019 — Contract and Outbox Before Connector

Date: 2026-07-29

Decision: Prepare future external work only through a content-addressed
Connector Contract, immutable Delivery Intent and durable Outbox.

Rationale: A generic tool call cannot prove which task, authority, target,
parameters or connector contract produced an external request.

## PILOT-DEC-020 — Dry-Run Connector Principal

Date: 2026-07-29

Decision: Admit a registered Connector Instance only for claim and outcome
commands while contracts enforce no network and no external effect.

Rationale: A worker needs an attributable identity and narrow fencing surface,
not agent, task, memory or audit authority.

## PILOT-DEC-021 — Uncertainty Never Auto-Retries

Date: 2026-07-29

Decision: Claim expiry or ambiguous worker outcome enters durable
`uncertain`. Only Human Governance may resolve it; no automatic retry is
permitted.

Rationale: A local missing acknowledgement cannot distinguish lost work from a
completed external operation. Automatic retry would risk duplicate effects in
a future real adapter.

## PILOT-DEC-022 — Personality Is Not Authority

Date: 2026-07-29

Decision: Model personality as a separate non-authoritative profile below
constitutions, role, task policy and Human Governance.

Rationale: Mixing persona and authority would let stylistic configuration
change permissions, evidence standards or approval behavior.

## PILOT-DEC-023 — Closed Personality Schema

Date: 2026-07-29

Decision: Permit only versioned content-addressed traits and bounded style
enums. Reject arbitrary instructions, system prompts and authority-bearing
fields.

Rationale: A free-form persona is an unbounded instruction and prompt-injection
surface whose meaning cannot be reviewed mechanically.

## PILOT-DEC-024 — Authenticated Self-Profile Only

Date: 2026-07-29

Decision: Let an active Agent Instance resolve only its own server-bound
Operating Profile through an exact signed command with no target-agent field.

Rationale: The future model context needs an exact profile, while cross-agent
inspection is unrelated authority and should remain an administrative concern.

## PILOT-DEC-025 — Separate Connector Simulation Process

Date: 2026-07-29

Decision: Run the bounded connector simulation in a separate child process
that receives only one exact claimed Delivery Intent through a closed
standard-I/O protocol.

Rationale: The worker should not share the controller's runtime object,
database handle or signing key, and its lifecycle must be testable before any
real connector is considered.

## PILOT-DEC-026 — Clean Exit Is Part of Acknowledgement

Date: 2026-07-29

Decision: Accept a worker response only after exact digest verification, empty
standard error and normal process exit code zero.

Rationale: A valid-looking response followed by a crash is an ambiguous
acknowledgement, not evidence of successful completion.

## PILOT-DEC-027 — Process Separation Is Not a Sandbox

Date: 2026-07-29

Decision: Report `networkIsolationEnforced: false` for process separation
alone, until an OS, container or infrastructure control actually denies the
operation claimed for that execution.

Rationale: A separate process under the same host account reduces authority
sharing but does not itself prevent network, filesystem or resource access.

ADR-0049 and PILOT-DEC-028 later permit positive flags only for the narrower
Darwin-required execution after exact runtime denial probes.

## PILOT-DEC-028 — Enforcement Requires Runtime Denial Proof

Date: 2026-07-29

Decision: Report network or filesystem-write isolation as enforced only when
the child observes the fixed denied listen, connect and write-open operations
and binds those probes to the exact request provider and policy digest.

Rationale: A selected launch mode, environment value or parent assertion does
not prove that the operating system actually applied the policy.

## PILOT-DEC-029 — Deprecated Darwin Provider Is Disposable Evidence

Date: 2026-07-29

Decision: Admit the fixed `/usr/bin/sandbox-exec` adapter only as an optional,
Darwin-only Level 1 provider that declares deprecation and fails closed with
no process-only fallback.

Rationale: The local interface can test the isolation contract now, but its
deprecated status and platform dependency make it unsuitable as the
production architecture.

## PILOT-DEC-030 — Deny Network and Writes Without Claiming Full Sandbox

Date: 2026-07-29

Decision: Bind the exact profile denying `network*` and `file-write*`, while
explicitly excluding filesystem reads, CPU, memory, process creation,
inherited descriptors and general syscall isolation from the claim.

Rationale: Security evidence must describe the implemented policy narrowly;
overstating one profile would recreate the process-separation ambiguity that
ADR-0048 prevented.

## PILOT-DEC-031 — Sandbox Failure Reuses Durable Uncertainty

Date: 2026-07-29

Decision: Missing, false, tampered or bypassed sandbox proof records no
outcome. The delivery remains claimed and can move after expiry only to
Human-Governance-controlled uncertainty.

Rationale: Isolation failure must never be converted into success, automatic
retry or widened authority.

## PILOT-DEC-032 — Closed Source Graph Before Worker Spawn

Date: 2026-07-29

Decision: Reconstruct one fixed, reachable and content-addressed worker source
graph before every process launch, rejecting unsafe paths, permissions,
unstable reads and undeclared loading.

Rationale: A fixed entry-point path does not prove which transitive source
bytes will participate in execution.

## PILOT-DEC-033 — Local Release Attestation Binds Exact Source Bytes

Date: 2026-07-29

Decision: Require an Ed25519 release attestation for the exact canonical
worker artifact, configure only its public trust descriptor and omit the
generated private key from FDOS and the child protocol.

Rationale: Content addressing detects difference but does not state which
artifact the local experiment admits as its release.

## PILOT-DEC-034 — Parent Verification and Child Digest Observation Are Distinct

Date: 2026-07-29

Decision: Let the parent verify release trust before spawn, bind that release
in protocol 1.2 and require the child to report only an exact local digest
match. Do not describe the child as independently verifying the signer.

Rationale: Accurate evidence must distinguish release authorization from the
source state observed in the launched process.

## PILOT-DEC-035 — Signed Mutable Source Is Not Immutable Deployment

Date: 2026-07-29

Decision: Keep immutable packaging, atomic deployment, protected trust,
workload identity and same-account race protection open as separate promotion
gates.

Rationale: A signature over a development worktree detects drift but neither
locks the source across launch nor protects a repository-local trust anchor
from an actor already able to replace the repository.

## PILOT-DEC-036 — Live Worker Executes from a Canonical Package

Date: 2026-07-29

Decision: Stop importing live worker execution modules from the FDOS
development worktree. Build one canonical package containing the exact
admitted UTF-8 module strings and bind source artifact and complete package
with separate SHA-256 identities.

Rationale: A signed source manifest still allowed modules to execute before
the child measured them. Separate packaging creates a transport and execution
identity independent of mutable source paths.

## PILOT-DEC-037 — Release Signing Is Detached from Private-Key Handling

Date: 2026-07-29

Decision: Produce an exact unsigned package-attestation request and accept
only a detached Ed25519 signature. Do not expose a runtime API that accepts,
generates or stores the release private key.

Rationale: A future HSM, KMS or offline release service must be able to own key
custody without sharing private material with FDOS.

## PILOT-DEC-038 — Public Trust Requires an Exact Anchor Pin

Date: 2026-07-29

Decision: Require the SHA-256 digest of the selected public trust descriptor
in addition to issuer, key ID and signature verification.

Rationale: Replacing a repository trust descriptor must not silently redefine
which public key is trusted when deployment-controlled state can provide an
independent pin.

## PILOT-DEC-039 — Bootstrap Verifies Before Packaged Code Evaluates

Date: 2026-07-29

Decision: Let the parent verify the package before spawn, then require a fixed
child bootstrap to independently repeat package, graph, release and trust-pin
verification before evaluating the fixed entry point from the verified
in-memory module strings.

Rationale: This removes live execution-module reads from the worktree and
closes the post-load source observation gap for admitted package bytes.

## PILOT-DEC-040 — Verified Package Is Not Immutable Deployment

Date: 2026-07-29

Decision: Report package verification and in-memory evaluation exactly, while
keeping immutable storage, protected release custody, supported runtime
isolation, bootstrap integrity and workload identity as separate promotion
gates.

Rationale: Repository packaging materially narrows the execution race, but a
mutable host can still replace the parent, bootstrap, verifier and pilot trust
pin together.

## PILOT-DEC-041 — Every Worker Launch Gets a Fresh Parent Challenge

Date: 2026-07-29

Decision: Generate one cryptographically random 32-byte challenge for every
worker launch and bind its canonical base64url value into protocol 1.4.

Rationale: A response must not be portable to another launch merely because
the package and connector request shape are similar.

## PILOT-DEC-042 — Bootstrap Owns One Ephemeral Response Key

Date: 2026-07-29

Decision: Generate a fresh Ed25519 key pair only after bootstrap package
verification, retain its private key in a one-use child-process closure and
expose only the public session descriptor plus signing function to packaged
code.

Rationale: Response authentication should not require a serialized private
key or reuse the parent Invocation or package-release signing authority.

## PILOT-DEC-043 — Sign Session, Request and Response Digests Together

Date: 2026-07-29

Decision: Emit one canonical authenticated envelope whose Ed25519 statement
binds the complete session digest, exact request digest and exact response
digest.

Rationale: Authenticating only response bytes would leave challenge, package
or request-context confusion as separate unsigned assumptions.

## PILOT-DEC-044 — Durable Result Cross-Binds Minimized Session Identity

Date: 2026-07-29

Decision: Include key, session, challenge and package-binding digests in the
response/result boundary and require the parent to compare them with evidence
derived from the authenticated full session.

Rationale: A valid signature for one session must not authorize a durable
result that claims another session while raw public-key material remains
outside the long-term evidence projection.

## PILOT-DEC-045 — Ephemeral Session Authentication Is Not Workload Attestation

Date: 2026-07-29

Decision: Report `externallyAttested: false` and keep immutable bootstrap
provenance, external workload identity, secure key erasure, revocation and
network replay state as separate promotion gates.

Rationale: The mutable bootstrap self-issues the launch key. Possession of
that key authenticates one local response but does not prove which immutable
workload or infrastructure identity created it.

## PILOT-DEC-046 — Retain a Minimized Verified Worker Receipt

Date: 2026-07-29

Decision: After every accepted process-worker clean exit, retain one closed
self-digested receipt binding request, response, package, session, isolation
and parent-verification evidence without raw parameters, challenge, public key
or signature.

Rationale: A result digest alone cannot explain after restart which transient
verification gates passed, while retaining the full envelope would expand the
general audit data surface unnecessarily.

## PILOT-DEC-047 — Separate Generic and Verified Worker Outcomes

Date: 2026-07-29

Decision: Admit receipts only through the distinct signed
`outbox.record-worker-outcome` operation. Keep the generic outcome command,
but reject any receipt field on it.

Rationale: A typed Connector outcome must not silently acquire the stronger
meaning of a locally verified process-worker execution.

## PILOT-DEC-048 — Reconstruct the Protocol Response from the Receipt

Date: 2026-07-29

Decision: Retain every minimized field required to rebuild the exact unsigned
protocol 1.4 response and require its SHA-256 digest to match during initial
admission and event replay.

Rationale: A self-digest alone detects mutation but does not prove that the
receipt's separate package, session and isolation claims describe the response
whose digest was accepted.

## PILOT-DEC-049 — Receipt Authentication Is Local, Not Independent

Date: 2026-07-29

Decision: Bind the receipt to the exact authenticated Connector Invocation and
hash-chained transaction while explicitly withholding any independently
signed workload- or audit-proof claim.

Rationale: The full workload envelope is omitted and the mutable local parent
constructs the receipt. Connector command authentication improves attribution
and replay integrity but cannot replace external workload identity or
independent attestation.
