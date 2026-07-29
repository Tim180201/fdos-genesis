import assert from "node:assert/strict";
import {
  chmod,
  mkdtemp,
  realpath,
  rm,
  writeFile
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  createOciWorkloadPolicy,
  digestObject,
  DockerOciWorkloadProvider,
  IntegrityError,
  PILOT_OCI_WORKER_COMMAND,
  PolicyError,
  ValidationError,
  verifyOciWorkloadPolicy,
  verifyOciWorkloadPreflight
} from "../src/index.js";

const manifestDigest = `sha256:${"a".repeat(64)}`;
const imageReference =
  `registry.example.com/fdos/connector-dry-run@${manifestDigest}`;
const imageId = `sha256:${"b".repeat(64)}`;
const layerOne = `sha256:${"c".repeat(64)}`;
const layerTwo = `sha256:${"d".repeat(64)}`;
const endpoint = "unix:///tmp/fdos-docker-test.sock";

function mutableClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function redigest(value) {
  const unsigned = mutableClone(value);
  delete unsigned.digest;
  return {
    ...unsigned,
    digest: digestObject(unsigned)
  };
}

function policy(overrides = {}) {
  return createOciWorkloadPolicy({
    imageReference,
    manifestDigest,
    platform: `linux/${process.arch === "x64" ? "amd64" : "arm64"}`,
    ...overrides
  });
}

function runtimeInfo(overrides = {}) {
  return {
    OSType: "linux",
    Architecture:
      process.arch === "x64" ? "amd64" : "arm64",
    CgroupVersion: "2",
    SecurityOptions: [
      "name=seccomp,profile=builtin",
      "name=cgroupns"
    ],
    ...overrides
  };
}

function runtimeVersion(overrides = {}) {
  return {
    Client: {
      Version: "29.6.2"
    },
    Server: {
      Version: "29.6.2",
      ApiVersion: "1.53"
    },
    ...overrides
  };
}

function inspectedImage(
  configuredPolicy,
  overrides = {}
) {
  const architecture =
    configuredPolicy.image.platform.split("/")[1];
  return {
    RepoDigests: [configuredPolicy.image.reference],
    Architecture: architecture,
    Os: "linux",
    Id: imageId,
    Config: {
      User: configuredPolicy.process.user,
      WorkingDir:
        configuredPolicy.process.workingDirectory,
      Entrypoint: [
        PILOT_OCI_WORKER_COMMAND[0]
      ],
      Cmd: PILOT_OCI_WORKER_COMMAND.slice(1),
      Env: [
        "LANG=C",
        "LC_ALL=C",
        "PATH=/usr/local/bin:/usr/bin:/bin",
        "TZ=UTC"
      ],
      Volumes: null,
      ExposedPorts: null
    },
    RootFS: {
      Type: "layers",
      Layers: [layerOne, layerTwo]
    },
    ...overrides
  };
}

function fakeDockerRunner({
  configuredPolicy,
  version = runtimeVersion(),
  info = runtimeInfo(),
  image = inspectedImage(configuredPolicy),
  failures = {}
}) {
  const calls = [];
  const runner = async (request) => {
    calls.push(mutableClone(request));
    const argumentList = request.arguments;
    let operation;
    let output;
    if (argumentList.includes("version")) {
      operation = "version";
      output = version;
    } else if (argumentList.includes("info")) {
      operation = "info";
      output = info;
    } else if (argumentList.includes("inspect")) {
      operation = "image";
      output = image;
    } else {
      throw new Error("Unexpected fake Docker command.");
    }
    if (failures[operation] instanceof Error) {
      throw failures[operation];
    }
    if (failures[operation]) {
      return {
        code: failures[operation].code ?? 1,
        signal: failures[operation].signal ?? null,
        stdout: failures[operation].stdout ?? "",
        stderr:
          failures[operation].stderr ??
          "fake Docker failure"
      };
    }
    return {
      code: 0,
      signal: null,
      stdout: JSON.stringify(output),
      stderr: ""
    };
  };
  return {
    calls,
    runner
  };
}

function provider(commandRunner) {
  return new DockerOciWorkloadProvider({
    executable: process.execPath,
    endpoint,
    commandRunner
  });
}

