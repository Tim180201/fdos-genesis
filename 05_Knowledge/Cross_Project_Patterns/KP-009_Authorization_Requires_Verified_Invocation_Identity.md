# KP-009 — Authorization Requires Verified Invocation Identity

Status: Knowledge Candidate
Source Projects: Company AI, FDOS Company OS Pilot
Validation Level: Level 1 — Experimental application

## Observation

Role and capability checks do not establish who supplied a command. A caller
that can choose its own actor object can select a registered identity and make
otherwise correct authorization logic act on a false premise.

The Company AI assessment therefore rejected caller-asserted runtime identity
as a production pattern. The FDOS pilot tested a narrower alternative: verify
a short-lived signed Invocation Context, persistently consume it once and then
derive an Agent Instance's role from the Agent Registry.

## Candidate Rule

Before an untrusted model, connector or communication ingress reaches an
authorization decision:

- authenticate a concrete human or workload principal;
- bind organization, audience, operation and the exact canonical command;
- bind issue, activation and expiry times;
- use a unique Invocation ID and durable replay protection;
- derive mutable roles and lifecycle state from a trusted server-side
  registry, not from caller claims;
- retain content-minimized verification metadata for audit;
- expose only the authenticated gateway, never a bypass API with equivalent
  authority.

An invalid, expired, unknown, altered or previously accepted Invocation must
fail closed.

## Limit

The FDOS experiment uses a local ephemeral Ed25519 authority. It does not prove
production identity-provider integration, private-key custody, revocation,
federation, trusted time, distributed replay protection or atomic external
execution. The later local SQLite transaction covers internal events only.

## Evidence

- Company AI source assessment in
  `03_Projects/Company_OS_Pilot/Reference_Adoption_Assessment.md`
- `04_Evidence/fdos-runtime/EV-FDOS-REFERENCE-INTAKE-002.md`
- `04_Evidence/fdos-runtime/EV-FDOS-AUTHENTICATED-INVOCATION-003.md`
- `04_Evidence/fdos-runtime/EV-FDOS-TRANSACTIONAL-PERSISTENCE-004.md`

## Next Validation

Integrate an independently managed human/workload identity provider with key
rotation and revocation. Add a durable connector outbox and then validate the
boundary through one read-only sandboxed connector before considering any
write capability.
