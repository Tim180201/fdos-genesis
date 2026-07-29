# Evidence Record — Durable Verified Worker Receipt

Status: Evidence Item / Human Review Required

Project: FDOS Company OS Pilot

Date: 2026-07-29

Confidence: High for closed receipt construction, exact protocol-response
reconstruction, active-claim/result binding, authenticated command separation,
SQLite replay and content-minimized evidence export; Low for immutable parent
provenance, protected Connector key custody, independent workload/audit
signature, hostile-host resistance or production isolation

FDOS Validation Level: Level 1 — Experimental

Core Impact: None

## 1. Purpose

Record executable evidence that FDOS can retain the material local checks
behind one accepted process-worker result without persisting raw Delivery
parameters or ephemeral workload cryptographic material.

The experiment closes the open Technical Slice 11 finding that the full
authenticated response was verified only transiently while the Outbox stored
only a result digest.

It does not retain or independently verify the full signed envelope. It
retains a content-minimized receipt, authenticated as part of the exact
Connector command, and explicitly preserves `externallyAttested: false`.

## 2. Evaluated Source

Change baseline:

- FDOS commit:
  `73e6970019e123d13f34cda43c54106fedde8e31`
- FDOS tree:
  `7ff9394bba62350e61e5695e9f408b5e3bd30912`

The complete 82-file runtime candidate is bound by:

- manifest:
  `EV-FDOS-WORKER-RECEIPT-012_Source_Manifest.sha256`
- manifest digest:
  `1fb1153f23b353537b94b2f1bce7e1910d3c2d91958db85b358f04413387ee9a`

The manifest includes both historical worker package v1 and current package
v2. The current release still points only to v2.

Test environment:

- runtime package: `@fdos/runtime-reference@0.12.0-experimental`
- Node.js: `v24.17.0`
- macOS: `26.5.1`, build `25F80`
- operating-system kernel: `Darwin 25.5.0 arm64`

Compatibility outside this exact environment was not independently
exercised.

## 3. Unchanged Worker Release

Receipt construction occurs in the parent/runtime layer and does not enter
the packaged worker source graph.

