import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  CONNECTOR_OUTBOX_DRY_RUN_WORKFLOW,
  ConflictError,
  createDryRunWorkerRequest,
  createDryRunWorkerResponse,
  DARWIN_NETWORK_ISOLATION_PROVIDER,
  deterministicIdFactory,
  digestObject,
  DarwinSandboxExecNetworkWriteDeny,
  IntegrityError,
  InvocationVerifier,
  LocalInvocationAuthority,
  openAuthenticatedPilotRuntime,
  PolicyError,
  ProcessSeparatedDryRunWorker,
  ValidationError,
  verifyDryRunWorkerRequest,
  verifyDryRunWorkerResponse
} from "../src/index.js";
import { controlledClock } from "../test-support/helpers.js";

const owner = Object.freeze({
  type: "human",
  id: "human:worker-owner"
});
const chief = Object.freeze({
  type: "agent",
  id: "agent:chief-of-staff:primary"
});
const operations = Object.freeze({
  type: "agent",
  id: "agent:operations:primary"
});
const connector = Object.freeze({
  type: "connector",
  id: "connector:reference:primary"
});
const syntheticWorkloadSessionChallenge =
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const syntheticWorkerPackage = Object.freeze({
  packageId: "worker-package:connector-dry-run",
  packageVersion: "2.0.0-experimental",
  packageDigest: digestObject({
    package: "protocol-test"
  }),
  artifactId: "worker:connector-dry-run",
  artifactVersion: "3.0.0-experimental",
  artifactDigest: digestObject({
    artifact: "protocol-test"
  }),
  attestationDigest: digestObject({
    attestation: "protocol-test"
  }),
  trustAnchorDigest: digestObject({
    trustAnchor: "protocol-test"
  }),
  issuerId: "issuer:fdos-worker-package-test",
  keyId: "key:fdos-worker-package-test"
});

function packageObservation(
  binding = syntheticWorkerPackage
) {
  return {
    ...binding,
    packageDigestMatched: true,
    releaseSignatureVerifiedByBootstrap: true,
    evaluatedFromVerifiedMemory: true
  };
}

function workloadSessionObservation({
  challenge = syntheticWorkloadSessionChallenge,
  binding = syntheticWorkerPackage
} = {}) {
  return {
    kind: "fdos-workload-session-observation",
    mode: "ephemeral-ed25519-parent-challenge",
    keyId: "key:session-0123456789abcdef01234567",
    sessionDigest: digestObject({
      session: "protocol-test"
    }),
    challengeDigest: digestObject({ challenge }),
    packageBindingDigest: digestObject(binding),
    ephemeralKeyGeneratedByBootstrap: true,
    externallyAttested: false
  };
}

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

function taskByStep(run, stepId) {
  const task = run.tasks.find((candidate) => candidate.stepId === stepId);
  if (!task) throw new Error(`Missing process-worker task ${stepId}.`);
  return task;
}

async function workerHarness(t) {
  const time = controlledClock(new Date().toISOString());
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "fdos-process-worker-")
  );
  const authority = LocalInvocationAuthority.create({
    clock: time.clock
  });
  const verifier = new InvocationVerifier({
    trustedKeys: [authority.trustDescriptor()],
    organizationId: authority.organizationId,
    audience: authority.audience,
    clock: time.clock
  });
  const gateway = await openAuthenticatedPilotRuntime({
    directory,
    invocationVerifier: verifier,
    clock: time.clock
  });
  t.after(async () => {
    await gateway.close().catch(() => {});
    await rm(directory, { recursive: true, force: true });
  });

  function execute(principal, type, payload) {
    const command = { type, payload };
    return gateway.execute({
      command,
      invocation: authority.issue({
        principal,
        command
      })
    });
  }

  return {
    time,
    gateway,
    execute
  };
}

