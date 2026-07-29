# Durable Verified Worker Receipt

Status: Experimental Local Audit Binding

Validation Level: Level 1

Production Status: Not Production Ready

Related Decision:

- `../../../00_Specification/ADR/ADR-0053_Durable_Verified_Worker_Receipt_Experiment.md`

## Purpose

Retain a content-minimized, replay-verifiable record of the checks performed
before one process-worker response becomes a durable Outbox outcome.

The receipt closes the audit gap between transient response-envelope
verification and the previous result-digest-only Outbox history. It does not
retain the workload signature, public key, random challenge, raw Delivery
Intent parameters, standard output or standard error.

## Acceptance Flow

```text
child exits cleanly
  -> parent verifies canonical authenticated envelope
  -> parent verifies session, signature, package and protocol response
  -> parent cross-binds minimized session observation
  -> parent constructs one closed verified-worker receipt
  -> connector signs exact record-worker-outcome command
  -> runtime verifies receipt against active delivery and fencing claim
  -> one transaction records Invocation acceptance and outcome event
  -> event replay revalidates receipt, command type and active claim
  -> evidence export projects receipt plus minimized Invocation authentication
```

The generic `outbox.record-outcome` command remains available for typed
failure, uncertainty and compatibility paths. Its closed command schema
rejects a `workerReceipt` field.

Only `outbox.record-worker-outcome` may carry a receipt. That command requires
all five fields:

```text
deliveryId
claimId
outcome
evidence
workerReceipt
```

It accepts only a `simulated` no-effect outcome whose result digest exactly
matches the receipt.

## Closed Receipt

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

Unexpected fields fail closed at every level.

### Request binding

The request projection contains:

```text
requestId
deliveryId
claimId
claimAttempt
connectorId
issuedAt
expiresAt
deliveryIntentDigest
digest
```

The runtime requires:

- the exact active Delivery ID;
- the active fencing claim ID and monotonic attempt;
- the owning Connector Instance;
- the exact immutable Delivery Intent digest;
- issuance no earlier than the claim;
- expiry no later than the claim lease;
- a response completion inside the request validity window.

Parent and runtime clocks may differ. The Level 1 binding allows at most
30 seconds between the response completion reported by the child path and the
runtime outcome-recording clock. This is a bounded local compatibility rule,
not evidence of synchronized production time.

### Response binding

The response projection contains:

```text
completedAt
resultDigest
digest
envelopeDigest
```

The receipt also retains every content-minimized field needed to reconstruct
the exact protocol 1.4 response:

- request, delivery, claim and connector identities;
- request and result digests;
- completion time;
- no-effect outcome;
- process, network and filesystem-write boundary observations;
- complete worker package/release identity and verification booleans;
- minimized workload-session observation.

Receipt normalization rebuilds that response and requires the reconstructed
SHA-256 digest to equal `response.digest`.

The full authenticated envelope cannot be reconstructed because its raw
challenge, public key and signature are deliberately omitted.
`envelopeDigest` is therefore a content-addressed reference to transiently
verified material, not an independently verifiable retained signature.

### Execution and package binding

The receipt requires:

```text
processSeparated: true
shell: false
networkAccess: false
externalEffects: false
```

Network and filesystem-write enforcement, provider, policy digest and probe
values must reproduce one supported protocol boundary:

- process-only with both enforcement flags false and probes `not_run`; or
- the recorded Darwin-required profile with both enforcement flags true and
  exact denial-probe results.

The complete package binding includes package, artifact, attestation,
trust-anchor, issuer and key identity. The receipt requires parent-admitted
bootstrap observations:

```text
packageDigestMatched: true
releaseSignatureVerifiedByBootstrap: true
evaluatedFromVerifiedMemory: true
```

The workload-session `packageBindingDigest` must equal the SHA-256 digest of
that exact package binding.

### Session and parent-verification binding

The minimized session evidence requires:

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

The receipt also requires affirmative parent observations for:

```text
authenticatedEnvelopeVerified
canonicalResponseVerified
protocolResponseVerified
outputBoundsVerified
emptyStandardErrorVerified
cleanProcessExitVerified
```

These booleans are generated only after the corresponding local checks pass.
They are claims by the mutable local parent, not remote attestation.

## Durable Authentication

The receipt itself is content-addressed with canonical SHA-256. The exact
`outbox.record-worker-outcome` command, including that receipt, is signed by
the registered Connector Instance through the existing Ed25519 Invocation
boundary.

The same SQLite transaction stores:

- the verified Invocation receipt;
- its exact command digest;
- the connector outcome event;
- the complete minimized worker receipt.

On replay, FDOS requires that a receipt-bearing outcome event was produced by
the `outbox.record-worker-outcome` operation. It reconstructs the exact
command from the outcome event and requires its digest to equal the verified
Invocation command digest. An old or generic `outbox.record-outcome`
Invocation cannot be reinterpreted as a verified worker outcome.

The evidence projection includes:

- the complete minimized worker receipt;
- Invocation and correlation IDs;
- exact command digest;
- Invocation envelope and receipt digests;
- issuer and key IDs;
- authentication method and assurance;
- verification time.

It excludes the Connector Invocation signature and public key. Independent
cryptographic replay therefore still requires the separately governed trust
material and original Invocation envelope.

## Failure Semantics

FDOS rejects:

- missing or extra receipt fields;
- changed receipt or nested response digests;
- a response digest that cannot be reconstructed;
- a wrong Delivery, claim, attempt, Connector Instance or intent digest;
- a result digest different from the Outbox outcome;
- request or response times outside their bounded windows;
- inconsistent process, network, write-isolation or probe claims;
- changed package/session binding;
- any false verification flag;
- raw signature, key, challenge, parameters or response fields;
- a receipt on the generic outcome command;
- a receipt event attributed to the wrong Invocation operation.

A rejected receipt records no Outbox outcome and leaves the delivery claimed.
Normal claim-expiry and Human Governance uncertainty rules remain unchanged.

## Explicit Non-Claims

The receipt does not establish:

- an independently signed or remotely attested audit artifact;
- immutable parent, bootstrap, verifier, package or trust storage;
- an externally issued workload identity;
- independent proof that the local parent actually performed each asserted
  check;
- protection from a compromised Connector signing key or host account;
- retained signature/public-key material for offline workload verification;
- distributed clock synchronization, replay ledger or revocation;
- a supported portable sandbox;
- a real connector or external effect.

The narrow supported claim is durable, exact, content-minimized recording and
revalidation of the local verified-worker result through an authenticated
Connector command and hash-chained transactional event history.
