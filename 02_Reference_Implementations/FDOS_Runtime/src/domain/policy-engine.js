import { AuthorizationError, PolicyError } from "../kernel/errors.js";
import { compareRisk } from "./action-catalog.js";
import { verifyActionIntent } from "./action-intent.js";

export class PolicyEngine {
  constructor({ actionCatalog, roleRegistry }) {
    this.actionCatalog = actionCatalog;
    this.roleRegistry = roleRegistry;
  }

  evaluateTaskExecution({ actor, task, approval = null, now = new Date() }) {
    if (actor.type !== "agent") {
      throw new AuthorizationError("Only an active agent may execute a task.");
    }
    if (actor.roleId !== task.ownerRoleId) {
      throw new AuthorizationError(
        `Task ${task.id} belongs to ${task.ownerRoleId}, not ${actor.roleId}.`
      );
    }

    verifyActionIntent(task.actionIntent, this.actionCatalog);
    this.roleRegistry.assertCapability(
      actor.roleId,
      task.actionIntent.capability
    );

    const riskClass = task.actionIntent.riskClass;
    if (compareRisk(riskClass, "A3") >= 0) {
      throw new PolicyError(
        `${riskClass} execution is blocked in the Level 1 runtime.`,
        { taskId: task.id, riskClass }
      );
    }

    if (riskClass === "A2") {
      if (!approval) {
        return { allowed: false, reason: "human_approval_required" };
      }
      if (
        approval.status !== "granted" ||
        approval.taskId !== task.id ||
        approval.intentDigest !== task.actionIntent.digest
      ) {
        throw new PolicyError("Approval does not bind the current action intent.");
      }
      if (
        !Number.isFinite(Date.parse(approval.expiresAt)) ||
        new Date(approval.expiresAt) <= now
      ) {
        throw new PolicyError("Approval has expired.");
      }
      return { allowed: true, consumeApprovalId: approval.id };
    }

    return { allowed: true, consumeApprovalId: null };
  }
}