async function prepareClaimedDelivery(
  harness,
  {
    leaseSeconds = 30,
    idempotencyKey = "process-worker-delivery-v1"
  } = {}
) {
  const started = await harness.execute(
    owner,
    "workflow.start",
    {
      workflowId: CONNECTOR_OUTBOX_DRY_RUN_WORKFLOW.id,
      version: CONNECTOR_OUTBOX_DRY_RUN_WORKFLOW.version,
      objective:
        "Exercise one exact process-separated connector dry-run."
    }
  );
  const intake = taskByStep(started.run, "intake");
  await harness.execute(chief, "task.claim", {
    taskId: intake.id
  });
  await harness.execute(chief, "task.complete", {
    taskId: intake.id,
    result: {
      scope: "Process-separated local simulation only."
    }
  });
  const connectorTask = taskByStep(started.run, "reference-read");
  await harness.execute(operations, "task.claim", {
    taskId: connectorTask.id
  });
  const prepared = await harness.execute(
    operations,
    "outbox.prepare",
    {
      taskId: connectorTask.id,
      connectorId: connector.id,
      operationId: "repository.metadata.read",
      parameters: {
        repositoryId: "fdos-genesis",
        revision: "process-bound-test",
        includeCommitMetadata: true
      },
      idempotencyKey
    }
  );
  const claimed = await harness.execute(
    connector,
    "outbox.claim",
    {
      deliveryId: prepared.delivery.id,
      leaseSeconds
    }
  );
  return {
    runId: started.run.id,
    taskId: connectorTask.id,
    deliveryId: prepared.delivery.id,
    claimed
  };
}

test("worker protocol binds the exact claim, intent, validity window and digest-only outcome", async (t) => {
  const harness = await workerHarness(t);
  const { claimed } = await prepareClaimedDelivery(harness);
  const issuedAt = harness.time.value().toISOString();
  const expiresAt = new Date(
    harness.time.value().getTime() + 4_000
  ).toISOString();
  assert.throws(
    () =>
      createDryRunWorkerRequest({
        delivery: claimed,
        requestId: "workerrequest_protocol_missing_package",
        issuedAt,
        expiresAt
      }),
    ValidationError
  );
  const request = createDryRunWorkerRequest({
    delivery: claimed,
    requestId: "workerrequest_protocol_000001",
    issuedAt,
    expiresAt,
    workerPackage: syntheticWorkerPackage,
    workloadSessionChallenge:
      syntheticWorkloadSessionChallenge
  });
  assert.equal(
    verifyDryRunWorkerRequest(request, { now: issuedAt }),
    true
  );

  const completedAt = new Date(
    harness.time.value().getTime() + 100
  ).toISOString();
  const response = createDryRunWorkerResponse({
    request,
    completedAt,
    workerPackageObservation: packageObservation(),
    workloadSessionObservation:
      workloadSessionObservation()
  });
  assert.equal(verifyDryRunWorkerResponse(response, request), true);
  assert.equal(response.outcome.type, "simulated");
  assert.deepEqual(
    Object.keys(response.outcome.evidence).sort(),
    ["externalEffect", "resultDigest"]
  );
  assert.equal(response.outcome.evidence.externalEffect, "none");
  assert.throws(
    () =>
      createDryRunWorkerResponse({
        request,
        completedAt,
        workerPackageObservation: packageObservation({
          ...syntheticWorkerPackage,
          packageDigest: digestObject({
            package: "mismatched-observation"
          })
        }),
        workloadSessionObservation:
          workloadSessionObservation()
      }),
    PolicyError
  );
  assert.throws(
    () => verifyDryRunWorkerRequest(null),
    IntegrityError
  );

  const changedBoundary = mutableClone(request);
  changedBoundary.execution.networkAccess = true;
  assert.throws(
    () => verifyDryRunWorkerRequest(redigest(changedBoundary)),
    IntegrityError
  );

  const extraRequestField = mutableClone(request);
  extraRequestField.rawToken = "must-not-be-accepted";
  assert.throws(
    () => verifyDryRunWorkerRequest(extraRequestField),
    IntegrityError
  );

  assert.throws(
    () =>
      verifyDryRunWorkerRequest(request, {
        now: new Date(Date.parse(expiresAt) + 1).toISOString()
      }),
    PolicyError
  );

  const changedClaim = mutableClone(response);
  changedClaim.claimId = "claim_tampered_000001";
  assert.throws(
    () =>
      verifyDryRunWorkerResponse(
        redigest(changedClaim),
        request
      ),
    IntegrityError
  );

  const assertedSandbox = mutableClone(response);
  assertedSandbox.workerBoundary.networkIsolationEnforced = true;
  assert.throws(
    () =>
      verifyDryRunWorkerResponse(
        redigest(assertedSandbox),
        request
      ),
    IntegrityError
  );

  const changedPackage = mutableClone(response);
  changedPackage.workerBoundary.workerPackage.packageDigest =
    digestObject({ package: "tampered-response" });
  assert.throws(
    () =>
      verifyDryRunWorkerResponse(
        redigest(changedPackage),
        request
      ),
    IntegrityError
  );

  const changedWorkloadSession = mutableClone(response);
  changedWorkloadSession.workerBoundary.workloadSession
    .challengeDigest = digestObject({
      challenge: "tampered-response"
    });
  assert.throws(
    () =>
      verifyDryRunWorkerResponse(
        redigest(changedWorkloadSession),
        request
      ),
    IntegrityError
  );

  const rawResponse = mutableClone(response);
  rawResponse.rawResult = claimed.intent.parameters;
  assert.throws(
    () => verifyDryRunWorkerResponse(rawResponse, request),
    IntegrityError
  );

  assert.throws(
    () =>
      createDryRunWorkerResponse({
        request,
        completedAt: new Date(
          Date.parse(expiresAt) + 1
        ).toISOString(),
        workerPackageObservation: packageObservation(),
        workloadSessionObservation:
          workloadSessionObservation()
      }),
    PolicyError
  );
});

