# Evidence Record — Git-Bound Reference Intake and Single-Writer Runtime

Status: Evidence Item / Human Review Required  
Project: FDOS Company OS Pilot  
Date: 2026-07-29  
Confidence: Medium for tested local behavior; Low for production fitness  
FDOS Validation Level: Level 1 — Experimental  
Core Impact: None

## 1. Purpose

Record executable evidence that FDOS can use TapTime and Company AI as
read-only references without copying mutable worktree state, automatically
promoting derived knowledge or allowing two local runtime owners to write the
same event store.

The evaluated FDOS source, tests and runtime documentation are bound by
`EV-FDOS-REFERENCE-INTAKE-002_Source_Manifest.sha256`.

## 2. Reference Binding

### TapTime

- commit: `d63c62de9eced5f7dd62c8c957d4c2fffce77bf9`
- tree: `753feedcae6724e711557e6492bbe26fa0b02083`
- tracked entries: 947
- tracked bytes: 10,943,535
- manifest:
  `sha256:6dec054a3b7b502bf60568ebf551bdb909f2e440b692f439377011f046e1d9d7`
- allowlisted documents verified: 17
- state: tracked clean with two untracked files
- untracked content intake: zero

### Company AI

- commit: `feb1000ea3623972449107e22b9579beea9d95e4`
- tree: `2998a0e19daafd28a24fca2cb61f635517d30b28`
- tracked entries: 97
- tracked bytes: 711,462
- manifest:
  `sha256:0110df868550152b4c9e4e90ff38963deaa9b03decc6b107bd4452770f5f105c`
- allowlisted documents/code files verified: 22
- state: clean

The adapter recorded a SHA-256 evidence object for every allowlisted file. Raw
reference content is not reproduced in this Evidence Record.

## 3. Implemented Controls

### Reference intake

- repository root must be exact;
- Git is invoked without a shell, pager, prompt, replacement objects or
  optional locks;
- HEAD and status are checked before and after snapshot capture;
- the full committed tree is content-addressed;
- document intake uses `git cat-file` against the bound blob object;
- unknown paths, traversal, symlinks, submodules, invalid UTF-8 and byte-limit
  violations fail closed;
- tracked worktree drift blocks intake by default;
- untracked files are counted but never read.

### Knowledge intake

- source evidence is structure- and digest-verified;
- snapshot and evidence schemas reject unexpected fields and mixed Git object
  formats;
- only content-minimized evidence metadata enters a Memory Candidate;
- evidence does not make the candidate readable memory;
- Human Governance must accept or reject the candidate;
- tampered evidence is rejected.

### Runtime ownership

- one exact process lease owns one local runtime directory;
- a second owner is rejected;
- release requires the exact lease identifier;
- an expired lease is reclaimed only when the recorded process is not alive;
- malformed or symlinked lease state fails closed;
- closing the runtime releases ownership;
- mutations after close are rejected.

## 4. Verification

```text
npm run check
tests 63
pass 63
fail 0
skipped 0
```

```text
npm run coverage
line coverage:     89.54%
branch coverage:   77.44%
function coverage: 88.93%
```

Coverage supports implementation review; it is not a production-security
claim.

The complete suite includes:

- eight Git-reference and evidence tests;
- five runtime-lease/ownership tests;
- the original workflow, approval, handoff, memory, audit and rehydration
  regression suite.

Actual reference commands:

```text
node src/cli.js reference-snapshot taptime <read-only-root>
node src/cli.js reference-snapshot company-ai <read-only-root>
```

Both completed without writing either source repository.

During the final read-only stability check, Company AI remained clean. TapTime
still resolved to the bound commit, tree and manifest, but its mutable
worktree had advanced to `tracked-dirty` with four tracked changes and five
untracked file entries. No changed content was ingested. This is expected
concurrent repository activity: the adapter reported the drift and default
document intake is blocked until a new stable source decision is made.

The source manifest is independently checkable from the runtime directory:

```text
shasum -a 256 -c \
  ../../04_Evidence/fdos-runtime/EV-FDOS-REFERENCE-INTAKE-002_Source_Manifest.sha256
```

## 5. Negative Evidence and Limits

This evidence does not prove:

- that local Git or the host account is uncompromised;
- that evidence is signed by an independent identity;
- that an agent's semantic summary faithfully represents source content;
- that ignored or untracked content is safe;
- production actor authentication;
- database transactionality or distributed worker safety;
- encryption, retention, privacy deletion or disaster recovery;
- connector or model-provider security.

The lease reduces concurrent-writer risk for the Level 1 local runtime. It is
not a substitute for a transactional event store.

## 6. Interpretation

Supported conclusion:

> FDOS can bind selected read-only reference material to exact committed Git
> objects, carry content-minimized provenance into a Human-reviewed knowledge
> candidate and prevent two cooperating local runtime processes from owning
> the same event store.

Unsupported conclusions:

- external repository content is automatically organizational truth;
- TapTime or Company AI has been imported into FDOS;
- the runtime is ready for unattended or distributed operation;
- a write connector may be enabled.

## 7. Governance

All implementation and documentation changes are confined to `fdos-genesis`.
TapTime and Company AI remain independent, read-only sources. This record is
project evidence, not Validated Knowledge, production approval or FDOS Core.