test("OCI workload policy is digest-pinned, closed and fail-closed", () => {
  const configured = policy();
  assert.equal(verifyOciWorkloadPolicy(configured), true);
  assert.equal(Object.isFrozen(configured), true);
  assert.equal(configured.image.reference, imageReference);
  assert.equal(
    configured.image.manifestDigest,
    manifestDigest
  );
  assert.equal(configured.process.user, "65532:65532");
  assert.deepEqual(
    configured.process.command,
    PILOT_OCI_WORKER_COMMAND
  );
  assert.equal(configured.security.privileged, false);
  assert.equal(configured.security.networkMode, "none");
  assert.equal(
    configured.security.filesystemMode,
    "read-only-root"
  );
  assert.deepEqual(
    configured.security.capabilitiesDrop,
    ["ALL"]
  );
  assert.deepEqual(configured.security.hostMounts, []);
  assert.deepEqual(configured.security.hostDevices, []);
  assert.equal(
    configured.resources.memorySwapBytes,
    configured.resources.memoryBytes
  );
});

test("OCI workload policy rejects mutable image references and digest confusion", () => {
  assert.throws(
    () =>
      createOciWorkloadPolicy({
        imageReference:
          "registry.example.com/fdos/connector-dry-run:latest",
        manifestDigest,
        platform: "linux/arm64"
    }),
    ValidationError
  );
  assert.throws(
    () =>
      createOciWorkloadPolicy({
        imageReference:
          `registry/fdos/connector-dry-run@${manifestDigest}`,
        manifestDigest,
        platform: "linux/arm64"
      }),
    ValidationError
  );
  assert.throws(
    () =>
      createOciWorkloadPolicy({
        imageReference:
          `registry.example.com:70000/fdos/connector-dry-run@${manifestDigest}`,
        manifestDigest,
        platform: "linux/arm64"
      }),
    ValidationError
  );
  assert.throws(
    () =>
      createOciWorkloadPolicy({
        imageReference: ` ${imageReference}`,
        manifestDigest,
        platform: "linux/arm64"
      }),
    ValidationError
  );
  assert.throws(
    () =>
      createOciWorkloadPolicy({
        imageReference,
        manifestDigest: `sha256:${"e".repeat(64)}`,
        platform: "linux/arm64"
      }),
    ValidationError
  );
  assert.throws(
    () =>
      createOciWorkloadPolicy({
        imageReference:
          `registry.example.com/fdos/Connector@${manifestDigest}`,
        manifestDigest,
        platform: "linux/arm64"
      }),
    ValidationError
  );
});

test("OCI workload policy rejects privilege, host-access and resource downgrades after redigest", () => {
  const cases = [
    (candidate) => {
      candidate.security.privileged = true;
    },
    (candidate) => {
      candidate.security.networkMode = "host";
    },
    (candidate) => {
      candidate.security.hostMounts = ["/:/host"];
    },
    (candidate) => {
      candidate.security.hostDevices = ["/dev/null"];
    },
    (candidate) => {
      candidate.security.capabilitiesDrop = [];
    },
    (candidate) => {
      candidate.security.seccompProfile = "unconfined";
    },
    (candidate) => {
      candidate.process.user = "0:0";
    },
    (candidate) => {
      candidate.resources.memorySwapBytes =
        candidate.resources.memoryBytes * 2;
    },
    (candidate) => {
      candidate.resources.pidsLimit = 1_000;
    },
    (candidate) => {
      candidate.resources.openFiles.hard =
        candidate.resources.openFiles.soft * 2;
    },
    (candidate) => {
      candidate.resources.tmpfs.noExec = false;
    }
  ];
  for (const change of cases) {
    const candidate = mutableClone(policy());
    change(candidate);
    assert.throws(
      () => verifyOciWorkloadPolicy(redigest(candidate)),
      IntegrityError
    );
  }
});

test("Docker OCI provider exposes no unverified enforcement claim", () => {
  const configured = policy();
  const fake = fakeDockerRunner({
    configuredPolicy: configured
  });
  const localProvider = provider(fake.runner);
  const status = localProvider.status();
  assert.equal(status.enforcementState, "not_inspected");
  assert.equal(status.executionAuthorized, false);
  assert.equal(status.productionReady, false);
  assert.equal(status.digestPinnedImageRequired, true);
});

