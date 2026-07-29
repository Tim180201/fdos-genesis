# Company OS Pilot — Validation Report 011

Status: Technical Slice 11 Passed / Human Review Pending

Date: 2026-07-29

Validation Level: Level 1 — Experimental

## Outcome

FDOS now authenticates every accepted dry-run worker response with a fresh
launch-local Ed25519 key.

The parent generates a fresh 256-bit challenge. After independently verifying
the signed worker package, the fixed bootstrap generates a fresh Ed25519 key
pair, retains the private key in a one-use child-process closure and exposes
only the public session plus response-signing function to verified packaged
code.

Worker protocol 1.4 binds the challenge and complete package identity. The
canonical response envelope signs complete session, request and response
digests. A minimized session observation enters the worker response and
simulated result digest; the parent cross-compares it with evidence derived
from the authenticated full session.

This result proves challenge-bound local response authentication and exact
session cross-binding on the recorded candidate. It does not prove immutable
bootstrap provenance, protected session memory, an externally issued workload
identity, remote attestation or production isolation.

## Acceptance Matrix

| Criterion | Result | Evidence |
|---|---|---|
| Complete automated suite | Passed, 140/140 | `../../04_Evidence/fdos-runtime/EV-FDOS-WORKLOAD-SESSION-011.md` |
| Focused artifact/package/process/session cases | Passed, 30/30 | `test/worker-artifact.test.js`, `test/worker-package.test.js`, `test/process-separated-worker.test.js`, `test/workload-session.test.js` |
| Fresh launch challenge | Passed | operating-system CSPRNG produces exact canonical 32-byte base64url challenge |
| Fresh session key | Passed | distinct Ed25519 fingerprint across independent authorities |
| Private-key serialization boundary | Passed | no private-key field/API/output; closure exposes only session and one-use signer |
| One-use signing | Passed | second signing attempt rejected |
| Exact package binding | Passed | complete package/artifact/release/trust identity included in session |
| Exact request/response binding | Passed | signed statement binds session, request and response digests |
| Canonical envelope | Passed | closed schema, canonical JSON, canonical 64-byte signature and full digest |
| Challenge replay rejection | Passed | envelope fails under a different parent challenge |
| Package replay rejection | Passed | envelope fails under a different complete package binding |
| Content/signature tamper rejection | Passed | changed response and signature rejected |
| Durable session binding | Passed | minimized observation enters response and simulated result digest |
| Valid-signature identity-confusion rejection | Passed | parent rejects authenticated session / durable observation mismatch |
| Real-child challenge mismatch | Passed | no accepted response or Outbox outcome |
| Real-child signature mismatch | Passed | invalid envelope rejected without Outbox outcome |
| Human-only uncertainty | Passed | all new failed claims reconcile after expiry only to `uncertain` |
| Process-only demo | Passed | signed response; network/write isolation remain false |
| Darwin-required demo | Passed on recorded host | signed response plus existing listen/connect/write-open denials |
| No external effect | Passed | `networkAccess: false`, `externalEffect: none` |
| External workload attestation | Not claimed | session explicitly records `externallyAttested: false` |
| FDOS Core promotion | Not requested | Reference Implementation remains Level 1 |

## Recorded Package and Release

The authenticated session contract becomes part of the admitted worker graph.
The recorded candidate is therefore a new deterministic package release:

```text
package id:          worker-package:connector-dry-run
package version:     2.0.0-experimental
package digest:      sha256:51cd86533646d78353ed91fc86e0d16f74fc7b4eb404c722c77d3b4a3d67d196
package file SHA-256: 7af0a5e75570fa7dbe88d4fc334b71a9b1be6d67eb16e4b8a1a801dc7aba0d30
artifact id:         worker:connector-dry-run
artifact version:    3.0.0-experimental
artifact digest:     sha256:59933e5c2830b0a63d32c2938cb00175431495862a2c948af8d3d4c105a7db8a
modules:             13
source bytes:        80,676
serialized bytes:    89,555
attestation digest:  sha256:e78fc5e2f8ca6fd90b19739634c10ec1b06c6ff83ec91776698bd49b754cda93
trust-anchor digest: sha256:c70b21a175dbfa514447d1de2476a7931e52632446abcaee6cba3c8a5da92c39
issuer:              issuer:fdos-worker-package-pilot
key:                 key:449d04c19a66d93bc574d99b
issued:              2026-07-29T14:17:25.900Z
```

The ephemeral release-signing private key was discarded and is not stored in
FDOS. This local fixture still proves no protected external release custody.

## Session and Protocol Binding

