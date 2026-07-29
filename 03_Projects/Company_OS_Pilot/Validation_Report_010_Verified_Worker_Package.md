# Company OS Pilot — Validation Report 010

Status: Technical Slice 10 Passed / Human Review Pending

Date: 2026-07-29

Validation Level: Level 1 — Experimental

## Outcome

FDOS now builds one deterministic worker package and no longer loads live
worker execution modules from the FDOS development worktree.

The parent verifies the canonical package, complete source artifact, closed
module graph, Ed25519 release and exact public trust-anchor digest before
spawn. A fixed child bootstrap independently repeats those checks before
evaluating the fixed entry point from the verified in-memory module strings.

Worker protocol 1.3 binds package, artifact, release and trust identities
through request, bootstrap observation, response and result digest.

This result proves deterministic packaging, detached signing, trust pinning
and verified-memory module loading on the recorded candidate. It does not
prove immutable deployment storage, protected external key custody,
production isolation or independently authenticated workload identity.

## Acceptance Matrix

| Criterion | Result | Evidence |
|---|---|---|
| Complete automated suite | Passed, 132/132 | `../../04_Evidence/fdos-runtime/EV-FDOS-WORKER-PACKAGE-010.md` |
| Focused artifact/package/process cases | Passed, 22/22 | `test/worker-artifact.test.js`, `test/worker-package.test.js`, `test/process-separated-worker.test.js` |
| Deterministic package rebuild | Passed | rebuilt package and artifact digests equal recorded release |
| Canonical package transport | Passed | one exact JSON record plus optional final LF |
| Complete package contents | Passed | 12 modules / 63,550 source bytes / 71,179 serialized bytes |
| Per-module source digest | Passed | size and SHA-256 reconstructed from exact UTF-8 |
| Complete source artifact digest | Passed | exact source graph identity recorded |
| Complete package digest | Passed | exact canonical package identity recorded |
| Closed reachable import graph | Passed | unapproved built-in import rejected |
| Package path checks | Passed | links, writable file/directory and unstable input rejected |
| Detached signing request | Passed | release API accepts a detached signature, not a private key |
| Canonical Ed25519 signature | Passed | alternate noncanonical encoding of the same 64 bytes rejected |
| Ed25519 package release | Passed | exact package and artifact identities verified |
| Trust-anchor pin | Passed | selected public descriptor must match exact SHA-256 pin |
| Parent preflight | Passed | package, graph, release and pin verified before spawn |
| Bootstrap preflight | Passed | same release independently verified before module evaluation |
| Verified-memory evaluation | Passed | fixed package entry point evaluated without source extraction |
| Protocol package binding | Passed | protocol 1.3 request/response/result equality enforced |
| Changed package content | Rejected | prior attestation no longer matched |
| Changed signature | Rejected | Ed25519 verification failed |
| Changed trust pin | Rejected | descriptor differed from expected anchor |
| Unexpected release field | Rejected | closed schema failed |
| Noncanonical package | Rejected | canonical transport check failed |
| Package symlink | Rejected | no-follow file boundary failed |
| Group-writable package/path | Rejected | permission policy failed |
| Bootstrap trust mismatch fault | Rejected | bootstrap stopped before packaged worker evaluation |
| Request package mismatch fault | Rejected | worker stopped with no accepted response |
| Failure reconciliation | Passed | after expiry, Human Governance moved only to `uncertain` |
| Process-only demo | Passed | verified package, no network, no effect |
| Darwin sandbox demo | Passed | same package plus prior network/write-denial proof |
| Private release key storage | Absent | no private release key in package, release fixture or protocol |
| External key custody | Not established | no HSM, KMS or protected release service connected |
| Immutable deployment | Not established | package and bootstrap remain owner-writable repository files |
| Independent workload trust | Not established | bootstrap observation and response are not independently signed |

## Recorded Release

```text
package id:          worker-package:connector-dry-run
package version:     1.0.0-experimental
package digest:      sha256:046b7dd22fc2454865139fd6951e2ccc7bfba4f1fa497a5831b164c77794fec4
artifact id:         worker:connector-dry-run
artifact version:    2.0.0-experimental
artifact digest:     sha256:b0c0107c2a90919831ab78866eb760e0094f75a34f002c667897e49c516cc59b
modules:             12
source bytes:        63,550
serialized bytes:    71,179
attestation digest:  sha256:ab215bdffa00f974093a6cc4f15534037a90c77543644ceda524d5d58418808c
trust-anchor digest: sha256:78dccc7696bb736ab5135ef8c3fc1745dcd413e5a8640b43cd9e5c68935fe01b
algorithm:           Ed25519
issuer:              issuer:fdos-worker-package-pilot
key:                 key:a189dda72dfdc5905ee62a94
issued:              2026-07-29T16:15:00.000Z
```