test("network-isolation protocol requires exact attestation binding", async (t) => {
  const harness = await workerHarness(t);
  const { claimed } = await prepareClaimedDelivery(harness);
  const issuedAt = harness.time.value().toISOString();
  const expiresAt = new Date(
    harness.time.value().getTime() + 4_000
  ).toISOString();
  const networkIsolation = {
    required: true,
    provider: DARWIN_NETWORK_ISOLATION_PROVIDER,
    policyDigest: digestObject({
      provider: DARWIN_NETWORK_ISOLATION_PROVIDER,
      policy: "test-bound"
    })
  };
  const request = createDryRunWorkerRequest({
    delivery: claimed,
    requestId: "workerrequest_isolation_000001",
    issuedAt,
    expiresAt,
    networkIsolation,
    workerPackage: syntheticWorkerPackage,
    workloadSessionChallenge:
      syntheticWorkloadSessionChallenge
  });
  assert.throws(
    () =>
      createDryRunWorkerResponse({
        request,
        completedAt: issuedAt,
        workerPackageObservation: packageObservation(),
        workloadSessionObservation:
          workloadSessionObservation()
      }),
    ValidationError
  );
  assert.throws(
    () =>
      createDryRunWorkerResponse({
        request,
        completedAt: issuedAt,
        networkIsolationAttestation: {
          enforced: false,
          filesystemWriteEnforced: false,
          filesystemWriteProbe: "not_run",
          provider: DARWIN_NETWORK_ISOLATION_PROVIDER,
          policyDigest: networkIsolation.policyDigest,
          probe: "not_run"
        },
        workerPackageObservation: packageObservation(),
        workloadSessionObservation:
          workloadSessionObservation()
      }),
    ValidationError
  );

  const response = createDryRunWorkerResponse({
    request,
    completedAt: issuedAt,
    networkIsolationAttestation: {
      enforced: true,
      filesystemWriteEnforced: true,
      filesystemWriteProbe: "dev_null_write_open_denied",
      provider: DARWIN_NETWORK_ISOLATION_PROVIDER,
      policyDigest: networkIsolation.policyDigest,
      probe: "socket_listen_and_connect_denied"
    },
    workerPackageObservation: packageObservation(),
    workloadSessionObservation:
      workloadSessionObservation()
  });
  assert.equal(verifyDryRunWorkerResponse(response, request), true);
  assert.equal(
    response.workerBoundary.networkIsolationEnforced,
    true
  );

  const changedProbe = mutableClone(response);
  changedProbe.workerBoundary.networkIsolationProbe = "not_run";
  assert.throws(
    () =>
      verifyDryRunWorkerResponse(
        redigest(changedProbe),
        request
      ),
    IntegrityError
  );

  const changedFilesystemProbe = mutableClone(response);
  changedFilesystemProbe.workerBoundary.filesystemWriteIsolationProbe =
    "not_run";
  assert.throws(
    () =>
      verifyDryRunWorkerResponse(
        redigest(changedFilesystemProbe),
        request
      ),
    IntegrityError
  );
});

