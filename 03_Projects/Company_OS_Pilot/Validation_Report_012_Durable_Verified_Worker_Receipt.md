# Company OS Pilot — Validation Report 012

Status: Technical Slice 12 Passed / Human Review Pending

Date: 2026-07-29

Validation Level: Level 1 — Experimental

## Outcome

FDOS now retains one closed Verified Worker Receipt for every accepted
process-worker simulation.

The receipt is constructed only after canonical envelope, session, signature,
protocol response, output bounds, empty standard error and clean process exit
have passed. It contains enough content-minimized structure to reconstruct the
exact protocol 1.4 response digest while excluding Delivery parameters,
random challenge, public/private key, signature and raw process output.

A distinct signed `outbox.record-worker-outcome` command binds the receipt to
the active Delivery, fencing claim, attempt, Connector Instance, Delivery
Intent, request window and result digest. Receipt, authenticated Invocation
and outcome commit together and survive SQLite restart.

This result proves durable local audit binding for the recorded candidate. It
does not prove an independently signed execution receipt, immutable parent,
protected Connector key custody, external workload identity, remote
attestation or production isolation.

## Acceptance Matrix

| Criterion | Result | Evidence |
|---|---|---|
| Complete automated suite | Passed, 140/140 | `../../04_Evidence/fdos-runtime/EV-FDOS-WORKER-RECEIPT-012.md` |
| Focused Connector/worker suite | Passed, 29/29 | `test/connector-outbox.test.js`, `test/process-separated-worker.test.js` |
| Closed receipt schema | Passed | exact nested shapes and canonical SHA-256 |
| Response reconstruction | Passed | receipt rebuilds exact protocol 1.4 response digest |
| Active Delivery binding | Passed | Delivery, claim, attempt, Connector and intent digest |
| Exact outcome binding | Passed | only simulated no-effect result with equal digest |
| Command separation | Passed | generic command rejects receipt; worker command requires it |
| Authenticated transaction | Passed | Invocation acceptance, command digest, receipt and event commit together |
| Replay validation | Passed | state rehydration rechecks operation, claim and receipt |
| Restart retention | Passed | receipt and Invocation authentication survive SQLite reopen |
| Evidence projection | Passed | minimized receipt plus command/envelope/Invocation receipt digests |
| Raw-field rejection | Passed | signature-like/raw receipt field rejected |
| Wrong-attempt rejection | Passed | no outcome; active claim preserved |
| Content minimization | Passed | no parameters, raw challenge, PEM key or signature in receipt/evidence |
| Worker package identity | Unchanged | package v2 and artifact v3 digests unchanged |
| Protocol identity | Unchanged | protocol remains 1.4 |
| Process-only demo | Passed | receipt recorded; isolation flags false |
| Darwin-required demo | Passed on recorded host | receipt records verified denial boundary |
| No external effect | Passed | `networkAccess: false`, `externalEffect: none` |
| Independent workload/audit signature | Not claimed | full envelope omitted; local parent/Connector trust remains |
| FDOS Core promotion | Not requested | Reference Implementation remains Level 1 |

## Receipt Contract

The top-level contract is:

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

### Durable request identity

```text
requestId
deliveryId
claimId
claimAttempt
connectorId
issuedAt
expiresAt
deliveryIntentDigest
request digest
```

### Durable response identity

```text
completedAt
resultDigest
response digest
authenticated-envelope digest
```

### Durable boundary identity

- process separation, shell, network and external-effect flags;
- filesystem-write and network-isolation enforcement/probes;
- provider and policy digest;
- complete package, source artifact, attestation, trust, issuer and key
  identity;
- package verification and verified-memory observations;
- minimized workload-session key, session, challenge and package-binding
  digests;
- explicit signature/challenge/package matching booleans;
- `externallyAttested: false`;
- explicit parent verification of authenticated envelope, canonical response,
  protocol response, output bounds, empty standard error and clean exit.

Every level rejects unexpected fields.

## Response Reconstruction

Receipt verification reconstructs the canonical unsigned
`fdos-process-worker-response` from:

- exact request/delivery/claim/connector identities;
- request digest;
- completion time;
- simulated no-effect outcome and result digest;
- complete minimized worker boundary;
- package observation;
- workload-session observation.

The reconstructed SHA-256 must equal the retained response digest.

The authenticated-envelope digest cannot be reconstructed because the raw
challenge, public session key and signature are intentionally omitted. It is a
content-addressed pointer to material verified transiently by the local
parent.

## Authenticated Outcome

The generic command remains:

```text
outbox.record-outcome
```

Its exact schema rejects `workerReceipt`.

The receipt path is:

