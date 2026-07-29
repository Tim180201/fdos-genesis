# ADR-0053 — Durable Verified Worker Receipt Experiment

Status: Implemented for Experiment; Human Review Pending; Not Accepted into
FDOS Core

Decision Date: 2026-07-29

Decision Owner: Human Governance

Validation Level: Level 1 — Experimental

Related Decisions:

- `ADR-0045_Transactional_Authenticated_Command_Experiment.md`
- `ADR-0046_Connector_Contract_and_Durable_Outbox_Experiment.md`
- `ADR-0048_Process_Separated_Dry_Run_Worker_Experiment.md`
- `ADR-0051_Deterministic_Signed_Worker_Package_Experiment.md`
- `ADR-0052_Ephemeral_Workload_Session_and_Authenticated_Response_Experiment.md`

## Decision

Every accepted Level 1 process-worker simulation shall record one closed,
content-minimized Verified Worker Receipt through a distinct authenticated
Connector command.

The parent shall create the receipt only after:

- bounded canonical output verification;
- authenticated envelope, workload session and Ed25519 signature verification;
- exact request, response, package and session-observation verification;
- empty standard error;
- clean child-process exit.

The runtime shall accept the receipt only through
`outbox.record-worker-outcome`. It shall bind the receipt to the exact active
Delivery, fencing claim, attempt, Connector Instance, Delivery Intent, request
window and result digest before recording the outcome.

The generic `outbox.record-outcome` command shall remain available for typed
failure, uncertainty and compatibility behavior, but shall reject any receipt
field. Evidence must distinguish a generic digest-only outcome from a
receipt-backed verified-worker outcome.

The receipt shall be replay-validated from the event log and included in the
content-minimized workflow evidence projection together with the verified
Connector Invocation metadata that authenticated its exact command.

This decision authorizes durable local audit binding. It does not create an
independently signed workload receipt, external attestation or production
audit proof.

## Context

ADR-0052 authenticates one exact worker response with a fresh challenge-bound
session key. The parent previously returned only response, envelope and
session digests plus verification booleans. The Outbox then persisted only the
simulated result digest.

After restart, the event history could prove that an authenticated Connector
recorded a result digest, but it did not retain:

- which worker request and response digests were verified;
- which package/release and session identity were observed;
- which isolation provider, policy and denial probes were bound;
- that response, signature, output bounds and clean exit all passed;
- a durable content-addressed link to the transient envelope digest.

Persisting the complete authenticated envelope would retain the random
challenge, public key and signature in the general company audit history.
That exceeds the current minimization need and would still not make the
mutable bootstrap an externally attested workload.

The bounded question is whether FDOS can retain enough exact structure to
reconstruct and revalidate the accepted protocol response without retaining
raw business parameters or ephemeral cryptographic material.

## Receipt Rule

The receipt shall use a closed versioned schema and canonical SHA-256 digest.
It shall contain only:

- request, Delivery, claim, attempt and Connector identities;
- request issuance, expiry and digest;
- Delivery Intent digest;
- response completion, result, response and envelope digests;
- no-network/no-effect process-boundary observations;
- network and filesystem-write isolation provider, policy and probes;
- complete package/artifact/release/trust identity and verification booleans;
- minimized session key, session, challenge and package-binding digests;
- explicit local parent-verification booleans;
- `externallyAttested: false`.

The receipt shall not contain:

- Delivery Intent parameters or raw task data;
- the random session challenge;
- session public or private keys;
- workload or Connector signatures;
- standard output or standard error;
- raw connector response or error content;
- secrets or credentials.

Unexpected fields shall fail closed.

## Independent Reconstruction Rule

The retained fields shall be sufficient to reconstruct the complete unsigned
protocol 1.4 worker response, including its worker boundary and minimized
session observation.

Receipt verification shall recompute the canonical response SHA-256 and
require equality with the retained response digest.

The envelope digest cannot be independently reconstructed without the omitted
public session and signature. It shall be represented explicitly as a
content-addressed reference to material verified transiently by the local
parent, not as retained independent signature evidence.

## Active-Claim Binding Rule

Before the outcome event is appended, the runtime shall require:

