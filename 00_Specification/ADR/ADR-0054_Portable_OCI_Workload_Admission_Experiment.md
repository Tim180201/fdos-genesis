# ADR-0054 — Portable OCI Workload Admission Experiment

Status: Implemented for Experiment; Human Review Pending; Not Accepted into
FDOS Core

Decision Date: 2026-07-29

Decision Owner: Human Governance

Validation Level: Level 1 — Experimental

Related Decisions:

- `ADR-0048_Process_Separated_Dry_Run_Worker_Experiment.md`
- `ADR-0049_Darwin_Network_and_Write_Sandbox_Experiment.md`
- `ADR-0051_Deterministic_Signed_Worker_Package_Experiment.md`
- `ADR-0052_Ephemeral_Workload_Session_and_Authenticated_Response_Experiment.md`
- `ADR-0053_Durable_Verified_Worker_Receipt_Experiment.md`

## Decision

FDOS shall introduce a closed OCI Workload Policy and a local Docker OCI
Provider as a fail-closed admission layer before any portable container-worker
integration.

The policy shall bind:

- one exact OCI manifest digest and named digest reference;
- one supported Linux platform;
- the fixed FDOS dry-run bootstrap, package path, non-root user and working
  directory;
- the only container environment names the worker may receive;
- read-only root filesystem, no caller-supplied host bind/volume/device
  mappings, no network, private IPC, no privileges, all Linux capabilities
  dropped, `no-new-privileges` and Docker's built-in seccomp profile;
- CPU, memory, swap, PID, open-file and tmpfs limits.

The provider shall admit a local runtime only after resolving and hashing the
configured Docker launcher, contacting only an explicit local Unix socket and
verifying a Linux Docker Engine with API 1.49 or newer, cgroup v2 and built-in
seccomp.

It shall admit an image only when local inspection binds the exact named
manifest digest, platform, non-root user, working directory, complete
entrypoint/command, rootfs layer set, absent declared volumes, absent exposed
ports and a small bounded image-environment allowlist.

Successful admission shall create a self-digested hardened launch template,
but it shall retain:

```text
executionAuthorized: false
executionObserved: false
workloadIdentityExternallyAttested: false
productionReady: false
```

This decision does not authorize starting a Docker/Colima daemon, building or
pulling an image, executing the worker in a container or enabling a real
Connector.

## Context

The current process worker has two launch modes:

- process-only, which is not a sandbox;
- an optional Darwin `sandbox-exec` experiment, which is deprecated,
  platform-specific and incomplete.

Technical Slice 12 made the local worker-verification result durable but left
the mutable parent, bootstrap, package and host inside the trusted computing
base. The next production-oriented gate requires a supported portable
container or VM boundary and an immutable deployment identity.

The recorded workstation exposes Docker CLI 29.6.2 and Colima tooling, but no
Docker or Colima daemon is running. Starting a host service would mutate state
outside the FDOS repository and is not authorized by the FDOS-only work scope.
No locally inspectable FDOS OCI image exists.

FDOS can nevertheless establish the complete admission contract, provider
boundary, launch-template construction and adversarial verification before a
separately authorized live-runtime slice.

## Closed Policy

The policy is canonical, self-digested and exact-shaped:

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

### Image

The image reference must use:

```text
registry/path@sha256:<64 lowercase hexadecimal characters>
```

Tag-only references and a reference whose digest differs from
`manifestDigest` fail closed. Only `linux/amd64` and `linux/arm64` are
admitted. The registry is restricted to `localhost` or a qualified hostname
with an optional valid TCP port; ambiguous unqualified registry components
are rejected.

A named digest is required because an OCI digest is a content identifier,
while a tag is a mutable human-readable pointer.

### Process

The pilot process is not caller-selectable:

```text
/usr/local/bin/node
--no-warnings
--experimental-vm-modules
/opt/fdos/runtime/src/workers/dry-run-worker-bootstrap.js
/opt/fdos/package/connector-dry-run-v2.fdos-package.json
```

The configured user is `65532:65532`; the working directory is
`/opt/fdos/worker`.

Only the existing bounded worker configuration names plus `LANG`, `LC_ALL`
and `TZ` may later enter the container. The admission artifact stores names,
not runtime values.

### Security

The exact policy requires:

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

Any weaker or additional value fails closed even if the outer policy digest
is recomputed.

### Resources

The policy binds:

- CPU quota between 0.1 and 2 CPUs;
- memory between 64 MiB and 512 MiB;
- memory-swap limit exactly equal to memory;
- PID limit between 8 and 128;
- equal bounded soft/hard open-file limits;
- one bounded `/tmp` tmpfs with `noexec`, `nosuid` and `nodev`.

The initial pilot defaults are 0.5 CPU, 128 MiB memory, 32 PIDs, 512 open
files and 16 MiB tmpfs.

## Launcher and Runtime Admission

The provider requires an explicit normalized absolute Docker executable and
an explicit `unix:///...` endpoint. TCP, SSH, context-selected and relative
runtime identities are rejected.

Launcher inspection:

1. resolves any symbolic link;
2. requires one regular non-empty executable no larger than 64 MiB;
3. rejects group- or world-writable content;
4. hashes the complete resolved binary;
5. records requested/resolved path, size, owner, group, mode and whether a
   requested leaf link was resolved;
