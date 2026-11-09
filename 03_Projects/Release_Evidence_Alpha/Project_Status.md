# Release Evidence Alpha — Project Status

Status: Phase 0 Active — Integrity Reproduction and Repair
Status Date: 2026-11-09
Owner: Human Governance
Branch: `codex/release-evidence-phase-0`
Starting Commit: `7e3960c088f15d2640a7717bcae0366b9d3cd0ec`

## Current Decision State

- Product direction: documented.
- Implementation authorization: Phase 0 accepted under ADR-0055.
- FDOS Core impact: none.
- Runtime production readiness: not claimed.
- External repository mutation: disabled.
- Customer-system connection: not authorized.
- Commercial validation: absent.

## Completed in Plan 0

- Product decision and target customer hypothesis.
- Exact Alpha scope and non-goals.
- Modular-monolith target architecture.
- Three-role agent workflow and context boundaries.
- Security and threat model.
- Eight-week internal delivery plan and later pilot gates.
- Acceptance matrix with technical and commercial evidence requirements.
- Risk register and project decision log.
- Accepted ADR-0055 separating the experiment from the FDOS Core.
- Human Governance acceptance of Plan 0 and Phase 0 authorization.

## Repository Facts at Start

- Branch `main` pointed to
  `7e3960c088f15d2640a7717bcae0366b9d3cd0ec` before the planning branch was
  created.
- The worktree was clean before Plan 0 edits.
- Existing active implementation is the Level 1 experimental FDOS Runtime.
- No file outside the FDOS repository was changed by Plan 0.

## Reported but Not Yet Revalidated

A 2026-11-09 independent review reported:

- 144 passing tests, seven failing tests and two intentional exclusions;
- seven OCI failures caused by a host-size-dependent launcher fixture;
- passing JavaScript syntax checks and reproducible worker packaging;
- one confidential-handoff defect;
- one incorrect Git path/blob binding acceptance;
- one canonical JSON `__proto__` collision.

These are planning inputs only. Phase 0 must reproduce them in the supported
environment and record exact evidence before the project changes their status.

## Open Gates

| Gate | State | Blocking condition |
|---|---|---|
| G0 — Plan accepted | Accepted 2026-11-09 | Plan 0 and ADR-0055 accepted by Human Governance |
| G1 — Integrity base | Active | REA-SEC-001..003 and REA-TEST-001 unresolved |
| G2 — Deterministic verifier | Not started | G1 and domain implementation required |
| G3 — Internal vertical slice | Not started | Verifier, agent contracts and real workflow required |
| G4 — Internal Alpha | Not started | Three dogfood changes and measurements required |
| G5 — External pilot | Not authorized | Security/operations hardening and paid pilot required |
| G6 — Sellable product | Not authorized | Repeated paid use and margin evidence required |

## Active Phase 0 Actions

1. Pin and record the supported runtime environment.
2. Reproduce REA-SEC-001 and add a multi-hop leakage regression.
3. Reproduce REA-SEC-002 with a controlled false path/blob association.
4. Reproduce REA-SEC-003 with distinct canonical inputs and equal digests.
5. Reproduce REA-TEST-001 without changing the 64 MiB admission limit.
6. Define canonical format versioning and migration compatibility.
7. Repair each issue in separate reviewable changes.
8. Run the complete supported suite and record exact counts.
9. Review G1 against `Acceptance_Matrix.md`.
10. Begin Release Evidence domain work only after G1 acceptance.

## Current Limitations

- No implemented Release Evidence domain exists.
- No live GitHub or CI integration exists.
- No real Technical Lead, Programmer or Reviewer model run is connected.
- No production identity, secret custody, tenant isolation, recovery or data
  lifecycle exists.
- No price, demand, conversion, support or renewal hypothesis is validated.
- No competitive advantage is established.

## External Action Status

Disabled. Plan 0 contains documentation only. It sends no message, installs no
GitHub App, calls no model provider and performs no release, deployment or
customer-system action.