test(
  "Darwin sandbox provider binds the trusted deprecated launcher and policy",
  { skip: process.platform !== "darwin" },
  async () => {
    const sandbox = new DarwinSandboxExecNetworkWriteDeny();
    const status = sandbox.status();
    assert.equal(status.networkIsolationRequired, true);
    assert.equal(status.networkIsolationEnforced, false);
    assert.equal(status.filesystemWriteIsolationRequired, true);
    assert.equal(status.filesystemWriteIsolationEnforced, false);
    assert.equal(status.enforcementState, "not_attested");
    assert.equal(status.deprecatedPlatformInterface, true);
    assert.equal(status.productionReady, false);

    const policy = await sandbox.inspect();
    assert.equal(policy.provider, DARWIN_NETWORK_ISOLATION_PROVIDER);
    assert.equal(policy.launcher.path, "/usr/bin/sandbox-exec");
    assert.equal(policy.launcher.uid, 0);
    assert.equal(policy.launcher.mode & 0o022, 0);
    assert.match(policy.launcher.digest, /^sha256:[0-9a-f]{64}$/);
    assert.match(policy.profileDigest, /^sha256:[0-9a-f]{64}$/);
    assert.match(policy.policyDigest, /^sha256:[0-9a-f]{64}$/);
    assert.equal(policy.networkAccess, false);
    assert.equal(policy.filesystemWriteAccess, false);
    assert.equal(policy.deprecatedPlatformInterface, true);
  }
);

test(
  "Darwin sandboxed worker proves listen and connect denial before recording an outcome",
  { skip: process.platform !== "darwin" },
  async (t) => {
    const harness = await workerHarness(t);
    const delivery = await prepareClaimedDelivery(harness);
    const worker = new ProcessSeparatedDryRunWorker({
      clock: harness.time.clock,
      idFactory: deterministicIdFactory("sandboxed"),
      timeoutMs: 3_000,
      networkIsolation: "darwin-sandbox-exec-required"
    });

    const configured = worker.status();
    assert.equal(configured.networkIsolationRequired, true);
    assert.equal(
      configured.networkIsolationProvider,
      DARWIN_NETWORK_ISOLATION_PROVIDER
    );
    assert.equal(configured.networkIsolationEnforced, false);

    const result = await worker.execute({
      delivery: delivery.claimed
    });
    assert.equal(
      result.workerBoundary.networkIsolationEnforced,
      true
    );
    assert.equal(
      result.workerBoundary.networkIsolationProvider,
      DARWIN_NETWORK_ISOLATION_PROVIDER
    );
    assert.equal(
      result.workerBoundary.networkIsolationProbe,
      "socket_listen_and_connect_denied"
    );
    assert.equal(
      result.workerBoundary.filesystemWriteIsolationEnforced,
      true
    );
    assert.equal(
      result.workerBoundary.filesystemWriteIsolationProbe,
      "dev_null_write_open_denied"
    );
    assert.match(
      result.workerBoundary.networkIsolationPolicyDigest,
      /^sha256:[0-9a-f]{64}$/
    );
    assert.equal(
      result.workerBoundary.workerPackage
        .evaluatedFromVerifiedMemory,
      true
    );

    const recorded = await harness.execute(
      connector,
      "outbox.record-outcome",
      {
        deliveryId: delivery.deliveryId,
        claimId: result.claimId,
        outcome: result.outcome.type,
        evidence: result.outcome.evidence
      }
    );
    assert.equal(recorded.status, "simulated");
    await harness.execute(operations, "task.complete", {
      taskId: delivery.taskId,
      result: {
        deliveryStatus: recorded.status,
        isolationPolicyDigest:
          result.workerBoundary.networkIsolationPolicyDigest
      }
    });
    const run = await harness.execute(owner, "workflow.view", {
      runId: delivery.runId
    });
    assert.equal(run.status, "completed");
  }
);

