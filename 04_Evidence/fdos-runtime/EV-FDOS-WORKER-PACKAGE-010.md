# Evidence Record — Deterministic Signed Worker Package Experiment

Status: Evidence Item / Human Review Required

Project: FDOS Company OS Pilot

Date: 2026-07-29

Confidence: High for deterministic package construction, detached signature
verification, trust-anchor pinning, parent/bootstrap verification and
verified-memory loading on the recorded candidate; Low for immutable
deployment, protected external key custody, production isolation or
independent workload identity

FDOS Validation Level: Level 1 — Experimental

Core Impact: None

## 1. Purpose

Record executable evidence that FDOS can build one canonical worker package,
verify its exact release independently in parent and child bootstrap, evaluate
only the verified in-memory module strings and reject package or trust
mismatches without recording false success.

This record does not claim immutable deployment storage, an HSM/KMS-backed
release service, a production software supply chain or a real connector.

## 2. Evaluated Source

Change baseline:

- FDOS commit:
  `205302dc8613e54a0f9df977b24ed2e5b8ffd087`
- FDOS tree:
  `4b918e6de912ddfa22994b7df9d63d7258fbcf9d`

The complete 75-file runtime candidate is bound by:

- manifest:
  `EV-FDOS-WORKER-PACKAGE-010_Source_Manifest.sha256`
- manifest digest:
  `c949304a632c9d6994a498fc05c32dbf6af053856a59a89bb886a16cc6ed860d`

Test environment:

- runtime package: `@fdos/runtime-reference@0.10.0-experimental`
- Node.js: `v24.17.0`
- macOS: `26.5.1`, build `25F80`
- operating-system kernel: `Darwin 25.5.0 arm64`

Compatibility outside this exact environment was not independently
exercised.

## 3. Package and Release Binding

### Fixed identities

```text
package id:          worker-package:connector-dry-run
package version:     1.0.0-experimental
package digest:      sha256:046b7dd22fc2454865139fd6951e2ccc7bfba4f1fa497a5831b164c77794fec4
package file SHA-256: ad46785ab8df1cb1fcd42dbef3dcb68a62ec142fb6aaf87c0d20ad620ffdd518
artifact id:         worker:connector-dry-run
artifact version:    2.0.0-experimental
artifact digest:     sha256:b0c0107c2a90919831ab78866eb760e0094f75a34f002c667897e49c516cc59b
entry point:         src/workers/dry-run-connector-worker.js
modules:             12
source bytes:        63,550
serialized bytes:    71,179
```

The package digest is the canonical FDOS object digest over the unsigned
package object. The package-file SHA-256 covers the exact serialized record,
including its embedded digest and final line feed. They intentionally serve
different evidence purposes.

### Canonical package policy

The package contains exact UTF-8 source strings, paths, sizes and SHA-256
records for all admitted modules. Verification rejects:

- unexpected, missing, additional, duplicate or reordered fields/modules;
- module size, source digest, source artifact or package digest mismatch;
- noncanonical JSON, multiple records or oversized transport;
- linked, wrong-owner, group/world-writable or unstable package files;
- linked, wrong-owner or group/world-writable package directories;
- source comments, dynamic import/code, CommonJS `require`, packages, added
  built-ins, escaping imports and unreachable modules.

The package is not extracted before execution.

### Detached signed release

```text
algorithm:           Ed25519
issuer:              issuer:fdos-worker-package-pilot
key:                 key:a189dda72dfdc5905ee62a94
issued:              2026-07-29T16:15:00.000Z
attestation digest:  sha256:ab215bdffa00f974093a6cc4f15534037a90c77543644ceda524d5d58418808c
trust-anchor digest: sha256:78dccc7696bb736ab5135ef8c3fc1745dcd413e5a8640b43cd9e5c68935fe01b
```

The release API creates a canonical unsigned attestation request and accepts
only the canonical base64url representation of a detached 64-byte Ed25519
signature. It has no private-key parameter.

The private key used for the pilot fixture was ephemeral and discarded. Only
the public descriptor, descriptor digest pin and attestation are stored in
FDOS.

## 4. Parent, Bootstrap and Protocol

### Parent preflight

Before every process-only or Darwin launch, the parent:

1. stably opens and reads the exact package file;
2. verifies canonical encoding and every module digest;
3. reconstructs the complete source artifact;
4. verifies the exact closed import graph;
5. verifies the package release signature;
6. requires the exact public trust-descriptor digest pin;
7. binds the result in protocol 1.3.

### Bootstrap preflight

The fixed child bootstrap receives only the absolute package path and a
bounded canonical public release envelope. Before evaluating packaged code it
repeats package, graph, signature and trust-pin verification.

It then creates exact Node.js VM modules from the verified strings and admits
only the fixed relative graph plus:

```text
node:crypto
node:fs/promises
node:net
```

The VM loader is experimental and is not a sandbox.

### Protocol 1.3

The exact request/response binding is:

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

The response additionally requires:

```text
packageDigestMatched: true
releaseSignatureVerifiedByBootstrap: true
evaluatedFromVerifiedMemory: true
```

These local bootstrap observations enter response and simulated result
digests. They are not independent workload attestation.

## 5. Verification

### Static and complete regression

```text
npm run check
tests 132
pass 132
fail 0
skipped 0
```

### Coverage

