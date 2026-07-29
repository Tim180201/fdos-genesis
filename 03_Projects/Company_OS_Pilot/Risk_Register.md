# Company OS Pilot — Risk Register

Status: Active  
Review Date: 2026-07-29

| ID | Risk | Severity | Mitigation | Status |
|---|---|---|---|---|
| PILOT-R-001 | Experimental controls mistaken for production security | High | Explicit status and known-gap documentation | Open |
| PILOT-R-002 | Untrusted caller forges an actor through the lower-level runtime API | High | Untrusted callers must use the signed Invocation Gateway; role is derived from the Agent Registry; lower-level runtime remains internal-only | Mitigated at gateway / bypass risk open |
| PILOT-R-003 | Event log exposes confidential content to host user | High | Local 0600 permissions; reject restricted data; add encryption before production | Open |
| PILOT-R-004 | Partial append or multiple writers corrupt state | Medium | Exact runtime-directory lease, local SQLite rollback, canonical hash-chain verification and transaction metadata checks | Mitigated for cooperating local runtime / hostile-host and distributed residual open |
| PILOT-R-005 | Action classification is incomplete | High | Closed action catalogue; unknown actions denied | Mitigated in experiment |
| PILOT-R-006 | Workflow automation expands autonomy too early | High | A3/A4 blocked; no connectors or model providers | Mitigated in experiment |
| PILOT-R-007 | Test success causes premature Core promotion | Medium | ADR-0043 promotion rule and evidence governance | Mitigated |
| PILOT-R-008 | Role and concrete agent identity are conflated | High | Separate Role and Agent registries; derive role from registered instance | Mitigated in experiment |
| PILOT-R-009 | Mutable or changing reference state becomes organizational evidence | High | Pre/post HEAD and status check; exact tree/blob binding; tracked drift blocks intake | Mitigated in experiment |
| PILOT-R-010 | Valid source bytes are summarized incorrectly or treated as authority | High | Source evidence creates only a Memory Candidate; Human Governance reviews meaning, scope and sensitivity | Open human-control risk |
| PILOT-R-011 | Local Git, host account or unsigned evidence export is compromised | High | No external action; content minimization; explicit Level 1 trust boundary; signed invocations do not imply independently signed evidence | Open |
| PILOT-R-012 | Stale filesystem lease or PID reuse blocks or misattributes ownership | Medium | Exact lease ID, expiry plus liveness check, malformed-state fail-closed behavior; transactional fencing later | Open residual risk |
| PILOT-R-013 | Signing key, trust-store bootstrap or issuer configuration is compromised | High | Experimental signer is ephemeral; verifier receives public material only; exact issuer, key, organization and audience binding; production key custody, rotation and revocation remain absent | Open before external use |
| PILOT-R-014 | Invocation acceptance and internal business events are separated by a crash window | High | Authenticated SQLite path commits acceptance and internal effects together; process-exit rollback is tested | Mitigated for local internal events / external and distributed residual open |
| PILOT-R-015 | A future integration receives the raw runtime and bypasses authentication | High | Expose only `AuthenticatedRuntimeGateway`; keep raw runtime inside the trusted process; add package/API isolation before connector work | Open integration gate |
| PILOT-R-016 | Replay ledger growth or invocation flooding degrades the local runtime | Medium | Command size and validity window are bounded; runtime serialization limits races; retention, rate limits and quotas are required before multi-user operation | Open |
| PILOT-R-017 | Clock drift causes valid requests to fail or invalid windows to be accepted | Medium | Exact `notBefore`/expiry enforcement and five-minute maximum TTL; require trusted synchronized time and measured skew in a later deployment | Open |
| PILOT-R-018 | Evolving synchronous `node:sqlite` API changes or blocks command processing | High | Require Node.js 22.13+, record exact tested version, serialize Level 1 commands, keep all ingress disabled; select supported production dependency and load-test later | Open before production or ingress |
| PILOT-R-019 | JSONL and SQLite stores diverge or a migration loses evidence | High | Reject two non-empty formats and non-empty format switches; no implicit migration; future tool requires manifests, backup and rollback evidence | Mitigated against implicit migration / explicit migration absent |
| PILOT-R-020 | SQLite file is lost, unavailable or unrecoverable | High | Full synchronous local commit and quick-check; no production data admitted | Open — backup, restore and disaster recovery absent |
| PILOT-R-021 | Local transaction is mistaken for atomic external delivery | High | No connector command exists; document outbox, idempotency and uncertain-outcome review as mandatory preconditions | Mitigated in disabled experiment / open before connector |
| PILOT-R-022 | SQLite commit acknowledgement fails and caller assumes rollback | High | Report only confirmed rollback; otherwise mark uncertain, stop, reopen and inspect replay/audit state | Open operational-recovery path |
