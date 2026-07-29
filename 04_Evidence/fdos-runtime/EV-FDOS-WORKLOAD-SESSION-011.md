# Evidence Record — Authenticated Ephemeral Workload Session

Status: Evidence Item / Human Review Required

Project: FDOS Company OS Pilot

Date: 2026-07-29

Confidence: High for canonical challenge/session/envelope construction,
launch-local Ed25519 response verification, exact package/request/response
binding and tested local fault rejection; Low for immutable bootstrap
provenance, protected session memory, external workload identity, remote
attestation or production isolation

FDOS Validation Level: Level 1 — Experimental

Core Impact: None

## 1. Purpose

Record executable evidence that FDOS can authenticate one exact dry-run worker
response with a fresh launch-local key while keeping the private key outside
every serialization boundary.

The evidence also records that a valid signature is insufficient when the
durable result names a different session: the parent must cross-bind the
authenticated full session with the minimized observation included in the
response and simulated result digest.

This record does not claim an externally issued or remotely attested workload
identity, immutable bootstrap, secure memory erasure, host-memory
confidentiality or a real connector.

## 2. Evaluated Source

Change baseline:

- FDOS commit:
  `a566463fe083816f842c389128b77e93111bd520`
- FDOS tree:
  `35bb09ea86ce97594dde4389d7ca41b3af75ad22`

The complete 80-file runtime candidate is bound by:

- manifest:
  `EV-FDOS-WORKLOAD-SESSION-011_Source_Manifest.sha256`
- manifest digest:
  `9ce26dd4d111c50649c1e297a6b4a050a1ec2ef2a283aa21735581bf7f9c1ccb`

The manifest includes the historical v1 package and current v2 package. The
current runtime release points only to v2; v1 remains immutable evidence for
Technical Slice 10.

Test environment:

- runtime package: `@fdos/runtime-reference@0.11.0-experimental`
- Node.js: `v26.3.1`
- macOS: `26.5.1`, build `25F80`
- operating-system kernel: `Darwin 25.5.0 arm64`

Compatibility outside this exact environment was not independently
exercised.

## 3. Package and Release Binding

Adding the session contract changes the admitted worker source graph. The
current deterministic package identity is:

```text
package id:          worker-package:connector-dry-run
package version:     2.0.0-experimental
package digest:      sha256:51cd86533646d78353ed91fc86e0d16f74fc7b4eb404c722c77d3b4a3d67d196
package file SHA-256: 7af0a5e75570fa7dbe88d4fc334b71a9b1be6d67eb16e4b8a1a801dc7aba0d30
artifact id:         worker:connector-dry-run
artifact version:    3.0.0-experimental
artifact digest:     sha256:59933e5c2830b0a63d32c2938cb00175431495862a2c948af8d3d4c105a7db8a
entry point:         src/workers/dry-run-connector-worker.js
modules:             13
source bytes:        80,676
serialized bytes:    89,555
```

Release identity:

```text
algorithm:           Ed25519
issuer:              issuer:fdos-worker-package-pilot
key:                 key:449d04c19a66d93bc574d99b
issued:              2026-07-29T14:17:25.900Z
attestation digest:  sha256:e78fc5e2f8ca6fd90b19739634c10ec1b06c6ff83ec91776698bd49b754cda93
trust-anchor digest: sha256:c70b21a175dbfa514447d1de2476a7931e52632446abcaee6cba3c8a5da92c39
```

The package-release private key was generated ephemerally, used through the
detached signing boundary and discarded. It was not printed, stored or passed
to the runtime or worker.

The repository retains only the package, public trust descriptor, trust pin
and signed attestation. This proves release-interface behavior, not protected
external release custody.

## 4. Session Contract

### Parent challenge

Before every process-only or Darwin launch, the parent requests exactly 32
bytes from Node.js `randomBytes` and encodes them as canonical unpadded
base64url.

The contract rejects:

- non-string values;
- padding;
- invalid alphabet or length;
- values that do not decode to exactly 32 bytes;
- semantically equivalent but noncanonical encodings.

The challenge enters protocol 1.4 and is independently supplied to the fixed
bootstrap. Only its digest enters the stable result.

### Bootstrap key

Only after bootstrap package/release verification, the child generates a
fresh Ed25519 key pair.

The bootstrap:

- deletes challenge and session-fault environment fields before packaged code
  evaluates;
- exports the public key in exact canonical SPKI PEM;
- derives the session key ID from the public DER SHA-256 fingerprint;
- retains the private `KeyObject` inside a closure;
- exposes only an immutable public session and one-use signing function;
- rejects a second signing attempt.

The private key is not present in:

- the worker package;
- the protocol request;
- the bootstrap environment after intake;
- the public session;
- the response or envelope;
- the stable runtime result;
- the evidence projection.

Node.js provides no secure-erasure guarantee. Process exit ends the logical
key lifetime but does not prove physical memory destruction.

### Public session

The exact closed session binds:

