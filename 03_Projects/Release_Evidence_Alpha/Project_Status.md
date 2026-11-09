# Release Evidence Alpha — Project Status

Status: Phase 0 Implemented — Gate G1 Human Review Required
Status Date: 2026-11-09
Owner: Human Governance
Branch: `codex/release-evidence-phase-0`
Starting Commit: `7e3960c088f15d2640a7717bcae0366b9d3cd0ec`

## Current Decision State

- Product direction: documented.
- Implementation authorization: Phase 0 accepted under ADR-0055.
- Phase 0 implementation: complete at
  `d51f8ce837029ab5ae2995e93fdc71ee0ce4ee88`.
- Gate G1 acceptance: pending Human Governance or independent review.
- G2 implementation authorization: not granted.
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

## Phase 0 Reproduction and Repair Results

The 2026-11-09 independent review reported:

- 144 passing tests, seven failing tests and two intentional exclusions;
- seven OCI failures caused by a host-size-dependent launcher fixture;
- passing JavaScript syntax checks and reproducible worker packaging;
- one confidential-handoff defect;
- one incorrect Git path/blob binding acceptance;
- one canonical JSON `__proto__` collision.

The local unmodified baseline passed all 153 existing tests because its Node
executable was only 68,384 bytes; the historical OCI failures were therefore
confirmed as host-size-dependent by source inspection rather than reproduced
on this host.

Dedicated adverse tests reproduced all three security defects before repair:

- a confidential Operations marker could enter a lower-classified Marketing
  handoff;
- a recomputed snapshot could associate an allowlisted path with another
  same-size Git blob;
- an own enumerable `__proto__` property collided with an empty object under
  old canonicalization.

Commit `d51f8ce` repairs those boundaries, replaces the OCI fixture without
raising the 64 MiB limit, introduces canonical JSON v2, documents its
migration boundary and retains a newly signed v3 worker package.

Final verification on the pinned Node.js 26.3.1 environment:

- `npm run check`: 159 passed, zero failed, zero skipped;
- `npm run coverage`: 91.61% lines, 79.50% branches, 92.80% functions;
- two clean package builds were byteidentical to the retained artifact;
- `git diff --check`: no findings.

Evidence:
`../../04_Evidence/fdos-runtime/EV-FDOS-PHASE0-INTEGRITY-014.md`.

## Open Gates

| Gate | State | Blocking condition |
|---|---|---|
| G0 — Plan accepted | Accepted 2026-11-09 | Plan 0 and ADR-0055 accepted by Human Governance |
| G1 — Integrity base | Review required | REA-AC-001..007 implemented; Human Governance or independent acceptance pending |
| G2 — Deterministic verifier | Not authorized | G1 acceptance required |
| G3 — Internal vertical slice | Not started | Verifier, agent contracts and real workflow required |
| G4 — Internal Alpha | Not started | Three dogfood changes and measurements required |
| G5 — External pilot | Not authorized | Security/operations hardening and paid pilot required |
| G6 — Sellable product | Not authorized | Repeated paid use and margin evidence required |

## Pending Human Actions

1. Review evidence item `EV-FDOS-PHASE0-INTEGRITY-014`.
2. Accept or reject REA-AC-001 through REA-AC-007 individually.
3. If all mandatory G1 criteria are accepted, close G1 and explicitly
   authorize G2.
4. If any criterion is rejected, record the exact deficiency and keep G1
   open.

## Current Limitations

- No implemented Release Evidence domain exists.
- No live GitHub or CI integration exists.
- No real Technical Lead, Programmer or Reviewer model run is connected.
- No production identity, secret custody, tenant isolation, recovery or data
  lifecycle exists.
- No price, demand, conversion, support or renewal hypothesis is validated.
- No competitive advantage is established.

## External Action Status

Disabled. Phase 0 changed only FDOS source, tests, local documentation and
repository evidence. It sent no message, installed no GitHub App, called no
model provider and performed no release, deployment or customer-system
action.