The current deterministic package identity remains:

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
attestation digest:  sha256:e78fc5e2f8ca6fd90b19739634c10ec1b06c6ff83ec91776698bd49b754cda93
trust-anchor digest: sha256:c70b21a175dbfa514447d1de2476a7931e52632446abcaee6cba3c8a5da92c39
issuer:              issuer:fdos-worker-package-pilot
key:                 key:449d04c19a66d93bc574d99b
```

Worker protocol remains version 1.4.

No package release or workload-session private key was generated, rotated,
printed or stored for this slice.

## 4. Receipt Construction Boundary

`ProcessSeparatedDryRunWorker` creates a receipt only after:

1. package/release/trust preflight;
2. bounded request serialization;
3. bounded single-line canonical output;
4. canonical authenticated-envelope digest;
5. exact parent challenge and package binding;
6. Ed25519 workload response signature;
7. exact protocol 1.4 response digest and request binding;
8. exact session-observation/envelope cross-binding;
9. empty standard error;
10. clean process exit.

The returned stable result contains `workerReceipt`.

The top-level receipt is:

```text
schemaVersion: 1.0
kind: fdos-verified-process-worker-receipt
protocolVersion: 1.4
request
response
executionBoundary
workerPackage
workloadSession
verification
digest
```

Every object uses an exact closed shape.

## 5. Content-Minimized Binding

### Request

The receipt binds:

- worker request ID and digest;
- Delivery ID;
- fencing claim ID and attempt;
- Connector Instance ID;
- issue and expiry timestamps;
- immutable Delivery Intent digest.

It does not retain Delivery Intent parameters.

### Response

The receipt binds:

- completion timestamp;
- result digest;
- protocol-response digest;
- authenticated-envelope digest.

It does not retain the full authenticated envelope.

### Execution boundary

The receipt binds:

- process separation and no-shell state;
- `networkAccess: false`;
- `externalEffects: false`;
- network and filesystem-write enforcement flags;
- isolation provider and policy digest;
- exact denial-probe identifiers.

### Package

The receipt binds complete:

- package ID, version and digest;
- source artifact ID, version and digest;
- release-attestation and trust-anchor digests;
- issuer and key IDs;
- package digest match;
- bootstrap release-signature verification;
- verified-memory evaluation.

### Workload session

The receipt binds:

```text
mode: ephemeral-ed25519-parent-challenge
algorithm: Ed25519
keyId
sessionDigest
challengeDigest
packageBindingDigest
ephemeralKeyGeneratedByBootstrap: true
responseSignatureVerified: true
challengeMatched: true
packageBindingMatched: true
externallyAttested: false
```

It excludes the raw challenge, public key and signature.

## 6. Independent Response Reconstruction

Receipt verification rebuilds the exact canonical unsigned protocol response
from retained fields:

```text
schemaVersion
kind
requestId
deliveryId
claimId
connectorId
requestDigest
completedAt
simulated no-effect outcome
complete minimized workerBoundary
```

Its SHA-256 must equal the retained response digest.

This means the receipt's package, session and isolation claims cannot describe
one response while retaining the digest of another.

The authenticated-envelope digest cannot be reconstructed from the receipt
because the public session and signature are omitted. It remains a
content-addressed reference to transiently verified material.

## 7. Runtime and Invocation Binding

The authenticated command surface now distinguishes:

```text
outbox.record-outcome
outbox.record-worker-outcome
```

The generic command rejects a receipt field at command normalization.

The worker command requires a receipt and admits only a simulated no-effect
outcome. Before commit, runtime verification requires:

- exact active Delivery;
- exact claim and attempt;
- exact owning Connector;
- exact Delivery Intent digest;
- request issuance no earlier than claim acquisition;
- request expiry no later than claim expiry;
- response completion inside the request validity window;
- no more than 30 seconds of parent/runtime clock skew;
- exact result-digest equality.

The signed Connector Invocation covers the complete worker-outcome command,
including the receipt.

## 8. Transaction and Replay Binding

One SQLite transaction stores:

- verified one-time Connector Invocation receipt;
- exact signed command digest;
- receipt-bearing outcome event;
- terminal simulated delivery state.

During rehydration FDOS:

1. verifies Invocation receipt and transaction attribution;
2. requires `outbox.record-worker-outcome`;
3. reconstructs the exact command from the event;
4. matches the accepted Invocation command digest;
5. verifies the receipt and response reconstruction;
6. rebinds the active Delivery and claim;
7. retains receipt and Invocation ID in state.

The restart test closed and reopened SQLite, then verified the same receipt
digest in both `outbox.get` and a newly generated workflow evidence bundle.

## 9. Evidence Projection

The workflow delivery projection contains:

- complete minimized worker receipt;
- Invocation and correlation IDs;
- operation and Connector principal ID;
- exact command digest;
- Invocation envelope digest;
- verified Invocation receipt digest;
- issuer and key IDs;
- authentication method and assurance;
- verification time.

The test searched the serialized evidence and found no:

- repository parameter values;
- raw workload public-key field;
- signature field.

The evidence bundle remains self-digested and event references remain tied to
the hash-chained transactional store.

## 10. Verification

### Complete regression

```text
npm run check
tests 140
pass 140
fail 0
skipped 0
```

### Focused Connector and worker boundary

```text
node --test --test-concurrency=1 \
  test/process-separated-worker.test.js \
  test/connector-outbox.test.js
tests 29
pass 29
fail 0
```

Focused receipt behavior included:

- valid receipt creation in process-only and Darwin-required modes;
- exact response/envelope/result and Delivery Intent digest exposure;
- receipt response-digest reconstruction;
- changed response digest rejection after receipt redigest;
- changed package binding rejection after receipt redigest;
- false clean-exit observation rejection after receipt redigest;
- extra raw/signature-like field rejection;
- wrong claim-attempt rejection;
- generic-command receipt-field rejection;
- active-claim preservation after rejected receipt;
- exact authenticated worker-outcome operation;
- evidence projection and SQLite restart retention;
- unchanged crash, timeout, package, session and sandbox failure behavior.

### Coverage

```text
npm run coverage
tests 140
pass 140
fail 0

all files:
line coverage:     91.30%
branch coverage:   78.96%
function coverage: 92.72%

verified-worker-receipt.js:
line coverage:     94.26%
branch coverage:   78.13%
function coverage: 100.00%

