# ADR-0051 — Deterministic Signed Worker Package Experiment

Status: Implemented for Experiment; Human Review Pending; Not Accepted into
FDOS Core

Decision Date: 2026-07-29

Decision Owner: Human Governance

Validation Level: Level 1 — Experimental

Related Decisions:

- `ADR-0046_Connector_Contract_and_Durable_Outbox_Experiment.md`
- `ADR-0048_Process_Separated_Dry_Run_Worker_Experiment.md`
- `ADR-0049_Darwin_Network_and_Write_Sandbox_Experiment.md`
- `ADR-0050_Signed_Worker_Source_Artifact_Experiment.md`

Subsequent Decision:

- `ADR-0052_Ephemeral_Workload_Session_and_Authenticated_Response_Experiment.md`

## Decision

The live Level 1 dry-run worker shall no longer load its execution modules
from the FDOS development worktree.

FDOS shall instead build one canonical, separately transportable worker
package. The parent and a minimal child bootstrap shall independently verify
the exact package, source artifact, closed import graph, Ed25519 release
attestation and pinned trust-anchor digest. Only after successful bootstrap
verification may the admitted modules be evaluated directly from the
verified in-memory package contents.

Worker protocol version 1.3 shall bind the exact package, source artifact,
attestation and trust anchor through request, bootstrap observation, response
and result digest.

This decision authorizes a deterministic package and verified-memory
execution experiment. It does not claim immutable storage, externally
protected key custody, production workload identity, a supported production
sandbox or a real connector.

## Context

ADR-0050 replaced trust in one entry-point path with a signed, closed source
graph. Its child nevertheless loaded worktree modules before it measured that
graph. A same-account source change during the launch interval could therefore
run before the child detected anything.

The next bounded question is whether FDOS can:

- package all admitted worker bytes deterministically;
- bind package bytes separately from source-manifest metadata;
- keep release private keys outside the runtime API;
- require an explicit public trust-anchor pin;
- verify the release independently in parent and child bootstrap;
- evaluate only bytes already held in verified memory;
- retain the existing no-network, no-effect and uncertainty semantics.

## Package Rule

The experimental package has fixed identity:

```text
package:          worker-package:connector-dry-run
package version:  1.0.0-experimental
source artifact:  worker:connector-dry-run
artifact version: 2.0.0-experimental
entry point:      src/workers/dry-run-connector-worker.js
```

The package is one canonical JSON record with:

- exact schema, package ID and version;
- the complete normalized source artifact;
- exactly 12 canonically ordered UTF-8 modules;
- exact path, encoding, byte size, SHA-256 and source text per module;
- one SHA-256 digest over the complete unsigned package.

The package verifier shall:

- reject unexpected fields and unsupported identity;
- reject missing, duplicate, reordered or additional modules;
- recompute every module size and digest;
- reconstruct and compare the complete source artifact;
- enforce the exact closed and reachable import policy;
- reject comments, dynamic loading, dynamic code, CommonJS loading,
  unapproved built-ins, packages and escaping imports;
- reject noncanonical, oversized, linked, wrong-owner, group/world-writable
  or unstable package files.

## Detached Signing Rule

The release API shall produce an unsigned canonical attestation request
containing only:

- schema and Ed25519 algorithm;
- issuer and key IDs;
- package and source-artifact identities and digests;
- issuance time.

The API shall accept a detached signature as its only signing result. It shall
require the exact canonical base64url representation of one 64-byte Ed25519
signature and shall not accept, create, retain or expose a release private
key.

This makes the boundary suitable for a future HSM, KMS or offline signing
service. The current repository contains no such service and makes no custody
claim.

## Trust-Anchor Rule

Verification requires:

- one to eight explicit Ed25519 public trust descriptors;
- the exact expected SHA-256 digest of the selected trust descriptor;
- exact issuer and key-ID agreement;
- a valid signature over the canonical unsigned attestation;
- exact package and source-artifact digest agreement.

A changed public key cannot be accepted merely by changing the trust
descriptor; its descriptor digest must also match the separately supplied
pin.

The pilot pin is still stored with the repository fixture. Callers may provide
a release configuration from deployment-controlled state, but the runtime
cannot prove that such state is externally protected. Runtime status therefore
sets `externalReleaseKeyCustodyAttested: false`.

