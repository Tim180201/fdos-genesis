# Company OS Pilot — Reference Adoption Assessment

Status: Completed Technical Assessment / Human Review Pending  
Date: 2026-07-29  
Scope: TapTime and Company AI as read-only references  
Implementation Repository: `fdos-genesis` only

## Decision Summary

FDOS should reuse selected patterns from both projects, but should not copy
either system wholesale.

Company AI is the stronger runtime reference. TapTime is the stronger
engineering-governance and high-assurance evidence reference. FDOS should own
the reusable control plane and keep product-specific behavior in its product
repository.

## Exact Reference Baselines

| Source | Commit | Tree | Tracked entries | Manifest digest | Worktree at capture |
|---|---|---|---:|---|---|
| TapTime | `d63c62de9eced5f7dd62c8c957d4c2fffce77bf9` | `753feedcae6724e711557e6492bbe26fa0b02083` | 947 | `sha256:6dec054a3b7b502bf60568ebf551bdb909f2e440b692f439377011f046e1d9d7` | tracked clean; two untracked files excluded |
| Company AI | `feb1000ea3623972449107e22b9579beea9d95e4` | `2998a0e19daafd28a24fca2cb61f635517d30b28` | 97 | `sha256:0110df868550152b4c9e4e90ff38963deaa9b03decc6b107bd4452770f5f105c` | clean |

The TapTime baseline advanced once during the assessment. FDOS detected the
change and rebound the assessment to the later stable commit. This is direct
evidence for KP-002: repository reality must be checked, not assumed.

## Assessment Method

- Both repositories were accessed read-only.
- Git status, HEAD, tree, branch, history, complete tracked inventory, size and
  directory/language distribution were examined.
- Every tracked entry was bound through the exact Git tree manifest.
- All 17 TapTime and 22 Company AI files in the FDOS intake allowlists were
  read from their committed Git blobs and received SHA-256 evidence.
- Source exports, workspace boundaries, database objects, test suites and
  documentation headings were inventoried across both repositories.
- Representative implementation and adversarial tests were reviewed in
  detail for each adopted control.
- TapTime's untracked `app.json` and `research/` content was not ingested.
- No build, test, install, formatter, Git mutation or product action was
  executed in either reference repository.

## What Company AI Contributes

### Adopted now

- explicit read-only source allowlists;
- automation disabled by default;
- exclusive work-run ownership;
- bounded handoff depth and count;
- human review after uncertain external delivery;
- separation of Teams ingress from agent execution;
- cost and usage preflight as a future connector requirement;
- PostgreSQL worker leases and transactional claims as the Level 2 target.

FDOS strengthened the first two runtime-relevant patterns:

- reference content is read from an exact Git object rather than a mutable
  filesystem path;
- the runtime lease binds the entire Level 1 event store, not only one queue
  command.

### Already represented in FDOS

- A0–A4 action classes;
- role-scoped memory;
- bounded handoffs;
- human-reviewed knowledge;
- idempotent task creation;
- explicit external-action boundaries.

### Deferred

- OpenAI/model-provider calls;
- Teams ingress and delivery;
- scheduler and notification outbox;
- PostgreSQL activation and JSONL migration;
- envelope encryption and key rotation;
- Azure/container deployment.

These are useful references, but enabling them before authenticated identities,
connector isolation and a reviewed transactional store would expand authority
faster than evidence.

### Not copied

- the direct worktree excerpt reader;
- caller-asserted runtime identity as a production identity model;
- unhashed JSONL audit as the final audit architecture;
- customer- or TapTime-specific prompts and routing;
- cloud configuration without a separately approved environment design.

## What TapTime Contributes

### Adopted now

- exact commit/tree/artifact evidence binding;
- stable-source verification before use;
- a separate Artifact Validation Register;
- risk-adaptive verification with explicit omitted-check rationale;
- fail-closed handling of ambiguous evidence;
- role and agent-instance separation;
- findings and risks require an explicit disposition;
- repository truth outranks stale summary documents;
- implementation, review and human acceptance are different gates.

### Applied to the pilot

- `Change_Impact_and_Verification_Profile.md` records R0–R3 and V0–V5
  selection without changing FDOS Core validation levels.
- `Artifact_Validation_Register.md` separates “implemented/tested” from
  “human reviewed” and “Core standard”.
- Git reference snapshots bind exact source reality.
- source-backed learning still enters memory as a Human-reviewed candidate.

### Deferred

- product-specific tenant, NFC, offline, mobile, PostgreSQL and physical-device
  controls;
- exact-head CI and independent review automation;
- deployment, production, legal and physical V5 gates.

### Not copied

- the full TapTime ADO hierarchy;
- product-specific authorization packages and runbooks;
- historical evidence narratives unrelated to FDOS runtime risks;
- duplicate Core terminology or new canonical FDOS objects.

The reusable lesson is the evidence discipline, not the product's document
volume.

## Resulting FDOS Architecture Direction

```text
Reference Repository
  -> exact Git snapshot and allowlist
  -> content-minimized source evidence
  -> agent-derived Memory Candidate
  -> Human Governance review
  -> scoped organizational memory

Runtime Store
  -> one exclusive Level 1 process owner
  -> local SQLite command transaction
  -> verified event-chain and transaction rehydration
  -> durable dry-run Outbox with serialized local claim fencing
  -> process-separated local simulation with exact acknowledgement
  -> Darwin-only network/write-denial learning adapter
  -> signed closed mutable worker source artifact
  -> deterministic signed worker package with verified-memory evaluation
  -> ephemeral challenge-bound authenticated worker response
  -> future immutable deployment, external workload identity, portable
     sandbox and distributed fencing
```

## Recommended Next Build Order

1. Human-review the authenticated-invocation, transactional-persistence,
   Connector Outbox, personality, process-worker and Darwin-sandbox evidence
   plus the signed-worker-artifact, verified-worker-package and authenticated-
   workload-session evidence, with all remaining identity, storage, model,
   release and isolation limits.
2. Replace the deprecated learning adapter with a supported portable sandbox;
   add outbound allowlisting, read/resource restrictions, externally rooted
   workload identity, immutable worker deployment, protected release trust
   and secrets controls.
3. Validate one authenticated read-only GitHub or document connector in that
   sandbox.
4. Add a model-provider adapter with budgets and structured response contracts.
5. Only then pilot Teams or Slack ingress; outbound actions remain separately
   approved.

## Governance

This assessment authorizes no work in TapTime or Company AI and no external
connector. It is project evidence for the FDOS Level 1 experiment. Adoption
into FDOS Core still requires the normal validation progression and Human
Governance.