```text
npm run coverage
tests 132
pass 132
fail 0

line coverage:     90.77%
branch coverage:   78.85%
function coverage: 92.15%

worker-package-contract.js:
line coverage:     95.09%
branch coverage:   77.78%
function coverage: 100.00%

worker-package-release.js:
line coverage:     88.86%
branch coverage:   63.38%
function coverage: 100.00%

dry-run-worker-package.js:
line coverage:     90.76%
branch coverage:   84.62%
function coverage: 91.67%

dry-run-worker-bootstrap.js:
line coverage:     79.13%
branch coverage:   68.57%
function coverage: 85.71%

process-separated-dry-run-worker.js:
line coverage:     87.00%
branch coverage:   86.08%
function coverage: 88.89%

dry-run-worker-protocol.js:
line coverage:     92.21%
branch coverage:   80.21%
function coverage: 100.00%
```

The packaged entry point uses virtual VM-module identifiers and does not
appear as a separate filesystem row in Node's aggregate report. Its behavior
is exercised through the complete process-only and Darwin end-to-end paths.

Coverage does not prove VM-module stability, immutable deployment,
bootstrap integrity or hostile-host resistance.

### Focused behavior

Twenty-two artifact/package/process-worker cases passed, including:

- deterministic package and artifact rebuild equality;
- valid recorded release and exact trust-anchor pin;
- detached signer request with no runtime private-key input;
- exact source-set and canonical 64-byte signature enforcement;
- changed package, signature, trust pin and unexpected-field rejection;
- noncanonical, linked and writable package/path rejection;
- newly packaged unapproved built-in rejection;
- exact protocol 1.3 package observation binding;
- independent bootstrap trust mismatch rejection before package evaluation;
- real-child request package mismatch rejection;
- successful process-only and Darwin-required execution;
- crash-before-response, response-then-crash, timeout and sandbox-bypass
  rejection;
- unchanged Outbox and human-only uncertainty reconciliation.

### End-to-end demos

```text
npm run demo
run status:             completed
tasks:                  4 completed
accepted Invocations:   14
committed transactions: 14
verified audit events:  29
external actions:       false
```

```text
npm run demo:outbox
run status:                              completed
delivery status:                         simulated
package digest:                          sha256:046b7dd22fc2454865139fd6951e2ccc7bfba4f1fa497a5831b164c77794fec4
release attestation verified by parent:  true
release signature verified by bootstrap: true
evaluated from verified memory:          true
network isolation enforced:              false
external effect:                         none
accepted Invocations:                    12
committed transactions:                  12
verified audit events:                   22
```

```text
npm run demo:sandbox
run status:                              completed
delivery status:                         simulated
package digest:                          sha256:046b7dd22fc2454865139fd6951e2ccc7bfba4f1fa497a5831b164c77794fec4
release attestation verified by parent:  true
release signature verified by bootstrap: true
evaluated from verified memory:          true
network isolation enforced:              true
filesystem-write isolation:              true
external effect:                         none
accepted Invocations:                    12
committed transactions:                  12
verified audit events:                   22
```

No service adapter or external request exists. Both workers execute only the
digest-based local simulation.

### Source-manifest verification

From `02_Reference_Implementations/FDOS_Runtime/`:

```text
shasum -a 256 -c \
  ../../04_Evidence/fdos-runtime/EV-FDOS-WORKER-PACKAGE-010_Source_Manifest.sha256
75 files OK
```

## 6. Fail-Closed Release Evolution

The first generated package and release were correctly invalidated when the
protocol's package-observation comparison was narrowed to the exact binding
projection. That code change created new source-artifact and package digests.

After the admitted execution sources stabilized, the package was rebuilt and
issued with a new ephemeral key. The previous fixture and private key were
discarded.

This is positive evidence that admitted source changes require a new package
and release. It is not evidence of automated or protected production release
infrastructure.

## 7. Negative Evidence and Limits

This evidence does not prove:

- immutable package/object/image storage or atomic deployment;
- protection if parent, bootstrap, verifier and repository trust pin are
  replaced together;
- externally protected release signing or public-trust provisioning;
- HSM, KMS, offline custody, expiry, revocation or transparency;
- stable production support for Node.js VM modules;
- a general JavaScript/package dependency analyzer;
- Node.js executable, built-in module, OS, boot-chain or remote provenance;
- independently authenticated parent, worker or signed response;
- a supported portable sandbox or complete resource isolation;
- secret-vault behavior;
- a real API/model/connector;
- service idempotency, rate, cost or concurrency controls;
- independent CI, penetration test, security review or human acceptance;
- production readiness.

## 8. Interpretation

Supported conclusion:

> On the recorded runtime manifest and trusted local host, FDOS can
> deterministically package its admitted dry-run worker modules, verify exact
> package and release identities in both parent and bootstrap, evaluate only
> the verified in-memory module strings and reject common package, signature,
> trust and protocol mismatches without recording false success or
> automatically retrying.

Unsupported conclusions:

- the package is stored immutably;
- the release signer or trust pin is externally protected;
- the bootstrap, Node.js runtime or host is independently attested;
- the worker response has independent workload identity;
- any GitHub, document, Slack, Teams, MCP or other service connector works;
- the pattern is production ready or an FDOS Core standard.

## 9. Governance

All implementation and documentation changes are confined to `fdos-genesis`.
TapTime and Company AI remain unchanged read-only references.

This Evidence Record supports Human Governance review of Technical Slice 10.
It authorizes no model call, real networked connector, external action,
production operation, FDOS Core change or knowledge promotion.
