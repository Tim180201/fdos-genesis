# OCI Workload Admission

Status: Experimental Preflight Foundation

Validation Level: Level 1

Production Status: Not Production Ready

Related Decision:

- `../../../00_Specification/ADR/ADR-0054_Portable_OCI_Workload_Admission_Experiment.md`

## Purpose

Define and validate the exact portable container boundary FDOS will require
before replacing the process-only and deprecated Darwin launch modes.

This module performs policy, local Docker runtime and local image admission.
It produces a hardened launch template. It does not execute a container and
does not authorize one.

## Components

```text
src/domain/oci-workload-policy.js
  -> exact self-digested OCI policy

src/integrations/docker-oci-workload-provider.js
  -> Docker launcher inspection
  -> local Unix-socket runtime admission
  -> exact image inspection
  -> hardened launch-template construction
  -> independently verifiable preflight artifact

test/oci-workload-boundary.test.js
  -> closed-schema and downgrade tests
  -> runtime/image confusion tests
  -> real shell-free bounded child-process fixture
```

## Policy Example

```js
import {
  createOciWorkloadPolicy
} from "../src/index.js";

const manifestDigest =
  "sha256:<exact OCI manifest digest>";

const policy = createOciWorkloadPolicy({
  imageReference:
    `registry.example.com/fdos/connector-dry-run@${manifestDigest}`,
  manifestDigest,
  platform: "linux/arm64"
});
```

Tag-only images are rejected. The reference digest and `manifestDigest` must
match exactly. The registry component must be `localhost` or a qualified
hostname, and any explicit port must be between 1 and 65535.

The fixed process is:

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

The process command, user, directory and environment-name allowlist cannot be
changed through policy input.

## Default Security Profile

```text
privileged:              false
new privileges:          denied
capabilities:            drop ALL
seccomp:                 Docker builtin
network:                 none
IPC namespace:           private
root filesystem:         read-only
caller-supplied host mounts:        none
additional host-device mappings:    none
healthcheck:              disabled
restart:                  Docker default `no`; no conflicting restart flag
container logging:       disabled
core dumps:              disabled
parent environment:      not forwarded
```

Default resource bounds:

```text
CPU:                     0.5
memory:                  128 MiB
memory plus swap:        128 MiB
memory swappiness:       0
PIDs:                    32
open files:              512 soft / 512 hard
/tmp tmpfs:              16 MiB, noexec, nosuid, nodev
```

The root filesystem is read-only, but the explicitly bounded `/tmp` tmpfs is
writable. Docker-managed files and the host/VM runtime remain part of the
provider boundary; `hostMounts: []` and `hostDevices: []` prohibit additional
caller-supplied mappings rather than claiming Docker exposes no managed
pseudo-filesystems or default devices.

## Provider Configuration

```js
import {
  DockerOciWorkloadProvider
} from "../src/index.js";

const provider = new DockerOciWorkloadProvider({
  executable: "/absolute/path/to/docker",
  endpoint: "unix:///absolute/path/to/docker.sock"
});
```

Only normalized absolute executables and local Unix sockets are accepted.
Remote TCP/SSH endpoints and implicit Docker contexts are rejected.

The default command runner:

- uses `spawn` with `shell: false`;
- uses `/` as the working directory;
- forwards no parent environment;
- sets only `LANG=C`, `LC_ALL=C` and `TZ=UTC`;
- accepts bounded output only;
- enforces a short timeout;
- rejects non-zero exit, signal, standard error and malformed JSON.

## Runtime Admission

`inspectRuntime()` first records the resolved launcher:

```text
requested and resolved path
complete SHA-256
size
uid/gid
mode
whether the requested leaf itself is a symbolic link
root ownership
```

The resolved file must be regular, non-empty, executable, at most 64 MiB and
not group- or world-writable. Its size and mode are checked before the
complete file is read. Runtime and image commands use the recorded resolved
path rather than the caller-supplied symbolic-link path.

The provider then requests JSON from:

```text
docker --host <unix socket> version --format=json
docker --host <unix socket> info --format=json
```

It requires:

```text
server API:     >= 1.49
server OS:      linux
architecture:   amd64 or arm64
cgroup:         v2
seccomp:        builtin
```

`rootless` is recorded but not treated as external attestation.

## Image Admission

`inspectImage()` uses the exact platform and digest reference and performs no
pull.

The local image must match:

- named manifest digest;
- platform and runtime architecture;
- `65532:65532`;
- `/opt/fdos/worker`;
- exact fixed entrypoint plus command;
- layered rootfs with content digests;
- no declared volume;
- no exposed port;
- image environment names limited to `PATH`, `LANG`, `LC_ALL` and `TZ`.

`NODE_OPTIONS`, worker configuration embedded in the image and any other
environment name fail closed.

The observation retains digests for the manifest, image ID, command, rootfs
and allowed image environment. It explicitly records
`externallyAttested: false`.

## Preflight

```js
const preflight = await provider.preflight(policy);
```

Preflight succeeds only when policy, runtime, image and launch template bind
exactly. The returned artifact is closed and self-digested.

Every successful preflight still contains:

```text
executionAuthorized: false
executionObserved: false
workloadIdentityExternallyAttested: false
productionReady: false
```

`verifyOciWorkloadPreflight(preflight)` reconstructs the expected launch
template from the retained policy, runtime and image observations and
revalidates their architecture binding. Changing `--network=none` to
`--network=host` or substituting another runtime architecture remains invalid
even after recomputing every affected digest.

## Recorded Local Host

The recorded development host exposed:

```text
Docker CLI:          29.6.2
requested path:      /opt/homebrew/bin/docker
resolved path:       /opt/homebrew/Cellar/docker/29.6.2/bin/docker
launcher mode:       0555
launcher owner:      uid 501 / gid 80
launcher SHA-256:    eade1c3a5dda47534dc776f2f534c99cc94cfcf9ce07c4bf09e98258d13e7d7a
Docker daemon:       unavailable
Colima instance:     unavailable
```

The user-owned Homebrew path is mutable local tooling, not protected release
infrastructure. No FDOS image was available for inspection.

## Failure Semantics

There is no fallback to process-only or Darwin execution from the OCI
provider.

Failure produces no preflight when:

- the policy is incomplete, changed or weaker;
- the launcher is missing, writable or malformed;
- the runtime cannot be contacted;
- API, Linux, architecture, cgroup or seccomp requirements fail;
- image identity or configuration differs;
- command output fails bounds, exit, stderr or JSON checks;
- retained bindings or launch arguments are changed.

## Current Boundary

This slice proves executable admission logic and exact template construction
against deterministic provider fixtures. It also proves that the real local
host fails closed because no daemon is available.

It does not prove a live container, an immutable registry, signed image
provenance, actual enforcement, cleanup semantics or workload identity. Those
remain the next separately authorized implementation gate.
