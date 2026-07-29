# Verified Worker Package

Status: Experimental Deterministic Package Boundary

Validation Level: Level 1

Production Status: Not Production Ready

Related Decision:

- `../../../00_Specification/ADR/ADR-0051_Deterministic_Signed_Worker_Package_Experiment.md`

## Purpose

Move the dry-run worker's admitted execution modules out of the mutable FDOS
worktree and into one deterministic, signed and separately transportable
package.

The parent and child bootstrap both verify the package. The bootstrap then
evaluates the exact verified module strings from memory without extracting
them to another mutable source directory.

## Verified Chain

```text
fixed 12-module source policy
  -> trusted stable source reads during package build
  -> closed reachable import graph
  -> source artifact SHA-256
  -> canonical package with exact UTF-8 module contents
  -> complete package SHA-256
  -> detached Ed25519 release attestation
  -> exact public trust descriptor + trust-anchor digest pin
  -> parent package and release verification
  -> protocol 1.3 release binding
  -> child bootstrap independently repeats verification
  -> verified module strings loaded into memory
  -> fixed entry point evaluated
  -> exact package observation bound into response and result digest
```

## Recorded Pilot Package

```text
package id:         worker-package:connector-dry-run
package version:    1.0.0-experimental
package digest:     sha256:046b7dd22fc2454865139fd6951e2ccc7bfba4f1fa497a5831b164c77794fec4
artifact id:        worker:connector-dry-run
artifact version:   2.0.0-experimental
artifact digest:    sha256:b0c0107c2a90919831ab78866eb760e0094f75a34f002c667897e49c516cc59b
modules:            12
source bytes:       63,550
serialized bytes:   71,179
attestation digest: sha256:ab215bdffa00f974093a6cc4f15534037a90c77543644ceda524d5d58418808c
trust-anchor digest: sha256:78dccc7696bb736ab5135ef8c3fc1745dcd413e5a8640b43cd9e5c68935fe01b
algorithm:          Ed25519
issuer:             issuer:fdos-worker-package-pilot
key:                key:a189dda72dfdc5905ee62a94
issued:             2026-07-29T16:15:00.000Z
```

The package is:

`../artifacts/worker-packages/connector-dry-run-v1.fdos-package.json`

Only its public trust descriptor, trust pin and signed attestation are stored
in `src/pilot/dry-run-worker-package-release.js`. The ephemeral signing key
used for this fixture was discarded and is not stored in FDOS.

## Package Format

The package is one canonical JSON record. It contains:

- fixed schema, package ID and version;
- the complete normalized source artifact;
- exactly 12 sorted module records;
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
- the existing exact fault and network-isolation fields;
- no forwarded parent environment and no private key.

Before evaluating packaged code, the bootstrap repeats package, graph,
signature and trust-pin verification. It then creates Node.js
`SourceTextModule` instances from the verified module strings.

The loader admits only:

- fixed relative imports that resolve inside the package;
- `node:crypto`;
- `node:fs/promises`;
- `node:net`.

Dynamic imports and every other built-in or package import fail closed.

The bootstrap sets one immutable observation and evaluates the fixed entry
point. The worker compares the observation with protocol 1.3 before producing
a response.

Node.js VM modules provide the in-memory loader mechanism. They are
experimental and are not an isolation boundary.

## Protocol 1.3

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
```

The response repeats the exact binding and requires:

```text
packageDigestMatched: true
releaseSignatureVerifiedByBootstrap: true
evaluatedFromVerifiedMemory: true
```

The complete observation enters the response digest and simulated result
digest.

## Failure Semantics

Any file, canonicalization, module, graph, package, artifact, attestation,
trust or binding failure produces no accepted outcome.

The `bootstrap-release-mismatch` fault changes only the trust pin sent to the
real bootstrap after the parent verified the correct release. The bootstrap
rejects before module evaluation.

The `package-binding-mismatch` fault keeps the verified release but changes
the package digest in the request. The real worker rejects the difference.

Both leave the durable delivery `claimed`. After expiry, only Human Governance
may reconcile it to `uncertain`.

## Explicit Non-Claims

This slice does not establish:

- immutable or remote content-addressed package storage;
- protected HSM, KMS or offline key custody;
- proof that caller-provided trust came from a protected system;
- bootstrap, verifier, Node.js, built-in, OS or boot-chain immutability;
- production-grade package isolation;
- independently authenticated workload identity;
- independently signed worker responses;
- release expiry, revocation, transparency or online rotation;
- portable supported network and resource isolation;
- a real connector or external action.

The repository fixture, bootstrap and verifier remain owner-writable trusted
code. Production requires an immutable deployment object, externally
protected trust, supported container or VM isolation, read-only root
filesystem and authenticated workload identity.
