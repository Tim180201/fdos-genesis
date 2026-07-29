# Company OS Pilot — Project Status

Status: Technical Slice 13 Passed / Human Review Pending
Date: 2026-07-29  
Validation Level: Level 1 — Experimental

## Current Goal

Establish the closed, digest-pinned and fail-closed OCI admission boundary
required before a portable container worker may be integrated. Separate
policy/runtime/image/template admission from live execution and preserve
explicit non-authorization when no daemon or image has been evidenced.

## Current Phase

Level 1 OCI workload-admission evidence review.

## Exit Criteria

- [x] reference runtime implemented;
- [x] security boundaries tested;
- [x] pilot workflow completed end to end;
- [x] evidence item recorded;
- [x] limitations documented;
- [x] TapTime and Company AI bound as read-only Git references;
- [x] source-backed knowledge kept in Human-reviewed candidate state;
- [x] concurrent ownership of one local event store rejected;
- [x] reference-adoption and artifact-validation records created;
- [x] Human Governance authorized the authenticated-invocation slice;
- [x] signed command, scope, time and replay controls implemented;
- [x] authenticated pilot completed without an external action;
- [x] Human Governance authorized the transactional-persistence slice;
- [x] authenticated Invocation acceptance and internal effects joined locally;
- [x] crash, rollback, restart, tamper and format-selection behavior tested;
- [x] transactional persistence ADR, operations guide and evidence prepared;
- [x] dry-run Connector Contract and active Connector Instance implemented;
- [x] task-bound Delivery Intent and durable idempotent Outbox implemented;
- [x] claim lease, fencing, retries and uncertainty state machine tested;
- [x] connector principal restricted to claim and outcome commands;
- [x] no-network Outbox demo completed with no external effect;
- [x] ADR, security model, operations guide and Evidence 005 prepared;
- [x] separate role-compatible Personality Profiles implemented;
- [x] closed profile schema excludes authority and arbitrary prompt fields;
- [x] exact profile version and digest bound to each Agent Instance;
- [x] authenticated self-only Operating Profile command implemented;
- [x] fixed precedence and personality safety invariants documented;
- [x] ADR, security model and Evidence 006 prepared;
- [x] exact expiring worker request/response protocol implemented;
- [x] Outbox demo simulation moved to a separate shell-free child process;
- [x] runtime, database, signing key and parent environment withheld from the
      child protocol;
- [x] worker response accepted only after exact binding and clean exit;
- [x] crash-before-response, response-then-crash and timeout paths tested;
- [x] rejected worker execution preserves the claim for human uncertainty
      reconciliation;
- [x] process-only lack of OS network/resource isolation reported explicitly;
- [x] ADR, security model, operations guide and Evidence 007 prepared;
- [x] exact provider and policy digest bound into worker protocol;
- [x] fixed root-owned Darwin launcher inspected and content-addressed;
- [x] loopback listen/connect and filesystem write-open denial proved inside
      the child before positive enforcement flags;
- [x] missing, false and tampered isolation attestations rejected;
- [x] deliberate required-sandbox launch bypass rejected;
- [x] sandbox failure preserved the claim for human-only uncertainty
      reconciliation;
- [x] Darwin-only and deprecated platform-interface status documented;
- [x] filesystem-read, CPU, memory, process and same-account gaps documented;
- [x] ADR, security model, operations guide and Evidence 008 prepared;
- [x] exact fixed worker source graph and entry point declared;
- [x] linked, mutable, oversized, invalid and undeclared source rejected;
- [x] deterministic per-file and complete artifact SHA-256 implemented;
- [x] local Ed25519 worker release verified before every spawn;
- [x] release identity bound through worker protocol 1.2;
- [x] child-side local artifact digest match bound into response and result;
- [x] source, signature, trust, schema and request-binding tampering rejected;
- [x] artifact failure preserved the claim for human-only uncertainty
      reconciliation;
- [x] mutable-source, same-account race, local-trust and runtime gaps
      documented;
