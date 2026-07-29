import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  agentActor,
  humanActor,
  openPilotRuntime,
  SOFTWARE_CHANGE_READINESS_WORKFLOW
} from "../src/index.js";

let harnessSequence = 0;

export function controlledClock(
  initial = "2026-07-29T08:00:00.000Z"
) {
  let current = new Date(initial);
  return {
    clock: () => new Date(current),
    advance(milliseconds) {
      current = new Date(current.getTime() + milliseconds);
      return new Date(current);
    },
    value() {
      return new Date(current);
    }
  };
}

export async function createPilotHarness(testContext, options = {}) {
  harnessSequence += 1;
  const directory = await mkdtemp(
    path.join(os.tmpdir(), `fdos-runtime-${harnessSequence}-`)
  );
  testContext.after(async () => {
    if (runtime) await runtime.close().catch(() => {});
    await rm(directory, { recursive: true, force: true });
  });
  let runtime = await openPilotRuntime({
    directory,
    ...options
  });
  return {
    directory,
    runtime,
    owner: humanActor("human:test-owner"),
    chief: agentActor("agent:chief-of-staff:primary"),
    operations: agentActor("agent:operations:primary"),
    marketing: agentActor("agent:marketing:primary")
  };
}

export async function startPilot(runtime, owner, overrides = {}) {
  return runtime.startWorkflow({
    actor: owner,
    workflowId: SOFTWARE_CHANGE_READINESS_WORKFLOW.id,
    version: SOFTWARE_CHANGE_READINESS_WORKFLOW.version,
    objective: "Prepare a bounded internal software-change decision pack.",
    input: {
      changeReference: "TEST-CHANGE-001",
      externalActionAuthorized: false
    },
    ...overrides
  });
}

export function findStep(run, stepId) {
  const task = run.tasks.find((candidate) => candidate.stepId === stepId);
  if (!task) throw new Error(`Missing test task ${stepId}.`);
  return task;
}

export const pilotResults = Object.freeze({
  intake: {
    scope: ["internal readiness"],
    successCriteria: ["traceable decision pack"],
    constraints: ["no external action"]
  },
  operations: {
    readiness: "ready_for_human_review",
    checks: [{ name: "tests", status: "passed" }],
    blockers: []
  },
  marketing: {
    audience: "internal",
    draft: "Internal draft only.",
    claimsToVerify: ["human approval"]
  },
  synthesis: {
    recommendation: "Request human review.",
    unresolvedRisks: ["No external action is authorized."],
    approvalRequests: ["Human decision"]
  }
});

export async function completePilot(runtime, actors, runId) {
  const { chief, operations, marketing, owner } = actors;
  let run = runtime.viewRun(runId, owner);
  let task = findStep(run, "executive-intake");
  await runtime.claimTask(task.id, chief);
  await runtime.completeTask(task.id, chief, pilotResults.intake);

  run = runtime.viewRun(runId, owner);
  task = findStep(run, "operations-readiness");
  await runtime.claimTask(task.id, operations);
  await runtime.completeTask(task.id, operations, pilotResults.operations);

  run = runtime.viewRun(runId, owner);
  task = findStep(run, "marketing-draft");
  await runtime.claimTask(task.id, marketing);
  await runtime.completeTask(task.id, marketing, pilotResults.marketing);

  run = runtime.viewRun(runId, owner);
  task = findStep(run, "executive-synthesis");
  await runtime.claimTask(task.id, chief);
  await runtime.completeTask(task.id, chief, pilotResults.synthesis);
  return runtime.viewRun(runId, owner);
}