## Parent and Bootstrap Rule

Before every spawn, the parent:

1. opens and stably reads the exact package file;
2. verifies canonical encoding, module graph, package and artifact digests;
3. verifies the release signature and trust-anchor pin;
4. binds the verified release into protocol 1.3;
5. starts only the fixed Node.js bootstrap without a shell;
6. passes only the package path and a bounded public release envelope.

Before any packaged worker module is evaluated, the bootstrap independently:

1. parses the exact canonical public release envelope;
2. reopens and stably reads the package;
3. repeats package, graph, signature and trust-pin verification;
4. constructs the exact allowed module set in memory;
5. admits only the fixed relative imports and Node.js built-ins;
6. exposes one immutable package observation to the signed worker code;
7. evaluates the fixed entry point through Node.js VM modules.

The package file is not extracted. Later mutation of the package file cannot
change the already loaded in-memory module strings.

## Protocol Rule

Protocol 1.3 request and response binding includes:

```text
packageId
packageVersion
packageDigest
artifactId
artifactVersion
artifactDigest
attestationDigest
trustAnchorDigest
issuerId
keyId
```

The child response additionally requires:

```text
packageDigestMatched: true
releaseSignatureVerifiedByBootstrap: true
evaluatedFromVerifiedMemory: true
```

These are bootstrap observations bound by canonical request and response
digests. They are not an independently signed workload attestation.

## Failure Rule

Any package, source graph, release, trust, bootstrap or protocol mismatch
shall produce no accepted worker outcome.

Two real-child fault paths are required:

- a correct parent release followed by a deliberately changed bootstrap
  trust-anchor pin;
- a correct verified package followed by a deliberately changed package
  digest in the worker request.

Both shall exit untrusted, leave the Outbox claim unchanged and permit only
Human Governance to reconcile the expired claim to `uncertain`.

There is no source-tree fallback and no automatic retry.

## Trusted Computing Base

This slice reduces the mutable worker-code window but does not eliminate the
host trust boundary. The trusted computing base still includes:

- the FDOS parent and package-verification implementation;
- the bootstrap file and its imported verifier modules;
- the repository-local pilot trust fixture and trust pin;
- the absolute Node.js executable and its built-in modules;
- the operating system, account and launch configuration;
- the optional deprecated Darwin sandbox launcher and policy.

The bootstrap and verifier execute before the package can verify itself.
Compromise of that trusted computing base can forge the local observations.

## Expected Evidence

The experiment should demonstrate or falsify:

- deterministic rebuild equality for package and source artifact;
- canonical one-record package transport;
- exact module and complete package digests;
- detached signing with no runtime private-key input;
- public trust-anchor pin enforcement;
- independent parent and bootstrap release verification;
- verified-memory module evaluation before worker entry-point execution;
- rejection of changed content, signature, trust, schema, imports, links and
  writable paths;
- rejection of bootstrap-release and request-package mismatches;
- unchanged no-network, no-effect and human-only uncertainty behavior;
- complete regression of prior Company OS Pilot controls.

## Consequences

Positive:

- the live worker no longer imports execution code from the worktree;
- package bytes are independently content-addressed from source metadata;
- verified bytes are evaluated without extraction;
- release signing is separated from private-key handling;
- public trust replacement requires a matching explicit pin;
- parent and bootstrap enforce the release independently;
- package identity crosses every protocol and evidence boundary exactly.

Negative:

- Node.js VM modules are experimental and not a production isolation layer;
- the package file and pilot trust pin remain owner-writable repository
  fixtures;
- bootstrap and verifier modules remain mutable host-side trusted code;
- no expiry, revocation, transparency or key-rotation service exists;
- no workload identity or independently signed response exists;
- the package covers JavaScript modules, not Node.js, built-ins, OS or boot
  provenance.

## Promotion Rule

This decision authorizes no real connector and no FDOS Core promotion.

Promotion requires an immutable deployment object or image, protected
external trust and release-key custody, supported container/VM isolation,
read-only root filesystem, workload identity, authenticated responses,
revocation, monitoring, incident response, independent review and Human
Governance approval.

Write, publish, send, payment, personnel and destructive operations remain
outside the gate.
