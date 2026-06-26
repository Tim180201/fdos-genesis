# Evidence Record: frogs Firestore Authorization Path Coherence

Status: Evidence Record
Project: `Tim180201/frogs-zeiterfassung`
FDOS Repository: `Tim180201/fdos-genesis`
Created: 2026-06-26
Research Agent: FDOS Research Agent
Validation Level: 0 — Project Evidence / Concept
Confidence: Medium for project-local observation, Low for organizational generalization

## FDOS Scope

This record is created under the Research Agent write authority for Evidence Records.

It does not modify FDOS Core, organizational standards, constitutional documents, capabilities, reference implementations or governance policies.

Relevant FDOS constraints checked before writing:

- `01_AI/03_Research_Agent_Constitution.md`: Research Agents may create Evidence Records and recommendations, but shall not directly modify FDOS Core or organizational standards.
- `06_Learning/README.md`: projects create reality; learning creates understanding; governance decides.
- `05_Knowledge/Knowledge_Governance_and_Evolution.md`: knowledge originates from validated evidence and remains subject to governance.
- `00_Specification/Organizational_Object_Model.md`: observations become evidence before knowledge, proposal or capability evolution.

## Source State

### FDOS baseline inspected

- `fdos-genesis@ac32f4bd4e193311b2db99f632fabc569e852c2d`
- Commit message: `docs: record architecture consolidation`
- Branch: `main`

### Project baseline inspected

- `frogs-zeiterfassung@152e176df60b2987ffcabe27988456c29a072cb4`
- Commit message: `fix(scan): use getSchuelerFuerLehrer for manual student selection`
- Branch: `main`

Project comparison basis:

- Previous FDOS evidence check used `frogs-zeiterfassung@4eac9209a2c5bddd2fe0f9e061c8c71e20351617`.
- Current `main` is 11 commits ahead of that baseline.

## Project Sources Reviewed

### Sprint and result documents

- `ADO/01_Sprints/SPRINT_RC-BUGFIX-NFC-CONNECTION-001.md`
- `ADO/02_Results/Result_RC-BUGFIX-NFC-CONNECTION-001.md`
- `ADO/01_Sprints/SPRINT_RC-BUGFIX-NFC-PERMISSION-ROOT-001.md`
- `ADO/02_Results/Result_RC-BUGFIX-NFC-PERMISSION-ROOT-001.md`
- `ADO/01_Sprints/SPRINT_RC-BUGFIX-TEACHER-STUDENT-VISIBILITY-001.md`
- `ADO/02_Results/Result_RC-BUGFIX-TEACHER-STUDENT-VISIBILITY-001.md`
- `ADO/01_Sprints/SPRINT_RC-BUGFIX-MANUAL-HOUR-STUDENT-SELECTION-001.md`
- `ADO/02_Results/Result_RC-BUGFIX-MANUAL-HOUR-STUDENT-SELECTION-001.md`

### Code and rules files

- `utils/nfcService.js`
- `utils/nfcErrors.js`
- `utils/db.js`
- `app/scan.jsx`
- `firestore.rules`

### Project commits in scope

- `fa22735f86d21325bdc38deaa0a5c1037f416932` — classify NFC Firestore errors instead of always showing connection error.
- `8e49ce5bf42931339030a05fde0d54e6a7816760` — record NFC connection result and same classification fix.
- `1e7d01be6ed27adebf88cbad3357ddf7a7449377` — use assigned-student loading for Lehrer NFC path.
- `9fbead8b920574532be6a9e4947ec0c697f5d733` — align Firestore student-read rule with `visibleForLehrerIds`.
- `152e176df60b2987ffcabe27988456c29a072cb4` — use assigned-student loading for manual student selection.

## Facts

### Fact 1 — Generic error handling masked authorization failures

The NFC path previously handled unclassified exceptions in `processNfcUid()` as connection errors.

The project result `Result_RC-BUGFIX-NFC-CONNECTION-001.md` documents that Firestore errors such as `permission-denied` and `not-found` were not classified by `e.code` and therefore appeared to users as an internet connection problem.

The project then added NFC error categories for permission and data errors and a `classifyFirestoreError(e)` helper in `utils/nfcService.js`.

### Fact 2 — Lehrer workflow attempted full student collection reads in restricted contexts