```text
outbox.record-worker-outcome
```

It requires the receipt and accepts only one exact active simulated outcome.
The Connector Invocation signature covers the complete command, including the
receipt. The event and receipt commit in the same local SQLite transaction as
the verified Invocation receipt.

During rehydration FDOS verifies that a receipt-bearing event came from this
exact operation. It reconstructs the command and matches the verified
Invocation command digest, then reruns receipt normalization, response
reconstruction and active-claim binding before retaining the receipt in state.

## Content-Minimized Evidence

Workflow evidence includes:

- complete minimized receipt;
- Invocation and correlation IDs;
- exact operation and Connector principal;
- command digest;
- Invocation envelope and verified-receipt digests;
- issuer and key IDs;
- authentication method and assurance;
- verification time.

It excludes:

- Delivery parameters and raw result content;
- random workload challenge;
- workload public/private key;
- workload or Connector signature;
- standard output or standard error.

## Verification

### Static and complete regression

```text
npm run check
tests 140
pass 140
fail 0
skipped 0
```

### Focused boundary

```text
node --test --test-concurrency=1 \
  test/process-separated-worker.test.js \
  test/connector-outbox.test.js
tests 29
pass 29
fail 0
```

The focused paths include:

- valid process-only and Darwin receipt construction;
- closed receipt and response-digest verification;
- raw-field rejection;
- wrong-attempt rejection with active-claim preservation;
- generic-command receipt-smuggling rejection;
- distinct authenticated worker-outcome operation;
- durable state and evidence across SQLite restart;
- unchanged crash, timeout, package, session and sandbox failures.

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
```

Coverage supports source review; it does not prove the truth of local parent
assertions, host integrity or external workload provenance.

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
worker receipt:              retained
receipt command digest:      retained
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
worker receipt:                   retained
network isolation enforced:       true
filesystem-write isolation:       true
listen/connect/write-open probes: denied
external effect:                  none
accepted Invocations:             12
committed transactions:           12
verified audit events:            22
```

## Unchanged Worker Release

The receipt is a parent/runtime audit layer and is not part of the packaged
worker source graph. The recorded release remains:

```text
package version:     2.0.0-experimental
package digest:      sha256:51cd86533646d78353ed91fc86e0d16f74fc7b4eb404c722c77d3b4a3d67d196
package file SHA-256: 7af0a5e75570fa7dbe88d4fc334b71a9b1be6d67eb16e4b8a1a801dc7aba0d30
artifact version:    3.0.0-experimental
artifact digest:     sha256:59933e5c2830b0a63d32c2938cb00175431495862a2c948af8d3d4c105a7db8a
attestation digest:  sha256:e78fc5e2f8ca6fd90b19739634c10ec1b06c6ff83ec91776698bd49b754cda93
trust-anchor digest: sha256:c70b21a175dbfa514447d1de2476a7931e52632446abcaee6cba3c8a5da92c39
```

No package release or session private key was generated or changed for this
slice.

## Open Findings

1. The mutable local parent creates and verifies the receipt.
2. The Connector Invocation authenticates the exact command but its key has no
   protected external custody.
3. A compromised parent, Connector key or host can fabricate a locally
   consistent receipt.
4. The full authenticated envelope is omitted, so offline workload-signature
   verification is not possible from the receipt alone.
5. The receipt is not signed independently by the workload or an audit
   authority.
6. Parent/runtime clock compatibility permits up to 30 seconds of skew.
7. No external workload identity, trusted timestamp, revocation or
   transparency service exists.
8. Package, bootstrap, verifier and trust pin remain mutable repository files.
9. Process-only and deprecated Darwin isolation gaps remain unchanged.
10. No real connector, secret, service idempotency or external effect was
    exercised.
11. No independent runner, security review or Human Governance decision exists.

## Governance Recommendation

Human Governance may accept Technical Slice 12 only as Level 1 evidence for:

- durable minimized recording of locally verified worker execution;
- exact protocol-response reconstruction;
- explicit separation of generic and verified-worker outcomes;
- claim-, intent-, result- and Invocation-bound receipt persistence;
- restart-safe content-minimized evidence export;
- rejection of tested receipt confusion and raw-field paths.

Before one real read-only connector, FDOS still needs immutable deployment,
protected release and Connector key custody, a supported portable container or
VM boundary, externally issued or remotely attested workload identity,
independently verifiable signed execution receipts or governed full-envelope
retention, trusted time, replay/revocation controls, monitoring, incident
response, independent review and Human Governance approval.

This report authorizes no model call, networked connector, write,
publication, message, payment, personnel action, deletion, production
operation or FDOS Core promotion.