test("Docker OCI preflight binds runtime, image and exact hardened launch template", async () => {
  const configured = policy();
  const fake = fakeDockerRunner({
    configuredPolicy: configured
  });
  const localProvider = provider(fake.runner);
  const preflight = await localProvider.preflight(configured);

  assert.equal(verifyOciWorkloadPreflight(preflight), true);
  assert.equal(preflight.policy.digest, configured.digest);
  assert.equal(preflight.runtime.operatingSystem, "linux");
  assert.equal(preflight.runtime.cgroupVersion, "2");
  assert.equal(preflight.runtime.seccompProfile, "builtin");
  assert.equal(preflight.runtime.externallyAttested, false);
  assert.equal(preflight.image.manifestDigestMatched, true);
  assert.equal(preflight.image.layerCount, 2);
  assert.equal(preflight.image.declaredVolumes, false);
  assert.equal(preflight.image.exposedPorts, false);
  assert.equal(preflight.executionAuthorized, false);
  assert.equal(preflight.executionObserved, false);
  assert.equal(
    preflight.workloadIdentityExternallyAttested,
    false
  );
  assert.equal(preflight.productionReady, false);
  assert.equal(
    preflight.template.parentEnvironmentForwarded,
    false
  );
  assert.equal(preflight.template.shell, false);

  const argumentsList = preflight.template.arguments;
  for (const required of [
    "--pull=never",
    "--network=none",
    "--read-only",
    "--user=65532:65532",
    "--cap-drop=ALL",
    "--security-opt=no-new-privileges=true",
    "--security-opt=seccomp=builtin",
    "--ipc=private",
    "--no-healthcheck",
    "--pids-limit=32",
    "--memory=134217728",
    "--memory-swap=134217728",
    "--memory-swappiness=0",
    "--cpus=0.5",
    "--ulimit=nofile=512:512",
    "--ulimit=core=0:0",
    "--tmpfs=/tmp:rw,noexec,nosuid,nodev,size=16777216",
    "--log-driver=none"
  ]) {
    assert.equal(argumentsList.includes(required), true);
  }
  for (const forbidden of [
    "--privileged",
    "--network=host",
    "--pid=host",
    "--ipc=host",
    "--volume",
    "--mount",
    "/var/run/docker.sock"
  ]) {
    assert.equal(argumentsList.includes(forbidden), false);
  }
  assert.equal(
    argumentsList.some((entry) =>
      entry.startsWith("--restart")
    ),
    false
  );

  assert.equal(fake.calls.length, 3);
  assert.deepEqual(
    fake.calls.map((call) =>
      call.arguments.find((entry) =>
        ["version", "info", "inspect"].includes(entry)
      )
    ),
    ["version", "info", "inspect"]
  );
  for (const call of fake.calls) {
    assert.equal(call.executable, process.execPath);
    assert.equal(call.arguments[0], "--host");
    assert.equal(call.arguments[1], endpoint);
  }
});

test("Docker OCI runtime admission fails closed without required daemon controls", async () => {
  const configured = policy();
  const invalidRuntimeCases = [
    {
      version: runtimeVersion({
        Server: {
          Version: "29.6.2",
          ApiVersion: "1.48"
        }
      })
    },
    {
      info: runtimeInfo({
        OSType: "windows"
      })
    },
    {
      info: runtimeInfo({
        CgroupVersion: "1"
      })
    },
    {
      info: runtimeInfo({
        SecurityOptions: ["name=cgroupns"]
      })
    }
  ];
  for (const overrides of invalidRuntimeCases) {
    const fake = fakeDockerRunner({
      configuredPolicy: configured,
      ...overrides
    });
    await assert.rejects(
      () => provider(fake.runner).preflight(configured),
      PolicyError
    );
    assert.equal(
      fake.calls.some((call) =>
        call.arguments.includes("inspect")
      ),
      false
    );
  }
});

