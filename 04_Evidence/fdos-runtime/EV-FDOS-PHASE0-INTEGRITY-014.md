# Evidence Record — Release Evidence Phase 0 Integrity Repairs

Status: Evidence Item / Human Review Required

Project: FDOS Release Evidence Alpha

Date: 2026-11-09

Confidence: High for the four local regression boundaries on the recorded
source and environment; Low for production security, hosted isolation,
customer operation or independent external validation

FDOS Validation Level: Level 1 — Experimental

Core Impact: None

## 1. Purpose

Record the reproduction, repair and verification evidence required before the
Release Evidence Alpha may leave Gate G1 and begin its deterministic domain
model.

This evidence covers:

- confidential information transfer through dynamic handoff;
- false Git path/blob associations in caller-controlled snapshots;
- canonical JSON loss of an own `__proto__` property;
- host-size-dependent OCI launcher tests.

It does not implement the Release Evidence product domain or authorize any
external action.

## 2. Evaluated Source

Implementation commit:

```text
d51f8ce837029ab5ae2995e93fdc71ee0ce4ee88
```

Implementation tree:

```text
2c646fd02da92e62788e859a38eda3e6345ffa60
```

The complete 89-file Runtime candidate is bound by:

- manifest:
  `EV-FDOS-PHASE0-INTEGRITY-014_Source_Manifest.sha256`;
- manifest SHA-256:
  `3b963adde863a483ba1392f1f7d0d2c282b2dbcbadaf885646c91244c356d5d6`.

The source commit is separate from this evidence record so the manifest can
bind an already immutable Git tree.

## 3. Recorded Environment

```text
runtime package: @fdos/runtime-reference@0.14.0-experimental
Node.js:         v26.3.1
npm:             11.16.0
SQLite:          3.53.2 through node:sqlite
Git:             2.54.0
macOS:           26.5.1, build 25F80
kernel:          Darwin 25.5.0 arm64
```

`.node-version` pins the Phase 0 validation environment to Node.js 26.3.1.
Compatibility across the wider declared `>=22.13` engine range was not
independently exercised.

The resolved Node executable used by this environment was 68,384 bytes. That
fact explains why the previously reported OCI failures did not occur in the
unmodified local baseline.

## 4. Baseline and Reproduction

At Phase 0 start, before Runtime source changes, the local environment passed
all 153 existing tests. The independent review had reported 144 passes, seven
OCI failures and two intentional exclusions on a host with a much larger Node
executable. The difference was environmental, not evidence that the fixture
was portable.

The three security conditions were then reproduced with dedicated adverse
tests before repair:

### REA-SEC-001 — Cross-department handoff leakage

An Operations agent could read accepted confidential Operations memory, copy a
marker into a dynamic Marketing handoff, declare the new handoff `internal`
and have the runtime accept it. The runtime validated the declared target
sensitivity but carried no trusted source provenance into the new task.

### REA-SEC-002 — False Git path/blob binding

A valid snapshot was changed so the allowlisted `docs/status.md` path pointed
to the blob of `docs/private.md`. The fixture used equal byte lengths and
recomputed the caller-controlled snapshot digest. Structural snapshot
verification accepted the object, and the old read path trusted the false
association.

### REA-SEC-003 — Canonical JSON collision

A null-prototype object containing an own enumerable `__proto__` data property
serialized and digested identically to `{}`. The old normalizer assigned the
property to an ordinary object's prototype instead of retaining it as data.

### REA-TEST-001 — Host-dependent OCI fixture

The seven historical failures were not locally reproducible because the
recorded Node launcher was below the 64 MiB admission limit. Source inspection
confirmed that the test used `process.execPath`, so the test result depended on
the installation size of Node rather than the Docker launcher contract.

## 5. Repairs

### Confidentiality containment

Dynamic free-form handoffs now fail closed when source and target roles belong
to different departments. Direct and multi-hop downgrade attempts are tested.
Same-department bounded handoffs remain available.

Predeclared workflow dependencies remain the only current cross-department
collaboration path. No declassification API exists. A future dynamic
cross-department path requires a task-scoped Context Projection and an
independent Human Governance declassification record before it can be enabled.

This is a deliberately narrow containment repair, not the final Context
Projection implementation planned for G3.

### Trusted Git reconstruction

Before every document read, the adapter now asks trusted local Git for:

- the declared object's `commit` type;
- the commit's exact root tree;
- the repository object format;
- the complete recursive tree manifest.

