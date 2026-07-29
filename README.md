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
- `04_Evidence/fdos-runtime/EV-FDOS-WORKER-PACKAGE-010.md`
- `04_Evidence/fdos-runtime/EV-FDOS-WORKLOAD-SESSION-011.md`
- `04_Evidence/fdos-runtime/EV-FDOS-WORKER-RECEIPT-012.md`

The pilot now includes exact read-only Git reference intake for TapTime and
Company AI, Human-reviewed source provenance and an exclusive local runtime
lease. Its third technical slice adds a signed, one-time Invocation boundary,
server-side role derivation and an authenticated three-role workflow. FDOS did
not modify either independent source repository.

Later technical slices add a durable dry-run Connector Outbox, governed
non-authoritative Personality Profiles, a process-separated digest-only
simulation worker, one optional Darwin network/write-denial experiment and a
repository-local signed closed worker source artifact. Technical Slice 10
adds a deterministic separately transportable worker package, detached
signing, an exact public trust-anchor pin, independent parent/bootstrap
verification and fixed entry-point evaluation from verified in-memory module
strings. Worker binding, clean-exit acknowledgement, crash/timeout behavior,
exact isolation-policy digests, runtime denial probes, sandbox-bypass
rejection and package/release tamper rejection are tested without enabling a
networked connector, model provider or external action.

Technical Slice 11 adds a fresh 256-bit challenge and bootstrap-generated
one-use Ed25519 key for every worker launch. Protocol 1.4 authenticates the
exact session, request, response and package, and binds a minimized session
observation into the durable result. This is local response authentication,
not independently attested workload identity.

Technical Slice 12 adds a closed Verified Worker Receipt after clean exit. A
distinct authenticated Connector command binds its minimized request,
response, package, session and isolation evidence to the active Delivery and
claim. The receipt survives restart and enters workflow evidence without raw
parameters, challenge, public key or signature. It is local authenticated
audit evidence, not an independently signed workload proof.

Human Governance should review all twelve evidence records and the remaining
identity, database, recovery, model and isolation limits. The deprecated
Darwin adapter must be replaced by a supported portable sandbox with outbound
allowlisting, read/resource restrictions, workload identity, immutable
deployment storage, protected release trust and secrets controls before one
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
