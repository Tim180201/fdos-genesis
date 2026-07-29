# Evidence Record — Governed Agent Personality Profiles

Status: Evidence Item / Human Review Required

Project: FDOS Company OS Pilot

Date: 2026-07-29

Confidence: High for tested profile validation and local access behavior; Low
for model expression or production fitness

FDOS Validation Level: Level 1 — Experimental

Core Impact: None

## 1. Purpose

Record executable evidence that FDOS can bind three distinct, exact
Personality Profiles to registered Agent Instances without changing their role
or authority.

This record does not claim that an AI model expressed any personality.

## 2. Evaluated Source

Change baseline:

- FDOS commit:
  `0533afb37ea12523e9e5c6ce0556f967ab5c0d6d`
- FDOS tree:
  `20e68c484d4516cbbed1dd03c05cce1ab7ff9059`

The complete 53-file runtime candidate is bound by:

- manifest:
  `EV-FDOS-AGENT-PERSONALITY-006_Source_Manifest.sha256`
- manifest digest:
  `sha256:9a087df8f0233cd9a43d1406eee59b07eb72e0ece2a6e2bb53566d5062ec4847`

Test environment:

- runtime package: `@fdos/runtime-reference@0.6.0-experimental`
- Node.js: `v24.17.0`
- operating system kernel: `Darwin 25.5.0 arm64`

Compatibility outside this exact environment was not independently exercised.

## 3. Implemented Boundary

### Separate object

Personality is not stored inside a Role Definition, permission set or signed
principal.

The registry accepts only a closed object containing:

- ID, version, compatible role, name and digest;
- three to six allowlisted traits;
- bounded style enums.

No free-form prompt or authority field exists.

### Exact Agent Instance binding

Every pilot Agent Instance stores the exact Personality Profile ID, version and
digest. A profile assigned to another role fails.

The three pilot bindings are:

- Chief of Staff — Executive Steward;
- Operations — Reliability Guardian;
- Marketing — Audience Builder.

### Fixed authority precedence

The runtime emits the fixed order:

```text
FDOS AI Constitution
> Agent Constitution
> Role Definition
> task policy and authorized human direction
> Personality Profile
```

It also emits fixed invariants that deny authority, capability, evidence,
data-scope, approval and organizational-memory changes.

Profiles cannot edit these controls.

### Authenticated self-read

`agent.profile` has an empty payload schema. The signed principal selects the
active Agent Instance.

The command therefore has no field with which to request another agent's
profile. Human access, payload smuggling and raw lower-level access fail.

## 4. Verification

### Static and complete regression

```text
npm run check
tests 110
pass 110
fail 0
skipped 0
```

### Coverage

```text
npm run coverage
line coverage:     90.88%
branch coverage:   79.13%
function coverage: 91.22%

personality-profile.js:
line coverage:     96.48%
branch coverage:   86.96%
function coverage: 100.00%

agent-registry.js:
line coverage:     92.04%
branch coverage:   70.83%
function coverage: 88.89%
```

### Focused behavior

Four personality-specific cases passed:

- all three pilot agents resolved distinct immutable profiles;
- schema smuggling, unapproved traits and digest drift were tested;
- two Agent Instances could share one role-compatible profile while retaining
  distinct identities;
- cross-role profile binding, cross-agent target smuggling, human use and
  lower-level-runtime use were denied.

The authenticated three-agent profile read committed three accepted
Invocations in three local transactions.

### Source-manifest verification

From `02_Reference_Implementations/FDOS_Runtime/`:

```text
shasum -a 256 -c \
  ../../04_Evidence/fdos-runtime/EV-FDOS-AGENT-PERSONALITY-006_Source_Manifest.sha256
53 files OK
```

## 5. Negative Evidence and Limits

This evidence does not prove:

- model prompt assembly or instruction precedence;
- personality expression by any model;
- stable personality across models, versions or sessions;
- factual-quality equivalence across styles;
- prompt-injection or role-confusion resistance at model level;
- Operating Profile digest attribution on model requests or outputs;
- production profile governance, signing, storage or revocation;
- localization, accessibility or cultural suitability;
- user-facing artificial-agent disclosure;
- safe anthropomorphism or appropriate user trust;
- external connector or action safety;
- independent CI or human acceptance.

## 6. Interpretation

Supported conclusion:

> Within the bound local Level 1 source, FDOS can represent distinct agent
> personalities as exact role-compatible, non-authoritative configuration and
> let an authenticated active agent resolve only its own profile.

Unsupported conclusions:

- the agents already behave with these personalities;
- personality is a permission, identity claim or memory source;
- a model may safely consume the profile;
- the profiles are production-approved;
- the pattern is an FDOS Core standard.

## 7. Governance

All implementation and documentation changes are confined to `fdos-genesis`.
TapTime and Company AI remain unchanged read-only references.

This Evidence Record supports Human Governance review of Technical Slice 6. It
authorizes no model call, external action, production persona, FDOS Core change
or knowledge promotion.
