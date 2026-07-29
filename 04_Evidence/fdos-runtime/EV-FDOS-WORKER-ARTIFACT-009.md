# Evidence Record — Signed Worker Source Artifact Experiment

Status: Evidence Item / Human Review Required

Project: FDOS Company OS Pilot

Date: 2026-07-29

Confidence: High for the recorded source inspection, release signature and
protocol-binding behavior; Low for immutable deployment, protected release
trust, same-account race resistance or independent workload identity

FDOS Validation Level: Level 1 — Experimental

Core Impact: None

## 1. Purpose

Record executable evidence that FDOS can reconstruct the exact source graph
of its no-effect worker, verify one locally trusted Ed25519 release before
spawn, bind that release through the process protocol and reject changed
source or child artifact identity without recording false success.

This record does not claim immutable packaging, a production software supply
chain or a real connector.

## 2. Evaluated Source

Change baseline:

- FDOS commit:
  `cfc793097e2e8ac8ccd81014a4faa03180479b5f`
- FDOS tree:
  `b1fad6e6a0df56542add1c38207d414bb5db402f`

The complete 66-file runtime candidate is bound by:

- manifest:
  `EV-FDOS-WORKER-ARTIFACT-009_Source_Manifest.sha256`
- manifest digest:
  `sha256:e6aef572d512d82f93e2ee41d007e8dde7deaf3005f79b55361344219ed2fad2`

Test environment:

- runtime package: `@fdos/runtime-reference@0.9.0-experimental`
- Node.js: `v26.3.1`
- macOS: `26.5.1`, build `25F80`
- operating-system kernel: `Darwin 25.5.0 arm64`

Compatibility outside this exact environment was not independently
exercised.

## 3. Artifact and Release Binding

### Fixed identity

```text
artifact id:        worker:connector-dry-run
artifact version:   1.0.0-experimental
entry point:        src/workers/dry-run-connector-worker.js
source files:       12
source bytes:       84546
artifact digest:    sha256:b1a6b08b65cdbb7042675633f356f0a092ca9227dddd17d79fb4121052234bc9
```

The fixed source list contains the worker, protocol, artifact inspector and
their admitted domain/kernel dependencies. Every listed source must be
reachable from the entry point.

### Filesystem and graph policy

Inspection rejects:

- linked, unavailable, non-directory or group/world-writable source paths;
- linked, non-regular, empty, oversized, group/world-writable or unstable
  files;
- invalid UTF-8 or more than 1 MiB total source;
- source comments, dynamic import/code, CommonJS `require`, bare packages,
  added Node.js built-ins, non-fixed specifiers, source-root escape,
  duplicate/unlisted imports or unreachable listed files.

Each file is opened by descriptor with final-component no-follow behavior
where supported. Device, inode, size, times and mode must remain stable across
the complete read.

### Signed release

```text
algorithm:          Ed25519
issuer:             issuer:fdos-worker-release-local
key:                key:3ad79fe92da3585ad472c6c6
issued:             2026-07-29T14:00:00.000Z
attestation digest: sha256:66ff84c603f7ea5ee0c1179560d9615a83faadb964f7f1982376f6c3f74eb97e
```

The private key was not stored in FDOS. The public trust descriptor and
attestation are exact closed objects. Unknown keys, issuer mismatch, changed
artifact, changed signature and unexpected fields fail closed.

## 4. Protocol and Runtime Observation

Worker protocol 1.2 binds:

```text
artifactId
artifactVersion
artifactDigest
attestationDigest
issuerId
keyId
```

The parent reconstructs and verifies the release before each spawn. The child
reconstructs its local artifact and compares identity, version and digest to
the request. Its response may then contain:

```text
localDigestMatched: true
```

The exact release binding and observation enter the canonical response and
simulated result digests. The child observation does not independently
authenticate the parent or signer; signature verification occurs in the
parent.

## 5. Verification

### Static and complete regression

```text
npm run check
tests 125
pass 125
fail 0
skipped 0
```

### Coverage

