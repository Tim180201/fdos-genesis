# Verified Worker Package

Status: Experimental Deterministic Package Boundary

Validation Level: Level 1

Production Status: Not Production Ready

Related Decision:

- `../../../00_Specification/ADR/ADR-0051_Deterministic_Signed_Worker_Package_Experiment.md`
- `../../../00_Specification/ADR/ADR-0052_Ephemeral_Workload_Session_and_Authenticated_Response_Experiment.md`

## Purpose

Move the dry-run worker's admitted execution modules out of the mutable FDOS
worktree and into one deterministic, signed and separately transportable
package.

The parent and child bootstrap both verify the package. The bootstrap then
evaluates the exact verified module strings from memory without extracting
them to another mutable source directory.

## Verified Chain

```text
fixed 13-module source policy
  -> trusted stable source reads during package build
  -> closed reachable import graph
  -> source artifact SHA-256
  -> canonical package with exact UTF-8 module contents
  -> complete package SHA-256
  -> detached Ed25519 release attestation
  -> exact public trust descriptor + trust-anchor digest pin
  -> parent package and release verification
  -> protocol 1.4 release + random session-challenge binding
  -> child bootstrap independently repeats verification
  -> verified module strings loaded into memory
  -> fresh one-use Ed25519 workload-session key
  -> fixed entry point evaluated
  -> exact package and session observations bound into result digest
  -> authenticated session/request/response envelope
```

## Recorded Pilot Package

```text
package id:         worker-package:connector-dry-run
package version:    2.0.0-experimental
package digest:     sha256:51cd86533646d78353ed91fc86e0d16f74fc7b4eb404c722c77d3b4a3d67d196
artifact id:        worker:connector-dry-run
artifact version:   3.0.0-experimental
artifact digest:    sha256:59933e5c2830b0a63d32c2938cb00175431495862a2c948af8d3d4c105a7db8a
modules:            13
source bytes:       80,676
serialized bytes:   89,555
attestation digest: sha256:e78fc5e2f8ca6fd90b19739634c10ec1b06c6ff83ec91776698bd49b754cda93
trust-anchor digest: sha256:c70b21a175dbfa514447d1de2476a7931e52632446abcaee6cba3c8a5da92c39
algorithm:          Ed25519
issuer:             issuer:fdos-worker-package-pilot
key:                key:449d04c19a66d93bc574d99b
issued:             2026-07-29T14:17:25.900Z
```

The package is:

`../artifacts/worker-packages/connector-dry-run-v2.fdos-package.json`

Only its public trust descriptor, trust pin and signed attestation are stored
in `src/pilot/dry-run-worker-package-release.js`. The ephemeral signing key
used for this fixture was discarded and is not stored in FDOS.

## Package Format

The package is one canonical JSON record. It contains:

- fixed schema, package ID and version;
- the complete normalized source artifact;
- exactly 13 sorted module records;
- exact UTF-8 source text, byte size and SHA-256 per module;
- a complete package digest.

Canonical serialization makes rebuild comparison byte-stable. The generated
file may contain one final line feed only.

The package is not a generic JavaScript bundle or package-manager archive. It
admits one fixed FDOS worker graph and has no third-party dependency resolver.

## Reproducible Build

From `02_Reference_Implementations/FDOS_Runtime`:

```bash
node scripts/build-dry-run-worker-package.js
```

The builder:

1. performs the existing trusted-path and stable source reads;
2. enforces the exact static import graph;
3. creates the source artifact;
4. embeds exact source strings in sorted module records;
5. computes the complete package digest;
6. atomically replaces the generated package file;
7. reports identities, digests and byte counts.

A source change creates a different artifact and package digest. It also
requires a new detached release signature.

## Detached Signing Boundary

`createWorkerPackageAttestationRequest` returns the exact canonical unsigned
release statement. An external signer signs those bytes. The runtime accepts
only the canonical base64url representation of the detached 64-byte Ed25519
signature through
`createWorkerPackageAttestation`.

No release API accepts a private key. This supports a later adapter for HSM,
KMS or offline custody without coupling private key material to FDOS.

The current pilot signature was generated offline with an ephemeral local key.
That proves the interface and cryptography, not protected external custody.