### Parent

For every execution, the parent:

1. verifies the canonical signed worker package;
2. generates 32 random challenge bytes;
3. binds the canonical challenge into protocol 1.4;
4. passes the challenge independently to the fixed bootstrap;
5. verifies the returned canonical envelope;
6. verifies challenge, complete package binding and Ed25519 signature;
7. verifies the exact protocol response;
8. cross-compares authenticated and response-bound session identity;
9. requires empty standard error and clean exit before acceptance.

### Bootstrap

Before packaged code evaluates, the bootstrap:

1. reads and deletes the challenge and session-fault environment fields;
2. independently verifies package, graph, release and trust pin;
3. generates a fresh Ed25519 key pair;
4. creates the public challenge/package-bound session;
5. retains the private key only in a one-use closure;
6. exposes immutable public session and signer globals;
7. evaluates the fixed entry point from verified in-memory strings.

### Signed statement

```text
sessionDigest
requestDigest
responseDigest
```

### Durable observation

```text
keyId
sessionDigest
challengeDigest
packageBindingDigest
ephemeralKeyGeneratedByBootstrap: true
externallyAttested: false
```

The complete observation enters the response and simulated result digests.
The full session, public key and signature remain transient verification
material rather than raw durable Outbox evidence.

## Verification

### Static and complete regression

```text
npm run check
tests 140
pass 140
fail 0
skipped 0
```

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

The packaged entry point runs through virtual VM-module identifiers and does
not appear as a separate filesystem coverage row. Coverage supports source
review; it does not prove cryptographic implementation correctness, entropy,
host-memory confidentiality, secure erasure or independent workload identity.

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

## Fault Results

### Session Challenge Mismatch

The real bootstrap received one random challenge while the real protocol
request bound another. The packaged worker rejected the session/request
difference and emitted no accepted response.

### Response Signature Mismatch

The real bootstrap generated the launch key and the real worker produced an
otherwise exact response. Fault injection changed the signature. Parent
Ed25519 verification rejected the envelope.

### Authenticated Session Observation Mismatch

The real child emitted a validly signed response, but the response-bound
observation named a different valid-shaped session key ID. Signature and
protocol shape verified; the parent's explicit envelope/result cross-check
rejected the identity confusion.

Every fault retained the active claim without recording an outcome. After
controlled expiry, Human Governance reconciled only to `uncertain`.

## Open Findings

1. The mutable bootstrap self-issues the response key.
2. The response therefore proves key possession, not external workload
   identity.
3. An actor able to replace parent/bootstrap/verifier can forge the whole
   local boundary.
4. The challenge crosses same-host process launch state and standard input.
5. No durable session nonce ledger exists; local replay resistance relies on
   fresh 256-bit challenges.
6. Node.js and the operating-system random source are trusted.
7. The private key remains in process memory until release by Node.js/process
   exit.
8. No secure erasure, locked memory, enclave, HSM or memory-confidentiality
   evidence exists.
9. No certificate chain, expiry, revocation, transparency or remote
   attestation exists.
10. The authenticated envelope is verified transiently rather than retained
    as a separate signed audit artifact.
11. Package, bootstrap, verifier and pilot trust pin remain owner-writable
    repository files.
12. Process-only mode still has no OS resource isolation.
13. The optional Darwin sandbox remains deprecated, incomplete and local.
14. No supported container/VM image, read-only root filesystem or external
    identity provider was exercised.
15. No real API, secret, DNS/TLS path, service idempotency or external effect
    was exercised.
16. No independent CI, cryptographic review, security review or Human
    Governance acceptance exists.

## Decision Request

Human Governance may accept Technical Slice 11 only as Level 1 evidence for:

- fresh challenge generation per local worker launch;
- bootstrap-generated, non-exported and one-use response keys;
- exact session, package, request and response digest binding;
- canonical authenticated response envelopes;
- transient Ed25519 response verification;
- durable minimized session evidence with exact parent cross-binding;
- tamper, replay, bad-signature and valid-signature identity-confusion
  rejection;
- preservation of clean-exit acknowledgement and human-only uncertainty.

Before one real read-only connector, FDOS still needs immutable deployment,
protected external release trust, a supported portable container or VM
boundary, read-only root filesystem, externally issued or remotely attested
workload identity, authenticated transport and replay state, revocation,
secrets controls, service-specific schemas/idempotency, monitoring, incident
response, independent review and Human Governance approval.

This report authorizes no model call, networked connector, write,
publication, message, payment, personnel action, deletion, production
operation or FDOS Core promotion.
