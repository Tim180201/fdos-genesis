# Evidence Record — OCI Workload Admission

Status: Evidence Item / Human Review Required

Project: FDOS Company OS Pilot

Date: 2026-07-29

Confidence: High for the closed OCI policy, deterministic provider logic,
local launcher identity, fixture-backed runtime/image admission, hardened
template reconstruction and fail-closed daemon-unavailable behavior; Low for
live container enforcement, immutable registry provenance, protected daemon
custody, external workload identity or production isolation

FDOS Validation Level: Level 1 — Experimental

Core Impact: None

## 1. Purpose

Record executable evidence for the admission boundary FDOS requires before a
portable container worker may replace process-only and deprecated Darwin
execution.

The evidence separates three statements:

1. the policy and provider logic passed local adversarial verification;
2. the installed Docker launcher has one recorded local filesystem identity;
3. no local daemon/image was available, so no live container or enforcement
   claim exists.

## 2. Evaluated Source

Change baseline:

- FDOS commit:
  `7b531814979e2f050bd542d2548e4a85c47073c5`
- FDOS tree:
  `83b2063ebd73a6561b719d52d3a7e240d6ee9b86`

The complete runtime candidate is bound by:

- manifest:
  `EV-FDOS-OCI-ADMISSION-013_Source_Manifest.sha256`
- manifest digest:
  `632ad0500b889301de8c0f9c6a34097a2945021e52b4f073a7c1da9497ef31ac`

Test environment:

- runtime package: `@fdos/runtime-reference@0.13.0-experimental`
- Node.js: `v26.3.1`
- macOS: `26.5.1`, build `25F80`
- operating-system kernel: `Darwin 25.5.0 arm64`
- Docker CLI: `29.6.2`, build `dfc4efb1e2`
- Colima: `0.10.3`, commit `00f6c297e92a82c04a4ab507db0a61435650d7e8`

Compatibility outside the exact tested Node/macOS source candidate was not
independently exercised.

## 3. Policy Evidence

`oci-workload-policy.js` implements one closed canonical policy:

```text
schemaVersion
kind
provider
image
process
security
resources
digest
```

### Image

The policy accepts only a named digest:

```text
registry/path@sha256:<64 lowercase hexadecimal characters>
```

The reference digest must equal `manifestDigest`; tag-only and mixed-digest
references fail before provider access. Unqualified registry components and
out-of-range explicit ports are rejected.

### Process

The exact pilot command, `65532:65532` identity,
`/opt/fdos/worker` directory and environment-name allowlist are internal
constants. Callers cannot select a shell, arbitrary command, root user or
additional environment name.

### Security

The only accepted security projection is:

```text
privileged: false
noNewPrivileges: true
capabilitiesDrop: [ALL]
seccompProfile: builtin
networkMode: none
ipcMode: private
filesystemMode: read-only-root
hostMounts: []
hostDevices: []
```

### Resources

CPU, memory, memory plus swap, PIDs, open files and a single `/tmp` tmpfs are
range-checked and content-addressed. Memory-swap must equal memory. The tmpfs
must be `noexec`, `nosuid` and `nodev`.

## 4. Provider Boundary

`docker-oci-workload-provider.js` accepts one explicit absolute executable and
one explicit local Unix socket. It rejects relative executable paths and
TCP/remote endpoints.

The default command runner:

- invokes no shell;
- uses `/` as its working directory;
- forwards no parent environment;
- sets only fixed locale/timezone values;
- bounds runtime, standard output and standard error;
- rejects timeout, signal, non-zero exit, standard error and malformed JSON.

The real child-process fixture exercised that runner through all three
preflight commands.

## 5. Launcher Evidence

The recorded launcher observation was:

```text
requested path:  /opt/homebrew/bin/docker
resolved path:   /opt/homebrew/Cellar/docker/29.6.2/bin/docker
SHA-256:         eade1c3a5dda47534dc776f2f534c99cc94cfcf9ce07c4bf09e98258d13e7d7a
size:            27,841,474 bytes
uid:             501
gid:             80
mode:            0555
symlink resolved:true
root owned:      false
```

The binary passed the local regular-file, executable-bit, size and write-mode
checks. Runtime and image inspection commands use the recorded resolved path.