6. uses the resolved path for bounded runtime and image inspection commands.

This is local filesystem identity only. A user-owned Homebrew binary is not
an externally protected trust root.

Runtime inspection executes bounded, shell-free:

```text
docker --host <unix socket> version --format=json
docker --host <unix socket> info --format=json
```

Admission requires:

- accepted client and server version responses with empty standard error;
- server API version 1.49 or newer;
- Linux server;
- supported `amd64` or `arm64` architecture;
- cgroup v2;
- `name=seccomp,profile=builtin`.

Rootless state is recorded but is not currently required because Docker
Desktop may place the daemon inside a VM. Neither mode creates external
attestation.

## Image Admission

Image admission executes bounded, shell-free local inspection with the exact
platform and named digest. It performs no pull.

The image must expose:

- the exact named digest in `RepoDigests`;
- matching Linux platform;
- the exact non-root user and working directory;
- entrypoint plus command equal to the complete fixed pilot command;
- a layered rootfs with at least one content digest;
- no declared volumes;
- no exposed ports;
- only `PATH`, `LANG`, `LC_ALL` and `TZ` as image-config environment names.

The environment restriction blocks image-level execution modifiers such as
`NODE_OPTIONS`. The complete allowed environment is retained only as a digest.

Image ID, manifest digest, command digest, rootfs digest and layer count enter
the observation. `externallyAttested` remains false.

## Launch Template

The launch template binds the policy, runtime and image observation digests.
It includes:

```text
--rm
--interactive
--pull=never
--platform=<exact platform>
--network=none
--read-only
--user=65532:65532
--workdir=/opt/fdos/worker
--cap-drop=ALL
--security-opt=no-new-privileges=true
--security-opt=seccomp=builtin
--ipc=private
--no-healthcheck
--pids-limit=<bound>
--memory=<bound>
--memory-swap=<same bound>
--memory-swappiness=0
--cpus=<bound>
--ulimit=nofile=<bound>:<bound>
--ulimit=core=0:0
--tmpfs=/tmp:rw,noexec,nosuid,nodev,size=<bound>
--log-driver=none
--stop-timeout=1
<exact image digest reference>
```

There is no `--privileged`, host namespace, port, caller-supplied host mount,
additional device, Docker socket, parent-environment forwarding or explicit
restart policy. Docker-managed pseudo-filesystems and default devices remain
inside the trusted runtime boundary. Docker's default restart policy is `no`;
an explicit `--restart` cannot be combined with the required `--rm`.

The template describes the future launch boundary. It intentionally does not
contain per-launch environment values and is not an execution authorization.

## Failure Rule

Policy, launcher, runtime, image or template mismatch records no admission.
Command failure, timeout, output overflow, non-empty standard error and
malformed runtime JSON fail closed with content-minimized diagnostic digests.

A valid-looking preflight whose template, runtime architecture or claim
booleans are changed and redigested must fail independent verification.

## Trusted Computing Base

This experiment still trusts:

- the mutable local FDOS parent and provider;
- the configured Docker CLI path and its parent filesystem;
- the local Unix socket endpoint and daemon;
- Docker's engine, container runtime, Linux VM/kernel, cgroups and seccomp;
- the local image store and inspection response;
- the future image builder, registry and deployment controller.

The policy reduces ambiguity; it does not make these components immutable.

## Explicit Non-Claims

This decision does not establish:

- a running or conformant Docker daemon;
- an existing, built, pulled, signed or executed FDOS OCI image;
- verified enforcement of the launch flags;
- a worker response from a container;
- container cleanup, timeout or crash semantics;
- a read-only rootfs, network denial or resource limit observed inside a live
  container;
- external image transparency, signature or provenance;
- externally rooted workload identity or remote attestation;
- protected daemon, release or Connector key custody;
- production readiness or a real Connector.

## Standards and Tool Basis

The contract was checked against:

- Docker's official
  [`docker container run`](https://docs.docker.com/reference/cli/docker/container/run/)
  reference for read-only rootfs, tmpfs, capabilities, resource limits,
  network, seccomp and `no-new-privileges`;
- Docker's official
  [`docker image inspect`](https://docs.docker.com/reference/cli/docker/image/inspect/)
  reference, including platform-bound inspection requiring API 1.49 or newer;
- Docker's official
  [seccomp documentation](https://docs.docker.com/engine/security/seccomp/);
- the
  [OCI Image Format](https://github.com/opencontainers/image-spec) and
  [Distribution](https://github.com/opencontainers/distribution-spec)
  specifications for content digests and the distinction between manifests
  and mutable tags.

These online documents are design references, not immutable FDOS evidence.
The exact local CLI help and binary identity are recorded separately.

## Promotion Rule

Before integrating this provider with `ProcessSeparatedDryRunWorker`, Human
Governance must separately authorize:

1. starting or selecting a supported local/CI container runtime;
2. a reproducible multi-platform image build from a digest-pinned base;
3. an externally protected image signature/provenance and registry policy;
4. live conformance probes for network, rootfs, user, capabilities, seccomp,
   process, memory and PID controls;
5. safe per-launch environment transfer, timeout, kill and cleanup semantics;
6. exact receipt extension for the outer container boundary;
7. externally rooted workload identity, trusted time and replay/revocation;
8. independent security review.

No real read-only Connector may be enabled before those gates pass.
