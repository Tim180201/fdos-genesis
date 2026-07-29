# Signed Worker Source Artifact

Status: Experimental Local Release Boundary

Validation Level: Level 1

Production Status: Not Production Ready

Related Decision:

- `../../../00_Specification/ADR/ADR-0050_Signed_Worker_Source_Artifact_Experiment.md`

## Purpose

Replace trust in one mutable worker path with a reproducible, signed identity
for the complete source graph used by the no-effect connector worker.

This control detects local release drift and binds the verified source identity
through parent, request, child observation, response and result. It does not
make the source immutable or establish an independent workload.

## Verified Chain

```text
fixed source policy
  -> trusted directories and stable file-descriptor reads
  -> closed reachable import graph
  -> per-file SHA-256 records
  -> canonical artifact digest
  -> Ed25519 release attestation + configured public trust
  -> exact worker-request release binding
  -> separate child reconstructs local artifact
  -> local digest match enters response and result digest
  -> parent accepts only exact response + clean exit
```

## Recorded Pilot Release

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

The public key and signed attestation are in
`src/pilot/dry-run-worker-release.js`. The generated private key is not stored
in FDOS. Any admitted source change requires a new local release attestation.

## Fixed Source Policy

`DRY_RUN_WORKER_ARTIFACT_FILES` lists the complete admitted graph:

```text
src/domain/action-catalog.js
src/domain/action-intent.js
src/domain/delivery-intent.js
src/domain/network-isolation-contract.js
src/domain/worker-artifact-attestation.js
src/integrations/dry-run-worker-artifact.js
src/kernel/canonical-json.js
src/kernel/errors.js
src/kernel/ids.js
src/kernel/validation.js
src/workers/dry-run-connector-worker.js
src/workers/dry-run-worker-protocol.js
```

Only the exact per-file relative and Node.js built-in import specifiers of the
recorded graph are admitted. Source comments are disallowed so they cannot
obscure import syntax. Bare packages, added built-ins, `require`, dynamic
`import()`, dynamic code construction, query/hash specifiers, source-root
escapes, duplicate/unlisted dependencies and unreachable listed files are
rejected.

The scanner deliberately supports this exact static ES-module graph. It is a
fail-closed policy check, not a complete JavaScript parser.

## Filesystem Inspection

Before computing an artifact:

- the absolute runtime root and every used source directory must be real
  directories and not group/world-writable;
- every final source path is opened with `O_NOFOLLOW` where the platform
  provides it;
- every source must be a regular, non-empty file, at most 256 KiB and not
  group/world-writable;
- complete artifact bytes may not exceed 1 MiB;
- device, inode, size, time and mode metadata must remain stable across the
  descriptor read;
- all bytes must be valid UTF-8.

Owner writability is deliberately allowed for this development-tree
experiment. These checks reduce path confusion and accidental drift; they are
not hostile same-account protection.

## Release Attestation

The canonical attestation binds exact artifact identity, digest, issuer, key,
issue time and Ed25519 signature. The verifier:

- permits one to eight explicit trusted public keys;
- rejects duplicate key IDs;
- requires Ed25519 key material;
- requires exact issuer/key agreement;
- requires exact local artifact digest agreement;
- verifies the canonical unsigned attestation bytes;
- rejects every unexpected field.

The attestation has no expiry or online revocation. Rotation is currently an
explicit source and governance change.

## Worker Protocol 1.2

The parent verifies the local artifact and release before each process spawn.
The request carries only the content-minimized release binding:

```text
artifactId
artifactVersion
artifactDigest
attestationDigest
issuerId
keyId
```

The child reconstructs the local source artifact and compares identifier,
version and digest. The response repeats the exact binding with:

```text
localDigestMatched: true
```

The response verifier requires equality with the request. The complete worker
boundary enters the response digest and simulated result digest.

`localDigestMatched` means only that the child observed source matching the
parent-provided digest. Signature and trust verification occurs in the parent.

## Failure Semantics

Any inspection, graph, digest, trust, signature or binding error stops before
an accepted outcome.

The `artifact-binding-mismatch` fault changes the request digest binding after
the parent has verified the real release. The real child observes the
difference, exits non-zero and emits no accepted response. The durable
delivery remains claimed and may move after expiry only through Human
Governance to `uncertain`.

There is no fallback to an unsigned path.

## Explicit Non-Claims

This slice does not establish:

- immutable source or atomic deployment;
- protection against a malicious same-account race;
- pre-execution child attestation, because modules load before child code can
  measure them;
- independently authenticated parent or worker identity;
- signed worker responses;
- protected release-key custody, expiry, revocation or transparency;
- Node.js executable, built-in module, OS or boot-chain provenance;
- general package dependency analysis;
- a real connector or production supply chain.

An attacker able to change both source and repository-local trust material can
replace this Level 1 trust root. Production requires externally protected
release trust plus an immutable artifact reference supplied to an isolated,
authenticated workload.