- [x] ADR, security model, operations guide and Evidence 009 prepared;
- [x] canonical separately transportable 13-module worker package generated;
- [x] source-artifact and complete package SHA-256 identities separated;
- [x] detached signing request implemented without runtime private-key input;
- [x] exact public trust-descriptor digest pin required;
- [x] parent package, graph, signature and trust-pin preflight implemented;
- [x] child bootstrap independently repeats release verification;
- [x] fixed entry point evaluated from verified in-memory module strings;
- [x] live worker no longer imports execution modules from the worktree;
- [x] package and session identity bound through worker protocol 1.4;
- [x] noncanonical, changed, linked, writable and undeclared package input
      rejected;
- [x] bootstrap trust mismatch and request package mismatch rejected;
- [x] package failures preserve the claim for human-only uncertainty
      reconciliation;
- [x] mutable bootstrap, repository trust, VM-module and workload gaps
      documented;
- [x] ADR, security model, operations guide and Evidence 010 prepared;
- [x] fresh canonical 32-byte parent challenge generated for every launch;
- [x] bootstrap creates a fresh Ed25519 key only after package verification;
- [x] private workload-session key retained by a one-use child closure;
- [x] complete session binds challenge and exact verified package identity;
- [x] protocol 1.4 binds the challenge into the exact worker request;
- [x] canonical response signature binds session, request and response digests;
- [x] minimized session observation enters response and simulated result
      digests;
- [x] parent cross-verifies authenticated and response-bound session identity;
- [x] challenge replay, response/signature tampering and second-sign attempts
      rejected;
- [x] real-child challenge, signature and valid-signature session-confusion
      faults rejected;
- [x] session failures preserve the claim for human-only uncertainty
      reconciliation;
- [x] external attestation, secure erasure, memory confidentiality and replay
      ledger non-claims documented;
- [x] ADR, security model, operations guide and Evidence 011 prepared;
- [x] closed self-digested Verified Worker Receipt implemented;
- [x] receipt retains enough minimized structure to reconstruct the exact
      protocol 1.4 response digest;
- [x] generic and receipt-backed outcomes separated into exact authenticated
      commands;
- [x] runtime binds receipt to Delivery, claim, attempt, Connector, intent,
      request window and result before commit;
- [x] event replay requires the exact worker-outcome Invocation operation;
- [x] receipt and minimized Invocation authentication survive SQLite restart
      and enter workflow evidence;
- [x] extra raw fields, wrong attempt and generic receipt smuggling rejected
      without changing the active claim;
- [x] worker package, release and protocol identities remained unchanged;
- [x] ADR, security model, operations guide and Evidence 012 prepared;
- [x] closed digest-pinned OCI Workload Policy implemented;
- [x] fixed non-root worker command and environment-name allowlist bound;
- [x] no-network, read-only-root, no-privilege and resource controls bound;
- [x] Docker launcher identity and local Unix-socket provider implemented;
- [x] Linux, API 1.49+, cgroup-v2 and built-in-seccomp admission implemented;
- [x] exact image RepoDigest, platform, process, rootfs and config admission
      implemented;
- [x] hardened launch template reconstructed from retained observations;
- [x] policy, runtime, image and template downgrade/confusion paths rejected;
- [x] real shell-free bounded command-runner fixture passed;
- [x] unavailable real local daemon failed closed before image admission;
- [x] no daemon start, image operation or container execution occurred;
- [x] ADR, security model, operations guide and Evidence 013 prepared;
- [ ] Human Governance reviewed Technical Slices 3–13 evidence.

## Verified Result

- 153 of 153 tests passed;
- four workflow tasks completed;
- Chief of Staff, Operations and Marketing participated;
- 14 signed invocations accepted in 14 committed local transactions;
- 29 authenticated pilot audit events verified;
- every Invocation-attributed pilot event shared its acceptance transaction;
- process exit and unexpected implementation failure left no partial events;
- recognized business failure consumed its Invocation with typed evidence;
- event-content and transaction-metadata tampering were rejected;
- non-empty JSONL was not migrated implicitly;
- sequential, concurrent and post-restart replay rejected;
- signature, command, organization, audience and time tampering rejected;
- 947 TapTime and 97 Company AI tracked entries were manifest-bound;
- 39 allowlisted reference files were byte- and evidence-verified;
- a second runtime owner was rejected;
- no external action executed;
- one dry-run delivery prepared from a claimed Operations task;
- exactly one registered Connector Instance claim succeeded;
- the no-network demo completed two tasks with 12 signed Invocations, 12
  committed transactions and 22 verified events;
