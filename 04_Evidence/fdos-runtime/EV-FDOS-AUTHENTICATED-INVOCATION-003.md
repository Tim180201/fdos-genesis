# Evidence Record — Authenticated Invocation Boundary

Status: Evidence Item / Human Review Required
Project: FDOS Company OS Pilot
Date: 2026-07-29
Confidence: Medium for tested local behavior; Low for production fitness
FDOS Validation Level: Level 1 — Experimental
Core Impact: None

## 1. Purpose

Record executable evidence that the FDOS experimental runtime can verify a
signed command identity before authorization, derive agent roles from trusted
runtime state, reject Invocation replay durably and complete the three-role
pilot without an external action.

This record does not claim production identity assurance.

## 2. Evaluated Source

Change baseline:

- FDOS commit:
  `60a66b171bf4134607b2014c79f18d0c2e62dd86`
- FDOS tree:
  `aae3f92260537c26a11344c3942034e355412b87`

The complete 41-file runtime candidate is bound by:

- manifest:
  `EV-FDOS-AUTHENTICATED-INVOCATION-003_Source_Manifest.sha256`
- manifest digest:
  `sha256:98e6005b1d57ea6bfdaf2e9b513787edb02e07eefde27f8c9695e0bafd107b3d`

Test environment:

- runtime package: `@fdos/runtime-reference@0.3.0-experimental`
- Node.js: `v26.3.1`
- operating system kernel: `Darwin 25.5.0`

Node.js 20–25 compatibility was not independently exercised by this evidence
run even though the package declares Node.js 20 or newer.

## 3. Implemented Boundary

### Signed Invocation Context

The local experiment uses Ed25519 to bind:

- issuer and public-key identifier;
- runtime audience and organization;
- unique Invocation and correlation identifiers;
- human, agent or connector principal type and identifier;
- exact operation and canonical SHA-256 command digest;
- authentication method and experimental assurance label;
- issue, activation, expiration and verification time;
- the bounded clock skew applied by the verifier.

Envelope, claim, principal, receipt and command payload shapes are exact.
Unknown operations and unexpected fields fail closed. Command content is
bounded to 256 KiB.

### Trust and authorization

- the verifier receives public trust descriptors only;
- one to 16 explicit keys support bounded rotation overlap;
- an agent Invocation contains no role claim;
- FDOS resolves the Agent Instance and derives its current role from the Agent
  Registry;
- connector principals are parsed but denied by the runtime;
- untrusted callers must use `AuthenticatedRuntimeGateway`;
- commands are deny-by-default and no connector-execution command exists.

### Durable one-time acceptance

Before command dispatch, the runtime:

1. verifies signature and structured claims;
2. validates the exact command binding and time window;
3. derives the authorized actor;
4. appends `identity.invocation.accepted` to the hash-chained event log;
5. dispatches the command through the authenticated gateway.

The accepted receipt excludes the signature, raw command, public/private key
material and bearer secrets. Rehydration rebuilds the consumed Invocation map
and validates actor, correlation, receipt digest and timing evidence.

An Invocation remains consumed when its business command fails.

## 4. Verification

### Static and complete regression

```text
npm run check
tests 79
pass 79
fail 0
skipped 0
```

The command included syntax checks for the CLI, identity verifier, Git
reference adapter, runtime lease and authenticated gateway.

### Coverage

```text
npm run coverage
line coverage:     90.83%
branch coverage:   77.73%
function coverage: 90.48%
```

Coverage supports implementation review. It is not a cryptographic audit or
production-security claim.

### Focused boundary suite

Sixteen authenticated-invocation tests passed, covering:

- valid signature, principal, organization, audience, operation and command;
- signature, command, envelope and receipt tampering;
- expiration, future activation, excessive TTL and bounded clock skew;
- unknown key and explicit two-key rotation;
- caller-provided role injection and connector-principal denial;
- request-field and command-payload smuggling;
- sequential and concurrent replay;
- replay after runtime restart;
- failed-command consumption;
- signed retry/cancellation, handoff and A2 approval paths;
- authenticated three-role pilot and system-event attribution.

### Authenticated pilot

```text
identity mode:             authenticated-invocation
algorithm:                 Ed25519
run status:                completed
workflow tasks:            4
accepted Invocations:      14
final audit events:        29
audit chain valid:         true
evidence events at export: 28
accepted memory items:     1
external actions:          false
```

The evidence bundle was exported before the final authenticated memory read.
Therefore it contains 28 events while the final runtime status contains 29.
The difference is expected and asserted.

### Source-manifest verification

From `02_Reference_Implementations/FDOS_Runtime/`:

```text
shasum -a 256 -c \
  ../../04_Evidence/fdos-runtime/EV-FDOS-AUTHENTICATED-INVOCATION-003_Source_Manifest.sha256
41 files OK
```

## 5. Negative Evidence and Limits

This evidence does not prove:

- that the ephemeral local signer authenticates a real human or workload;
- protected private-key custody, online revocation, federation, HSM use or
  incident response;
- independent trust-store bootstrap or hostile-host protection;
- that the lower-level JavaScript runtime cannot be exposed accidentally;
- atomicity between Invocation acceptance and all command effects;
- distributed replay protection, quotas or replay-ledger retention;
- trusted-time operation beyond the bounded local skew test;
- production organization/tenant isolation;
- independently signed evidence exports;
- encryption, retention, privacy deletion, backup or disaster recovery;
- connector, model-provider, Slack/Teams or real workload security;
- Node.js compatibility outside the recorded environment.

The consume-before-dispatch rule prefers duplicate prevention over automatic
retry. A crash may leave an accepted Invocation with no completed business
effect. This must become one transactional boundary before Level 2.

## 6. Interpretation

Supported conclusion:

> Within the bound local Level 1 source, FDOS can verify an Ed25519-signed,
> short-lived exact command Invocation, derive authorization identity from
> trusted runtime state, reject reuse across concurrency and restart, and
> execute the internal three-role workflow without an external action.

Unsupported conclusions:

- FDOS has production-grade human or workload identity;
- a model, Slack/Teams adapter or connector may now be enabled;
- replay protection is distributed or transactionally atomic;
- the runtime is ready for unattended operation;
- the pattern is validated FDOS Core knowledge.

## 7. Governance

All implementation and documentation changes are confined to `fdos-genesis`.
TapTime and Company AI remain independent read-only references.

This Evidence Record supports Human Governance review of Technical Slice 3.
It authorizes no external action, deployment, FDOS Core change or knowledge
promotion.