The ephemeral private key used to issue this pilot fixture was discarded.
Changing any admitted execution source requires a new package, source artifact
digest, package digest and detached release signature.

## Test Quality

- 132 tests passed.
- 90.77% line coverage.
- 78.85% branch coverage.
- 92.15% function coverage.
- `worker-package-contract.js` reached 95.09% line, 77.78% branch and 100.00%
  function coverage.
- `worker-package-release.js` reached 88.86% line, 63.38% branch and 100.00%
  function coverage.
- `dry-run-worker-package.js` reached 90.76% line, 84.62% branch and 91.67%
  function coverage.
- `dry-run-worker-bootstrap.js` reached 79.13% line, 68.57% branch and 85.71%
  function coverage.
- `process-separated-dry-run-worker.js` reached 87.00% line, 86.08% branch and
  88.89% function coverage.
- `dry-run-worker-protocol.js` reached 92.21% line, 80.21% branch and 100.00%
  function coverage.

The packaged entry-point code executes through virtual VM-module identifiers
and is validated behaviorally by the process and Darwin end-to-end cases; it
does not appear as a separate filesystem row in Node's aggregate coverage
report.

Coverage supports source review. It does not prove VM-module stability,
bootstrap integrity, hostile-host resistance, key custody or production
supply-chain security.

## Verified Flow

```text
fixed source graph
  -> deterministic canonical package build
  -> separate artifact and package digests
  -> detached Ed25519 signature
  -> exact public trust-anchor digest pin
  -> parent package/release preflight
  -> protocol 1.3 request binding
  -> fixed separate verifier bootstrap
  -> bootstrap repeats package/release preflight
  -> verified source strings become in-memory VM modules
  -> fixed package entry point evaluates
  -> exact package observation enters response/result digest
  -> parent verifies clean exit and exact response
  -> authenticated digest-only outcome recording
```

No package source directory is extracted. Later modification of the package
file does not alter module strings already loaded into the child.

## Fault Results

### Bootstrap Release Mismatch

The parent first verified the correct release. It then changed only the
trust-anchor pin in the bounded public release envelope sent to the real
bootstrap.

The bootstrap rejected before evaluating packaged worker modules, emitted no
accepted response and exited non-zero.

### Request Package Mismatch

The parent and bootstrap verified the correct package. The test changed only
the package digest in the exact worker request.

The signed worker code compared the bootstrap observation with the request,
rejected the mismatch and emitted no accepted response.

For both faults, the parent reported `WORKER_EXIT_UNTRUSTED`, did not record an
outcome and retained the active claim. After controlled lease expiry, Human
Governance reconciled the delivery only to `uncertain`.

## Open Findings

1. The package file is deterministic and separately transportable but not
   stored in immutable deployment infrastructure.
2. Package, bootstrap, verifier and pilot trust pin remain owner-writable
   repository files.
3. An actor able to replace the FDOS parent, bootstrap, verifier and trust pin
   can forge the local control boundary.
4. The detached signing interface is HSM/KMS-ready, but no protected external
   signer is connected.
5. Caller-provided release configuration does not prove its own custody or
   provenance.
6. The attestation has no expiry, online revocation, transparency record or
   automated rotation.
7. Node.js VM modules are experimental and are not an isolation mechanism.
8. Node.js executable and built-in module provenance are outside the package.
9. The exact source scanner is not a general JavaScript parser or dependency
   analyzer.
10. The bootstrap observation is local state, not independent workload
    attestation.
11. Worker responses remain unsigned and are accepted through the trusted
    parent process.
12. Process-only mode still provides no OS resource isolation.
13. The optional Darwin sandbox remains deprecated and incomplete.
14. No real API, secret, DNS/TLS path, service idempotency or external effect
    was exercised.
15. No independent CI, security review or Human Governance acceptance exists.

## Decision Request

Human Governance may accept Technical Slice 10 only as Level 1 evidence for:

- deterministic, separately transportable worker packaging;
- exact package, source artifact, release and trust-pin binding;
- detached signing without runtime private-key handling;
- independent parent and bootstrap verification;
- fixed entry-point evaluation from verified in-memory module strings;
- package, path, signature, trust and protocol tamper rejection;
- preservation of durable uncertainty after bootstrap or request mismatch.

Before one real read-only connector, FDOS still needs immutable deployment
storage, externally protected release trust, a supported portable container or
VM boundary, destination allowlisting, read/resource restrictions,
independent workload identity and authenticated responses, secrets controls,
service-specific schemas/idempotency, monitoring and operations.

This report authorizes no model call, networked connector, write,
publication, message, payment, personnel action, deletion, production
operation or FDOS Core promotion.