It recomputes manifest summary fields and digest, then compares each allowed
document's exact path, mode, type, object ID and byte length. A self-consistent
but false caller snapshot no longer authorizes a blob read.

### Canonical JSON v2

The normalizer now uses null-prototype result objects and preserves
`__proto__` as ordinary data. It rejects accessors, non-enumerable or
symbol-keyed properties, sparse or extended arrays, cycles and unsupported
JavaScript values.

Every affected digest and Ed25519 signature consumes:

```text
fdos-canonical-json:2.0\0<canonical JSON bytes>
```

The breaking change advanced Runtime, event-store, event, worker artifact and
worker package versions. Old non-empty stores fail closed. No signature or
history is silently reinterpreted. The migration boundary is documented in
`docs/CANONICAL_JSON_V2_MIGRATION.md`.

### OCI fixture boundary

The launcher identity test now uses a controlled small executable fixture.
Separate boundary coverage proves:

- a 64 MiB executable is admitted when all other local checks pass;
- a 64 MiB plus one byte executable is rejected;
- the production maximum remains unchanged.

## 6. Worker Package Continuity

Canonical JSON v2 changes worker source and release identities. The retained
v3 pilot package records:

```text
package version:     3.0.0-experimental
package digest:      sha256:afc2612336bc34f8c1da817be814f40ed713de8b13ad4380a29cd75c2d343700
artifact version:    4.0.0-experimental
artifact digest:     sha256:5b138ba1405ff1f8d6dd011d24053b97db6a0a37aa083ec49acfd875da12ca2d
attestation digest:  sha256:0a65f68281e452e6dc1fe41a2b77bf2a6b28a1a3c6096bc9642e54b2f95a6c1d
trust-anchor digest: sha256:cc0f819ae182836b859213ab5f660f9f07f18557b42a9169263c83009bc011d1
modules:             13
source bytes:        82,378
serialized bytes:    91,329
package file SHA-256: 8133f57cd16294c3ae8017ed09b94d71acbf3b9a9d9bb0219b17e5396ea84719
```

The ephemeral signing private key was discarded and is not stored in FDOS.
The public descriptor, pin and attestation remain repository-local Level 1
fixtures, not protected production trust.

Two fresh builds were byteidentical to each other and to the retained package.

## 7. Complete Verification

Static checks and complete regression suite:

```text
npm run check
tests:   159
passed:  159
failed:  0
skipped: 0
```

Coverage run:

```text
npm run coverage
tests:   159
passed:  159
failed:  0

line coverage:     91.61%
branch coverage:   79.50%
function coverage: 92.80%
```

Repository formatting verification:

```text
git diff --check
no findings
```

## 8. Gate G1 Evidence Mapping

| Acceptance | Implementation evidence | State |
|---|---|---|
| REA-AC-001 | Direct and multi-hop cross-department downgrade regression | Implemented; review required |
| REA-AC-002 | No declassification path exists; all free-form cross-department handoffs fail closed | Implemented containment; review required |
| REA-AC-003 | Trusted Git reconstruction plus false path/blob substitution rejection | Implemented; review required |
| REA-AC-004 | `__proto__` collision regression and unsupported property-shape rejection | Implemented; review required |
| REA-AC-005 | v2 integrity-domain contract, v1 signature rejection, store-format rejection and migration document | Implemented; review required |
| REA-AC-006 | Controlled launcher plus exact 64 MiB boundary tests | Implemented; review required |
| REA-AC-007 | Complete 159-test suite green in pinned environment | Implemented; review required |

Implementation authors do not mark these items `Accepted`. Gate G1 remains
open until Human Governance or an explicitly independent reviewer accepts the
evidence.

## 9. Limitations and Non-Claims

- The implementation and evidence were produced in the same local operator
  context; no independent security review has occurred.
- Cross-department dynamic collaboration is disabled, not fully modeled.
- Local Git and the operating-system account remain trusted.
- Canonical JSON v2 has no automated production migration tool.
- The SQLite, package and signing boundaries remain experimental.
- No model provider, GitHub App, CI webhook, customer repository or external
  connector is enabled.
- Passing tests do not establish tenant isolation, production identity,
  recovery, availability, regulatory compliance or commercial demand.

## 10. Requested Human Decision

Human Governance should either:

1. accept REA-AC-001 through REA-AC-007 and close Gate G1, authorizing only
   G2 deterministic Release Evidence domain work; or
2. record exact rejected criteria and required changes while G1 remains open.

No G2 implementation authorization is inferred from this evidence record.
