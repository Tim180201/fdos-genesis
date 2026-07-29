# ADR-0044 — Authenticated Invocation Boundary Experiment

Status: Accepted for Experiment; Not Accepted into FDOS Core

Decision Date: 2026-07-29

Decision Owner: Human Governance

Validation Level: Level 1 — Experimental

Related Decision:
`ADR-0043_FDOS_Runtime_Level_1_Experiment.md`

## Decision

The FDOS Runtime experiment shall add an authenticated command boundary before
any model provider or external connector is introduced.

Untrusted callers must use `AuthenticatedRuntimeGateway`. The gateway accepts
only a signed, short-lived Invocation Context bound to one organization,
principal, operation and exact canonical command digest.

The existing lower-level runtime remains an internal Reference Implementation
and test surface. It is not an authorized integration interface.

## Context

Technical Slices 1 and 2 demonstrated role-based coordination, approvals,
memory governance, exact reference evidence and exclusive local runtime
ownership.

They still accepted caller-asserted actor objects. Giving that surface to a
model, HTTP endpoint, Slack/Teams adapter or connector would allow the caller
to assert another human or Agent Instance identifier.

FDOS therefore needs evidence that identity is verified before role and
capability authorization is evaluated.

## Experimental Mechanism

The Level 1 implementation shall:

1. use Ed25519 signatures;
2. give the runtime verifier public keys only;
3. bind issuer, key, audience and organization;
4. bind a unique Invocation ID and correlation ID;
5. bind the principal type and identifier without accepting a role claim;
6. bind the exact operation and canonical SHA-256 command digest;
7. enforce issue, activation and expiration timestamps;
8. consume each accepted Invocation ID once in the persistent event log;
9. reject sequential, concurrent and post-restart replay;
10. preserve Invocation and correlation attribution on resulting audit events;
11. reject unexpected identity and command fields;
12. keep signatures, key material and bearer secrets out of durable events.

## Local Authority Boundary

The experiment may use an ephemeral in-process signing authority for
deterministic local testing and demonstration.

That authority is not a production identity provider. Its existence proves
only that the runtime can verify a configured trust root and enforce signed
claims.

Production use requires independent issuer operation, protected private-key
custody, revocation, rotation, workload or human authentication evidence and
reviewed bootstrap configuration.

## Failure Semantics

The runtime consumes a verified Invocation before dispatch.

If the business command then fails, the Invocation remains consumed. A caller
must obtain a new Invocation for any retry.

The Level 1 JSONL store cannot make acceptance and all command events one
database transaction. This limitation is accepted only for the experiment and
becomes a required target for the transactional persistence slice.

## Expected Evidence

The experiment should demonstrate or falsify:

- valid signed commands execute through the gateway;
- signature, command, organization and audience tampering is denied;
- expired and not-yet-active invocations are denied;
- unknown signing keys are denied;
- bounded key rotation can trust two explicit public keys;
- caller-provided role claims are structurally rejected;
- connector identities remain denied;
- replay is denied sequentially, concurrently and after restart;
- a failed command still consumes the Invocation ID;
- raw signatures and key material do not enter durable audit evidence;
- the three-role pilot completes using authenticated commands only.

## Consequences

Positive:

- identity verification becomes distinct from role authorization;
- every authenticated action gains exact Invocation and correlation evidence;
- later model and connector adapters receive a narrow command surface;
- replay behavior becomes executable and testable.

Negative:

- key and trust-root lifecycle now becomes an explicit operational concern;
- accepted identity metadata increases audit volume;
- the non-transactional store exposes an acceptance-to-command atomicity gap;
- the internal runtime API must remain inaccessible to untrusted callers.

## Promotion Rule

Passing local cryptographic tests does not establish production identity.

Promotion requires independent identity-provider integration, key custody,
revocation, incident procedures, transactional persistence, project evidence
and Human Governance review.
