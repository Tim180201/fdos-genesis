# Company OS Pilot — Validation Report 006

Status: Technical Slice 6 Passed / Human Review Pending

Date: 2026-07-29

Validation Level: Level 1 — Experimental

## Outcome

FDOS now distinguishes Role Definition, Agent Instance and Personality
Profile.

Chief of Staff, Operations and Marketing each bind one distinct, versioned
and content-addressed profile. Personality remains the lowest-precedence
working-style layer and cannot contain authority, tools, memory scopes,
approval rules, arbitrary prompts or model settings.

No model provider was invoked. The result proves profile configuration and
access controls, not expressed model behavior.

## Acceptance Matrix

| Criterion | Result | Evidence |
|---|---|---|
| Complete automated suite | Passed, 110/110 | `../../04_Evidence/fdos-runtime/EV-FDOS-AGENT-PERSONALITY-006.md` |
| Focused personality cases | Passed, 4/4 | `test/agent-personality.test.js`; `test/canonical-and-domain.test.js` |
| Distinct pilot profiles | Passed | three unique Personality and Operating Profile digests |
| Closed schema | Passed | unexpected capability field rejected |
| Trait allowlist | Passed | unapproved descriptor rejected |
| Content addressing | Passed | accepted field change produced a different digest |
| Role compatibility | Passed | Marketing profile rejected for Operations instance |
| Authority separation | Passed | actor role remained registry-derived; profile exposes no capabilities |
| Fixed precedence | Passed | personality is last after constitution, role and task policy |
| Fixed invariants | Passed | authority, evidence, scope, approval and memory protections supplied by runtime |
| Authenticated self-read | Passed | signed principal resolved its own exact Operating Profile |
| Cross-agent lookup | Rejected | `agent.profile` accepts no target-agent field |
| Human profile command | Rejected | post-acceptance authorization failure recorded |
| Lower-level runtime path | Rejected | guarded transaction and Invocation attribution required |
| Existing runtime controls | Passed | complete regression remained green |
| Model personality assurance | Not established | no model adapter or model output |

## Test Quality

- 110 tests passed.
- 90.88% line coverage.
- 79.13% branch coverage.
- 91.22% function coverage.
- `personality-profile.js` reached 96.48% line, 86.96% branch and 100%
  function coverage.
- `agent-registry.js` reached 92.04% line, 70.83% branch and 88.89% function
  coverage.

Coverage supports implementation review. It is not a behavioral, linguistic,
prompt-injection, accessibility or model-quality evaluation.

## Pilot Profiles

```text
Chief of Staff -> Executive Steward
Operations     -> Reliability Guardian
Marketing      -> Audience Builder
```

Each resolved Operating Profile contains:

- minimal Agent Instance identity;
- mandatory role communication style;
- exact Personality Profile and digest;
- fixed precedence;
- fixed non-authoritative invariants;
- complete Operating Profile digest.

## Open Findings

1. No model consumed an Operating Profile.
2. Operating Profile digests are not yet bound into model request/output
   evidence.
3. Trusted local bootstrap configuration can replace profiles at startup.
4. No independent signature or governance service protects profile
   definitions.
5. No style consistency, factual-quality or role-confusion evaluation exists.
6. No prompt-injection test exists because profiles are not assembled into a
   model prompt.
7. No localization, accessibility, cultural or user-preference review exists.
8. Pilot profile names and style selections have not received separate human
   acceptance.
9. No policy yet governs user-facing disclosure, display names or
   anthropomorphism.
10. Tests do not prove that two model instances sharing a profile behave
    identically.

## Decision Request

Human Governance may accept Technical Slice 6 only as Level 1 evidence for:

- a separate non-authoritative personality object;
- closed, exact and role-compatible profile binding;
- authenticated self-only Operating Profile resolution;
- preparation for a future governed model-context contract.

Before a model uses personality, FDOS must separately validate prompt
precedence, exact profile-digest binding, injection resistance, style
consistency, factual behavior and transparent artificial-agent disclosure.

This report authorizes no model call, connector, external action, production
persona or FDOS Core promotion.
