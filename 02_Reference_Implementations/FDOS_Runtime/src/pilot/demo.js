import { agentActor } from "../domain/agent-registry.js";
import { humanActor } from "../domain/role-registry.js";
import {
  SOFTWARE_CHANGE_READINESS_WORKFLOW
} from "./software-change-readiness.js";

function taskByStep(run, stepId) {
  const task = run.tasks.find((candidate) => candidate.stepId === stepId);
  if (!task) throw new Error(`Demo task not found: ${stepId}.`);
  return task;
}

async function executeStep(runtime, runId, stepId, actor, result) {
  const run = runtime.viewRun(runId, actor);
  const task = taskByStep(run, stepId);
  await runtime.claimTask(task.id, actor);
  await runtime.completeTask(task.id, actor, result);
}

export async function executeSoftwareChangeReadinessDemo(runtime) {
  const owner = humanActor("human:demo-owner");
  const chief = agentActor("agent:chief-of-staff:primary");
  const operations = agentActor("agent:operations:primary");
  const marketing = agentActor("agent:marketing:primary");

  const started = await runtime.startWorkflow({
    actor: owner,
    workflowId: SOFTWARE_CHANGE_READINESS_WORKFLOW.id,
    version: SOFTWARE_CHANGE_READINESS_WORKFLOW.version,
    objective:
      "Prepare an internal readiness decision pack for a bounded software change.",
    input: {
      changeReference: "DEMO-CHANGE-001",
      requestedWindow: "not scheduled",
      externalActionAuthorized: false
    },
    idempotencyKey: "fdos-runtime-demo-v1"
  });
  const runId = started.run.id;

  await executeStep(runtime, runId, "executive-intake", chief, {
    scope: [
      "Assess internal readiness.",
      "Prepare an unpublished communication draft."
    ],
    successCriteria: [
      "Operational blockers are explicit.",
      "All communication claims are traceable.",
      "Human Governance receives the final decision."
    ],
    constraints: [
      "No production change.",
      "No publication or email.",
      "No connector execution."
    ]
  });

  await executeStep(runtime, runId, "operations-readiness", operations, {
    readiness: "conditionally_ready_for_human_review",
    checks: [
      { name: "automated-tests", status: "reported_passed" },
      { name: "rollback-plan", status: "requires_human_confirmation" },
      { name: "production-change", status: "not_executed" }
    ],
    blockers: ["Human release authorization is intentionally absent."]
  });

  await executeStep(runtime, runId, "marketing-draft", marketing, {
    audience: "internal stakeholders",
    draft:
      "The bounded change has completed internal preparation and awaits human review.",
    claimsToVerify: [
      "Final test evidence",
      "Approved release window",
      "Human publication authorization"
    ]
  });

  await executeStep(runtime, runId, "executive-synthesis", chief, {
    recommendation: "Proceed only to human review; do not release or publish.",
    unresolvedRisks: [
      "Rollback confirmation remains human-owned.",
      "No external action has been authorized."
    ],
    approvalRequests: [
      "Human review of operational evidence",
      "Separate future approval for any external action"
    ]
  });

  const memoryCandidate = await runtime.proposeMemory({
    actor: operations,
    scope: "department:operations",
    title: "Release-readiness pilot observation",
    content:
      "An internal recommendation must remain distinct from release authorization.",
    sensitivity: "internal",
    sourceReferences: [`workflow-run:${runId}`]
  });
  await runtime.reviewMemory({
    candidateId: memoryCandidate.id,
    actor: owner,
    decision: "accepted",
    reason: "Accepted for this experimental department memory only."
  });

  return {
    run: runtime.viewRun(runId, owner),
    evidence: runtime.exportEvidenceBundle(runId, owner),
    acceptedOperationsMemory: runtime.readMemory({
      actor: operations,
      scope: "department:operations"
    })
  };
}