```text
npm run coverage
tests 125
pass 125
fail 0

line coverage:     90.26%
branch coverage:   79.04%
function coverage: 90.82%

worker-artifact-attestation.js:
line coverage:     90.00%
branch coverage:   69.88%
function coverage: 100.00%

dry-run-worker-artifact.js:
line coverage:     88.32%
branch coverage:   84.52%
function coverage: 92.86%

process-separated-dry-run-worker.js:
line coverage:     86.19%
branch coverage:   87.14%
function coverage: 88.89%

dry-run-worker-protocol.js:
line coverage:     91.92%
branch coverage:   80.81%
function coverage: 100.00%

dry-run-connector-worker.js:
line coverage:     55.68%
branch coverage:   36.36%
function coverage: 50.00%
```

Coverage does not prove parser completeness, immutable deployment or
same-account race resistance.

### Focused behavior

Fifteen artifact/process-worker cases passed, including:

- exact request, response, release and local-digest binding;
- missing release binding rejection;
- mismatched response observation rejection;
- fixed artifact graph and valid pilot release verification;
- source-byte, signature, foreign-key and unexpected-field rejection;
- undeclared import, group-writable source and symbolic-link rejection;
- deliberate child artifact-binding mismatch rejection;
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
run status:                             completed
delivery status:                        simulated
artifact digest:                        sha256:b1a6b08b65cdbb7042675633f356f0a092ca9227dddd17d79fb4121052234bc9
release attestation verified by parent: true
child local artifact digest matched:    true
network isolation enforced:             false
external effect:                        none
accepted Invocations:                   12
committed transactions:                 12
verified audit events:                  22
```

```text
npm run demo:sandbox
run status:                             completed
delivery status:                        simulated
artifact digest:                        sha256:b1a6b08b65cdbb7042675633f356f0a092ca9227dddd17d79fb4121052234bc9
release attestation verified by parent: true
child local artifact digest matched:    true
network isolation enforced:             true
filesystem-write isolation:             true
external effect:                        none
accepted Invocations:                   12
committed transactions:                 12
verified audit events:                  22
```

No service adapter or external request exists. Both workers execute only the
digest-based local simulation.

### Source-manifest verification

From `02_Reference_Implementations/FDOS_Runtime/`:

```text
shasum -a 256 -c \
  ../../04_Evidence/fdos-runtime/EV-FDOS-WORKER-ARTIFACT-009_Source_Manifest.sha256
66 files OK
```

## 6. Fail-Closed Release Evolution

The first focused regression after artifact-domain hardening correctly failed
the old embedded release: changing signed source changed the artifact digest.

The inspector was then hardened to use descriptor reads, trusted directory
checks and stable metadata. The child observation field was narrowed from the
ambiguous `selfVerified` to `localDigestMatched`. Only after all artifact
source stabilized was the recorded release issued with a new ephemeral local
key. Its private key was discarded.

This is positive evidence that source changes invalidate the old release. It
is not evidence of an automated or protected production release process.

## 7. Negative Evidence and Limits

This evidence does not prove:

- immutable packaging or atomic deployment;
- resistance to malicious source changes between parent inspection and module
  loading;
- pre-execution child measurement, because modules load before observation;
- protection when the same actor can replace both source and local trust;
- protected signing-key custody, expiry, revocation or transparency;
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

> On the recorded source manifest and trusted local host, FDOS can reconstruct
> one closed worker source graph, verify an exact Ed25519 release before spawn,
> bind that release through its worker protocol and reject common source,
> signature, trust and child-binding mismatches without recording false
> success or automatically retrying.

Unsupported conclusions:

- the worker package is immutable;
- the release trust is independently protected;
- a malicious same-account source race is prevented;
- the worker or response has independent workload identity;
- any GitHub, document, Slack, Teams, MCP or other service connector works;
- the pattern is production ready or an FDOS Core standard.

## 9. Governance

All implementation and documentation changes are confined to `fdos-genesis`.
TapTime and Company AI remain unchanged read-only references.

This Evidence Record supports Human Governance review of Technical Slice 9. It
authorizes no model call, real networked connector, external action,
production operation, FDOS Core change or knowledge promotion.