test(
  "Darwin sandbox bypass fault is rejected by the child socket probes",
  { skip: process.platform !== "darwin" },
  async (t) => {
    const harness = await workerHarness(t);
    const delivery = await prepareClaimedDelivery(harness);
    const worker = new ProcessSeparatedDryRunWorker({
      clock: harness.time.clock,
      timeoutMs: 3_000,
      faultMode: "sandbox-bypass",
      networkIsolation: "darwin-sandbox-exec-required"
    });

    await assert.rejects(
      () => worker.execute({ delivery: delivery.claimed }),
      (error) =>
        error instanceof ConflictError &&
        error.details?.reasonCode === "WORKER_EXIT_UNTRUSTED"
    );
    const current = await harness.execute(owner, "outbox.get", {
      deliveryId: delivery.deliveryId
    });
    assert.equal(current.status, "claimed");
    assert.equal(current.lastOutcome, null);

    harness.time.advance(30_000);
    const reconciled = await harness.execute(
      owner,
      "outbox.reconcile-expired",
      { deliveryId: delivery.deliveryId }
    );
    assert.equal(reconciled.status, "uncertain");
    assert.equal(
      reconciled.lastOutcome.evidence.reasonCode,
      "CLAIM_LEASE_RECONCILED"
    );
  }
);

