# Company OS Pilot — Validation Report 013

Status: Technical Slice 13 Passed / Human Review Pending

Date: 2026-07-29

Validation Level: Level 1 — Experimental

## Outcome

FDOS now has a closed OCI Workload Policy and an executable local Docker OCI
admission provider.

The policy admits only one named OCI manifest digest, supported Linux
platform, fixed FDOS worker process, non-root identity, bounded environment
surface, no-network/read-only/no-privilege security profile and explicit
resource limits.

The provider resolves and hashes one configured Docker executable, contacts
only one explicit Unix socket, requires a compatible Linux/cgroup-v2/seccomp
Engine, inspects the exact local image and reconstructs a hardened launch
template.

The preflight is deliberately non-authorizing:

```text
executionAuthorized: false
executionObserved: false
workloadIdentityExternallyAttested: false
productionReady: false
```

The real local Docker CLI was inspected, but no Docker/Colima daemon was
running and no FDOS OCI image existed. The provider failed closed before image
inspection or execution. No host service was started, no image was built or
pulled and no container ran.

This slice validates the reusable admission foundation. It does not satisfy
the later live immutable-deployment or external-workload-identity gate.

## Acceptance Matrix

| Criterion | Result | Evidence |
|---|---|---|
| Complete automated suite | Passed, 153/153 | `../../04_Evidence/fdos-runtime/EV-FDOS-OCI-ADMISSION-013.md` |
| Focused OCI suite | Passed, 13/13 | `../../02_Reference_Implementations/FDOS_Runtime/test/oci-workload-boundary.test.js` |
| Closed self-digested policy | Passed | exact top-level and nested shapes |
| Digest-only image identity | Passed | tag-only and mismatched digest rejected |
| Fixed worker process | Passed | command/user/workdir/environment names not caller-selectable |
| Privilege denial | Passed | non-root, non-privileged, drop ALL, NNP, seccomp |
| Host isolation intent | Passed as template | no network, caller-supplied host mount/device mappings or host namespaces |
| Filesystem policy | Passed as template | read-only root plus bounded `/tmp` tmpfs |
| Resource policy | Passed as template | CPU, memory/swap, PIDs, open files and tmpfs bound |
| Launcher identity | Passed locally | resolved complete binary SHA-256 and mode |
| Runtime admission | Passed against fixtures | API 1.49+, Linux, cgroup v2 and built-in seccomp |
| Runtime-unavailable behavior | Passed on recorded host | fail-closed before image admission |
| Image admission | Passed against fixtures | RepoDigest/platform/config/rootfs exact |
| Image config confusion | Rejected | root, command, environment, volume, port and architecture faults |
| Launch-template reconstruction | Passed | weakened redigested template rejected |
| Shell-free bounded command runner | Passed | real local executable fixture |
| Live OCI image inspection | Not performed | no daemon/image |
| Live container enforcement | Not performed | no execution authorized |
| External workload identity | Not claimed | explicit false |
| FDOS Core promotion | Not requested | reference implementation remains Level 1 |

## OCI Workload Policy

The closed policy is:

```text
schemaVersion: 1.0
kind: fdos-oci-workload-policy
provider: docker-engine-local-oci-v1
image
process
security
resources
digest
```

### Image identity

The reference must have this form:

```text
registry/path@sha256:<64 lowercase hexadecimal characters>
```

The digest suffix must equal `manifestDigest`. Supported platforms are
`linux/amd64` and `linux/arm64`. Registry components must be `localhost` or a
qualified hostname with an optional port between 1 and 65535.

### Fixed process

```text
user:              65532:65532
working directory: /opt/fdos/worker
command:
  /usr/local/bin/node
  --no-warnings
  --experimental-vm-modules
  /opt/fdos/runtime/src/workers/dry-run-worker-bootstrap.js
  /opt/fdos/package/connector-dry-run-v2.fdos-package.json
```

The per-launch allowlist contains only the existing worker configuration
names plus `LANG`, `LC_ALL` and `TZ`. Independently, the inspected image
configuration may contain `PATH` plus those three inert locale/timezone names.
Per-launch values are not retained in preflight.

### Security policy

```text
privileged:           false
no-new-privileges:    true
capabilities dropped: ALL
seccomp:              builtin
network:              none
IPC:                  private
root filesystem:      read-only
caller-supplied host mounts:     none
additional host-device mappings: none
```

### Default resource policy

```text
CPU:                  0.5
memory:               128 MiB
memory plus swap:     128 MiB
PIDs:                 32
open files:           512 / 512
/tmp tmpfs:           16 MiB, noexec, nosuid, nodev
```

All values remain inside explicit ranges and are included in the policy
digest.

## Local Docker Provider

The provider accepts only:

- a normalized absolute executable;
- a normalized `unix:///...` endpoint;
- shell-free bounded JSON commands;
- empty standard error and clean exit.

Launcher inspection resolves links and requires a regular, non-empty,
executable binary no larger than 64 MiB with no group/world write bit. It
records complete SHA-256, paths, size, ownership and mode; inspection commands
use the resolved path.