```text
schemaVersion: 1.0
kind: fdos-ephemeral-workload-session
mode: ephemeral-ed25519-parent-challenge
algorithm: Ed25519
challenge
keyId
publicKeyPem
workerPackage
```

The complete `workerPackage` binding includes:

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

The key ID must equal the first 24 hexadecimal characters of the SHA-256
fingerprint of the public SPKI DER bytes. Noncanonical PEM, a non-Ed25519 key
or a changed fingerprint fails closed.

## 5. Authenticated Response

### Signature statement

The one-use authority signs canonical JSON for:

```text
schemaVersion: 1.0
kind: fdos-workload-response-signature-statement
sessionDigest
requestDigest
responseDigest
```

The signature must be canonical unpadded base64url for exactly one 64-byte
Ed25519 signature.

### Envelope

The child emits exactly one canonical JSON line:

```text
schemaVersion: 1.0
kind: fdos-authenticated-worker-response
workloadSession
response
signature
digest
```

The envelope digest covers the complete unsigned envelope. The response digest
is independently reconstructed before its reference is admitted to the
signature statement.

### Parent verification

The parent accepts no result until:

1. output is one bounded canonical record;
2. session schema, algorithm, public key and fingerprint verify;
3. the exact random challenge matches;
4. the complete worker-package binding matches;
5. the response digest and signed request digest verify;
6. the Ed25519 signature verifies;
7. protocol 1.4 request/response/package/isolation checks verify;
8. authenticated and response-bound session evidence match exactly;
9. standard error is empty;
10. the child exits normally with code zero.

The stable result includes response and envelope digests plus verified,
content-minimized session evidence. It excludes the raw challenge, public key
and signature.

## 6. Durable Observation

The worker response and simulated result digest bind:

```text
kind: fdos-workload-session-observation
mode: ephemeral-ed25519-parent-challenge
keyId
sessionDigest
challengeDigest
packageBindingDigest
ephemeralKeyGeneratedByBootstrap: true
externallyAttested: false
```

The parent derives the same observation from the authenticated full session
and compares:

- `keyId`;
- `sessionDigest`;
- `challengeDigest`;
- `packageBindingDigest`.

This separates transient cryptographic material from durable evidence without
letting the durable projection claim a different signer.

`ephemeralKeyGeneratedByBootstrap` is a local bootstrap observation.
`externallyAttested: false` is mandatory. Neither is remote attestation.

## 7. Verification

### Complete regression

```text
npm run check
tests 140
pass 140
fail 0
skipped 0
```

### Focused boundary

Thirty artifact/package/process/session cases passed:

- deterministic package and artifact rebuild equality;
- valid release signature and exact trust pin;
- challenge schema and canonical base64url enforcement;
- canonical Ed25519 public-key representation and fingerprint binding;
- canonical 64-byte signature enforcement;
- one-use signing;
- distinct public-key identity across independent authorities;
- complete session/package binding;
- response and envelope digest reconstruction;
- response-content and signature tamper rejection;
- replay rejection under another challenge;
- replay rejection under another package;
- exact protocol session-observation binding;
- successful process-only and Darwin-required execution;
- real-child challenge mismatch rejection;
- real-child signature mismatch rejection;
- real-child valid-signature session-observation confusion rejection;
- unchanged crash, post-response crash, timeout, package, trust and sandbox
  failure behavior;
- unchanged claim preservation and human-only uncertainty reconciliation.

### Coverage

```text
npm run coverage
tests 140
pass 140
fail 0

all files:
line coverage:     91.09%
branch coverage:   79.04%
function coverage: 92.32%

workload-session-contract.js:
line coverage:     93.54%
branch coverage:   80.39%
function coverage: 95.00%

ephemeral-workload-session.js:
line coverage:     100.00%
branch coverage:   90.91%
function coverage: 100.00%

process-separated-dry-run-worker.js:
line coverage:     91.04%
branch coverage:   88.04%
function coverage: 90.00%

dry-run-worker-protocol.js:
line coverage:     92.24%
branch coverage:   79.59%
function coverage: 100.00%

dry-run-worker-bootstrap.js:
line coverage:     82.91%
branch coverage:   66.67%
function coverage: 87.50%
```

The packaged worker entry point uses virtual VM-module identifiers and does
not appear as a separate filesystem row. Its behavior is covered through the
real child-process paths.

Coverage does not prove entropy quality, cryptographic implementation
correctness, secure memory, immutable bootstrap provenance or hostile-host
resistance.

### Internal workflow demo

```text
npm run demo
run status:             completed
tasks:                  4 completed
accepted Invocations:   14
committed transactions: 14
verified audit events:  29
external actions:       false
```

### Process-only Outbox demo

```text
npm run demo:outbox
run status:                  completed
delivery status:             simulated
package/release verified:    true
response signature verified: true
challenge matched:           true
package binding matched:     true
externally attested:         false
network isolation enforced:  false
external effect:             none
accepted Invocations:        12
committed transactions:      12
verified audit events:       22
```

### Darwin-required Outbox demo

