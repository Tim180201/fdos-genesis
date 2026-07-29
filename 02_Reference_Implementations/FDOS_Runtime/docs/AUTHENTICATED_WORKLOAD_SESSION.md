# Authenticated Ephemeral Workload Session

Status: Experimental Local Response Authentication

Validation Level: Level 1

Production Status: Not Production Ready

Related Decision:

- `../../../00_Specification/ADR/ADR-0052_Ephemeral_Workload_Session_and_Authenticated_Response_Experiment.md`

## Purpose

Authenticate one exact dry-run worker response with a fresh key that exists
only for one child-process launch.

This closes the unsigned-response gap in the verified-package experiment. It
does not turn the mutable bootstrap into an independently attested workload.

## Verified Flow

```text
parent verifies signed worker package
  -> parent generates fresh random 32-byte challenge
  -> protocol 1.4 binds challenge and complete package identity
  -> fixed bootstrap repeats package/release verification
  -> bootstrap generates fresh Ed25519 key pair in child memory
  -> private key remains inside a one-use signing closure
  -> public session binds challenge + complete package identity
  -> packaged worker verifies request/session equality
  -> response binds minimized session observation into result digest
  -> bootstrap-held key signs session + request + response digests
  -> child emits one canonical authenticated envelope
  -> parent verifies envelope digest, session, package and signature
  -> parent verifies protocol response and exact session cross-binding
  -> clean exit permits digest-only Outbox outcome recording
```

## Challenge

`ProcessSeparatedDryRunWorker` generates 32 random bytes for every execution
and encodes them as canonical, unpadded base64url.

The challenge:

- is carried in protocol 1.4;
- is supplied independently to the fixed bootstrap;
- must match in bootstrap session, packaged request and parent verification;
- is represented only by a digest in the stable result;
- is never reused intentionally.

No durable challenge registry exists in this Level 1 experiment.

## Ephemeral Key

Only after verifying the canonical worker package and release does the
bootstrap generate an Ed25519 key pair.

The private `KeyObject`:

- remains in a closure in the child process;
- is not placed in an environment field or global property;
- is not serialized into the request, session, response or result;
- signs at most one response;
- is released with process memory when the child exits.

FDOS does not claim secure key erasure or protection against same-account
memory inspection.

The public key is exported as canonical PEM. Its DER SHA-256 fingerprint
derives the session key ID:

```text
key:session-<first 24 hexadecimal fingerprint characters>
```

## Complete Session Binding

The public session descriptor has a closed schema:

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

`workerPackage` is the complete protocol binding:

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

Changing any field changes the session digest and invalidates exact
verification.

## Signed Statement and Envelope

The one-use authority signs canonical JSON for:

```text
schemaVersion: 1.0
kind: fdos-workload-response-signature-statement
sessionDigest
requestDigest
responseDigest
```

The exact authenticated envelope contains:

```text
schemaVersion: 1.0
kind: fdos-authenticated-worker-response
workloadSession
response
signature
digest
```

The signature must be the canonical unpadded base64url representation of
exactly 64 bytes. The session challenge must decode canonically to exactly 32
bytes. The public key must parse as Ed25519 and its fingerprint must match the
declared key ID.

## Durable Session Observation

The response and simulated result digest contain only:

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

The parent derives the same values from the authenticated full session and
compares them field by field. This prevents a valid signature from
authenticating one session while the durable result claims another.

The observation is meaningful only together with parent verification of the
full envelope. By itself it is not an attestation.

## Protocol 1.4 Acceptance

The parent accepts a result only after all existing package, request,
isolation, response, output and clean-exit checks plus:

1. canonical envelope parsing;
2. exact envelope digest reconstruction;
3. exact challenge equality;
4. complete worker-package binding equality;
5. Ed25519 response-signature verification;
6. exact response digest and request-digest binding;
7. exact session observation comparison;
8. normal child exit with empty standard error.

The stable result reports:

```text
responseDigest
responseEnvelopeDigest
workloadSession.keyId
workloadSession.sessionDigest
workloadSession.challengeDigest
workloadSession.packageBindingDigest
workloadSession.responseSignatureVerified: true
workloadSession.challengeMatched: true
workloadSession.packageBindingMatched: true
workloadSession.externallyAttested: false
```

No signature or public key is copied into the stable runtime result.

## Fault Evidence

`session-challenge-mismatch` gives the real bootstrap one challenge and binds
another into the real request. The child rejects before returning an accepted
response.

`response-signature-mismatch` lets the real bootstrap create the session but
changes the canonical signature before the real child emits the envelope.
The parent rejects cryptographic verification.

`session-observation-mismatch` lets the real child produce a validly signed
response whose durable observation names another valid-shaped key ID. The
parent verifies the signature and then rejects the observation/envelope
identity mismatch.

All three paths record no outcome. After claim expiry they permit only
Human-Governance-controlled reconciliation to `uncertain`.

## Explicit Non-Claims

This slice does not establish:

- an externally issued or remotely attested workload identity;
- proof of bootstrap, verifier, Node.js, OS or boot provenance;
- immutable package, bootstrap or trust storage;
- HSM, KMS, enclave or hardware-backed session keys;
- secure memory erasure or confidentiality from the host account;
- authenticated transport between different hosts;
- durable nonce/replay state for a network service;
- certificate expiry, revocation or transparency;
- a supported portable sandbox;
- a real connector or external action.

The session authenticates possession of a key generated by the currently
running mutable bootstrap. Production requires an immutable workload boundary
and identity rooted outside that bootstrap.