The NFC permission sprint documents that `findSchuelerByNfc()` used `getSchueler()` before the fix.

`getSchueler()` reads the complete `schueler` collection. Firestore rules do not allow Lehrer to read all students.

The project changed the Lehrer NFC path to use `getSchuelerFuerLehrer(session.id)`, which loads students via assigned relationships instead of a full collection read.

### Fact 3 — Manual student selection repeated the same authorization-path mismatch

The manual-hour result documents that `app/scan.jsx` loaded all students with `getSchueler()` and then filtered locally for Lehrer.

For Lehrer, this caused Firestore permission denial before local filtering could produce the assigned subset.

The project changed the Lehrer manual-selection path to use `getSchuelerFuerLehrer(session?.id)`.

### Fact 4 — Rules and denormalized visibility fields were not fully aligned

The teacher-student visibility result documents that assignment writes used:

- `zuordnungen` as relationship source,
- `schueler.visibleForLehrerIds` as denormalized visibility support.

Firestore `teacherOwnsStudent(data)` previously checked `lehrerId` and `lehrerIds`, but not `visibleForLehrerIds`.

The project added `visibleForLehrerIds` to the student-read rule while documenting that Lehrer cannot write this field themselves.

### Fact 5 — Validation remains incomplete for production behavior

Project results document partial validation only:

- static checks / syntax checks where possible,
- `git diff --check` for affected files,
- no confirmed real NFC hardware test,
- no confirmed Firebase Rules emulator run for the visibility rule,
- rules deployment required before production behavior changes.

## Observations

### Observation 1 — Authorization-safe query shape mattered more than post-query filtering

In multiple affected paths, the intended business rule was correct after local filtering, but the Firestore query failed before local filtering because the initial read scope exceeded the caller's allowed access.

### Observation 2 — Relationship source and access-rule source drifted

The project used `zuordnungen` and `visibleForLehrerIds` to represent teacher-student assignment, while the original rule function checked older or alternative fields (`lehrerId`, `lehrerIds`).

This created a mismatch between application relationship semantics and rule authorization semantics.

### Observation 3 — Accurate error classification improved diagnosis before full remediation

The first NFC fix did not solve the root authorization issue, but it prevented a misleading network message and exposed the next actionable failure class.

This improved the evidence chain for later root-cause fixes.

## Interpretation

The project shows a recurring RC-stage failure mode:

> Security rules, data-model relationship fields and frontend loading paths must express the same authorization reality. If one layer uses a broader read path or an outdated relationship field, secure rules fail correctly but user workflows appear broken.

This is an interpretation based on one project and repeated related fixes within that project. It is not an FDOS standard.

## Risks and Limits

1. Evidence comes from one project only. Organizational generalization remains low confidence.
2. Runtime validation is incomplete because hardware NFC testing, APK-level confirmation and Firebase Rules emulator validation were not documented as completed.
3. Some fixes depend on deployed Firestore rules. Repository state alone does not prove production environment state.
4. Existing data may still be inconsistent if older student records do not contain the expected denormalized visibility field.
5. The Standort/Admin paths still contain broader reads in some contexts; this record does not conclude whether those paths are safe or unsafe without separate evidence.

## FDOS-Relevant Learning Candidate

Classification: Knowledge Candidate Input, not validated knowledge.

When a project uses role-based Firestore or document-level authorization, RC validation should check three aligned artifacts together:

1. frontend query shape,
2. relationship/source-of-truth fields,
3. Firestore rule predicates.

The same functional relationship should not be represented differently across these artifacts without an explicit compatibility strategy.

## Unverbindliche Bereinigungsempfehlung

For `frogs-zeiterfassung`, consider documenting the teacher-student assignment contract in one project-level ADO note after RC stabilization:

- authoritative relationship source (`zuordnungen`),
- denormalized fields used for rule evaluation (`visibleForLehrerIds`, legacy `lehrerId` / `lehrerIds`),
- permitted read paths per role,
- required Firebase Rules deployment evidence,
- required hardware/API validation evidence for NFC and manual hour flows.

This is a cleanup recommendation only and does not establish a new FDOS standard.

## FDOS Action

Created this Evidence Record only.

No FDOS Core, standard, constitution, governance, capability or reference implementation was changed.
