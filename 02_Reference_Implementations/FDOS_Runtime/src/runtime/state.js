import { digestObject, jsonClone } from "../kernel/canonical-json.js";
import { IntegrityError } from "../kernel/errors.js";
import { assertId } from "../kernel/ids.js";
import {
  isoDate,
  requiredString
} from "../kernel/validation.js";
import { verifyInvocationReceipt } from "../identity/invocation.js";

export function createRuntimeState() {
  return {
    runs: new Map(),
    tasks: new Map(),
    approvals: new Map(),
    memoryCandidates: new Map(),
    acceptedInvocations: new Map()
  };
}

function requireRun(state, runId) {
  const run = state.runs.get(runId);
  if (!run) throw new IntegrityError(`Event references missing run ${runId}.`);
  return run;
}

function requireTask(state, taskId) {
  const task = state.tasks.get(taskId);
  if (!task) throw new IntegrityError(`Event references missing task ${taskId}.`);
  return task;
}

function requireApproval(state, approvalId) {
  const approval = state.approvals.get(approvalId);
  if (!approval) {
    throw new IntegrityError(`Event references missing approval ${approvalId}.`);
  }
  return approval;
}

function requireMemoryCandidate(state, candidateId) {
  const candidate = state.memoryCandidates.get(candidateId);
  if (!candidate) {
    throw new IntegrityError(
      `Event references missing memory candidate ${candidateId}.`
    );
  }
  return candidate;
}

function verifyDefinitionSnapshot(definition) {
  const unsigned = jsonClone(definition);
  const digest = unsigned.digest;
  delete unsigned.digest;
  if (digestObject(unsigned) !== digest) {
    throw new IntegrityError("Workflow definition snapshot digest mismatch.");
  }
}