test("Docker OCI image admission rejects identity and configuration confusion", async () => {
  const configured = policy();
  const base = inspectedImage(configured);
  const invalidImages = [
    {
      ...base,
      RepoDigests: [
        `registry.example.com/fdos/other@${manifestDigest}`
      ]
    },
    {
      ...base,
      Config: {
        ...base.Config,
        User: "0:0"
      }
    },
    {
      ...base,
      Config: {
        ...base.Config,
        Cmd: ["--eval", "process.exit(0)"]
      }
    },
    {
      ...base,
      Config: {
        ...base.Config,
        Cmd: [
          ...base.Config.Cmd.slice(0, -1),
          `${base.Config.Cmd.at(-1)} `
        ]
      }
    },
    {
      ...base,
      Config: {
        ...base.Config,
        Env: [
          ...base.Config.Env,
          "NODE_OPTIONS=--require=/tmp/injected.js"
        ]
      }
    },
    {
      ...base,
      Config: {
        ...base.Config,
        Volumes: {
          "/data": {}
        }
      }
    },
    {
      ...base,
      Config: {
        ...base.Config,
        ExposedPorts: {
          "8080/tcp": {}
        }
      }
    },
    {
      ...base,
      Architecture:
        configured.image.platform.endsWith("arm64")
          ? "amd64"
          : "arm64"
    },
    {
      ...base,
      RootFS: {
        Type: "layers",
        Layers: []
      }
    }
  ];
  for (const image of invalidImages) {
    const fake = fakeDockerRunner({
      configuredPolicy: configured,
      image
    });
    await assert.rejects(
      () => provider(fake.runner).preflight(configured),
      PolicyError
    );
  }
});

test("Docker OCI command failures and malformed output retain no admission", async () => {
  const configured = policy();
  const failureCases = [
    {
      failures: {
        version: {
          code: 1,
          stderr: "daemon unavailable"
        }
      },
      ErrorType: PolicyError
    },
    {
      failures: {
        info: new Error("socket closed")
      },
      ErrorType: PolicyError
    },
    {
      version: "not-json",
      ErrorType: PolicyError
    }
  ];
  for (const failure of failureCases) {
    const fake = fakeDockerRunner({
      configuredPolicy: configured,
      ...failure
    });
    await assert.rejects(
      () => provider(fake.runner).preflight(configured),
      failure.ErrorType
    );
  }

  const malformed = fakeDockerRunner({
    configuredPolicy: configured
  });
  malformed.runner = async () => ({
    code: 0,
    signal: null,
    stdout: "{",
    stderr: ""
  });
  await assert.rejects(
    () => provider(malformed.runner).preflight(configured),
    IntegrityError
  );
});

test("OCI preflight verification rejects launch-template and architecture tampering after redigest", async () => {
  const configured = policy();
  const fake = fakeDockerRunner({
    configuredPolicy: configured
  });
  const preflight = await provider(fake.runner).preflight(
    configured
  );
  const changed = mutableClone(preflight);
  const networkIndex =
    changed.template.arguments.indexOf("--network=none");
  changed.template.arguments[networkIndex] = "--network=host";
  changed.template = redigest(changed.template);
  const rewrapped = redigest(changed);
  assert.throws(
    () => verifyOciWorkloadPreflight(rewrapped),
    IntegrityError
  );

  const crossArchitecture = mutableClone(preflight);
  crossArchitecture.runtime.architecture =
    configured.image.platform.endsWith("arm64")
      ? "amd64"
      : "arm64";
  crossArchitecture.runtime = redigest(
    crossArchitecture.runtime
  );
  crossArchitecture.template.runtimeObservationDigest =
    crossArchitecture.runtime.digest;
  crossArchitecture.template = redigest(
    crossArchitecture.template
  );
  assert.throws(
    () =>
      verifyOciWorkloadPreflight(
        redigest(crossArchitecture)
    ),
    IntegrityError
  );

  const nonExecutableLauncher = mutableClone(preflight);
  nonExecutableLauncher.runtime.launcher.mode = 0o600;
  nonExecutableLauncher.runtime = redigest(
    nonExecutableLauncher.runtime
  );
  nonExecutableLauncher.template.runtimeObservationDigest =
    nonExecutableLauncher.runtime.digest;
  nonExecutableLauncher.template = redigest(
    nonExecutableLauncher.template
  );
  assert.throws(
    () =>
      verifyOciWorkloadPreflight(
        redigest(nonExecutableLauncher)
      ),
    IntegrityError
  );
});

test("OCI preflight verification rejects false execution and attestation claims", async () => {
  const configured = policy();
  const fake = fakeDockerRunner({
    configuredPolicy: configured
  });
  const preflight = await provider(fake.runner).preflight(
    configured
  );
  for (const field of [
    "executionAuthorized",
    "executionObserved",
    "workloadIdentityExternallyAttested",
    "productionReady"
  ]) {
    const changed = mutableClone(preflight);
    changed[field] = true;
    assert.throws(
      () => verifyOciWorkloadPreflight(redigest(changed)),
      IntegrityError
    );
  }
});