## Trust Provisioning

Every verifier receives:

- explicit public Ed25519 trust descriptors;
- the expected SHA-256 digest of the selected trust descriptor.

The selected descriptor must match issuer, key ID and the exact external pin.
Replacing the public key and descriptor without replacing the pin fails.

`ProcessSeparatedDryRunWorker` accepts a caller-provided release
configuration. This is the seam for deployment-controlled trust. The runtime
reports whether configuration came from the repository fixture or its caller,
but it never claims that the caller's key custody is protected.

## Parent Preflight

Before every spawn the parent:

- requires an absolute package path;
- rejects a linked, wrong-owner or group/world-writable package directory;
- opens the package with `O_NOFOLLOW` when supported;
- requires a regular, owner-controlled file within 2 MiB;
- verifies stable device, inode, size, timestamps and mode across the read;
- decodes exact UTF-8;
- requires one canonical JSON record;
- reconstructs all module and source-artifact digests;
- enforces the closed import graph;
- verifies the signature and pinned trust anchor.

No unsigned source-tree fallback exists.

## Bootstrap Verification and Evaluation

The child starts a fixed bootstrap with:

- the absolute package path as its only script argument;
- one bounded canonical public release envelope;
- one fresh canonical parent challenge;
- the existing exact fault and network-isolation fields;
- no forwarded parent environment and no parent or release private key.

Before evaluating packaged code, the bootstrap repeats package, graph,
signature and trust-pin verification. It then creates Node.js
`SourceTextModule` instances from the verified module strings.

The loader admits only:

- fixed relative imports that resolve inside the package;
- `node:crypto`;
- `node:fs/promises`;
- `node:net`.

Dynamic imports and every other built-in or package import fail closed.

The bootstrap sets one immutable package observation, generates a fresh
Ed25519 session key and evaluates the fixed entry point. The worker compares
package and session with protocol 1.4 before producing an authenticated
response. The session private key remains in a one-use bootstrap closure.

Node.js VM modules provide the in-memory loader mechanism. They are
experimental and are not an isolation boundary.

## Protocol 1.4

The request binds:

```text
packageId
packageVersion
packageDigest
artifactId
artifactVersion
artifactDigest
attestationDigest
trustAnchorDigest
issuerId
keyId
workloadSessionChallenge
```

The response repeats the exact binding and requires:

```text
packageDigestMatched: true
releaseSignatureVerifiedByBootstrap: true
evaluatedFromVerifiedMemory: true
workloadSession.keyId
workloadSession.sessionDigest
workloadSession.challengeDigest
workloadSession.packageBindingDigest
workloadSession.externallyAttested: false
```

The complete observations enter the response digest and simulated result
digest. A canonical Ed25519 envelope separately binds complete session,
request and response digests. The parent verifies the envelope and requires
the response-bound session observation to match the authenticated session.

## Failure Semantics

Any file, canonicalization, module, graph, package, artifact, attestation,
trust or binding failure produces no accepted outcome.

The `bootstrap-release-mismatch` fault changes only the trust pin sent to the
real bootstrap after the parent verified the correct release. The bootstrap
rejects before module evaluation.

The `package-binding-mismatch` fault keeps the verified release but changes
the package digest in the request. The real worker rejects the difference.

Challenge, signature and authenticated-session observation mismatches are
tested separately under ADR-0052.

All failures leave the durable delivery `claimed`. After expiry, only Human
Governance may reconcile it to `uncertain`.

## Explicit Non-Claims

This slice does not establish:

- immutable or remote content-addressed package storage;
- protected HSM, KMS or offline key custody;
- proof that caller-provided trust came from a protected system;
- bootstrap, verifier, Node.js, built-in, OS or boot-chain immutability;
- production-grade package isolation;
- externally issued or remotely attested workload identity;
- protection of the bootstrap-created session key from the host account;
- secure session-key erasure or a durable network replay ledger;
- release expiry, revocation, transparency or online rotation;
- portable supported network and resource isolation;
- a real connector or external action.

The repository fixture, bootstrap and verifier remain owner-writable trusted
code. Production requires an immutable deployment object, externally
protected trust, supported container or VM isolation, read-only root
filesystem and authenticated workload identity.