- the delivery ended `simulated` with `externalEffect: none`;
- concurrent claims, stale contracts, raw result fields and connector
  overreach were denied;
- expired claims entered durable uncertainty, could be detected without a
  live worker and could not auto-retry;
- workflow completion evidence included a content-minimized delivery
  projection without raw connector parameters;
- Chief of Staff, Operations and Marketing resolved three distinct
  content-addressed Personality Profiles;
- personality schema smuggling, invalid traits and cross-role binding were
  rejected;
- authenticated agents could read only their own server-resolved Operating
  Profile;
- no model call occurred and no claim of expressed personality is made;
- one exact claimed delivery was transferred to a separate local process;
- the child returned a response binding request, delivery, fencing claim,
  Connector Instance, completion time and digest-only outcome;
- normal process execution completed the existing authenticated Outbox demo
  with the same 12 Invocations, 12 transactions and 22 events;
- crash before output, valid output followed by crash and hang timeout were
  rejected without recording an outcome;
- abandoned failed-process claims reconciled only to `uncertain` after expiry;
- process-only execution continued to report network and filesystem-write
  isolation false;
- one Darwin-required execution bound the inspected launcher and fixed policy,
  observed kernel denial for listen, connect and write-open, and only then
  reported both enforcement flags true;
- a deliberate direct-launch bypass was rejected by the child probes without
  recording an outcome;
- the failed bypass claim reconciled only to `uncertain` after expiry;
- one exact 12-file, 84,546-byte worker source artifact was reconstructed and
  bound by SHA-256;
- the configured Ed25519 release attestation verified before every normal and
  Darwin worker launch;
- the child reconstructed its local artifact and bound
  `localDigestMatched: true` into the response and result digest;
- changed source bytes, release signature, trust key, schema, imports,
  permissions and symbolic links were rejected;
- a deliberately changed request artifact binding caused child rejection,
  recorded no outcome and reconciled only to `uncertain` after expiry;
- the release private key was not stored in FDOS or passed to the child;
- no immutable-package, independent workload or same-account race claim is
  made;
- one canonical 13-module, 80,676-source-byte and 89,555-serialized-byte
  worker package was reproduced exactly;
- package and source artifact were bound by separate SHA-256 identities;
- the package release was verified against an exact Ed25519 public
  trust-descriptor digest pin;
- the release API accepted only a detached signature and no private release
  key was stored or passed;
- the parent verified package, graph, release and trust pin before spawn;
- the child bootstrap independently repeated those checks before evaluating
  packaged code;
- the fixed entry point evaluated from the verified in-memory module strings
  without source-directory extraction;
- protocol 1.4 bound package, artifact, attestation, trust anchor, issuer, key
  and fresh session challenge through request, response and result;
- changed package content, signature, trust pin, schema, canonical encoding,
  import graph, permissions and symbolic links were rejected;
- deliberately changed bootstrap trust and request package bindings caused
  child rejection, recorded no outcome and reconciled only to `uncertain`
  after expiry;
- no immutable-storage, HSM/KMS-custody, independent workload or
  production-VM-module claim is made;
- every normal and Darwin worker launch used a fresh bootstrap-generated
  Ed25519 response key and parent-generated 256-bit challenge;
- the private session key was absent from package, environment after bootstrap
  intake, request, response and stable runtime result;
- one-use signing, canonical challenge/signature material, content tampering
  and cross-challenge/package replay were rejected;
- the response envelope authenticated complete session, request and response
  digests;
- the response/result digest bound a minimized session observation that the
  parent cross-checked against the authenticated full session;
- deliberately mismatched challenge, signature and validly signed durable
  session identity caused rejection, recorded no outcome and reconciled only
  to `uncertain` after expiry;