- exact Delivery, claim, attempt and Connector equality;
- exact immutable Delivery Intent digest equality;
- request issuance no earlier than claim acquisition;
- request expiry no later than claim expiry;
- response completion inside the request window;
- no more than 30 seconds local parent/runtime clock skew;
- a simulated outcome with `externalEffect: none`;
- exact result-digest equality.

The receipt may never upgrade a failed or uncertain outcome into verified
worker evidence.

## Invocation and Replay Rule

`outbox.record-worker-outcome` shall be a separate signed Invocation
operation. Its closed command payload shall require the complete receipt.

Invocation acceptance, exact command digest, receipt-bearing outcome event and
state transition shall commit in one local SQLite transaction.

During event replay FDOS shall:

1. verify the accepted Invocation receipt and transaction attribution;
2. require the Invocation operation to be
   `outbox.record-worker-outcome`;
3. reconstruct the exact command and match its verified Invocation digest;
4. verify the active delivery and claim;
5. verify the complete receipt and response reconstruction;
6. reapply the exact binding rules;
7. retain the receipt and its Invocation ID in reconstructed state.

An event from the generic outcome command shall not be reinterpreted as a
verified-worker event.

## Evidence Rule

Workflow evidence shall project the complete minimized receipt plus:

- Invocation and correlation IDs;
- operation and Connector principal ID;
- exact command digest;
- Invocation envelope and receipt digests;
- issuer and key IDs;
- authentication method and assurance;
- verification time.

The evidence bundle shall remain self-digested and shall not expose raw
Delivery Intent parameters, workload public keys or signatures.

## Failure Rule

A malformed, changed, mismatched or wrongly attributed receipt shall record no
Outbox outcome. The active claim shall remain unchanged.

After claim expiry, the existing Human Governance reconciliation path may move
the delivery only to `uncertain`. No unsigned, generic or automatically
repaired worker-success fallback is permitted.

## Trusted Computing Base

The receipt narrows audit ambiguity but does not remove the Level 1 trusted
computing base:

- the mutable local parent and receipt constructor;
- the child bootstrap and workload-session issuer;
- package, release, protocol and receipt verifiers;
- the Connector Invocation signing key and trust bootstrap;
- the Node.js executable, SQLite store, host account and operating system;
- the repository-local package and trust fixtures.

A compromised parent or Connector signing key can fabricate locally
consistent receipt assertions. The receipt is authenticated as an exact
Connector command and protected by the transactional hash-chained event
history; it is not independently signed by an external workload or audit
authority.

## Expected Evidence

The experiment should demonstrate or falsify:

- deterministic closed receipt construction;
- independent protocol-response digest reconstruction;
- exact package/session/isolation binding;
- rejection of extra raw or cryptographic fields;
- rejection of wrong claim, attempt, intent and result binding;
- separation between generic and verified-worker outcome operations;
- preservation of the claim after receipt rejection;
- durable SQLite restart and event-replay retention;
- content-minimized evidence export with exact Invocation authentication;
- unchanged worker package identity and no external effect;
- complete regression of prior Company OS Pilot controls.

## Consequences

Positive:

- accepted worker verification survives restart as structured evidence;
- the exact response digest can be reconstructed without raw business input;
- generic connector outcomes cannot masquerade as verified-worker outcomes;
- receipt, outcome and authenticated command are transactionally linked;
- evidence exposes exact package, session and isolation claims without raw
  challenge, public key or signature;
- the worker package and protocol remain unchanged because receipt creation is
  a parent/runtime audit concern.

Negative:

- event and evidence size increase;
- the parent and Connector Invocation authority remain trusted;
- offline workload-signature verification is impossible without separately
  retained envelope material;
- the 30-second clock-skew rule is a local compatibility bound, not production
  time assurance;
- generic outcomes remain possible and must never be reported as receipt-
  backed execution;
- no external workload identity, revocation, transparency or portable sandbox
  is added.

## Promotion Rule

This decision authorizes no real connector and no FDOS Core promotion.

Promotion requires an immutable supported deployment, externally rooted
workload identity, protected release and Connector key custody, independently
verifiable signed execution receipts or retained governed envelope evidence,
trusted time, replay and revocation controls, a portable sandbox, monitoring,
incident response, independent review and Human Governance approval.
