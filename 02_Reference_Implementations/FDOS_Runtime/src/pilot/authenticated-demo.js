import { createId } from "../kernel/ids.js";
import {
  SOFTWARE_CHANGE_READINESS_WORKFLOW
} from "./software-change-readiness.js";

const principals = Object.freeze({
  owner: Object.freeze({
    type: "human",
    id: "human:demo-owner"
  }),
  chief: Object.freeze({
    type: "agent",
    id: "agent:chief-of-staff:primary"
  }),
  operations: Object.freeze({
    type: "agent",
    id: "agent:operations:primary"
  }),
  marketing: Object.freeze({
    type: "agent",
    id: "agent:marketing:primary"
  })
});

function taskByStep(run, stepId) {
  const task = run.tasks.find((candidate) => candidate.stepId === stepId);
  if (!task) throw new Error(`Authenticated demo task not found: ${stepId}.`);
  return task;
}

async function invoke(
  gateway,
  authority,
  principal,
  correlationId,
  type,
  payload
) {
  const command = { type, payload };
  return gateway.execute({
    command,
    invocation: authority.issue({
      principal,
      command,
      correlationId
    })
  });
}

async function executeStep(
  gateway,
  authority,
  principal,
  correlationId,
  task,
  result
) {
  await invoke(
    gateway,
    authority,
    principal,
    correlationId,
    "task.claim",
    { taskId: task.id }
  );
  await invoke(
    gateway,
    authority,
    principal,
    correlationId,
    "task.complete",
    { taskId: task.id, result }
  );
}

export async function executeAuthenticatedSoftwareChangeReadinessDemo({
  gateway,
  authority
}) {
  const correlationId = createId("correlation");
  const started = await invoke(
    gateway,
    authority,
    principals.owner,
    correlationId,
    "workflow.start",
    {
      workflowId: SOFTWARE_CHANGE_READINESS_WORKFLOW.id,
      version: SOFTWARE_CHANGE_READINESS_WORKFLOW.version,
      objective:
        "Prepare an authenticated internal readiness decision pack for a bounded software change.",
      input: {
        changeReference: "AUTH-DEMO-CHANGE-001",
        requestedWindow: "not scheduled",
        externalActionAuthorized: false
      },
      idempotencyKey: "fdos-authenticated-runtime-demo-v1"
    }
  );
  const runId = started.run.id;

  await executeStep(
    gateway,
    authority,
    principals.chief,
    correlationId,
    taskByStep(started.run, "executive-intake"),
    {
      scope: [
        "Assess internal readiness.",
        "Prepare an unpublished communication draft."
      ],
      successCriteria: [
        "Every runtime command has a verified invocation.",
        "Operational blockers are explicit.",
        "Human Governance receives the final decision."
      ],
      constraints: [
        "No production change.",
        "No publication or email.",
        "No connector execution."
      ]
    }
  );

  await executeStep(
    gateway,
    authority,
    principals.operations,
    correlationId,
    taskByStep(started.run, "operations-readiness"),
    {
      readiness: "conditionally_ready_for_human_review",
      checks: [
        { name: "authenticated-invocations", status: "verified" },
        { name: "replay-protection", status: "enabled" },
        { name: "production-change", status: "not_executed" }
      ],
      blockers: [
        "Production identity-provider integration is intentionally absent."
      ]
    }
  );

  await executeStep(
    gateway,
    authority,
    principals.marketing,
    correlationId,
    taskByStep(started.run, "marketing-draft"),
    {
      audience: "internal stakeholders",
      draft:
        "The authenticated pilot completed internal preparation and awaits human review.",
      claimsToVerify: [
        "Independent identity-provider evidence",
        "Transactional persistence",
        "Human publication authorization"
      ]
    }
  );

  await executeStep(
    gateway,
    authority,
    principals.chief,
    correlationId,
    taskByStep(started.run, "executive-synthesis"),
    {
      recommendation:
        "Accept identity feasibility evidence only; do not release or publish.",
      unresolvedRisks: [
        "The local signing authority is not a production identity provider.",
        "No external action has been authorized."
      ],
      approvalRequests: [
        "Human review of identity evidence",
        "Separate future approval for any connector"
      ]
    }
  );

  const memoryCandidate = await invoke(
    gateway,
    authority,
    principals.operations,
    correlationId,
    "memory.propose",
    {
      scope: "department:operations",
      title: "Authenticated invocation pilot observation",
      content:
        "Authorization must use verified principal identity and exact command binding rather than caller assertions.",
      sensitivity: "internal",
      sourceReferences: [`workflow-run:${runId}`]
    }
  );
  await invoke(
    gateway,
    authority,
    principals.owner,
    correlationId,
    "memory.review",
    {
      candidateId: memoryCandidate.id,
      decision: "accepted",
      reason: "Accepted for this experimental department memory only."
    }
  );

  const run = await invoke(
    gateway,
    authority,
    principals.owner,
    correlationId,
    "workflow.view",
    { runId }
  );
  const evidence = await invoke(
    gateway,
    authority,
    principals.owner,
    correlationId,
    "evidence.export",
    { runId }
  );
  const acceptedOperationsMemory = await invoke(
    gateway,
    authority,
    principals.operations,
    correlationId,
    "memory.read",
    { scope: "department:operations" }
  );

  return {
    correlationId,
    run,
    evidence,
    acceptedOperationsMemory,
    status: gateway.status()
  };
}