test("separate worker completes one authenticated outbox run with content-minimized evidence", async (t) => {
  const harness = await workerHarness(t);
  const delivery = await prepareClaimedDelivery(harness);
  const worker = new ProcessSeparatedDryRunWorker({
    clock: harness.time.clock,
    idFactory: deterministicIdFactory("process"),
    timeoutMs: 2_000
  });

  const result = await worker.execute({
    delivery: delivery.claimed
  });
  assert.equal(result.deliveryId, delivery.deliveryId);
  assert.equal(result.claimId, delivery.claimed.claim.id);
  assert.equal(result.connectorId, connector.id);
  assert.equal(result.outcome.type, "simulated");
  assert.equal(result.outcome.evidence.externalEffect, "none");
  assert.match(result.requestDigest, /^sha256:[0-9a-f]{64}$/);
  assert.match(result.responseDigest, /^sha256:[0-9a-f]{64}$/);
  assert.match(
    result.responseEnvelopeDigest,
    /^sha256:[0-9a-f]{64}$/
  );
  assert.equal(
    new Date(result.completedAt).toISOString(),
    result.completedAt
  );
  assert.doesNotMatch(
    JSON.stringify(result),
    /repositoryId|process-bound-test|includeCommitMetadata/
  );

  const status = worker.status();
  assert.equal(status.processSeparated, true);
  assert.equal(status.shell, false);
  assert.equal(status.parentEnvironmentForwarded, false);
  assert.equal(status.networkAccess, false);
  assert.equal(status.externalEffects, false);
  assert.equal(status.networkIsolationEnforced, false);
  assert.equal(status.networkIsolationRequired, false);
  assert.equal(status.filesystemWriteIsolationEnforced, false);
  assert.equal(status.filesystemWriteIsolationRequired, false);
  assert.equal(status.workerPackagePreflightRequired, true);
  assert.equal(
    status.workerPackageBootstrapVerificationRequired,
    true
  );
  assert.equal(
    status.workerPackageInMemoryEvaluationRequired,
    true
  );
  assert.equal(
    status.workerPackageReleaseTrustConfigured,
    true
  );
  assert.equal(
    status.workerPackageTrustProvisioning,
    "repository-pilot-fixture"
  );
  assert.equal(status.externalReleaseKeyCustodyAttested, false);
  assert.equal(
    status.workloadSessionResponseAuthenticationRequired,
    true
  );
  assert.equal(
    status.workloadSessionMode,
    "ephemeral-ed25519-parent-challenge"
  );
  assert.equal(
    status.workloadSessionPrivateKeyExported,
    false
  );
  assert.equal(
    status.independentWorkloadAttestationConfigured,
    false
  );
  assert.equal(
    result.workloadSession.responseSignatureVerified,
    true
  );
  assert.equal(
    result.workloadSession.challengeMatched,
    true
  );
  assert.equal(
    result.workloadSession.packageBindingMatched,
    true
  );
  assert.equal(
    result.workloadSession.externallyAttested,
    false
  );
  assert.match(
    result.workloadSession.keyId,
    /^key:session-[0-9a-f]{24}$/
  );
  assert.match(
    result.workloadSession.sessionDigest,
    /^sha256:[0-9a-f]{64}$/
  );
  assert.equal(
    result.workerBoundary.workloadSession.keyId,
    result.workloadSession.keyId
  );
  assert.equal(
    result.workerBoundary.workloadSession.sessionDigest,
    result.workloadSession.sessionDigest
  );
  assert.equal(
    result.workerBoundary.workloadSession.challengeDigest,
    result.workloadSession.challengeDigest
  );
  assert.equal(
    result.workerBoundary.workloadSession.packageBindingDigest,
    result.workloadSession.packageBindingDigest
  );
  assert.doesNotMatch(
    JSON.stringify(result),
    /PRIVATE KEY/
  );
  assert.doesNotMatch(
    JSON.stringify(result),
    /"publicKeyPem"|"signature"|"challenge":/
  );
  assert.equal(
    result.workerBoundary.filesystemWriteIsolationEnforced,
    false
  );
  assert.equal(
    result.workerBoundary.filesystemWriteIsolationProbe,
    "not_run"
  );
  assert.equal(
    result.workerBoundary.workerPackage.packageDigestMatched,
    true
  );
  assert.equal(
    result.workerBoundary.workerPackage
      .releaseSignatureVerifiedByBootstrap,
    true
  );
  assert.equal(
    result.workerBoundary.workerPackage
      .evaluatedFromVerifiedMemory,
    true
  );
  assert.match(
    result.workerBoundary.workerPackage.packageDigest,
    /^sha256:[0-9a-f]{64}$/
  );
  assert.match(
    result.workerBoundary.workerPackage.artifactDigest,
    /^sha256:[0-9a-f]{64}$/
  );
  assert.match(
    result.workerBoundary.workerPackage.attestationDigest,
    /^sha256:[0-9a-f]{64}$/
  );
  assert.match(
    result.workerBoundary.workerPackage.trustAnchorDigest,
    /^sha256:[0-9a-f]{64}$/
  );
  assert.throws(() => {
    status.networkAccess = true;
  }, TypeError);

  const recorded = await harness.execute(
    connector,
    "outbox.record-outcome",
    {
      deliveryId: delivery.deliveryId,
      claimId: result.claimId,
      outcome: result.outcome.type,
      evidence: result.outcome.evidence
    }
  );
  assert.equal(recorded.status, "simulated");
  await harness.execute(operations, "task.complete", {
    taskId: delivery.taskId,
    result: {
      deliveryStatus: recorded.status,
      workerResponseDigest: result.responseDigest
    }
  });
  const run = await harness.execute(owner, "workflow.view", {
    runId: delivery.runId
  });
  assert.equal(run.status, "completed");
  const evidence = await harness.execute(owner, "evidence.export", {
    runId: delivery.runId
  });
  assert.equal(evidence.deliveries.length, 1);
  assert.equal(
    evidence.deliveries[0].resultDigest,
    result.outcome.evidence.resultDigest
  );
  assert.doesNotMatch(
    JSON.stringify(evidence),
    /repositoryId|process-bound-test/
  );
});

