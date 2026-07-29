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
- one process holding the exact runtime-directory lease;
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
| Agent claims another role | Signed ID only; Agent Registry derives the immutable role assignment |
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
| Source evidence becomes memory automatically | Candidate state plus Human Governance review |

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

## Known Gaps

- the ephemeral local signer does not prove a real human or workload identity;
- public-key bootstrap and host process remain trusted;
- there is no online key revocation or identity-provider federation;
- internal direct-runtime access can bypass the authenticated gateway;
- invocation acceptance and command execution are not one transaction;
- filesystem access by the host account bypasses runtime read policy;
- no encryption at rest;
- process lease is not a transactional or distributed event store;
- no distributed transaction or queue;
- local Git and its operating-system account are trusted;
- reference evidence is content-addressed but not independently signed;
- no connector sandbox;
- no denial-of-service protection;
- no production retention or privacy-deletion process.

These limitations must remain visible in every evidence or readiness claim.
