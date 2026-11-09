# Release Evidence Alpha — Product Decision

Status: Planning Baseline
Date: 2026-11-09
Owner: Human Governance

## Decision

Continue FDOS through a materially narrower product experiment named **FDOS
Release Evidence**.

Do not currently build or market FDOS as a complete autonomous company,
founder platform, coding platform or general agent operating system.

## Problem

For a specific release candidate, a software team must determine:

- what was requested and decided;
- which exact code and artifact implement it;
- which tests and reviews apply;
- whether those results are still current;
- who approved the exact baseline;
- why the release is allowed or blocked.

Existing information is often distributed across issues, pull requests, CI
results and human decisions. The Alpha tests whether FDOS can reduce the work
of assembling and validating that evidence without replacing those systems.

## Proposed Customer

Initial customer profile, as an unvalidated hypothesis:

- founder-, CTO- or engineering-lead-owned B2B SaaS team;
- approximately 5–20 developers;
- existing product and recurring releases;
- GitHub and GitHub Actions;
- enterprise customers asking for traceable development or release evidence;
- no dedicated platform or application-lifecycle-management team.

The trigger is the recurring evidence burden, not team size alone.

## Product Promise

For one release candidate, FDOS should answer within two minutes:

> Is every required item present, trustworthy and applicable to this exact
> baseline? If not, what changed and what must be repeated?

It then exports the answer as a reproducible JSON/HTML dossier.

## Differentiation Hypothesis

No competitive advantage is currently proven.

The narrow hypothesis is that a small GitHub team values this combination:

- setup in less than one hour;
- exact binding across requirement, decision, commit, tests and approval;
- conservative invalidation when an external decision or requirement changes;
- understandable failure reasons and remediation;
- portable evidence export;
- no LLM dependency in the release gate.

Native GitHub controls and established products must be used as the comparison
baseline. Value counts only where FDOS is materially simpler or catches a
relevant case they do not.

## Product Form

The intended sequence is:

1. local deterministic verifier and versioned change file;
2. GitHub Action and check result;
3. minimal GitHub App for hosted coordination and dossier retention;
4. additional standard integrations only after repeated paid use.

The product is not a new source host, CI runner, deployment platform or coding
model.

## Agent Strategy

The Alpha includes three controlled roles:

- Technical Lead;
- Programmer;
- Reviewer.

They exchange typed, versioned artifacts through FDOS. They do not coordinate
through an ungoverned shared chat or unrestricted mutable memory. The product
must remain useful even if implementation is performed by a human or an
external coding agent.

## Commercial Hypotheses

None of the following is observed customer evidence:

- bounded paid pilot: EUR 1,500–3,000 once;
- continuation: EUR 199 per team per month for up to three active repositories
  and bounded verification volume;
- later test tier: EUR 499 per team per month after additional value is
  demonstrated;
- direct gross-margin target: at least 75%;
- steady support target: at most 30 minutes per team per month.

The pilot fee pays for bounded onboarding and measurement. It does not include
custom connectors or general process consulting. One-time fees are not MRR.

## Success Signals

- three internal FDOS changes complete the workflow;
- at least one real stale-evidence condition is caught;
- evidence-collection time falls by at least 50% internally;
- median external setup is at most 60 minutes;
- two paid pilots follow qualified demonstrations;
- teams reuse the product across releases and continue paying;
- direct margin remains at least 75% with support valued honestly.

## Failure Signals

- GitHub and CI templates solve the same problem just as well;
- FDOS requires custom integration for every team;
- false positives or unexplained blocks dominate usage;
- any false green occurs in an adverse case;
- teams like the concept but will not pay or reuse it;
- agent or support costs remove the expected margin.

## Long-Term Relationship to the FDOS Vision

Release Evidence is a possible trust foundation for a later automated
software operating system:

```text
Release Evidence
  → controlled coding-agent work
  → governed software delivery
  → software control center
  → broader organizational automation
```

That expansion is earned through evidence. It is not included in the Alpha
decision.