```text
npm run demo:sandbox
run status:                       completed
delivery status:                  simulated
response signature verified:      true
network isolation enforced:       true
filesystem-write isolation:       true
listen/connect/write-open probes: denied
external effect:                  none
accepted Invocations:             12
committed transactions:           12
verified audit events:            22
```

The optional Darwin result remains evidence for one deprecated local profile,
not a portable sandbox.

## 8. Fault Evidence

### Challenge mismatch

The parent generated one challenge for the real bootstrap and intentionally
bound a different valid challenge into the real request. The packaged worker
detected the difference and exited without an accepted response.

### Invalid signature

The bootstrap generated the real launch key. The response was constructed
normally, then the test authority changed one canonical signature character.
The real parent rejected Ed25519 verification.

### Valid-signature session confusion

The real worker changed only the valid-shaped key ID inside the minimized
session observation, recomputed the protocol response and signed that exact
response with the real session key.

The parent successfully authenticated the envelope, then rejected the
observation because it did not name the signing session. This demonstrates
that signature verification and durable-evidence identity verification are
separate mandatory gates.

### Durable result

Every new failure:

- recorded no Outbox outcome;
- left the delivery `claimed`;
- prohibited automatic retry;
- moved after controlled expiry only through Human Governance to `uncertain`.

## 9. Private-Material and Canonicalization Review

Repository and output inspection found no stored session or release private
key. The exposed session authority has only:

```text
workloadSession
signResponse
```

The signer cannot return a second response. The result contains no PEM private
key marker, public session PEM or raw signature.

The contract rejects:

- unexpected fields at session, observation and envelope boundaries;
- unsupported schema, kind, mode or algorithm;
- malformed, non-Ed25519 or noncanonical public keys;
- key/fingerprint mismatch;
- malformed or noncanonical challenge/signature bytes;
- response or envelope digest mismatch;
- challenge/package mismatch;
- invalid signature;
- response-bound session mismatch.

## 10. Checks Not Performed

- No file, test, build or Git state in TapTime or Company AI was changed.
- No external model, API, connector, DNS or TLS request was made.
- No container image or OCI runtime was tested. The installed local daemon was
  unavailable; starting a host service would exceed the user's FDOS-repository-
  only mutation scope.
- No immutable object/image storage or atomic deployment was tested.
- No external workload-identity provider, certificate chain, remote
  attestation, revocation or transparency service was tested.
- No HSM, KMS, enclave, locked-memory or secure-erasure control was tested.
- No hostile parent/bootstrap/verifier replacement or host-memory inspection
  was tested.
- No supported container/VM sandbox, filesystem-read control, CPU/memory/
  process quota or portable outbound allowlist was tested.
- No exact-commit independent CI, cryptographic review, security review,
  operational runbook or Human Governance acceptance was performed.

## 11. Open Findings

1. Session identity is self-issued by the mutable bootstrap.
2. The same host/account owns parent, bootstrap, verifier and child.
3. Host or bootstrap replacement can forge the entire local session boundary.
4. The challenge is carried through same-host launch state and protocol input.
5. Fresh 256-bit randomness replaces a durable replay ledger for this local
   experiment.
6. Node.js and operating-system random/crypto implementations remain trusted.
7. Private session key bytes may remain in process memory until reclaimed.
8. No secure erasure or memory-confidentiality guarantee exists.
9. No external certificate, expiry, revocation or transparency record exists.
10. The full signed envelope is not retained as an independent audit artifact.
11. The repository package, bootstrap, verifier and trust pin are mutable.
12. The pilot release trust has no protected external custody.
13. Node.js VM modules remain experimental and are not isolation.
14. Process-only mode has no operating-system resource boundary.
15. Darwin `sandbox-exec` remains deprecated and does not restrict reads or
    general resources.
16. No real connector, service idempotency, secret or external effect was
    exercised.
17. No independent runner or Human Governance decision exists.

## 12. Interpretation

The narrow supported statement is:

> On the manifest-bound Level 1 candidate, FDOS accepted a worker response
> only after a fresh parent challenge, fresh bootstrap-created Ed25519 key,
> exact session/package/request/response signature, exact durable session
> cross-binding and clean process exit verified.

The unsupported statement is:

> FDOS has established a production workload identity or remote attestation.

`externallyAttested: false` prevents that stronger interpretation in the
machine-readable evidence.

## 13. Governance Conclusion

Technical Slice 11 passed its selected local R3/V3 verification.

The evidence supports Human Governance review of:

- fresh challenge-bound local worker sessions;
- non-exported one-use session keys;
- exact authenticated response envelopes;
- durable minimized session evidence;
- replay, tamper, signature and identity-confusion rejection;
- preservation of no-effect and human-only uncertainty semantics.

It does not authorize:

- a real connector;
- network access;
- a model provider;
- an external write or message;
- immutable or production deployment;
- external workload identity;
- FDOS Core promotion.

The next bounded gate is a supported immutable container or VM deployment with
read-only root filesystem, externally rooted workload identity, protected
release trust, outbound/read/resource isolation, authenticated transport,
replay/revocation controls, monitoring, incident response and independent
review.