Runtime admission requires:

```text
Docker API:      >= 1.49
server OS:       linux
architecture:    amd64 or arm64
cgroup:          v2
seccomp profile: builtin
```

Rootless mode is observed but not required or treated as attestation.

## Image Admission

The exact named digest is inspected locally with the policy platform and no
pull.

Admission binds:

- exact `RepoDigests` entry;
- Linux platform matching the runtime;
- exact non-root user and workdir;
- exact entrypoint plus command;
- layered rootfs and content digests;
- no declared volumes;
- no exposed ports;
- image-config environment names limited to `PATH`, `LANG`, `LC_ALL` and
  `TZ`.

The observation retains image ID, manifest, command, rootfs and allowed
environment digests. It records `externallyAttested: false`.

## Hardened Launch Template

The template contains:

```text
--rm
--interactive
--pull=never
--platform=<exact>
--network=none
--read-only
--user=65532:65532
--workdir=/opt/fdos/worker
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
--stop-timeout=1
<exact digest reference>
```

It contains no privilege, host network/namespace, port, caller-supplied host
mount, additional device or Docker-socket flag. Docker-managed files/default
devices remain part of the trusted runtime boundary. The required `--rm` uses
Docker's default `no` restart policy; the exact template contains no
conflicting `--restart` option.

Independent preflight verification reconstructs this exact list from the
retained policy, runtime and image observations and revalidates their
architecture binding. Redigested `--network=host` and cross-architecture
substitutions were rejected.

## Verification

### Complete regression

```text
npm run check
tests 153
pass 153
fail 0
skipped 0
```

### Focused boundary

```text
node --test --test-concurrency=1 \
  test/oci-workload-boundary.test.js
tests 13
pass 13
fail 0
```

Focused cases include:

- valid frozen policy and preflight;
- tag-only and digest-confused image rejection;
- privilege, network, mount, device, capability, seccomp, root-user and
  resource downgrades after outer redigest;
- missing API, Linux, cgroup-v2 and seccomp capability rejection;
- wrong RepoDigest, user, command, environment, volume, port, architecture
  and rootfs rejection;
- command failure, malformed output and unavailable daemon rejection;
- launch-template and runtime-architecture substitution after complete
  affected-digest recomputation;
- false execution, attestation and production claims;
- invalid executable and remote endpoint identities;
- real bounded shell-free child-process command execution.

### Coverage

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

Coverage validates source paths, not a real container runtime or host-kernel
enforcement.

## Recorded Host Reality

```text
Docker CLI version: 29.6.2
Docker requested:   /opt/homebrew/bin/docker
Docker resolved:    /opt/homebrew/Cellar/docker/29.6.2/bin/docker
Docker binary SHA:  eade1c3a5dda47534dc776f2f534c99cc94cfcf9ce07c4bf09e98258d13e7d7a
Docker binary mode: 0555
Docker owner/group: uid 501 / gid 80
Docker daemon:      unavailable
Colima version:     0.10.3
Colima instance:    unavailable
FDOS OCI image:     unavailable
```

The actual provider returned `POLICY_DENIED` at `runtime-version` and produced
no preflight. Its content-minimized diagnostic digest was:

```text
sha256:844df846d44ce3d9b15c2d82b65d46da49c0d8cd3afd0cc7d6d3d16d8197893c
```

No daemon was started because that would mutate host state outside the
authorized FDOS repository scope.

## Unchanged Worker Release

The OCI admission code is outside the packaged 13-module worker graph.
Protocol 1.4, package v2 and artifact v3 remain unchanged.

No release or session private key was generated, changed, printed or stored.

## Open Findings

1. No live Docker/OCI runtime was admitted on the recorded host.
2. No FDOS OCI image has been reproducibly built or inspected.
3. Template construction does not prove runtime enforcement.
4. The provider is not integrated into `ProcessSeparatedDryRunWorker`.
5. Per-launch environment transfer, timeout, kill and cleanup are not
   implemented for containers.
6. The outer OCI boundary is not represented in worker protocol 1.4 or the
   durable receipt.
7. The Docker CLI is user-owned local tooling.
8. A future Unix socket and daemon remain trusted local authorities.
9. No protected registry, signature, provenance, SBOM, vulnerability policy
   or transparency service exists.
10. No externally rooted workload identity, trusted time, revocation or
    remote attestation exists.
11. No independent runner, security review or Human Governance decision
    exists.

## Governance Recommendation

Human Governance may accept Technical Slice 13 only as Level 1 evidence for:

- a closed digest-pinned OCI worker policy;
- fail-closed local launcher/runtime/image admission;
- exact hardened launch-template reconstruction;
- tested downgrade and identity-confusion rejection;
- explicit separation between admission and execution.

The next separately authorized slice should build a reproducible image from a
digest-pinned base, admit it through an available supported runtime, run only
live no-effect conformance probes, implement bounded kill/cleanup and retain
the outer OCI observation in the worker receipt.

This report authorizes no daemon start, image pull/build, container execution,
networked connector, external write or FDOS Core promotion.
