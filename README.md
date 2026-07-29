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
- `04_Evidence/fdos-runtime/EV-FDOS-CONNECTOR-OUTBOX-005.md`
- `04_Evidence/fdos-runtime/EV-FDOS-AGENT-PERSONALITY-006.md`
- `04_Evidence/fdos-runtime/EV-FDOS-PROCESS-WORKER-007.md`
- `04_Evidence/fdos-runtime/EV-FDOS-DARWIN-SANDBOX-008.md`
- `04_Evidence/fdos-runtime/EV-FDOS-WORKER-ARTIFACT-009.md`

The pilot now includes exact read-only Git reference intake for TapTime and
Company AI, Human-reviewed source provenance and an exclusive local runtime
lease. Its third technical slice adds a signed, one-time Invocation boundary,
server-side role derivation and an authenticated three-role workflow. FDOS did
not modify either independent source repository.

Later technical slices add a durable dry-run Connector Outbox, governed
non-authoritative Personality Profiles, a process-separated digest-only
simulation worker, one optional Darwin network/write-denial experiment and a
repository-local signed closed worker source artifact. Worker binding,
clean-exit acknowledgement, crash/timeout behavior, exact isolation-policy
digests, runtime denial probes, sandbox-bypass rejection and source-release
tamper rejection are tested without enabling a networked connector, model
provider or external action.

Human Governance should review all nine evidence records and the remaining
identity, database, recovery, model and isolation limits. The deprecated
Darwin adapter must be replaced by a supported portable sandbox with outbound
allowlisting, read/resource restrictions, workload identity, immutable
packaging, protected release trust and secrets controls before one
authenticated read-only connector.

Then use FDOS and ADO in further real projects.

Do not expand the Core until real evidence proves the need.

The ephemeral local signer is not a production identity provider. Local
SQLite transaction tests do not prove production persistence. The experimental
runtime is not a Core expansion and is not production ready. A separate child
process alone is not a sandbox. The optional Darwin result proves only the
recorded `network*`/`file-write*` profile and selected denial probes, not a
portable or complete resource boundary.

## Version Consistency Rule

> **Bei widersprüchlichen Versionsinformationen gilt immer der tatsächlich vorhandene Projektinhalt. Versionsbezeichnungen dürfen niemals ohne Verifikation als korrekt angenommen werden.**

Hinweis für AI-Agenten:

- Erkennt ein Agent Versionsinkonsistenzen, muss er diese dokumentieren.
- Bis zur Klärung wird ausschließlich der tatsächlich enthaltene Projektinhalt verarbeitet.
- Es dürfen keine Versionsannahmen getroffen werden.
- Der Nutzer ist auf die Inkonsistenz hinzuweisen.
- Nach Klärung wird die neue Referenzversion übernommen.

Die endgültige Festlegung einer Referenzversion erfolgt ausschließlich durch einen verantwortlichen Menschen.