It remains user-owned Homebrew tooling and is not an immutable or externally
protected release root.

## 6. Runtime Admission Contract

The provider issues only:

```text
docker --host <unix socket> version --format=json
docker --host <unix socket> info --format=json
```

It requires:

- Docker server API 1.49 or newer;
- Linux server;
- `amd64` or `arm64`;
- cgroup v2;
- `name=seccomp,profile=builtin`.

Rootless state is recorded. Both true and false remain local observations,
not workload attestation.

## 7. Image Admission Contract

The provider locally inspects the exact named digest and exact platform. It
does not pull an image.

It requires:

- the exact reference in `RepoDigests`;
- matching Linux architecture;
- exact non-root user and workdir;
- exact FDOS bootstrap plus package command;
- layered rootfs with at least one layer digest;
- no declared volumes;
- no exposed ports;
- image environment names limited to `PATH`, `LANG`, `LC_ALL` and `TZ`.

The image observation contains only identities, booleans, counts and digests.
It does not copy raw layer content or environment values.

## 8. Launch Template Evidence

The provider deterministically creates a template with:

```text
--pull=never
--network=none
--read-only
--user=65532:65532
--cap-drop=ALL
--security-opt=no-new-privileges=true
--security-opt=seccomp=builtin
--ipc=private
--no-healthcheck
--pids-limit=32
--memory=134217728
--memory-swap=134217728
--memory-swappiness=0
--cpus=0.5
--ulimit=nofile=512:512
--ulimit=core=0:0
--tmpfs=/tmp:rw,noexec,nosuid,nodev,size=16777216
--log-driver=none
```

It also binds exact platform, workdir, resource values and named image digest.

The template contains no privilege, host network/namespace, published port,
caller-supplied host mount, additional device, Docker-socket access or
explicit restart option. Docker-managed files/default devices remain in the
trusted runtime boundary. The required `--rm` therefore uses Docker's default
`no` restart policy without the documented `--rm`/`--restart` conflict.

Preflight stores the complete policy plus runtime, image and template
observation digests. Verification reconstructs the template rather than
trusting its booleans.

## 9. Explicit Non-Authorization

Every successful fixture-backed preflight required:

```text
executionAuthorized: false
executionObserved: false
workloadIdentityExternallyAttested: false
productionReady: false
```

Tests changed each field to true and recomputed the outer digest. Verification
rejected every artifact.

There is no generic or fallback path that converts preflight into process-only
or Darwin execution.

## 10. Complete Verification

```text
npm run check
tests 153
pass 153
fail 0
skipped 0
```

Focused:

```text
node --test --test-concurrency=1 \
  test/oci-workload-boundary.test.js
tests 13
pass 13
fail 0
```

Coverage:

```text
npm run coverage
tests 153
pass 153
fail 0

all files:
line coverage:     91.57%
branch coverage:   79.29%
function coverage: 92.84%

oci-workload-policy.js:
line coverage:     98.22%
branch coverage:   92.75%
function coverage: 100.00%

docker-oci-workload-provider.js:
line coverage:     92.01%
branch coverage:   78.69%
function coverage: 91.84%
```

## 11. Adversarial Evidence

### Policy downgrade

After recomputing the outer policy digest, tests attempted:

- privileged mode;
- host network;
- host root mount;
- host device;
- retained Linux capabilities;
- unconfined seccomp;
- root user;
- swap above memory;
- excessive PID limit;
- unequal soft/hard open-file limits;
- executable tmpfs.

Every case failed policy verification.

### Runtime capability confusion

API 1.48, non-Linux server, cgroup v1 and absent built-in seccomp each failed
before any image-inspect request.

### Image confusion

Wrong RepoDigest, root user, substituted command, `NODE_OPTIONS`, declared
volume, exposed port, wrong architecture and empty rootfs each failed before
template creation.

### Template downgrade

The test replaced `--network=none` with `--network=host`, recomputed both
template and preflight digests and reran independent verification. Exact
reconstruction rejected it. A second case replaced the admitted runtime
architecture, recomputed the runtime, template and preflight digests and was
rejected by the independent policy/runtime/image architecture binding.

### Command failure

Non-zero exit, standard error, thrown socket error, semantically malformed
JSON and syntactically malformed JSON produced no preflight.

## 12. Recorded Real-Host Negative Evidence