for (const fault of [
  {
    mode: "crash-before-response",
    timeoutMs: 2_000,
    reasonCode: "WORKER_EXIT_UNTRUSTED"
  },
  {
    mode: "response-then-crash",
    timeoutMs: 2_000,
    reasonCode: "WORKER_EXIT_UNTRUSTED"
  },
  {
    mode: "bootstrap-release-mismatch",
    timeoutMs: 2_000,
    reasonCode: "WORKER_EXIT_UNTRUSTED"
  },
  {
    mode: "package-binding-mismatch",
    timeoutMs: 2_000,
    reasonCode: "WORKER_EXIT_UNTRUSTED"
  },
  {
    mode: "session-challenge-mismatch",
    timeoutMs: 2_000,
    reasonCode: "WORKER_EXIT_UNTRUSTED"
  },
  {
    mode: "response-signature-mismatch",
    timeoutMs: 2_000,
    errorType: IntegrityError
  },
  {
    mode: "session-observation-mismatch",
    timeoutMs: 2_000,
    errorType: IntegrityError
  },
  {
    mode: "hang",
    timeoutMs: 50,
    reasonCode: "WORKER_TIMEOUT"
  }
]) {
  test(`worker fault ${fault.mode} is rejected and reconciles only to uncertainty`, async (t) => {
    const harness = await workerHarness(t);
    const delivery = await prepareClaimedDelivery(harness);
    const worker = new ProcessSeparatedDryRunWorker({
      clock: harness.time.clock,
      timeoutMs: fault.timeoutMs,
      faultMode: fault.mode
    });

    await assert.rejects(
      () => worker.execute({ delivery: delivery.claimed }),
      (error) => {
        if (fault.errorType) {
          return error instanceof fault.errorType;
        }
        return (
          error instanceof ConflictError &&
          error.details?.reasonCode === fault.reasonCode
        );
      }
    );
    const stillClaimed = await harness.execute(
      owner,
      "outbox.get",
      { deliveryId: delivery.deliveryId }
    );
    assert.equal(stillClaimed.status, "claimed");
    assert.equal(stillClaimed.lastOutcome, null);

    harness.time.advance(30_000);
    const reconciled = await harness.execute(
      owner,
      "outbox.reconcile-expired",
      { deliveryId: delivery.deliveryId }
    );
    assert.equal(reconciled.status, "uncertain");
    assert.equal(
      reconciled.lastOutcome.evidence.reasonCode,
      "CLAIM_LEASE_RECONCILED"
    );
  });
}

test("worker construction, clock and expired-claim checks fail closed", async (t) => {
  assert.throws(
    () =>
      new ProcessSeparatedDryRunWorker({
        timeoutMs: 49
      }),
    ValidationError
  );
  assert.throws(
    () =>
      new ProcessSeparatedDryRunWorker({
        faultMode: "unbounded-network"
      }),
    ValidationError
  );
  assert.throws(
    () =>
      new ProcessSeparatedDryRunWorker({
        networkIsolation: "assume-isolated"
      }),
    ValidationError
  );
  assert.throws(
    () =>
      new ProcessSeparatedDryRunWorker({
        faultMode: "sandbox-bypass"
      }),
    ValidationError
  );
  assert.throws(
    () =>
      new ProcessSeparatedDryRunWorker({
        clock: null
      }),
    ValidationError
  );

  const harness = await workerHarness(t);
  const delivery = await prepareClaimedDelivery(harness);
  await assert.rejects(
    () => new ProcessSeparatedDryRunWorker().execute(),
    ValidationError
  );
  const invalidClock = new ProcessSeparatedDryRunWorker({
    clock: () => "not-a-date"
  });
  await assert.rejects(
    () => invalidClock.execute({ delivery: delivery.claimed }),
    ValidationError
  );

  harness.time.advance(30_000);
  const expired = new ProcessSeparatedDryRunWorker({
    clock: harness.time.clock
  });
  await assert.rejects(
    () => expired.execute({ delivery: delivery.claimed }),
    ConflictError
  );
});
