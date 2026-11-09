# ADR-0055 — Release Evidence Alpha Experiment

Status: Accepted for Experiment; Phase 0 Implemented; G1 Review Pending
Decision Date: 2026-11-09
Decision Owner: Human Governance
Validation Level: Level 1 — Experimental
Repository Baseline: `7e3960c088f15d2640a7717bcae0366b9d3cd0ec`

## Decision

FDOS may execute a bounded Release Evidence Alpha as a new validation project
under `03_Projects/Release_Evidence_Alpha/`.

Human Governance accepted the Plan 0 package and authorized Phase 0 on
2026-11-09. The Alpha shall extend the existing experimental FDOS Runtime
selectively. It shall not create a second platform, redefine the FDOS Core or
imply production readiness.

Implementation note: commit `d51f8ce` completed the bounded Phase 0 repairs.
Evidence item `EV-FDOS-PHASE0-INTEGRITY-014` awaits Human Governance or
independent Gate G1 acceptance. G2 is not authorized by this implementation.

The Alpha shall prove one narrow outcome:

> For one GitHub repository and one release candidate, FDOS can bind the exact
> requirement, decision revision, work order, commit, tests, review and human
> approval; detect when any required evidence is missing, invalid or stale;
> and produce a reproducible release dossier explaining the result.

## Context

The Company OS Pilot demonstrated reusable concepts for roles, agent
identities, tasks, approvals, events, evidence and local audit. It did not
implement a sellable software control center, a production security boundary
or a real GitHub-to-release workflow.

An independent product and technical review dated 2026-11-09 recommended a
materially narrower product direction: a GitHub-near Release Evidence service
for existing software teams. The review also reported three integrity or
confidentiality defects and a non-green test baseline. Those findings were
Phase 0 inputs and are now addressed by the review-pending Evidence Item
`EV-FDOS-PHASE0-INTEGRITY-014`.

The proposed experiment exists to test the product direction without
unfreezing the FDOS Core or building a general autonomous company platform.

## Product Boundary

The first supported path is:

```text
Human objective
  → Technical Lead work order
  → Human work-order approval
  → Programmer implementation
  → independent Reviewer findings
  → GitHub/CI evidence intake
  → deterministic FDOS eligibility decision
  → exact human release approval
  → JSON/HTML release dossier
```

LLM output may propose, summarize or implement work. It shall never be the
authoritative release eligibility decision.

## Architectural Direction

The Alpha shall use a modular monolith with a local verifier and narrow
adapters. It shall prefer existing GitHub and CI execution rather than build a
new coding platform, runner, container service or deployment system.

The minimum logical modules are:

- change and decision revision registry;
- work-order and role-bound agent-run orchestration;
- task-scoped context projection;
- Git and CI evidence intake;
- deterministic integrity, completeness and freshness verification;
- exact, expiring and single-use human approval;
- append-only audit and replay;
- portable JSON/HTML dossier generation.

The initial persistence boundary remains local and experimental. A cloud
service, multi-tenancy and production identity are later gates, not Alpha
assumptions.

## Role Separation

The Alpha shall model at least these roles:

- **Technical Lead** — proposes architecture, acceptance criteria and bounded
  work orders;
- **Programmer** — implements only an approved work order on an isolated
  branch or worktree;
- **Reviewer** — evaluates the requirement, diff and evidence independently
  and cannot approve its own implementation;
- **Human Governance** — owns material scope decisions and final release
  authority.

A Role Definition, Agent Instance and Personality Profile remain separate
objects. Personality never grants authority. No agent may assign itself a
role, expand its own capabilities, declassify information or approve its own
release.

## Information Boundary

Agents shall not receive unrestricted organizational memory. Every run
receives a versioned, task-scoped context projection containing only the
documents, evidence and tools required by the approved work order.

Every projected item shall retain:

- source identity and revision;
- classification and owning scope;
- inclusion reason;
- integrity digest;
- projection timestamp or sequence;
- applicable declassification decision, if any.

Sensitivity shall not decrease through a handoff unless an independent,
authorized declassification decision exists.

## Required Phase 0 Repairs

Implementation may not progress to external repository use until the
following reported defects are independently reproduced, covered by
regression tests and resolved:

1. confidential content can cross a handoff into a lower-sensitivity task;
2. a controlled Git snapshot can assert an incorrect path/blob association;
3. canonical JSON can lose an own `__proto__` property and produce a digest
   collision with a different input.

The OCI launcher test fixture shall also be made independent of the host
Node.js binary size without weakening the configured admission limit.

## In Scope

- one repository and one release-candidate type;
- GitHub and GitHub Actions as the only external product stack;
- one versioned change format;
- exact requirement and decision revisions;
- one Technical Lead, one Programmer and one Reviewer role contract;
- exact commit, review, check and test evidence;
- missing, invalid, stale and unknown evidence states;
- exact human approvals;
- deterministic JSON/HTML dossiers;
- adversarial, integration and end-to-end tests;
- internal FDOS dogfooding before any paid pilot.

## Out of Scope

- a general virtual company or founder platform;
- autonomous production deployment;
- Slack, Teams, Jira, email, CRM or MCP integrations;
- arbitrary CI providers or source-control systems;
- self-hosted enterprise packaging;
- microservices, graph databases or vector-memory infrastructure;
- custom model training or an FDOS coding model;
- unrestricted multi-agent delegation;
- customer-specific workflow development in the base subscription;
- legal, financial, personnel, publication, deletion or payment actions.

## Acceptance Gates

The internal Alpha is technically acceptable only when:

1. all supported tests pass in the pinned environment;
2. every known Phase 0 defect has a regression test and documented repair;
3. at least 20 adverse evidence-applicability cases fail closed;
4. no adverse case produces a false eligible or authorized result;
5. three real FDOS changes complete the full workflow;
6. a changed requirement at an unchanged commit invalidates prior evidence;
7. approval binds the exact baseline and cannot be replayed;
8. Technical Lead, Programmer and Reviewer permissions are independently
   enforced;
9. the dossier is reproducible from retained evidence after restart;
10. no external publication, deployment or customer-system mutation occurs.

External pilot work requires an additional Human Governance decision,
security review, production-capable identity and credential handling, bounded
tenant isolation, retention/deletion behavior and an observed setup path.

## Commercial Experiment

Commercial assumptions remain hypotheses. The initial candidate offer is a
bounded paid pilot followed by a team subscription. Price, demand, support
load and renewal are not validated facts.

The Alpha shall measure:

- setup time;
- time to first useful finding;
- release-dossier preparation time before and after FDOS;
- false blocks and false greens;
- support minutes per team;
- direct infrastructure and model cost;
- repeated use and paid continuation.

No general market claim follows from internal dogfooding.

## Stop Rules

Stop external progression when any of the following is true:

- a known integrity or confidentiality defect remains open;
- an adverse fixture produces false green;
- an agent can modify its own authority or approval;
- no complete internal vertical slice exists by the agreed Alpha gate;
- the same use case is solved equally simply and more cheaply by native
  GitHub/CI controls or an established product;
- onboarding requires persistent customer-specific engineering;
- observed direct margin cannot reach the predeclared threshold;
- paid pilots do not repeat or renew.

## Core Impact

None.

No part of the Release Evidence Alpha becomes an FDOS Core standard merely
because its tests pass or a pilot pays. Promotion requires reviewed evidence
and the existing FDOS validation lifecycle.

## Reversibility

Planning artifacts remain in the Project layer. Experimental implementation
remains in the Reference Implementation layer. Either can be revised,
retired or extracted later without changing the FDOS Core.
