# ADR-0052 — Ephemeral Workload Session and Authenticated Response Experiment

Status: Implemented for Experiment; Human Review Pending; Not Accepted into
FDOS Core

Decision Date: 2026-07-29

Decision Owner: Human Governance

Validation Level: Level 1 — Experimental

Related Decisions:

- `ADR-0046_Connector_Contract_and_Durable_Outbox_Experiment.md`
- `ADR-0048_Process_Separated_Dry_Run_Worker_Experiment.md`
- `ADR-0049_Darwin_Network_and_Write_Sandbox_Experiment.md`
- `ADR-0050_Signed_Worker_Source_Artifact_Experiment.md`
- `ADR-0051_Deterministic_Signed_Worker_Package_Experiment.md`

## Decision

Every Level 1 dry-run worker launch shall use one fresh, parent-generated
256-bit challenge and one fresh child-bootstrap-generated Ed25519 key pair.

After independently verifying the signed worker package, the bootstrap shall
create the key pair in child-process memory. It shall expose only the public
session descriptor and a one-use response-signing function to the verified
packaged worker. The private key shall not enter the request, environment,
package, response or runtime result.

Worker protocol version 1.4 shall bind the challenge into the exact request.
The child shall return one canonical authenticated response envelope whose
signature binds:

- the complete workload-session digest;
- the exact worker-request digest;
- the exact worker-response digest.

The workload session shall bind its public key and challenge to the complete
verified package, artifact, release, trust-anchor, issuer and key identity.
The response and simulated result digest shall include a minimized session
observation. The parent shall verify the full signed envelope and require the
minimized observation to equal the verified session evidence before accepting
the result.

This decision authorizes local response authentication for an ephemeral
bootstrap-created session. It does not establish independent workload
identity, remote attestation, immutable bootstrap provenance or production
authentication.

## Context

ADR-0051 ensures that parent and bootstrap verify the same canonical package
and that the bootstrap evaluates only verified in-memory module strings. Its
protocol response nevertheless relied on the parent process and operating
system channel for authenticity.

The next bounded question is whether FDOS can:

- make every worker launch cryptographically unique;
- prevent a response from being replayed under another parent challenge;
- bind the response signer to the exact admitted package;
- authenticate the exact request and exact response without exporting a
  private key;
- preserve only content-minimized session evidence in the runtime result;
- reject both invalid signatures and validly signed identity confusion;
- retain no-network, no-effect, clean-exit and human-only uncertainty rules.

## Session Rule

Before constructing protocol 1.4, the parent shall generate exactly 32 random
bytes with the operating-system cryptographic random source and encode them
as canonical unpadded base64url.

The bootstrap shall read and delete the challenge environment field before
packaged code evaluates. Only after package and release verification shall it:

1. generate a fresh Ed25519 key pair;
2. construct a closed workload-session descriptor;
3. derive `key:session-<24 hexadecimal characters>` from the SHA-256
   fingerprint of the public SPKI bytes;
4. bind the complete verified worker-package identity;
5. retain the private `KeyObject` only in a bootstrap closure;
6. permit exactly one response-signing operation.

The session descriptor is public evidence. Its public key is not a configured
trust anchor and does not independently prove which workload created it.

## Signature Rule

The exact canonical signature statement is:

```text
schemaVersion
kind
sessionDigest
requestDigest
responseDigest
```

The child signs its canonical JSON bytes with Ed25519. The returned envelope
contains the complete session descriptor, exact response, canonical 64-byte
signature and a digest over the complete unsigned envelope.

The parent shall reject:

- noncanonical JSON, base64url, public keys or signatures;
- unsupported schemas, algorithms, modes or unexpected fields;
- a key ID that does not match the public-key fingerprint;
- a response or envelope digest mismatch;
- a challenge or complete package-binding mismatch;
- an invalid Ed25519 signature;
- a response outside the request validity window;
- any mismatch between authenticated session evidence and the response-bound
  session observation;