export function applyRuntimeEvent(state, event) {
  const payload = event.payload;
  if (
    event.type !== "identity.invocation.accepted" &&
    event.actor.invocationId
  ) {
    const accepted = state.acceptedInvocations.get(
      event.actor.invocationId
    );
    if (!accepted) {
      throw new IntegrityError(
        `Event references unaccepted invocation ${event.actor.invocationId}.`
      );
    }
    if (
      accepted.transactionId !== (event.transactionId || null) ||
      accepted.correlationId !== event.actor.correlationId
    ) {
      throw new IntegrityError(
        "Invocation-attributed event crosses its transaction."
      );
    }
  }

  switch (event.type) {
    case "identity.invocation.accepted": {
      verifyInvocationReceipt(payload.receipt);
      const receipt = jsonClone(payload.receipt);
      if (state.acceptedInvocations.has(receipt.invocationId)) {
        throw new IntegrityError(
          `Duplicate invocation ${receipt.invocationId}.`
        );
      }
      if (
        event.actor.type !== receipt.principal.type ||
        event.actor.id !== receipt.principal.id ||
        event.actor.invocationId !== receipt.invocationId ||
        event.actor.correlationId !== receipt.correlationId
      ) {
        throw new IntegrityError(
          "Invocation receipt and event actor differ."
        );
      }
      const acceptedAt = isoDate(
        payload.acceptedAt,
        "invocation acceptedAt"
      );
      const eventTimestamp = isoDate(
        event.timestamp,
        "invocation event timestamp"
      );
      if (
        acceptedAt !== receipt.verifiedAt ||
        Date.parse(eventTimestamp) +
          receipt.verificationClockSkewMs <
          Date.parse(acceptedAt)
      ) {
        throw new IntegrityError(
          "Invocation acceptance time is inconsistent."
        );
      }
      state.acceptedInvocations.set(receipt.invocationId, {
        ...receipt,
        acceptedAt,
        transactionId: event.transactionId || null
      });
      return;
    }

    case "identity.invocation.execution-failed": {
      const invocationId = assertId(
        payload.invocationId,
        "failed invocation id"
      );
      const accepted = state.acceptedInvocations.get(invocationId);
      if (!accepted) {
        throw new IntegrityError(
          `Failure references unaccepted invocation ${invocationId}.`
        );
      }
      if (
        invocationId !== event.actor.invocationId ||
        payload.operation !== accepted.operation ||
        payload.commandDigest !== accepted.commandDigest
      ) {
        throw new IntegrityError(
          "Invocation failure does not match its accepted command."
        );
      }
      requiredString(payload.errorCode, "command failure code", {
        max: 64,
        pattern: /^[A-Z][A-Z0-9_]{2,63}$/
      });
      requiredString(payload.errorType, "command failure type", {
        max: 80,
        pattern: /^[A-Z][a-zA-Z0-9]{2,79}$/
      });
      requiredString(payload.messageDigest, "command failure digest", {
        max: 71,
        pattern: /^sha256:[0-9a-f]{64}$/
      });
      isoDate(payload.failedAt, "command failedAt");
      return;
    }

    case "workflow.run.started": {
      if (state.runs.has(payload.run.id)) {
        throw new IntegrityError(`Duplicate run ${payload.run.id}.`);
      }
      verifyDefinitionSnapshot(payload.run.definitionSnapshot);
      const run = jsonClone(payload.run);
      state.runs.set(run.id, run);
      for (const taskSource of payload.tasks) {
        if (state.tasks.has(taskSource.id)) {
          throw new IntegrityError(`Duplicate task ${taskSource.id}.`);
        }
        const task = jsonClone(taskSource);
        if (task.runId !== run.id) {
          throw new IntegrityError(`Task ${task.id} has the wrong run binding.`);
        }
        state.tasks.set(task.id, task);
      }
      return;
    }

    case "task.ready": {
      const task = requireTask(state, payload.taskId);
      task.status = "ready";
      task.waitingReason = null;
      task.updatedAt = payload.readyAt;
      return;
    }

    case "task.claimed": {
      const task = requireTask(state, payload.taskId);
      task.status = "in_progress";
      task.claimedBy = payload.claimedBy;
      task.claimedAt = payload.claimedAt;
      task.updatedAt = payload.claimedAt;
      return;
    }

    case "task.completed": {
      const task = requireTask(state, payload.taskId);
      task.status = "completed";
      task.result = jsonClone(payload.result);
      task.resultDigest = payload.resultDigest;
      task.completedAt = payload.completedAt;
      task.updatedAt = payload.completedAt;
      task.claimedBy = null;
      return;
    }

    case "task.failed": {
      const task = requireTask(state, payload.taskId);
      task.status = "failed";
      task.failure = {
        reason: payload.reason,
        retryable: payload.retryable,
        failedAt: payload.failedAt
      };
      task.claimedBy = null;
      task.updatedAt = payload.failedAt;
      const run = requireRun(state, task.runId);
      run.status = "failed";
      run.updatedAt = payload.failedAt;
      return;
    }

    case "task.retry.authorized": {
      const task = requireTask(state, payload.taskId);
      task.status = "ready";
      task.attempt = payload.attempt;
      task.failure = null;
      task.claimedBy = null;
      task.claimedAt = null;
      task.updatedAt = payload.authorizedAt;
      const run = requireRun(state, task.runId);
      run.status = run.taskIds.some(
        (taskId) =>
          taskId !== task.id && requireTask(state, taskId).status === "failed"
      )
        ? "failed"
        : "active";
      run.updatedAt = payload.authorizedAt;
      return;
    }

    case "task.cancelled": {
      const task = requireTask(state, payload.taskId);
      task.status = "cancelled";
      task.claimedBy = null;
      task.updatedAt = payload.cancelledAt;
      const run = requireRun(state, task.runId);
      run.status = "cancelled";
      run.updatedAt = payload.cancelledAt;
      return;
    }

    case "task.handoff.created": {
      const parent = requireTask(state, payload.parentTaskId);
      if (state.tasks.has(payload.childTask.id)) {
        throw new IntegrityError(`Duplicate task ${payload.childTask.id}.`);
      }
      parent.status = "waiting_handoff";
      parent.claimedBy = null;
      parent.updatedAt = payload.createdAt;
      parent.childTaskIds.push(payload.childTask.id);
      const child = jsonClone(payload.childTask);
      state.tasks.set(child.id, child);
      const run = requireRun(state, parent.runId);
      run.taskIds.push(child.id);
      run.handoffCount += 1;
      run.updatedAt = payload.createdAt;
      return;
    }

    case "task.handoff.returned": {
      const parent = requireTask(state, payload.parentTaskId);
      parent.status = "ready";
      parent.waitingReason = null;
      parent.updatedAt = payload.returnedAt;
      return;
    }

    case "approval.requested": {
      if (state.approvals.has(payload.approval.id)) {
        throw new IntegrityError(`Duplicate approval ${payload.approval.id}.`);
      }
      const approval = jsonClone(payload.approval);
      state.approvals.set(approval.id, approval);
      const task = requireTask(state, approval.taskId);
      task.status = "waiting_approval";
      task.waitingReason = "human_approval_required";
      task.updatedAt = approval.requestedAt;
      return;
    }

    case "approval.granted": {
      const approval = requireApproval(state, payload.approvalId);
      approval.status = "granted";
      approval.decidedBy = payload.decidedBy;
      approval.decidedAt = payload.decidedAt;
      approval.expiresAt = payload.expiresAt;
      const task = requireTask(state, approval.taskId);
      task.status = "ready";
      task.waitingReason = null;
      task.updatedAt = payload.decidedAt;
      return;
    }

    case "approval.denied": {
      const approval = requireApproval(state, payload.approvalId);
      approval.status = "denied";
      approval.decidedBy = payload.decidedBy;
      approval.decidedAt = payload.decidedAt;
      approval.decisionReason = payload.reason;
      const task = requireTask(state, approval.taskId);
      task.status = "cancelled";
      task.waitingReason = "approval_denied";
      task.updatedAt = payload.decidedAt;
      const run = requireRun(state, task.runId);
      run.status = "cancelled";
      run.updatedAt = payload.decidedAt;
      return;
    }

    case "approval.expired": {
      const approval = requireApproval(state, payload.approvalId);
      approval.status = "expired";
      approval.expiredAt = payload.expiredAt;
      const task = requireTask(state, approval.taskId);
      if (task.status === "waiting_approval") {
        task.status = "ready";
        task.waitingReason = null;
        task.updatedAt = payload.expiredAt;
      }
      return;
    }

    case "approval.consumed": {
      const approval = requireApproval(state, payload.approvalId);
      approval.status = "consumed";
      approval.consumedAt = payload.consumedAt;
      return;
    }

    case "memory.candidate.proposed": {
      if (state.memoryCandidates.has(payload.candidate.id)) {
        throw new IntegrityError(
          `Duplicate memory candidate ${payload.candidate.id}.`
        );
      }
      state.memoryCandidates.set(
        payload.candidate.id,
        jsonClone(payload.candidate)
      );
      return;
    }

    case "memory.candidate.reviewed": {
      const candidate = requireMemoryCandidate(state, payload.candidateId);
      candidate.status = payload.decision;
      candidate.reviewedBy = payload.reviewedBy;
      candidate.reviewedAt = payload.reviewedAt;
      candidate.reviewReason = payload.reason;
      return;
    }

    case "workflow.run.completed": {
      const run = requireRun(state, payload.runId);
      run.status = "completed";
      run.evidenceDigest = payload.evidenceDigest;
      run.evidenceBaseHeadHash = payload.evidenceBaseHeadHash;
      run.completedAt = payload.completedAt;
      run.updatedAt = payload.completedAt;
      return;
    }

    default:
      throw new IntegrityError(`Unknown runtime event type: ${event.type}.`);
  }
}