Local tool discovery:

```text
docker:  /opt/homebrew/bin/docker
colima:  /opt/homebrew/bin/colima
podman:  unavailable
nerdctl: unavailable
finch:   unavailable
```

Runtime state:

```text
Docker server: unavailable at unix:///var/run/docker.sock
Colima:        not running
Lima instance:none
```

The actual provider accepted the Docker launcher identity, then rejected
`runtime-version`:

```text
error code:        POLICY_DENIED
message:           Docker OCI runtime command was not accepted.
diagnostic digest: sha256:844df846d44ce3d9b15c2d82b65d46da49c0d8cd3afd0cc7d6d3d16d8197893c
```

It emitted no runtime observation, image observation, launch template or
preflight.

No Docker/Colima service was started because that would change host state
outside the authorized FDOS-only mutation scope.

## 13. Unchanged Worker Release

The OCI policy/provider/test/doc files are outside the current packaged worker
source graph.

The existing release remains:

```text
package version:     2.0.0-experimental
package digest:      sha256:51cd86533646d78353ed91fc86e0d16f74fc7b4eb404c722c77d3b4a3d67d196
package file SHA-256: 7af0a5e75570fa7dbe88d4fc334b71a9b1be6d67eb16e4b8a1a801dc7aba0d30
artifact version:    3.0.0-experimental
artifact digest:     sha256:59933e5c2830b0a63d32c2938cb00175431495862a2c948af8d3d4c105a7db8a
attestation digest:  sha256:e78fc5e2f8ca6fd90b19739634c10ec1b06c6ff83ec91776698bd49b754cda93
trust-anchor digest: sha256:c70b21a175dbfa514447d1de2476a7931e52632446abcaee6cba3c8a5da92c39
```

Worker protocol remains 1.4.

No private release, workload, registry or Connector key was generated,
changed, printed or stored.

## 14. Standards Basis

Design inputs were checked against:

- Docker's official container-run reference;
- Docker's official image-inspect reference;
- Docker's official seccomp documentation;
- OCI Image Format and Distribution specifications.

Those mutable online documents are design references. They are not part of
the source manifest and are not presented as immutable validation evidence.
The local CLI help confirmed every selected launch option.

## 15. Checks Not Performed

- No daemon was started or configured.
- No image was built, pulled, pushed, signed, scanned or inspected live.
- No registry, DNS, TLS or external network request was made by FDOS.
- No container was created, started, killed or removed.
- No in-container network, filesystem, user, capability, seccomp or resource
  probe ran.
- No container timeout, orphan or cleanup behavior was tested.
- No OCI observation entered worker protocol, Outbox state or durable receipt.
- No external workload identity, image provenance, KMS, transparency,
  revocation or timestamp service was tested.
- No independent CI runner, security review or Human Governance acceptance
  exists.

## 16. Open Findings

1. Positive runtime/image admission uses deterministic fixtures.
2. The real host establishes only launcher identity and daemon-unavailable
   rejection.
3. A user-owned launcher and future local daemon remain mutable trusted
   components.
4. A local RepoDigest observation is not external image signature or
   provenance.
5. The launch template is not execution or enforcement evidence.
6. No reproducible FDOS OCI image exists.
7. No safe container environment-transfer, kill or cleanup integration exists.
8. Worker protocol and durable receipt do not bind the outer OCI boundary.
9. No externally rooted workload identity exists.
10. No production monitoring, incident response or independent review exists.

## 17. Interpretation

The narrow supported statement is:

> On the manifest-bound Level 1 candidate, FDOS enforced a closed
> digest-pinned OCI worker policy, validated fixture-backed local
> runtime/image admission, reconstructed an exact hardened non-authorizing
> launch template and failed closed against the unavailable real local daemon.

The unsupported statement is:

> FDOS ran an immutable, isolated or externally attested container workload.

## 18. Governance Conclusion

Technical Slice 13 passed its selected local R3/V3 verification for OCI
admission foundation only.

It authorizes no daemon start, image operation, container execution, real
Connector, external effect or FDOS Core promotion.

The next gate is a separately approved live no-effect container experiment
with reproducible digest-pinned build, protected provenance, admitted runtime,
inside/outside conformance probes, deterministic cleanup and durable outer
boundary receipt binding.