- any non-zero exit, signal or standard-error output.

## Durable Binding Rule

The response shall not duplicate the full public key or raw challenge inside
the durable worker boundary. It shall include:

```text
kind
mode
keyId
sessionDigest
challengeDigest
packageBindingDigest
ephemeralKeyGeneratedByBootstrap: true
externallyAttested: false
```

This minimized observation enters the worker-response digest and simulated
result digest. The parent recomputes it from the authenticated full session
and compares every identity field.

The raw challenge, public key, signature and full envelope are returned only
as transient verification material. The stable runtime result exposes
digests and verification booleans, not private material.

## Replay Rule

A signed response is valid only for its exact random challenge, complete
package binding, request digest and response digest.

The bootstrap signer is one-use. FDOS does not maintain a durable nonce
registry for these local sessions; replay resistance depends on generating a
fresh unpredictable challenge for every launch and exact parent verification.
Production ingress would require deployment-scoped identity and replay state
appropriate to that trust domain.

## Failure Rule

Any session, challenge, envelope, signature, response or cross-binding failure
shall produce no accepted worker outcome.

Three real-child fault paths are required:

- the request challenge differs from the challenge supplied to the bootstrap;
- the bootstrap emits an invalid signature over an otherwise valid response;
- the child emits a validly signed response whose minimized session identity
  differs from the signing session.

Each failure leaves the Outbox delivery `claimed`. After lease expiry, only
Human Governance may reconcile it to `uncertain`. There is no automatic retry
and no unsigned-response fallback.

## Trusted Computing Base

The authenticated session narrows response substitution and confusion inside
the tested protocol. Its trusted computing base still includes:

- the FDOS parent and challenge generator;
- the mutable child bootstrap and session-authority implementation;
- the package and release verifiers;
- the Node.js executable, crypto implementation and VM loader;
- the host operating system, account and process launch;
- the repository-local pilot trust fixture;
- the optional deprecated Darwin sandbox launcher and policy.

An actor able to replace the bootstrap can generate another key, claim the
same bootstrap observations and sign a forged response. The scheme therefore
authenticates possession of a launch-local private key, not an independently
attested workload or immutable deployment identity.

## Expected Evidence

The experiment should demonstrate or falsify:

- unique Ed25519 public-key identity across launches;
- canonical 32-byte challenge and 64-byte signature enforcement;
- one-use response signing;
- exact session, request, response and package binding;
- signature, response-content and envelope-content tamper rejection;
- replay rejection under another challenge or package;
- real-child challenge, signature and session-observation fault rejection;
- session observation inclusion in response and simulated result digests;
- private-key absence from environment, package, output and stable result;
- unchanged clean-exit acknowledgement and human-only uncertainty;
- complete regression of all prior Company OS Pilot controls.

## Consequences

Positive:

- each accepted response proves possession of a fresh launch-local private
  key;
- a captured response cannot be moved to another random challenge or package;
- request, response and package identities meet in one signed statement;
- the durable result binds minimized session identity without persisting the
  public key, signature or challenge;
- valid-signature identity confusion is tested separately from bad
  cryptography;
- no private session key crosses a serialization boundary.

Negative:

- the bootstrap self-issues the session key and remains mutable;
- the parent supplies the challenge through same-host process state;
- private-key lifetime depends on Node.js memory management and process exit;
- no secure key destruction, hardware protection or memory-confidentiality
  claim exists;
- no certificate chain, external identity provider, revocation or remote
  attestation exists;
- the authenticated envelope is transient rather than a separately retained
  audit artifact;
- process-only and deprecated Darwin isolation limitations remain unchanged.

## Promotion Rule

This decision authorizes no real connector and no FDOS Core promotion.

Promotion requires an immutable deployment object or image, externally
protected release trust, a supported container or VM boundary, read-only root
filesystem, workload identity issued or attested outside the mutable
bootstrap, authenticated transport, replay controls, revocation, monitoring,
incident response, independent review and Human Governance approval.