test("Docker provider accepts only absolute local launcher and Unix-socket identities", () => {
  assert.throws(
    () =>
      new DockerOciWorkloadProvider({
        executable: "docker",
        endpoint
      }),
    ValidationError
  );
  assert.throws(
    () =>
      new DockerOciWorkloadProvider({
        executable: process.execPath,
        endpoint: "tcp://127.0.0.1:2375"
      }),
    ValidationError
  );
  assert.throws(
    () =>
      new DockerOciWorkloadProvider({
        executable: process.execPath,
        endpoint: "unix:///tmp/../var/docker.sock"
    }),
    ValidationError
  );
  assert.throws(
    () =>
      new DockerOciWorkloadProvider({
        executable: process.execPath,
        endpoint: "unix:///"
      }),
    ValidationError
  );
  assert.throws(
    () =>
      new DockerOciWorkloadProvider({
        executable: process.execPath,
        endpoint: `${endpoint}\n`
      }),
    ValidationError
  );
});

test("Docker launcher inspection records exact local binary identity without upgrading trust", async (t) => {
  const configured = policy();
  const fake = fakeDockerRunner({
    configuredPolicy: configured
  });
  const localProvider = provider(fake.runner);
  const launcher = await localProvider.inspectLauncher();
  assert.match(launcher.digest, /^sha256:[0-9a-f]{64}$/);
  assert.equal(launcher.requestedPath, process.execPath);
  assert.equal(launcher.size > 0, true);
  assert.equal(launcher.mode & 0o022, 0);
  assert.equal(typeof launcher.rootOwned, "boolean");

  const directory = await mkdtemp(
    path.join(os.tmpdir(), "fdos-launcher-mode-")
  );
  const untrustedExecutable = path.join(
    directory,
    "docker-fixture"
  );
  await writeFile(untrustedExecutable, "fixture", {
    encoding: "utf8",
    mode: 0o600,
    flag: "wx"
  });
  t.after(async () => {
    await rm(directory, {
      recursive: true,
      force: true
    });
  });
  const untrustedProvider = new DockerOciWorkloadProvider({
    executable: untrustedExecutable,
    endpoint
  });
  await assert.rejects(
    () => untrustedProvider.inspectLauncher(),
    IntegrityError
  );
  await chmod(untrustedExecutable, 0o722);
  await assert.rejects(
    () => untrustedProvider.inspectLauncher(),
    IntegrityError
  );
});

test("Docker provider executes bounded preflight commands without a shell or parent environment", async (t) => {
  const configured = policy();
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "fdos-fake-docker-")
  );
  const executable = path.join(directory, "docker-fixture");
  const fixtureSource = [
    `#!${process.execPath}`,
    `const version = ${JSON.stringify(runtimeVersion())};`,
    `const info = ${JSON.stringify(runtimeInfo())};`,
    `const image = ${JSON.stringify(
      inspectedImage(configured)
    )};`,
    "const args = process.argv.slice(2);",
    "const output = args.includes(\"version\")",
    "  ? version",
    "  : args.includes(\"info\")",
    "    ? info",
    "    : args.includes(\"inspect\")",
    "      ? image",
    "      : null;",
    "if (output === null) process.exit(64);",
    "process.stdout.write(JSON.stringify(output));",
    ""
  ].join("\n");
  await writeFile(executable, fixtureSource, {
    encoding: "utf8",
    mode: 0o500,
    flag: "wx"
  });
  await chmod(executable, 0o500);
  t.after(async () => {
    await rm(directory, {
      recursive: true,
      force: true
    });
  });

  const localProvider = new DockerOciWorkloadProvider({
    executable,
    endpoint
  });
  const preflight = await localProvider.preflight(configured);
  assert.equal(verifyOciWorkloadPreflight(preflight), true);
  assert.equal(
    preflight.runtime.launcher.requestedPath,
    executable
  );
  assert.equal(
    preflight.runtime.launcher.resolvedPath,
    await realpath(executable)
  );
  assert.equal(
    preflight.runtime.launcher.symlinkResolved,
    false
  );
  assert.equal(
    preflight.template.parentEnvironmentForwarded,
    false
  );
  assert.equal(preflight.template.shell, false);
});
