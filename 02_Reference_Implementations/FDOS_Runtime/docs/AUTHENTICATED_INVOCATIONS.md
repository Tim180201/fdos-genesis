# Authenticated Invocation Boundary

Status: Experimental Design

Validation Level: Level 1

Production Status: Not Production Ready

## Purpose

Replace caller-asserted runtime actors at the external command boundary with
cryptographically verified, short-lived and one-time Invocation Contexts.

This slice proves a local trust-boundary design. It does not claim that a human
or workload has been authenticated by a production identity provider.

## Boundary

The authenticated surface is `AuthenticatedRuntimeGateway`.

The lower-level `FdosRuntime` API remains an internal reference-kernel and test
surface. A connector, model adapter, HTTP endpoint, Slack/Teams adapter or
other untrusted caller must never receive that object directly.

```text
Local demo authority / future identity provider
  -> signed Invocation Context
  -> Invocation Verifier
  -> transactional one-time acceptance
  -> exact command dispatch in the same local transaction
  -> existing FDOS authorization and workflow policy
```

## Signed Claims

Each Invocation Context binds:

- exact issuer and trusted signing key;
- Ed25519 algorithm;
- runtime audience;
- organization identifier;
- Invocation ID;
- correlation ID;
- principal type and identifier;
- exact operation;
- canonical SHA-256 command digest;
- authentication method and assurance label;
- issue, activation and expiration timestamps.

The principal contains no role claim. For an agent principal, FDOS resolves the
registered Agent Instance and derives its current role and status from the
Agent Registry. Personality is also server-resolved from an exact profile
binding but is not an identity claim and grants no authority.

Unexpected envelope, claim, principal, command or receipt fields fail closed.

## Trust and Key Handling

`InvocationVerifier` receives only Ed25519 public keys. It supports an explicit
set of trusted key IDs so a bounded key-rotation overlap can be tested.

`LocalInvocationAuthority` holds an ephemeral private key in process memory for
the local demo and tests. It does not serialize or log that key. Its trust
descriptor contains a public key only.

Production work requires:

- an independently operated identity provider or workload-attestation system;
- reviewed issuer registration;
- protected private-key custody;
- revocation and rotation procedures;
- authentication assurance appropriate to the principal and action risk;
- secure bootstrap configuration for the runtime trust store.

## Replay and Transaction Semantics

Inside one SQLite transaction the runtime verifies signature and claims,
derives the actor, appends `identity.invocation.accepted` and dispatches the
exact command. Invalid identity evidence or replay rolls that empty attempt
back without creating a new acceptance or failure event.

The Invocation ID is then consumed permanently:

- sequential replay is rejected;
- concurrent replay is serialized and rejected;
- replay after runtime restart is rejected;
- a business-command failure still consumes the Invocation ID.

Every resulting Invocation-attributed event must carry the same correlation
and transaction IDs as the acceptance event.

Recognized validation, authorization, conflict, not-found and policy failures
after acceptance commit:

- Invocation acceptance;
- deliberate internal state transitions, such as approval expiry;
- content-minimized `identity.invocation.execution-failed` evidence.

Integrity and unexpected implementation failures before commit roll back
acceptance and all internal effects. The same Invocation may be retried only
after diagnosis.

A transaction-finalization failure reports confirmed rollback or an uncertain
outcome. The caller must stop, reopen and inspect audit/replay state; it may
not infer rollback from the error.

This distinction is safe only because the experiment has no external effect.
The dry-run Connector Contract and Outbox now provide idempotent preparation,
claim fencing and uncertainty review, while still enforcing no network and no
external effect.

See `TRANSACTIONAL_PERSISTENCE.md` and `CONNECTOR_OUTBOX.md`.

## Audit Minimization

Durable identity evidence contains:

- verified claim metadata;
- public key ID and issuer ID;
- command digest;
- envelope digest;
- correlation and Invocation IDs;
- verification/acceptance timestamp and the bounded clock skew applied.

It does not contain:

- the signature;
- private or public key material;
- a bearer token;
- the raw command inside the identity receipt;
- authentication secrets.

Runtime action events carry Invocation and correlation IDs. System-generated
events caused by an authenticated action inherit the same attribution and
transaction ID.

## Principal Policy

The experimental verifier can parse human, agent and connector principals.

The current runtime accepts:

- humans;
- active registered Agent Instances;
- active registered Connector Instances only for `outbox.claim` and
  `outbox.record-outcome`.

Connector principals remain denied for workflows, tasks, approvals, memory,
general Outbox reads, audit and evidence export.

## Command Policy

Commands are deny-by-default. Each allowed command has an exact payload schema.
The signed command digest changes when any payload content changes.

Current command families cover:

- self-only Agent Operating Profile resolution;
- workflow start and view;
- task read, claim, completion, failure, retry, cancellation and handoff;
- approval request, decision and listing;
- memory proposal, review and read;
- dry-run Outbox preparation, inspection, claim, outcome, retry,
  cancellation and uncertainty resolution;
- audit read and evidence export.

No command enables networked connector execution or A3/A4 execution.

## Known Limits

- The local signer is not proof of a real human or workload identity.
- Runtime bootstrap still trusts the host process and supplied public keys.
- The transaction is local and does not include an external system.
- There is no online key revocation, hardware-backed key or federation.
- The synchronous `node:sqlite` API remains an evolving dependency and can
  block the event loop.
- There is no schema migration, backup/restore or disaster-recovery procedure.
- Organization binding is tested for one configured organization, not
  production tenant isolation.
- Direct use of the internal runtime bypasses the gateway and is prohibited for
  untrusted integrations by architecture, not by a language sandbox.
- Host compromise can still rewrite local files and trust configuration.
- Connector identities are local experimental registrations without
  production workload attestation, revocation or process isolation.
- Personality Profile authentication proves exact configuration access, not
  model behavior or safe persona expression.