process-separated-dry-run-worker.js:
line coverage:     91.26%
branch coverage:   87.10%
function coverage: 90.00%
```

Coverage does not prove truthful parent observations, independent signer
provenance, hostile-host resistance or production safety.

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
receipt retained:            true
receipt command digest:      retained
response signature verified: true
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
receipt retained:                 true
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

## 11. Fault and Failure Evidence

### Receipt response tamper

The test changed the retained protocol-response digest and recomputed the outer
receipt digest. Independent response reconstruction rejected the receipt.

### Receipt package tamper

The test changed the package digest and recomputed the outer receipt digest.
The session package-binding digest no longer matched and verification failed.

### False clean exit

The test changed `cleanProcessExitVerified` to false and recomputed the receipt
digest. Closed verification semantics rejected it.

### Extra raw field

The test added a signature-like top-level receipt field. Exact shape
verification rejected the worker-outcome command.

### Wrong attempt

The test changed the claim attempt to another valid integer and recomputed the
receipt digest. Receipt structure remained valid, but active-claim binding
rejected it.

### Generic-command smuggling

The test added a `workerReceipt` field to `outbox.record-outcome`. Exact signed
command normalization rejected it before Invocation acceptance.

Every receipt failure recorded no Outbox outcome and left the delivery
`claimed`.

## 12. Private-Material and Scope Review

The runtime receipt and evidence contain no:

- Delivery Intent parameter object;
- raw repository revision or repository ID;
- workload challenge;
- workload public/private key;
- workload response signature;
- Connector Invocation signature;
- standard output or standard error.

The receipt contains only fixed observations, identifiers, timestamps and
digests.

No file, Git state, dependency, test or build in TapTime or Company AI was
changed.

## 13. Checks Not Performed

- No external model, API, connector, DNS or TLS request was made.
- No container image or OCI runtime was tested. The local daemon remained
  unavailable; starting a host service exceeded the authorized FDOS-only
  mutation scope.
- No immutable object/image storage or atomic deployment was tested.
- No external workload identity, audit signer, protected Connector custody,
  HSM, KMS, certificate, revocation or transparency service was tested.
- No retained full-envelope offline verification was performed.
- No hostile parent/bootstrap/verifier replacement or host-memory inspection
  was tested.
- No trusted clock synchronization or timestamp authority was tested.
- No supported portable sandbox, filesystem-read control, CPU/memory/process
  quota or outbound allowlist was tested.
- No real service idempotency, secret or external effect was exercised.
- No exact-commit independent CI, cryptographic review, security review,
  operational runbook or Human Governance acceptance was performed.

## 14. Open Findings

1. The mutable local parent constructs and verifies the receipt.
2. The receipt is authenticated by the local Connector Invocation, not signed
   independently by the workload or an audit authority.
3. Connector signing-key custody remains local and unprotected.
4. A compromised parent, Connector key or host can fabricate locally
   consistent receipt assertions.
5. The full signed envelope remains transient and cannot be verified offline
   from the receipt alone.
6. The 30-second clock-skew allowance is not trusted-time evidence.
7. No external workload identity, revocation, replay ledger or transparency
   service exists.
8. Package, bootstrap, verifier and trust pin remain owner-writable repository
   files.
9. Process-only mode has no OS isolation.
10. Darwin `sandbox-exec` remains deprecated, platform-specific and incomplete.
11. No real connector, secret or external effect was exercised.
12. No independent runner or Human Governance decision exists.

## 15. Interpretation

The narrow supported statement is:

> On the manifest-bound Level 1 candidate, FDOS retained and replay-validated
> a closed content-minimized receipt for one locally authenticated worker
> result, reconstructed its exact protocol response, and bound it to the
> active claim and exact signed Connector command across SQLite restart.

The unsupported statement is:

> FDOS has an independently signed production execution receipt or remotely
> attested workload audit proof.

## 16. Governance Conclusion

Technical Slice 12 passed its selected local R3/V3 verification.

The evidence supports Human Governance review of:

- closed content-minimized worker receipts;
- exact protocol-response reconstruction;
- explicit generic/verified outcome separation;
- Delivery-, claim-, intent-, result- and Invocation-bound persistence;
- restart-safe receipt and authentication evidence;
- tested raw-field, digest, package, verification and attempt confusion
  rejection;
- unchanged no-network/no-effect and human-only uncertainty semantics.

It does not authorize:

- a real connector;
- network access;
- a model provider;
- an external write or message;
- immutable or production deployment;
- external workload identity;
- independently signed audit proof;
- FDOS Core promotion.

The next bounded gate is a supported immutable container or VM deployment with
read-only root filesystem, externally rooted workload identity, protected
release and Connector trust, independently verifiable signed execution
receipts or governed full-envelope retention, trusted time, outbound/read/
resource isolation, replay/revocation controls, monitoring, incident response
and independent review.
