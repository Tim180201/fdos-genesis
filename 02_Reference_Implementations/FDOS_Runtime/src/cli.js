#!/usr/bin/env node

import { mkdir, mkdtemp } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { executeSoftwareChangeReadinessDemo } from "./pilot/demo.js";
import { openPilotReferenceSource } from "./pilot/reference-sources.js";
import { openPilotRuntime } from "./pilot/software-change-readiness.js";

function usage() {
  return [
    "FDOS Runtime — Level 1 Experimental",
    "",
    "Commands:",
    "  demo                 execute the internal-only pilot in a new local store",
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
  const runtime = await openPilotRuntime({ directory });
  try {
    const result = await executeSoftwareChangeReadinessDemo(runtime);
    const summary = {
      mode: "Level 1 — Experimental",
      productionReady: false,
      externalActionsExecuted: false,
      store: directory,
      status: runtime.status(),
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
    await runtime.close();
  }
}

async function verifyStore(directory) {
  if (!directory) throw new Error("verify requires a store directory.");
  const runtime = await openPilotRuntime({
    directory: path.resolve(directory)
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
