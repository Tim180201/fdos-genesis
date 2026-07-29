# Read-Only Reference Intake

Status: Experimental Design  
Validation Level: Level 1  
External Writes: Prohibited

## Purpose

Allow FDOS to learn from explicitly approved repositories without treating a
mutable worktree, an untracked file or an unreviewed summary as organizational
truth.

## Boundary

The intake adapter:

1. resolves the configured repository root;
2. invokes only local, read-only Git commands without a shell;
3. binds the exact commit and tree;
4. inventories every tracked entry and creates one manifest digest;
5. checks HEAD and worktree status before and after capture;
6. exposes only metadata for explicitly allowlisted documents;
7. reads an allowed document from its immutable Git blob, never from the
   mutable worktree;
8. rejects symlinks, submodules, traversal, oversized content and invalid
   UTF-8;
9. excludes every untracked file from content intake;
10. creates content-minimized document evidence;
11. rejects digest-valid snapshots or evidence objects with unexpected fields
    or inconsistent Git object formats.

The adapter performs no network request and writes nothing to a reference
repository.

## Source States

| State | Meaning | Default document intake |
|---|---|---|
| `clean` | tracked and untracked state is empty | allowed |
| `tracked-clean-with-untracked` | committed tree is clean; untracked files exist | allowed from Git objects; untracked content excluded |
| `tracked-dirty` | at least one tracked path differs from HEAD | blocked |

A caller may explicitly read the already-bound commit while the worktree is
dirty. That is a commit read, not a statement about the current worktree, and
must be reported as such.

## Knowledge Boundary

Reading evidence does not update company or department memory.

An agent may propose a Memory Candidate with one or more verified
`git-reference-document` bindings. The runtime stores only source metadata and
digests with the candidate. Human Governance must still:

- assess whether the derived statement is faithful to the source;
- decide its scope and sensitivity;
- accept or reject the candidate.

A valid digest proves integrity of the recorded evidence object. It does not
prove that a summary is semantically correct or that the source itself is
authoritative.

## Pilot Policies

The Level 1 pilot defines two source policies in
`src/pilot/reference-sources.js`:

- `taptime`
- `company-ai`

Each policy has a fixed document/code allowlist and byte limit. The repository
root is supplied at runtime and is never embedded in durable evidence.

## CLI

```bash
node src/cli.js reference-snapshot taptime /absolute/path/to/taptime
node src/cli.js reference-snapshot company-ai /absolute/path/to/company-ai-platform
```

The command prints content-minimized JSON. It does not print allowed document
content and does not persist the snapshot.

## Known Limits

- Local Git and the operating-system account are trusted.
- Evidence objects are content-addressed, not signed by an independent trust
  service.
- A manifest binds committed Git objects; it does not inspect ignored or
  untracked content.
- Semantic conflicts between documents require human or agent analysis.
- Production intake needs authenticated source registration, retention rules,
  malware/content controls and an independent evidence store.
