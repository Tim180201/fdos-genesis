import { digestObject, jsonClone } from "../kernel/canonical-json.js";
import { IntegrityError } from "../kernel/errors.js";
import { assertId } from "../kernel/ids.js";
import {
  assertPlainObject,
  isoDate,
  requiredString
} from "../kernel/validation.js";
import {
  invocationCommandDigest,
  verifyInvocationReceipt
} from "../identity/invocation.js";
import {
  verifyDeliveryIntent,
  verifyDeliveryOutcome
} from "../domain/delivery-intent.js";
import {
  assertVerifiedWorkerReceiptBinding
} from "../domain/verified-worker-receipt.js";

export function createRuntimeState() {
  return {
    runs: new Map(),
    tasks: new Map(),
    approvals: new Map(),
    memoryCandidates: new Map(),
    outbox: new Map(),
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

function requireDelivery(state, deliveryId) {
  const delivery = state.outbox.get(deliveryId);
  if (!delivery) {
    throw new IntegrityError(
      `Event references missing connector delivery ${deliveryId}.`
    );
  }
  return delivery;
}

function exactKeys(value, expected, field) {
  assertPlainObject(value, field);
  const actual = Object.keys(value).sort();
  const normalizedExpected = [...expected].sort();
  if (
    actual.length !== normalizedExpected.length ||
    actual.some((key, index) => key !== normalizedExpected[index])
  ) {
    throw new IntegrityError(`${field} has an unexpected shape.`);
  }
}

function verifyPreparedDelivery(delivery, state, event) {
  const hasWorkerReceipt =
    Object.hasOwn(delivery, "workerReceipt");
  const hasWorkerReceiptInvocationId =
    Object.hasOwn(delivery, "workerReceiptInvocationId");
  if (
    hasWorkerReceipt !==
      hasWorkerReceiptInvocationId
  ) {
    throw new IntegrityError(
      "Prepared connector delivery receipt state is incomplete."
    );
  }
  exactKeys(
    delivery,
    [
      "attempt",
      "claim",
      "completedAt",
      "createdAt",
      "id",
      "intent",
      "lastOutcome",
      "maxAttempts",
      ...(hasWorkerReceipt
        ? [
            "workerReceipt",
            "workerReceiptInvocationId"
          ]
        : []),
      "resolution",
      "retryable",
      "status",
      "updatedAt"
    ],
    "prepared connector delivery"
  );
  const id = assertId(delivery.id, "connector delivery id");
  if (!id.startsWith("delivery_") || event.subject !== id) {
    throw new IntegrityError(
      "Connector delivery identifier or event subject is invalid."
    );
  }
  verifyDeliveryIntent(delivery.intent);
  if (
    delivery.status !== "prepared" ||
    delivery.attempt !== 0 ||
    delivery.maxAttempts !== delivery.intent.connector.maxAttempts ||
    delivery.claim !== null ||
    delivery.lastOutcome !== null ||
    (hasWorkerReceipt &&
      (delivery.workerReceipt !== null ||
        delivery.workerReceiptInvocationId !== null)) ||
    delivery.resolution !== null ||
    delivery.retryable !== false ||
    delivery.completedAt !== null ||
    delivery.createdAt !== delivery.intent.requestedAt ||
    delivery.updatedAt !== delivery.createdAt ||
    delivery.intent.requestedBy !== event.actor.id
  ) {
    throw new IntegrityError(
      "Prepared connector delivery state is inconsistent."
    );
  }
  isoDate(delivery.createdAt, "delivery createdAt");
  const task = requireTask(state, delivery.intent.task.id);
  if (
    task.runId !== delivery.intent.task.runId ||
    task.attempt !== delivery.intent.task.attempt ||
    task.actionIntent.digest !==
      delivery.intent.task.actionIntentDigest ||
    task.ownerRoleId !== delivery.intent.task.ownerRoleId
  ) {
    throw new IntegrityError(
      "Connector delivery no longer binds its source task."
    );
  }
}

function verifyClaim(claim, delivery, actor) {
  exactKeys(
    claim,
    ["attempt", "claimedAt", "connectorId", "expiresAt", "id"],
    "connector delivery claim"
  );
  const id = assertId(claim.id, "connector delivery claim id");
  const claimedAt = isoDate(claim.claimedAt, "delivery claimedAt");
  const expiresAt = isoDate(claim.expiresAt, "delivery claim expiresAt");
  if (
    !id.startsWith("claim_") ||
    claim.connectorId !== delivery.intent.connector.id ||
    claim.connectorId !== actor.id ||
    claim.attempt !== delivery.attempt + 1 ||
    claim.attempt > delivery.maxAttempts ||
    Date.parse(expiresAt) <= Date.parse(claimedAt)
  ) {
    throw new IntegrityError("Connector delivery claim is inconsistent.");
  }
}

function verifyResolution(resolution, actor) {
  exactKeys(
    resolution,
    [
      "decision",
      "evidenceDigest",
      "reason",
      "resolvedAt",
      "resolvedBy",
      "resultDigest",
      "retryable"
    ],
    "delivery uncertainty resolution"
  );
  if (
    !["cancelled", "confirmed_simulated", "failed"].includes(
      resolution.decision
    ) ||
    resolution.resolvedBy !== actor.id ||
    actor.type !== "human" ||
    typeof resolution.retryable !== "boolean"
  ) {
    throw new IntegrityError(
      "Delivery uncertainty resolution is inconsistent."
    );
  }
  requiredString(resolution.reason, "delivery resolution reason", {
    max: 2_000
  });
  requiredString(
    resolution.evidenceDigest,
    "delivery resolution evidence digest",
    {
      max: 71,
      pattern: /^sha256:[0-9a-f]{64}$/
    }
  );
  isoDate(resolution.resolvedAt, "delivery resolvedAt");
  if (resolution.decision === "confirmed_simulated") {
    requiredString(
      resolution.resultDigest,
      "delivery resolution result digest",
      {
        max: 71,
        pattern: /^sha256:[0-9a-f]{64}$/
      }
    );
    if (resolution.retryable) {
      throw new IntegrityError(
        "Confirmed simulation resolution cannot be retryable."
      );
    }
  } else if (resolution.resultDigest !== null) {
    throw new IntegrityError(
      "Non-simulated resolution contains a result digest."
    );
  }
  if (
    resolution.decision !== "failed" &&
    resolution.retryable
  ) {
    throw new IntegrityError(
      "Only a failed uncertainty resolution can be retryable."
    );
  }
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

    case "connector.delivery.prepared": {
      exactKeys(
        payload,
        ["delivery"],
        "connector delivery prepared payload"
      );
      verifyPreparedDelivery(payload.delivery, state, event);
      const delivery = jsonClone(payload.delivery);
      if (state.outbox.has(delivery.id)) {
        throw new IntegrityError(
          `Duplicate connector delivery ${delivery.id}.`
        );
      }
      for (const existing of state.outbox.values()) {
        if (
          existing.intent.idempotencyDigest ===
          delivery.intent.idempotencyDigest
        ) {
          throw new IntegrityError(
            "Duplicate connector delivery idempotency binding."
          );
        }
      }
      state.outbox.set(delivery.id, delivery);
      return;
    }

    case "connector.delivery.claimed": {
      exactKeys(
        payload,
        ["claim", "deliveryId"],
        "connector delivery claimed payload"
      );
      const delivery = requireDelivery(state, payload.deliveryId);
      if (
        event.subject !== delivery.id ||
        delivery.status !== "prepared" ||
        event.actor.type !== "connector"
      ) {
        throw new IntegrityError(
          "Connector delivery cannot enter claimed state."
        );
      }
      verifyClaim(payload.claim, delivery, event.actor);
      const claim = jsonClone(payload.claim);
      delivery.status = "claimed";
      delivery.attempt = claim.attempt;
      delivery.claim = claim;
      delivery.retryable = false;
      delivery.resolution = null;
      delivery.updatedAt = claim.claimedAt;
      return;
    }

    case "connector.delivery.outcome-recorded": {
      const hasWorkerReceipt = Object.hasOwn(
        payload,
        "workerReceipt"
      );
      exactKeys(
        payload,
        [
          "claimId",
          "deliveryId",
          "outcome",
          ...(hasWorkerReceipt
            ? ["workerReceipt"]
            : [])
        ],
        "connector delivery outcome payload"
      );
      const delivery = requireDelivery(state, payload.deliveryId);
      const acceptedInvocation =
        state.acceptedInvocations.get(
          event.actor.invocationId
        );
      if (
        event.subject !== delivery.id ||
        delivery.status !== "claimed" ||
        event.actor.type !== "connector" ||
        payload.claimId !== delivery.claim.id ||
        acceptedInvocation?.operation !==
          (hasWorkerReceipt
            ? "outbox.record-worker-outcome"
            : "outbox.record-outcome")
      ) {
        throw new IntegrityError(
          "Connector delivery outcome has no matching active claim."
        );
      }
      const outcome = verifyDeliveryOutcome(payload.outcome);
      const outcomeOperation = hasWorkerReceipt
        ? "outbox.record-worker-outcome"
        : "outbox.record-outcome";
      const commandDigest = invocationCommandDigest({
        type: outcomeOperation,
        payload: {
          deliveryId: delivery.id,
          claimId: payload.claimId,
          outcome: outcome.type,
          evidence: outcome.evidence,
          ...(hasWorkerReceipt
            ? {
                workerReceipt:
                  payload.workerReceipt
              }
            : {})
        }
      });
      if (
        outcome.recordedBy !== event.actor.id ||
        event.actor.id !== delivery.claim.connectorId ||
        commandDigest !==
          acceptedInvocation.commandDigest ||
        Date.parse(outcome.recordedAt) >
          Date.parse(delivery.claim.expiresAt)
      ) {
        throw new IntegrityError(
          "Connector delivery outcome violates claim ownership or lease."
        );
      }
      const workerReceipt = hasWorkerReceipt
        ? assertVerifiedWorkerReceiptBinding(
            payload.workerReceipt,
            {
              delivery,
              claim: delivery.claim,
              outcome,
              recordedAt: outcome.recordedAt
            },
            IntegrityError
          )
        : null;
      delivery.status = outcome.type;
      delivery.lastOutcome = jsonClone(outcome);
      delivery.workerReceipt = workerReceipt
        ? jsonClone(workerReceipt)
        : null;
      delivery.workerReceiptInvocationId =
        workerReceipt
          ? event.actor.invocationId
          : null;
      delivery.claim = null;
      delivery.retryable =
        outcome.type === "failed" && outcome.evidence.retryable;
      delivery.updatedAt = outcome.recordedAt;
      delivery.completedAt =
        outcome.type === "simulated" ? outcome.recordedAt : null;
      return;
    }

    case "connector.delivery.claim-expired": {
      exactKeys(
        payload,
        [
          "claimId",
          "deliveryId",
          "detectedAt",
          "expiredAt",
          "outcome"
        ],
        "connector delivery claim-expiry payload"
      );
      const delivery = requireDelivery(state, payload.deliveryId);
      if (
        event.subject !== delivery.id ||
        delivery.status !== "claimed" ||
        payload.claimId !== delivery.claim.id ||
        payload.expiredAt !== delivery.claim.expiresAt
      ) {
        throw new IntegrityError(
          "Connector claim-expiry event is inconsistent."
        );
      }
      const detectedAt = isoDate(
        payload.detectedAt,
        "delivery claim expiry detectedAt"
      );
      if (Date.parse(detectedAt) < Date.parse(payload.expiredAt)) {
        throw new IntegrityError(
          "Connector claim expiry was detected before lease expiry."
        );
      }
      const outcome = verifyDeliveryOutcome(payload.outcome);
      const authorizedDetector =
        (event.actor.type === "connector" &&
          event.actor.id === delivery.claim.connectorId) ||
        (event.actor.type === "system" &&
          event.actor.id === "fdos-runtime");
      if (
        !authorizedDetector ||
        outcome.type !== "uncertain" ||
        outcome.recordedBy !== delivery.claim.connectorId ||
        outcome.recordedAt !== detectedAt
      ) {
        throw new IntegrityError(
          "Expired connector claim requires an uncertain outcome."
        );
      }
      delivery.status = "uncertain";
      delivery.lastOutcome = jsonClone(outcome);
      delivery.workerReceipt = null;
      delivery.workerReceiptInvocationId = null;
      delivery.claim = null;
      delivery.retryable = false;
      delivery.updatedAt = detectedAt;
      return;
    }

    case "connector.delivery.retry-authorized": {
      exactKeys(
        payload,
        [
          "authorizedAt",
          "authorizedBy",
          "deliveryId",
          "reason"
        ],
        "connector delivery retry payload"
      );
      const delivery = requireDelivery(state, payload.deliveryId);
      if (
        event.subject !== delivery.id ||
        delivery.status !== "failed" ||
        !delivery.retryable ||
        delivery.attempt >= delivery.maxAttempts ||
        event.actor.type !== "human" ||
        payload.authorizedBy !== event.actor.id
      ) {
        throw new IntegrityError(
          "Connector delivery retry authorization is invalid."
        );
      }
      requiredString(payload.reason, "delivery retry reason", {
        max: 2_000
      });
      const authorizedAt = isoDate(
        payload.authorizedAt,
        "delivery retry authorizedAt"
      );
      delivery.status = "prepared";
      delivery.retryable = false;
      delivery.updatedAt = authorizedAt;
      return;
    }

    case "connector.delivery.cancelled": {
      exactKeys(
        payload,
        [
          "cancelledAt",
          "cancelledBy",
          "deliveryId",
          "reason"
        ],
        "connector delivery cancellation payload"
      );
      const delivery = requireDelivery(state, payload.deliveryId);
      if (
        event.subject !== delivery.id ||
        !["prepared", "failed"].includes(delivery.status) ||
        event.actor.type !== "human" ||
        payload.cancelledBy !== event.actor.id
      ) {
        throw new IntegrityError(
          "Connector delivery cancellation is invalid."
        );
      }
      requiredString(payload.reason, "delivery cancellation reason", {
        max: 2_000
      });
      const cancelledAt = isoDate(
        payload.cancelledAt,
        "delivery cancelledAt"
      );
      delivery.status = "cancelled";
      delivery.claim = null;
      delivery.retryable = false;
      delivery.updatedAt = cancelledAt;
      delivery.completedAt = cancelledAt;
      return;
    }

    case "connector.delivery.uncertainty-resolved": {
      exactKeys(
        payload,
        ["deliveryId", "resolution"],
        "connector delivery resolution payload"
      );
      const delivery = requireDelivery(state, payload.deliveryId);
      if (
        event.subject !== delivery.id ||
        delivery.status !== "uncertain"
      ) {
        throw new IntegrityError(
          "Connector delivery is not awaiting uncertainty resolution."
        );
      }
      verifyResolution(payload.resolution, event.actor);
      const resolution = jsonClone(payload.resolution);
      delivery.resolution = resolution;
      delivery.status =
        resolution.decision === "confirmed_simulated"
          ? "simulated"
          : resolution.decision;
      delivery.retryable =
        resolution.decision === "failed" && resolution.retryable;
      delivery.updatedAt = resolution.resolvedAt;
      delivery.completedAt = ["cancelled", "confirmed_simulated"].includes(
        resolution.decision
      )
        ? resolution.resolvedAt
        : null;
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
