# Evidence Record — TapTime Status/Reality Drift Under Active Governance

Status: Evidence Item
Project: TapTime
Date: 2026-07-07
Source Repository: Tim180201/taptime

## Observation

TapTime runs an unusually strict governance model (Decision Log, Risk Register, ADRs, Feature Blueprints, Development Task Profile, Review Agent verification, Human Architect approval) explicitly designed to keep documented status aligned with real repository state.

Despite this, the top-level status surfaces (`README.md`, `ADO/00_Core/Project_Status.md`) remained frozen at "Ready for Development Sprint 001" / "no application code yet" through at least Development Sprint 010, while `ADO/00_Core/Decision_Log.md` and the actual commit history showed ten completed development sprints, two working packages (`packages/core`, `apps/mobile`) and 127 passing tests.

Three further, independent instances of the same failure mode were found in the same repository during this review:

- `ADO/00_Core/Risk_Register.md` lists all five registered risks as "Open" since Sprint 1, including R-004 ("missing automated tests"), even though 127 automated tests exist at the time of review.
- `CONTRIBUTING.md` declares `main` as protected with mandatory pull-request review ("Git Workflow" section), but the reviewed commit history shows all Development Sprint work (001–010) committed directly to `main` with no corresponding PRs.
- The project's own `ADO/05_Evidence/EP-008/EP-008_Synchronization_Update*.md` series repeatedly self-reports "Decision Log staleness" as an open, recurring finding across multiple sprints, rather than as a one-time incident.

## Evidence

- `README.md` / `ADO/00_Core/Project_Status.md`, both dated 2026-07-03, unchanged through commit `6257558` (2026-07-07) despite six additional completed Development Sprints in between.
- `ADO/00_Core/Decision_Log.md` entries for Development Sprint 001 through Development Sprint 010 (`DT-001`–`DT-015`), all "Completed", contradicting the top-level status line.
- `ADO/00_Core/Risk_Register.md`: five rows, Status column uniformly "Open" since the document's creation.
- `CONTRIBUTING.md` "Git Workflow" section vs. `git log --oneline` showing direct commits to `main` for all recent feature work.
- `ADO/05_Evidence/Repository_Readiness_Assessment.md` independently flags a related gap: "if branch protection is not actually configured, this is a policy-vs-reality gap worth a separate check" — the project's own review process already recognizes this class of risk but has not closed it.

## FDOS Classification

Type: Project Evidence
Confidence: Medium
Scope: Cross-Project (see `05_Knowledge/Cross_Project_Evidence/CPE-001_Status_Reality_Drift.md` — the same pattern was independently observed in the frogs project, `EV-FROGS-STATUS-SECURITY-DOC-CONSOLIDATION.md`)
Core Impact: None

## Recommendation

Treat this as reinforcing evidence for an existing organizational risk class, not as a new FDOS Core concept.

Recommended project action for TapTime:

1. Make `ADO/00_Core/Decision_Log.md` the single rendered source for `README.md`'s status line and `Project_Status.md`'s headline (generated or checked, not independently hand-maintained).
2. Add a lightweight automated check (script or CI step) that fails when `Project_Status.md`'s stated status is older than the latest closed Development Sprint in the Decision Log.
3. Re-review the Risk Register at each Development Sprint closure rather than only at creation; a risk with contradicting evidence (e.g. R-004 vs. 127 passing tests) must be updated or explicitly re-justified, not left unchanged.
4. Reconcile `CONTRIBUTING.md`'s declared Git Workflow with actual practice: either enforce branch protection and PR review, or update the document to describe what is actually practiced.

## FDOS Learning

This is a second, independent occurrence of a pattern already seen in the frogs project: explicit governance rules that require accurate status reporting do not, by themselves, prevent status drift. The rules were followed in spirit (extensive logging, explicit sprint closures) but the specific artifacts humans and agents read first (README, Project_Status) were not included in the enforcement loop.

This suggests the underlying organizational risk is not "missing governance" but "governance without an automated reality check on the specific surfaces that get read first." See `05_Knowledge/Cross_Project_Evidence/CPE-001_Status_Reality_Drift.md` for the cross-project framing.

No FDOS Core change is required or proposed by this evidence record alone.