- the session key is self-issued by the mutable bootstrap; no external
  workload-attestation, secure-erasure or host-memory protection claim is
  made;
- every accepted process-worker outcome retained one closed receipt binding
  request, response, envelope, package, session, isolation and parent-check
  digests;
- receipt verification independently reconstructed the canonical protocol 1.4
  response digest;
- the signed `outbox.record-worker-outcome` command, receipt and outcome
  committed in one authenticated SQLite transaction;
- generic outcome commands could not carry or claim a worker receipt;
- wrong-shape and wrong-claim-attempt receipts recorded no outcome and left
  the delivery claimed;
- the receipt plus exact Connector Invocation command, envelope and receipt
  digests survived restart and entered content-minimized workflow evidence;
- no Delivery parameters, random challenge, workload public key or signature
  entered the receipt or evidence projection;
- the receipt remains a local parent/Connector assertion rather than an
  independently signed or remotely attested execution proof;
- one closed OCI policy admitted only an exact manifest digest, supported
  Linux platform, fixed worker command, non-root identity and bounded
  no-network/read-only/no-privilege resource profile;
- the Docker provider resolved and hashed its launcher, accepted only a local
  Unix socket and required API 1.49+, Linux, cgroup v2 and built-in seccomp;
- fixture-backed image admission bound RepoDigest, platform, user, workdir,
  command, rootfs, absent volumes/ports and a bounded environment allowlist;
- the hardened launch template bound every security/resource flag and
  rejected a redigested host-network substitution;
- real Docker launcher inspection recorded CLI 29.6.2 and its exact binary
  SHA-256, but the missing daemon produced no runtime/image preflight;
- every OCI preflight retained execution, observation, external-attestation
  and production-readiness claims as false;
- no Docker/Colima daemon was started, no image was built/pulled and no
  container executed;
- no real service was contacted and no external effect occurred.

See `Validation_Report.md`,
`Validation_Report_003_Authenticated_Invocation.md`,
`Validation_Report_004_Transactional_Persistence.md`,
`Validation_Report_005_Connector_Outbox.md`,
`Validation_Report_006_Agent_Personality.md`,
`Validation_Report_007_Process_Separated_Worker.md`,
`Validation_Report_008_Darwin_Sandbox.md`,
`Validation_Report_009_Signed_Worker_Artifact.md`,
`Validation_Report_010_Verified_Worker_Package.md`,
`Validation_Report_011_Authenticated_Workload_Session.md`,
`Validation_Report_012_Durable_Verified_Worker_Receipt.md`,
`Validation_Report_013_OCI_Workload_Admission.md`,
`Reference_Adoption_Assessment.md` and the evidence records under
`../../04_Evidence/fdos-runtime/`.

## External Action Status

Disabled. A process-separated local simulation path is enabled with
`networkAccess: false` and `externalEffects: false`.

The default path reports both isolation flags false. On the recorded Darwin
host, an optional deprecated `sandbox-exec` experiment may report network and
filesystem-write isolation true only after exact in-child denial probes.
Both paths now require the same deterministic signed package. Parent and
bootstrap verify it before the fixed entry point is evaluated from memory.
Each launch also requires a fresh challenge-bound response signature and exact
session-observation cross-check. Every accepted result additionally requires a
closed receipt recorded through the distinct authenticated worker-outcome
command and replay-bound to the exact claim.
The package file, verifier, bootstrap and pilot trust pin are not immutable or
independently deployed. The session key is created by that mutable bootstrap
and is not external workload identity. The durable receipt omits the full
envelope and is not independent workload proof. Neither path authorizes a real
connector.

The OCI provider is an admission-only future boundary. It is not connected to
the worker. Its positive runtime/image tests use deterministic local fixtures;
the recorded real Docker daemon was unavailable. Every resulting template is
non-authorizing and no container execution occurred.

Personality is configuration only. No model provider is connected.

## Reference Repository Status

Read-only. No files, Git state, dependencies, tests, builds or external systems
were changed in TapTime or Company AI.

## Core Impact

None.
