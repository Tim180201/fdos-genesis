# FDOS Genesis

Status: Long-Term Stable  
Repository Baseline: v3.12.0 Clean LTS  
Mode: Project Validation

FDOS Genesis is the stable architecture baseline of the Genesis phase.

The FDOS Core is considered stable.

Future evolution should originate from validated evidence in real projects.

## Core Rule

Reality has priority over architecture.

## Operational Rule

FDOS exists to serve products, customers and organizations — never itself.

## Current Active Areas

```text
00_Specification/              FDOS Core specification and governance
01_AI/                         AI Constitution, Agent Constitutions and Collaboration Standard
02_Reference_Implementations/  Reusable implementations of FDOS concepts
03_Projects/                   Project references and validation targets
04_Evidence/                   Evidence packages and validation artifacts
05_Knowledge/                  Organizational knowledge assets
06_Learning/                   Organizational learning system and lifecycle
Archive/                       Historical or deprecated material
```

## v3.12.0 Clean LTS Synchronization

This repository baseline synchronizes the GitHub repository with the current Genesis content state.

It does not introduce a new Core capability.

It clarifies repository structure, object terminology and evidence handling.

## Next Step

Review and validate the Level 1 Company OS Pilot:

- `02_Reference_Implementations/FDOS_Runtime/`
- `03_Projects/Company_OS_Pilot/`
- `04_Evidence/fdos-runtime/EV-FDOS-RUNTIME-PILOT-001.md`
- `04_Evidence/fdos-runtime/EV-FDOS-REFERENCE-INTAKE-002.md`
- `04_Evidence/fdos-runtime/EV-FDOS-AUTHENTICATED-INVOCATION-003.md`
- `04_Evidence/fdos-runtime/EV-FDOS-TRANSACTIONAL-PERSISTENCE-004.md`

The pilot now includes exact read-only Git reference intake for TapTime and
Company AI, Human-reviewed source provenance and an exclusive local runtime
lease. Its third technical slice adds a signed, one-time Invocation boundary,
server-side role derivation and an authenticated three-role workflow. FDOS did
not modify either independent source repository.

The fourth technical slice now joins Invocation acceptance and all internal
command events in one verified local SQLite transaction. It adds crash
rollback, typed failure evidence and fail-closed format handling without
enabling a connector, model provider or external action.

Human Governance should review all four evidence records and the remaining
identity, database, recovery and external-side-effect limits before the next
bounded experiment: a disabled-by-default connector contract with outbox,
idempotency and uncertain-outcome semantics.

Then use FDOS and ADO in further real projects.

Do not expand the Core until real evidence proves the need.

The ephemeral local signer is not a production identity provider. Local
SQLite transaction tests do not prove production persistence. The experimental
runtime is not a Core expansion and is not production ready.

## Version Consistency Rule

> **Bei widersprüchlichen Versionsinformationen gilt immer der tatsächlich vorhandene Projektinhalt. Versionsbezeichnungen dürfen niemals ohne Verifikation als korrekt angenommen werden.**

Hinweis für AI-Agenten:

- Erkennt ein Agent Versionsinkonsistenzen, muss er diese dokumentieren.
- Bis zur Klärung wird ausschließlich der tatsächlich enthaltene Projektinhalt verarbeitet.
- Es dürfen keine Versionsannahmen getroffen werden.
- Der Nutzer ist auf die Inkonsistenz hinzuweisen.
- Nach Klärung wird die neue Referenzversion übernommen.

Die endgültige Festlegung einer Referenzversion erfolgt ausschließlich durch einen verantwortlichen Menschen.
