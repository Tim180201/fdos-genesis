#!/usr/bin/env node

import { mkdir, mkdtemp } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  InvocationVerifier,
  LocalInvocationAuthority
} from "./identity/invocation.js";
import {
  executeAuthenticatedSoftwareChangeReadinessDemo
} from "./pilot/authenticated-demo.js";
import {
  executeConnectorOutboxDryRunDemo
} from "./pilot/connector-outbox-demo.js";
import { openPilotReferenceSource } from "./pilot/reference-sources.js";
import {
  openAuthenticatedPilotRuntime,
  openPilotRuntime
} from "./pilot/software-change-readiness.js";

function usage() {
  return [
    "FDOS Runtime — Level 1 Experimental",
    "",
    "Commands:",
    "  demo                 execute the authenticated internal-only pilot",
    "  outbox-demo          execute the no-network connector outbox dry-run",
    "  verify <directory>   verify and summarize an existing local store",
    "  reference-snapshot <taptime|company-ai> <repository>",
    "                       capture content-minimized, read-only Git evidence",
    "",
    "No command enables external actions."
  ].join("\n");
}

async function runDemo() {
  const runtimeRoot = path.resolve(".runtime");
  await mkdir(runtimeRoot, { recursive: true, mode: 0o700 });
  const directory = await mkdtemp(path.join(runtimeRoot, "demo-"));
  const authority = LocalInvocationAuthority.create();
  const verifier = new InvocationVerifier({
    trustedKeys: [authority.trustDescriptor()],
    organizationId: authority.organizationId,
    audience: authority.audience
  });
  const gateway = await openAuthenticatedPilotRuntime({
    directory,
    invocationVerifier: verifier
  });
  try {
    const result = await executeAuthenticatedSoftwareChangeReadinessDemo({
      gateway,
      authority
    });
    const summary = {
      mode: "Level 1 — Experimental",
      productionReady: false,
      externalActionsExecuted: false,
      identity: {
        mode: "authenticated-invocation",
        algorithm: "Ed25519",
        organizationId: authority.organizationId,
        correlationId: result.correlationId
      },
      store: directory,
      status: result.status,
      run: {
        id: result.run.id,
        workflow: `${result.run.workflowDefinitionId}@${result.run.workflowDefinitionVersion}`,
        status: result.run.status,
        taskCount: result.run.tasks.length,
        evidenceDigest: result.run.evidenceDigest
      },
      evidence: result.evidence,
      acceptedMemoryCount: result.acceptedOperationsMemory.length
    };
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  } finally {
    await gateway.close();
  }
}

async function runOutboxDemo() {
  const runtimeRoot = path.resolve(".runtime");
  await mkdir(runtimeRoot, { recursive: true, mode: 0o700 });
  const directory = await mkdtemp(path.join(runtimeRoot, "outbox-demo-"));
  const authority = LocalInvocationAuthority.create();
  const verifier = new InvocationVerifier({
    trustedKeys: [authority.trustDescriptor()],
    organizationId: authority.organizationId,
    audience: authority.audience
  });
  const gateway = await openAuthenticatedPilotRuntime({
    directory,
    invocationVerifier: verifier
  });
  try {
    const result = await executeConnectorOutboxDryRunDemo({
      gateway,
      authority
    });
    const summary = {
      mode: "Level 1 — Experimental Connector Dry-Run",
      productionReady: false,
      networkAccess: false,
      externalActionsExecuted: false,
      store: directory,
      correlationId: result.correlationId,
      run: {
        id: result.run.id,
        status: result.run.status,
        taskCount: result.run.tasks.length
      },
      delivery: {
        id: result.delivery.id,
        status: result.delivery.status,
        attempt: result.delivery.attempt,
        intentDigest: result.delivery.intent.digest,
        resultDigest:
          result.delivery.lastOutcome?.evidence?.resultDigest || null,
        externalEffect:
          result.delivery.lastOutcome?.evidence?.externalEffect || null
      },
      worker: {
        kind: result.worker.kind,
        processSeparated:
          result.worker.workerBoundary.processSeparated,
        shell: result.worker.workerBoundary.shell,
        networkAccess:
          result.worker.workerBoundary.networkAccess,
        externalEffects:
          result.worker.workerBoundary.externalEffects,
        networkIsolationEnforced:
          result.worker.workerBoundary.networkIsolationEnforced,
        requestDigest: result.worker.requestDigest,
        responseDigest: result.worker.responseDigest
      },
      evidence: {
        bundleDigest: result.evidence.bundleDigest,
        deliveryCount: result.evidence.deliveries.length,
        eventReferenceCount: result.evidence.eventReferences.length
      },
      audit: {
        eventCount: result.audit.length,
        valid: result.status.audit.valid,
        headHash: result.status.audit.headHash
      },
      status: result.status
    };
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  } finally {
    await gateway.close();
  }
}

async function verifyStore(directory) {
  if (!directory) throw new Error("verify requires a store directory.");
  const runtime = await openPilotRuntime({
    directory: path.resolve(directory),
    persistence: "auto"
  });
  try {
    process.stdout.write(
      `${JSON.stringify(
        {
          directory: path.resolve(directory),
          status: runtime.status(),
          integrity: runtime.verifyIntegrity()
        },
        null,
        2
      )}\n`
    );
  } finally {
    await runtime.close();
  }
}

async function snapshotReference(sourceId, repository) {
  if (!sourceId || !repository) {
    throw new Error(
      "reference-snapshot requires a source id and repository root."
    );
  }
  const source = await openPilotReferenceSource(
    sourceId,
    path.resolve(repository)
  );
  const snapshot = await source.captureSnapshot();
  process.stdout.write(`${JSON.stringify(snapshot, null, 2)}\n`);
}

async function main() {
  const [command, ...argumentsList] = process.argv.slice(2);
  if (!command || command === "help" || command === "--help") {
    process.stdout.write(`${usage()}\n`);
    return;
  }
  if (command === "demo") {
    await runDemo();
    return;
  }
  if (command === "outbox-demo") {
    await runOutboxDemo();
    return;
  }
  if (command === "verify") {
    await verifyStore(argumentsList[0]);
    return;
  }
  if (command === "reference-snapshot") {
    await snapshotReference(argumentsList[0], argumentsList[1]);
    return;
  }
  throw new Error(`Unknown command: ${command}.\n\n${usage()}`);
}

main().catch((error) => {
  const code = error?.code ? ` [${error.code}]` : "";
  process.stderr.write(`FDOS Runtime error${code}: ${error.message}\n`);
  process.exitCode = 1;
});
