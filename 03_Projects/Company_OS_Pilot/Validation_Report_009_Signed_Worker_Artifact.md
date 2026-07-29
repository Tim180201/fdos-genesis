# Company OS Pilot — Validation Report 009

Status: Technical Slice 9 Passed / Human Review Pending

Date: 2026-07-29

Validation Level: Level 1 — Experimental

## Outcome

FDOS now reconstructs one exact closed worker source graph and verifies a
repository-local Ed25519 release attestation before every process-only or
Darwin-sandboxed dry-run worker launch.

Worker protocol 1.2 binds the exact artifact and release identity. The child
reconstructs its local source artifact and may respond only when its digest
matches that request. The observation is bound into the response and
digest-only result.

This result proves deterministic source inspection, local signature
verification and parent/child artifact binding on the recorded candidate. It
does not prove immutable packaging, protected release infrastructure,
same-account race resistance or independent workload identity.

## Acceptance Matrix

| Criterion | Result | Evidence |
|---|---|---|
| Complete automated suite | Passed, 125/125 | `../../04_Evidence/fdos-runtime/EV-FDOS-WORKER-ARTIFACT-009.md` |
| Focused artifact/process-worker cases | Passed, 15/15 | `test/worker-artifact.test.js`, `test/process-separated-worker.test.js` |
| Fixed artifact identity and entry point | Passed | exact ID, version and source path verified |
| Complete source policy | Passed | 12 files / 84,546 bytes |
| Closed reachable import graph | Passed | every listed source reachable; unlisted import rejected |
| Directory and file trust checks | Passed | symlink, group/world-write and invalid source fail closed |
| Stable descriptor reads | Passed | file metadata bound before/after complete read |
| Per-file and complete SHA-256 | Passed | exact artifact digest recorded |
| Ed25519 release verification | Passed | exact local issuer, key and signature |
| Release private key storage | Absent | no private key in artifact, protocol or repository |
| Changed source bytes | Rejected | old attestation no longer matched |
| Changed signature | Rejected | Ed25519 verification failed |
| Foreign trust key | Rejected | signing key not trusted |
| Unexpected attestation field | Rejected | closed schema failed |
| Undeclared import | Rejected | graph policy failed |
| Source symlink | Rejected | descriptor open/path trust failed |
| Group-writable source | Rejected | permission policy failed |
| Protocol release binding | Passed | request/response/result equality enforced |
| Deliberate child binding mismatch | Rejected | child exited non-zero; no outcome |
| Failure reconciliation | Passed | after expiry, Human Governance moved only to `uncertain` |
| Process-only demo | Passed | signed source and local digest match reported |
| Darwin sandbox demo | Passed | same source identity plus prior denial proof |
| No external effect | Passed | no service adapter; `externalEffect: none` |
| Immutable deployment | Not established | development source remains owner-writable |
| Independent workload trust | Not established | local child and response are not independently authenticated |

## Recorded Artifact

```text
artifact id:        worker:connector-dry-run
artifact version:   1.0.0-experimental
entry point:        src/workers/dry-run-connector-worker.js
source files:       12
source bytes:       84546
artifact digest:    sha256:b1a6b08b65cdbb7042675633f356f0a092ca9227dddd17d79fb4121052234bc9
attestation digest: sha256:66ff84c603f7ea5ee0c1179560d9615a83faadb964f7f1982376f6c3f74eb97e
algorithm:          Ed25519
issuer:             issuer:fdos-worker-release-local
key:                key:3ad79fe92da3585ad472c6c6
issued:             2026-07-29T14:00:00.000Z
```

The private key used to issue this local experimental release was not stored.
A source change requires a newly governed attestation.

## Test Quality

- 125 tests passed.
- 90.26% line coverage.
- 79.04% branch coverage.
- 90.82% function coverage.
- `worker-artifact-attestation.js` reached 90.00% line, 69.88% branch and
  100.00% function coverage.
- `dry-run-worker-artifact.js` reached 88.32% line, 84.52% branch and 92.86%
  function coverage.
- `process-separated-dry-run-worker.js` reached 86.19% line, 87.14% branch and
  88.89% function coverage.
- `dry-run-worker-protocol.js` reached 91.92% line, 80.81% branch and 100.00%
  function coverage.
- the child entry point reached 55.68% line, 36.36% branch and 50.00% function
  coverage.

Coverage supports source review. It does not prove parser completeness,
race resistance, key custody or production supply-chain security.

## Verified Flow

```text
authenticated Connector claim
  -> inspect fixed runtime/source directories
  -> open and hash every fixed source
  -> verify closed reachable import graph
  -> reconstruct canonical artifact digest
  -> verify exact Ed25519 release attestation
  -> bind release in protocol 1.2 request
  -> launch separate no-effect worker
  -> child reconstructs local source artifact
  -> child binds local digest match into response
  -> parent verifies exact response and clean exit
  -> authenticated digest-only outcome recording
```

The same artifact preflight applies to the process-only and optional
Darwin-required launch. It does not change either isolation claim.

## Fault Result

The `artifact-binding-mismatch` test first verified the real release, then
changed only the artifact digest placed in the exact request. The real child
reconstructed its local artifact, observed the mismatch, emitted no accepted
response and exited non-zero.

The parent reported `WORKER_EXIT_UNTRUSTED`, stored no raw response or error
content and did not mutate the Outbox. After controlled lease expiry, Human
Governance reconciled the delivery only to `uncertain`.

## Open Findings

1. The signed artifact is a mutable source manifest, not immutable packaging.
2. Source is owner-writable in the development tree.
3. The repository-local trust descriptor and attestation can be replaced by
   an actor already able to rewrite the repository.
4. There is no HSM, vault, protected build signer or independent release
   service.
5. The attestation has no expiry, online revocation or transparency record.
6. Parent inspection and child loading are not one atomic filesystem action.
7. JavaScript modules load before child code performs its local observation.
8. A malicious same-account actor or modified worker may defeat the
   post-load observation.
9. The static import scanner is a conservative policy for the fixed graph,
   not a general JavaScript parser or package analyzer.
10. Node.js executable and built-in modules are outside the artifact.
11. The child does not independently authenticate the parent or verify the
    release signature.
12. The worker response and workload identity are not independently signed or
    attested.
13. No real API, secret, DNS/TLS path, service idempotency or external effect
    was exercised.
14. No independent CI, security review or Human Governance acceptance exists.

## Decision Request

Human Governance may accept Technical Slice 9 only as Level 1 evidence for:

- deterministic closed-source artifact reconstruction;
- local Ed25519 release verification before launch;
- exact parent/request/child/response/result artifact binding;
- common path, source, graph, signature and trust tamper rejection;
- preservation of durable uncertainty after artifact mismatch.

Before one real read-only connector, FDOS still needs immutable packaging and
atomic deployment, externally protected release trust, supported portable
isolation, destination allowlisting, filesystem-read/resource restrictions,
independent workload identity and signed responses, secrets controls,
service-specific schemas/idempotency, monitoring and operations.

This report authorizes no model call, networked connector, write,
publication, message, payment, personnel action, deletion, production
operation or FDOS Core promotion.
