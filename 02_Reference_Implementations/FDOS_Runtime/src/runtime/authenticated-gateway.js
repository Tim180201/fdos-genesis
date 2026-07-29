import { immutableJson } from "../kernel/canonical-json.js";
import { ValidationError } from "../kernel/errors.js";
import { assertPlainObject } from "../kernel/validation.js";
import { normalizeInvocationCommand } from "../identity/invocation.js";

function exactRequestShape(request) {
  assertPlainObject(request, "authenticated runtime request");
  const keys = Object.keys(request).sort();
  if (
    keys.length !== 2 ||
    keys[0] !== "command" ||
    keys[1] !== "invocation"
  ) {
    throw new ValidationError(
      "Authenticated runtime request has an unexpected shape."
    );
  }
}

async function dispatch(runtime, command, actor) {
  const payload = command.payload;
  switch (command.type) {
    case "agent.profile":
      return runtime.getAgentOperatingProfile(actor);
    case "workflow.start":
      return runtime.startWorkflow({ ...payload, actor });
    case "workflow.view":
      return runtime.viewRun(payload.runId, actor);
    case "task.list-ready":
      return runtime.listReadyTasks(actor);
    case "task.get":
      return runtime.getTask(payload.taskId, actor);
    case "task.context":
      return runtime.getTaskContext(payload.taskId, actor);
    case "task.claim":
      return runtime.claimTask(payload.taskId, actor);
    case "task.complete":
      return runtime.completeTask(payload.taskId, actor, payload.result);
    case "task.fail":
      return runtime.failTask(payload.taskId, actor, {
        reason: payload.reason,
        retryable: payload.retryable
      });
    case "task.retry":
      return runtime.retryTask(payload.taskId, actor);
    case "task.cancel":
      return runtime.cancelTask(payload.taskId, actor, payload.reason);
    case "task.handoff":
      return runtime.handoffTask({ ...payload, actor });
    case "approval.request":
      return runtime.requestApproval({ ...payload, actor });
    case "approval.decide":
      return runtime.decideApproval({ ...payload, actor });
    case "approval.list":
      return runtime.listApprovals(actor, payload.taskId || null);
    case "memory.propose":
      return runtime.proposeMemory({ ...payload, actor });
    case "memory.review":
      return runtime.reviewMemory({ ...payload, actor });
    case "memory.read":
      return runtime.readMemory({ ...payload, actor });
    case "memory.list-candidates":
      return runtime.listMemoryCandidates(actor);
    case "outbox.prepare":
      return runtime.prepareDelivery({ ...payload, actor });
    case "outbox.get":
      return runtime.getDelivery(payload.deliveryId, actor);
    case "outbox.list":
      return runtime.listOutbox(actor, payload.status ?? null);
    case "outbox.claim":
      return runtime.claimDelivery({ ...payload, actor });
    case "outbox.record-outcome":
      return runtime.recordDeliveryOutcome({ ...payload, actor });
    case "outbox.record-worker-outcome":
      return runtime.recordVerifiedWorkerOutcome({
        ...payload,
        actor
      });
    case "outbox.reconcile-expired":
      return runtime.reconcileExpiredDelivery({ ...payload, actor });
    case "outbox.retry":
      return runtime.retryDelivery({ ...payload, actor });
    case "outbox.cancel":
      return runtime.cancelDelivery({ ...payload, actor });
    case "outbox.resolve-uncertain":
      return runtime.resolveUncertainDelivery({ ...payload, actor });
    case "audit.read":
      return runtime.auditTrail(actor, {
        runId: payload.runId || null
      });
    case "evidence.export":
      return runtime.exportEvidenceBundle(payload.runId, actor);
    default:
      throw new ValidationError(
        `Authenticated runtime command is unsupported: ${command.type}.`
      );
  }
}

export class AuthenticatedRuntimeGateway {
  #runtime;
  #pending;

  constructor(runtime) {
    if (
      !runtime ||
      typeof runtime.executeAuthenticatedCommand !== "function" ||
      typeof runtime.close !== "function"
    ) {
      throw new ValidationError(
        "Authenticated gateway requires an identity-enabled FDOS runtime."
      );
    }
    if (!runtime.status().persistence?.transactional) {
      throw new ValidationError(
        "Authenticated gateway requires transactional persistence."
      );
    }
    this.#runtime = runtime;
    this.#pending = Promise.resolve();
  }

  execute(request) {
    exactRequestShape(request);
    const command = normalizeInvocationCommand(request.command);
    const invocation = immutableJson(request.invocation);
    const operation = this.#pending.then(() =>
      this.#runtime.executeAuthenticatedCommand({
        invocation,
        command,
        executor: (actor) =>
          dispatch(this.#runtime, command, actor)
      })
    );
    this.#pending = operation.catch(() => undefined);
    return operation;
  }

  status() {
    return {
      ...this.#runtime.status(),
      authenticatedInvocationRequired: true
    };
  }

  verifyIntegrity() {
    return this.#runtime.verifyIntegrity();
  }

  close() {
    const operation = this.#pending.then(() => this.#runtime.close());
    this.#pending = operation.catch(() => undefined);
    return operation;
  }
}
