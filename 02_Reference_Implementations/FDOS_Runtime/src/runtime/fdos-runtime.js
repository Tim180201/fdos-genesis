import { AsyncLocalStorage } from "node:async_hooks";
import { lstat } from "node:fs/promises";
import path from "node:path";
import {
  canonicalJson,
  digestObject,
  immutableJson,
  jsonClone
} from "../kernel/canonical-json.js";
import {
  AuthorizationError,
  ConflictError,
  IntegrityError,
  NotFoundError,
  PersistenceError,
  PolicyError,
  ValidationError
} from "../kernel/errors.js";
import { EventLog } from "../kernel/event-log.js";
import { assertId, createId } from "../kernel/ids.js";
import { RuntimeDirectoryLease } from "../kernel/runtime-lease.js";
import { SqliteEventStore } from "../kernel/sqlite-event-store.js";
import { verifyReferenceDocumentEvidence } from "../integrations/git-reference-source.js";
import {
  invocationSubject,
  verifyInvocationReceipt
} from "../identity/invocation.js";
import {
  assertPlainObject,
  enumValue,
  requiredString,
  uniqueStrings
} from "../kernel/validation.js";
import {
  ActionCatalog,
  compareRisk,
  SENSITIVITY_CLASSES
} from "../domain/action-catalog.js";
import {
  AgentRegistry,
  PILOT_AGENT_DEFINITIONS
} from "../domain/agent-registry.js";
import {
  createActionIntent,
  verifyActionIntent
} from "../domain/action-intent.js";
import { ConnectorRegistry } from "../domain/connector-contract.js";
import {
  createDeliveryIntent,
  normalizeDeliveryOutcome
} from "../domain/delivery-intent.js";
import {
  PersonalityRegistry,
  PILOT_PERSONALITY_DEFINITIONS
} from "../domain/personality-profile.js";
import { PolicyEngine } from "../domain/policy-engine.js";
import {
  PILOT_ROLE_DEFINITIONS,
  RoleRegistry,
  systemActor
} from "../domain/role-registry.js";
import { WorkflowRegistry } from "../domain/workflow-definition.js";
import { applyRuntimeEvent, createRuntimeState } from "./state.js";

const MAX_INPUT_BYTES = 64 * 1024;
const MAX_RESULT_BYTES = 128 * 1024;
const MAX_MEMORY_BYTES = 32 * 1024;
const MAX_SOURCE_EVIDENCE_BYTES = 32 * 1024;
const CONNECTOR_WORKER_OPERATIONS = new Set([
  "outbox.claim",
  "outbox.record-outcome"
]);
const OUTBOX_STATUSES = Object.freeze([
  "cancelled",
  "claimed",
  "failed",
  "prepared",
  "simulated",
  "uncertain"
]);
const RUNTIME_CONSTRUCTION_TOKEN = Symbol("fdos-runtime-construction");

function byteLengthOfJson(value) {
  return Buffer.byteLength(canonicalJson(value), "utf8");
}

function normalizeActor(
  actor,
  agentRegistry,
  { human = true, agent = true } = {}
) {
  if (!actor || typeof actor !== "object" || Array.isArray(actor)) {
    throw new AuthorizationError("A structured actor identity is required.");
  }
  const hasInvocationId = actor.invocationId !== undefined;
  const hasCorrelationId = actor.correlationId !== undefined;
  if (hasInvocationId !== hasCorrelationId) {
    throw new AuthorizationError(
      "Actor invocation attribution is incomplete."
    );
  }
  const invocationAttribution = hasInvocationId
    ? {
        invocationId: assertId(
          actor.invocationId,
          "actor invocation id"
        ),
        correlationId: assertId(
          actor.correlationId,
          "actor correlation id"
        )
      }
    : {};
  if (actor.type === "human" && human) {
    return immutableJson({
      type: "human",
      id: requiredString(actor.id, "human actor id", {
        max: 120,
        pattern: /^human:[a-zA-Z0-9][a-zA-Z0-9._-]+$/
      }),
      ...invocationAttribution
    });
  }
  if (actor.type === "agent" && agent) {
    return immutableJson({
      ...agentRegistry.resolveActor(actor),
      ...invocationAttribution
    });
  }
  throw new AuthorizationError(`Actor type ${actor.type || "<empty>"} is denied.`);
}

function requireHuman(actor, agentRegistry) {
  return normalizeActor(actor, agentRegistry, { human: true, agent: false });
}

function attributedSystemActor(triggerActor) {
  if (!triggerActor?.invocationId || !triggerActor?.correlationId) {
    return systemActor;
  }
  return immutableJson({
    ...systemActor,
    invocationId: triggerActor.invocationId,
    correlationId: triggerActor.correlationId
  });
}

function assertResultContract(task, result) {
  assertPlainObject(result, "task result");
  if (byteLengthOfJson(result) > MAX_RESULT_BYTES) {
    throw new ValidationError("Task result exceeds the 128 KiB limit.");
  }
  for (const field of task.outputContract.requiredFields) {
    if (
      !Object.hasOwn(result, field) ||
      result[field] === null ||
      result[field] === undefined
    ) {
      throw new ValidationError(
        `Task ${task.id} result is missing required field ${field}.`
      );
    }
  }
}

function activeApproval(approval, now) {
  return (
    ["requested", "granted"].includes(approval.status) &&
    Number.isFinite(Date.parse(approval.expiresAt)) &&
    new Date(approval.expiresAt) > now
  );
}

function taskEvidence(task) {
  return {
    taskId: task.id,
    stepId: task.stepId,
    ownerRoleId: task.ownerRoleId,
    parentTaskId: task.parentTaskId,
    attempt: task.attempt,
    actionIntentDigest: task.actionIntent.digest,
    resultDigest: task.resultDigest
  };
}

function deliveryEvidence(delivery) {
  const outcomeEvidence = delivery.lastOutcome?.evidence || null;
  return {
    deliveryId: delivery.id,
    taskId: delivery.intent.task.id,
    actionIntentDigest: delivery.intent.task.actionIntentDigest,
    connectorId: delivery.intent.connector.id,
    contractVersion: delivery.intent.connector.contractVersion,
    contractDigest: delivery.intent.connector.contractDigest,
    operationId: delivery.intent.operation.id,
    intentDigest: delivery.intent.digest,
    status: delivery.status,
    attempt: delivery.attempt,
    outcomeType: delivery.lastOutcome?.type || null,
    resultDigest:
      outcomeEvidence?.resultDigest ||
      delivery.resolution?.resultDigest ||
      null,
    outcomeEvidenceDigest:
      outcomeEvidence?.evidenceDigest ||
      outcomeEvidence?.messageDigest ||
      null,
    resolutionEvidenceDigest:
      delivery.resolution?.evidenceDigest || null,
    externalEffect: outcomeEvidence?.externalEffect || null
  };
}

function normalizeSourceEvidence(value) {
  if (!Array.isArray(value) || value.length > 10) {
    throw new ValidationError(
      "Memory source evidence must contain at most ten bindings."
    );
  }
  const normalized = value.map((entry) => {
    verifyReferenceDocumentEvidence(entry);
    return jsonClone(entry);
  });
  if (byteLengthOfJson(normalized) > MAX_SOURCE_EVIDENCE_BYTES) {
    throw new ValidationError(
      "Memory source evidence exceeds the 32 KiB limit."
    );
  }
  const digests = normalized.map((entry) => entry.evidenceDigest);
  if (new Set(digests).size !== digests.length) {
    throw new ValidationError("Memory source evidence contains duplicates.");
  }
  return normalized;
}

function recordableCommandFailure(error) {
  return (
    error instanceof ValidationError ||
    error instanceof AuthorizationError ||
    error instanceof ConflictError ||
    error instanceof NotFoundError ||
    error instanceof PolicyError
  );
}

function commandFailureEvidence(error, receipt, failedAt) {
  return {
    invocationId: receipt.invocationId,
    operation: receipt.operation,
    commandDigest: receipt.commandDigest,
    errorCode: requiredString(error.code, "command failure code", {
      max: 64,
      pattern: /^[A-Z][A-Z0-9_]{2,63}$/
    }),
    errorType: requiredString(error.name, "command failure type", {
      max: 80,
      pattern: /^[A-Z][a-zA-Z0-9]{2,79}$/
    }),
    messageDigest: digestObject({
      message: String(error.message || "command failed")
    }),
    failedAt
  };
}

async function fileHasBytes(directory, fileName) {
  const filePath = path.join(path.resolve(directory), fileName);
  try {
    const fileStat = await lstat(filePath);
    if (fileStat.isSymbolicLink() || !fileStat.isFile()) {
      throw new IntegrityError(
        `Runtime persistence path is not a regular file: ${fileName}.`
      );
    }
    return fileStat.size > 0;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

async function selectPersistence(directory, requested) {
  const persistence = requiredString(
    requested,
    "runtime persistence",
    {
      max: 16,
      pattern: /^(auto|jsonl|sqlite)$/
    }
  );
  const [hasJsonl, hasSqlite] = await Promise.all([
    fileHasBytes(directory, "events.jsonl"),
    fileHasBytes(directory, "events.sqlite")
  ]);
  if (hasJsonl && hasSqlite) {
    throw new ConflictError(
      "Runtime directory contains two non-empty persistence formats."
    );
  }
  if (persistence === "auto") {
    return hasSqlite ? "sqlite" : "jsonl";
  }
  if (
    (persistence === "sqlite" && hasJsonl) ||
    (persistence === "jsonl" && hasSqlite)
  ) {
    throw new ConflictError(
      "Explicit migration is required before changing persistence format."
    );
  }
  return persistence;
}

export function verifyEvidenceBundle(bundle) {
  assertPlainObject(bundle, "evidence bundle");
  const unsigned = jsonClone(bundle);
  const digest = unsigned.bundleDigest;
  delete unsigned.bundleDigest;
  if (digestObject(unsigned) !== digest) {
    throw new IntegrityError("Evidence-bundle digest mismatch.");
  }
  return true;
}

export class FdosRuntime {
  #eventLog;
  #clock;
  #idFactory;
  #actionCatalog;
  #roleRegistry;
  #personalityRegistry;
  #agentRegistry;
  #connectorRegistry;
  #workflowRegistry;
  #policy;
  #state;
  #mutations;
  #mutationContext;
  #runtimeLease;
  #leaseOwnership;
  #invocationVerifier;
  #closed;

  static async open({
    directory,
    clock = () => new Date(),
    idFactory = createId,
    roleDefinitions = PILOT_ROLE_DEFINITIONS,
    personalityDefinitions = PILOT_PERSONALITY_DEFINITIONS,
    agentDefinitions = PILOT_AGENT_DEFINITIONS,
    actionDefinitions = [],
    connectorContractDefinitions = [],
    connectorInstanceDefinitions = [],
    workflowDefinitions = [],
    runtimeLeaseOptions = {},
    invocationVerifier = null,
    persistence = "jsonl"
  }) {
    const actionCatalog = new ActionCatalog(actionDefinitions);
    const roleRegistry = new RoleRegistry(roleDefinitions);
    const personalityRegistry = new PersonalityRegistry(
      personalityDefinitions
    );
    const agentRegistry = new AgentRegistry({
      roleRegistry,
      personalityRegistry,
      definitions: agentDefinitions
    });
    const connectorRegistry = new ConnectorRegistry({
      actionCatalog,
      contractDefinitions: connectorContractDefinitions,
      instanceDefinitions: connectorInstanceDefinitions
    });
    const workflowRegistry = new WorkflowRegistry({
      actionCatalog,
      roleRegistry,
      definitions: workflowDefinitions
    });
    const runtimeLease = new RuntimeDirectoryLease(
      directory,
      runtimeLeaseOptions
    );
    const leaseOwnership = await runtimeLease.acquire();
    let eventLog = null;
    try {
      const selectedPersistence = await selectPersistence(
        directory,
        persistence
      );
      eventLog =
        selectedPersistence === "sqlite"
          ? await SqliteEventStore.open({
              directory,
              clock,
              idFactory
            })
          : await EventLog.open({
              directory,
              clock,
              idFactory
            });
      const runtime = new FdosRuntime({
        constructionToken: RUNTIME_CONSTRUCTION_TOKEN,
        eventLog,
        clock,
        idFactory,
        actionCatalog,
        roleRegistry,
        personalityRegistry,
        agentRegistry,
        connectorRegistry,
        workflowRegistry,
        runtimeLease,
        leaseOwnership,
        invocationVerifier
      });
      runtime.rehydrate();
      return runtime;
    } catch (error) {
      await eventLog?.close().catch(() => {});
      await runtimeLease.release(leaseOwnership.id).catch(() => {});
      throw error;
    }
  }

  constructor({
    constructionToken,
    eventLog,
    clock,
    idFactory,
    actionCatalog,
    roleRegistry,
    personalityRegistry,
    agentRegistry,
    connectorRegistry,
    workflowRegistry,
    runtimeLease,
    leaseOwnership,
    invocationVerifier
  }) {
    if (constructionToken !== RUNTIME_CONSTRUCTION_TOKEN) {
      throw new AuthorizationError(
        "Use FdosRuntime.open() to construct a governed runtime."
      );
    }
    this.#eventLog = eventLog;
    this.#clock = clock;
    this.#idFactory = idFactory;
    this.#actionCatalog = actionCatalog;
    this.#roleRegistry = roleRegistry;
    this.#personalityRegistry = personalityRegistry;
    this.#agentRegistry = agentRegistry;
    this.#connectorRegistry = connectorRegistry;
    this.#workflowRegistry = workflowRegistry;
    this.#policy = new PolicyEngine({ actionCatalog, roleRegistry });
    this.#state = createRuntimeState();
    this.#mutations = Promise.resolve();
    this.#mutationContext = new AsyncLocalStorage();
    this.#runtimeLease = runtimeLease;
    this.#leaseOwnership = leaseOwnership;
    if (
      invocationVerifier !== null &&
      typeof invocationVerifier?.verify !== "function"
    ) {
      throw new ValidationError(
        "Runtime invocation verifier must expose verify()."
      );
    }
    this.#invocationVerifier = invocationVerifier;
    this.#closed = false;
  }

  rehydrate() {
    this.#state = createRuntimeState();
    for (const event of this.#eventLog.all()) {
      applyRuntimeEvent(this.#state, event);
    }
  }

  registerWorkflow(definition, actor) {
    this.assertOpen();
    requireHuman(actor, this.#agentRegistry);
    return this.#workflowRegistry.register(definition);
  }

  listWorkflowDefinitions() {
    return this.#workflowRegistry.list();
  }

  listRoleDefinitions() {
    return this.#roleRegistry.list();
  }

  listPersonalityProfiles() {
    return this.#personalityRegistry.list();
  }

  listAgentInstances() {
    return this.#agentRegistry.list();
  }

  getAgentOperatingProfile(actor) {
    this.assertOpen();
    const normalizedActor = normalizeActor(actor, this.#agentRegistry, {
      human: false,
      agent: true
    });
    this.assertAuthenticatedOperation(normalizedActor, "agent.profile");
    return this.#agentRegistry.getOperatingProfile(normalizedActor.id);
  }

  listConnectorContracts() {
    return this.#connectorRegistry.listContracts();
  }

  listConnectorInstances() {
    return this.#connectorRegistry.listInstances();
  }

  async mutate(operation) {
    if (this.#mutationContext.getStore() === this) {
      this.assertOpen();
      return operation();
    }
    const result = this.#mutations.then(() =>
      this.#mutationContext.run(this, () => {
        this.assertOpen();
        return operation();
      })
    );
    this.#mutations = result.catch(() => undefined);
    return result;
  }

  assertOpen() {
    if (this.#closed) {
      throw new ConflictError("FDOS runtime is closed.");
    }
  }

  async close() {
    const result = this.#mutations.then(async () => {
      if (this.#closed) return false;
      await this.#eventLog.close();
      this.#closed = true;
      const released = await this.#runtimeLease.release(
        this.#leaseOwnership.id
      );
      if (!released) {
        throw new IntegrityError(
          "FDOS runtime could not release its exact process lease."
        );
      }
      return true;
    });
    this.#mutations = result.catch(() => undefined);
    return result;
  }

  now() {
    const value = this.#clock();
    if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
      throw new ValidationError("Runtime clock returned an invalid date.");
    }
    return value;
  }

  async append(type, actor, subject, payload) {
    const event = await this.#eventLog.append({
      type,
      actor,
      subject,
      payload
    });
    applyRuntimeEvent(this.#state, event);
    return event;
  }

  async acceptAuthenticatedInvocation({ invocation, command }) {
    return this.mutate(async () => {
      if (!this.#invocationVerifier) {
        throw new PolicyError(
          "Authenticated invocation verification is not configured."
        );
      }
      if (
        this.#eventLog.status().transactional &&
        !this.#eventLog.inTransaction()
      ) {
        throw new PolicyError(
          "Authenticated invocation must enter a persistence transaction."
        );
      }
      const receipt = this.#invocationVerifier.verify(invocation, {
        command
      });
      verifyInvocationReceipt(receipt);
      if (
        receipt.principal.type === "connector" &&
        !CONNECTOR_WORKER_OPERATIONS.has(command.type)
      ) {
        throw new AuthorizationError(
          `Connector principals cannot invoke ${command.type}.`
        );
      }
      if (this.#state.acceptedInvocations.has(receipt.invocationId)) {
        throw new ConflictError(
          `Invocation ${receipt.invocationId} was already consumed.`
        );
      }
      const actorSource = {
        ...receipt.principal,
        invocationId: receipt.invocationId,
        correlationId: receipt.correlationId
      };
      const actor =
        receipt.principal.type === "connector"
          ? immutableJson({
              ...this.#connectorRegistry.resolveActor(receipt.principal),
              invocationId: receipt.invocationId,
              correlationId: receipt.correlationId
            })
          : normalizeActor(actorSource, this.#agentRegistry);
      const acceptedAt = receipt.verifiedAt;
      await this.append(
        "identity.invocation.accepted",
        actor,
        invocationSubject(command, receipt.invocationId),
        {
          receipt,
          acceptedAt
        }
      );
      return immutableJson({ actor, receipt });
    });
  }

  assertAuthenticatedOperation(actor, operation) {
    if (
      !this.#eventLog.status().transactional ||
      !this.#eventLog.inTransaction()
    ) {
      throw new PolicyError(
        "Guarded runtime commands require an authenticated transaction."
      );
    }
    if (!actor?.invocationId || !actor?.correlationId) {
      throw new AuthorizationError(
        "Guarded runtime commands require Invocation attribution."
      );
    }
    const accepted = this.#state.acceptedInvocations.get(
      actor.invocationId
    );
    if (
      !accepted ||
      accepted.operation !== operation ||
      accepted.correlationId !== actor.correlationId ||
      accepted.principal.type !== actor.type ||
      accepted.principal.id !== actor.id
    ) {
      throw new AuthorizationError(
        "Guarded runtime command attribution is invalid."
      );
    }
    return accepted;
  }

  authenticatedConnectorActor(actor, operation) {
    const connector = this.#connectorRegistry.resolveActor(actor);
    const normalized = immutableJson({
      ...connector,
      invocationId: assertId(
        actor?.invocationId,
        "connector actor invocation id"
      ),
      correlationId: assertId(
        actor?.correlationId,
        "connector actor correlation id"
      )
    });
    this.assertAuthenticatedOperation(normalized, operation);
    return normalized;
  }

  assertCurrentConnectorBinding(delivery) {
    const resolved = this.#connectorRegistry.resolveOperation(
      delivery.intent.connector.id,
      delivery.intent.operation.id
    );
    if (
      resolved.contract.digest !==
        delivery.intent.connector.contractDigest ||
      resolved.operation.digest !== delivery.intent.operation.digest
    ) {
      throw new PolicyError(
        `Delivery ${delivery.id} has a stale connector contract binding.`
      );
    }
    const normalizedParameters =
      this.#connectorRegistry.normalizeParameters(
        resolved.operation,
        delivery.intent.parameters
      );
    if (
      digestObject(normalizedParameters) !==
      delivery.intent.parametersDigest
    ) {
      throw new IntegrityError(
        `Delivery ${delivery.id} parameters violate the current contract.`
      );
    }
    return resolved;
  }

  assertDeliveryTaskActive(delivery) {
    const task = this.findTask(delivery.intent.task.id);
    const run = this.findRun(task.runId);
    if (
      run.status !== "active" ||
      task.status !== "in_progress" ||
      task.claimedBy !== delivery.intent.requestedBy ||
      task.attempt !== delivery.intent.task.attempt ||
      task.actionIntent.digest !==
        delivery.intent.task.actionIntentDigest
    ) {
      throw new PolicyError(
        `Delivery ${delivery.id} source task is no longer active.`
      );
    }
    return task;
  }

  async executeAuthenticatedCommand({
    invocation,
    command,
    executor
  }) {
    if (typeof executor !== "function") {
      throw new ValidationError(
        "Authenticated command requires an executor."
      );
    }
    let result;
    let commandError = null;
    await this.mutate(async () => {
      const persistence = this.#eventLog.status();
      if (
        !persistence.transactional ||
        typeof this.#eventLog.transaction !== "function"
      ) {
        throw new PolicyError(
          "Authenticated commands require transactional persistence."
        );
      }
      try {
        await this.#eventLog.transaction(async (transaction) => {
          const accepted = await this.acceptAuthenticatedInvocation({
            invocation,
            command
          });
          const outcome = await transaction.savepoint(async () => {
            try {
              return {
                succeeded: true,
                value: await executor(accepted.actor)
              };
            } catch (error) {
              if (
                error instanceof IntegrityError ||
                error instanceof PersistenceError ||
                !recordableCommandFailure(error)
              ) {
                throw error;
              }
              return {
                succeeded: false,
                error
              };
            }
          });
          if (outcome.succeeded) {
            result = outcome.value;
          } else {
            commandError = outcome.error;
            const failedAt = this.now().toISOString();
            await this.append(
              "identity.invocation.execution-failed",
              accepted.actor,
              invocationSubject(command, accepted.receipt.invocationId),
              commandFailureEvidence(
                commandError,
                accepted.receipt,
                failedAt
              )
            );
          }
        });
      } catch (error) {
        this.rehydrate();
        throw error;
      }
    });
    if (commandError) throw commandError;
    return result;
  }

  findRun(runId) {
    const run = this.#state.runs.get(runId);
    if (!run) throw new NotFoundError(`Unknown workflow run: ${runId}.`);
    return run;
  }

  findTask(taskId) {
    const task = this.#state.tasks.get(taskId);
    if (!task) throw new NotFoundError(`Unknown task: ${taskId}.`);
    return task;
  }

  findApproval(approvalId) {
    const approval = this.#state.approvals.get(approvalId);
    if (!approval) throw new NotFoundError(`Unknown approval: ${approvalId}.`);
    return approval;
  }

  findDelivery(deliveryId) {
    const normalizedId = assertId(deliveryId, "connector delivery id");
    const delivery = this.#state.outbox.get(normalizedId);
    if (!delivery) {
      throw new NotFoundError(`Unknown connector delivery: ${normalizedId}.`);
    }
    return delivery;
  }

  async startWorkflow({
    actor,
    workflowId,
    version,
    objective,
    input = {},
    idempotencyKey
  }) {
    return this.mutate(async () => {
      const normalizedActor = normalizeActor(actor, this.#agentRegistry);
      const definition = this.#workflowRegistry.get(workflowId, version);
      if (normalizedActor.type === "agent") {
        this.#roleRegistry.assertCapability(
          normalizedActor.roleId,
          "workflow:start"
        );
        if (normalizedActor.roleId !== definition.ownerRoleId) {
          throw new AuthorizationError(
            `${normalizedActor.id} does not hold the owner role for workflow ${definition.id}.`
          );
        }
      }

      const normalizedObjective = requiredString(
        objective,
        "workflow objective",
        { max: 4_000 }
      );
      const normalizedInput = jsonClone(
        assertPlainObject(input, "workflow input")
      );
      if (byteLengthOfJson(normalizedInput) > MAX_INPUT_BYTES) {
        throw new ValidationError("Workflow input exceeds the 64 KiB limit.");
      }
      for (const step of definition.steps) {
        if (compareRisk(step.action.riskClass, "A3") >= 0) {
          throw new PolicyError(
            `Workflow ${definition.id} contains blocked ${step.action.riskClass} step ${step.id}.`
          );
        }
      }

      const requestDigest = digestObject({
        objective: normalizedObjective,
        input: normalizedInput
      });
      let idempotencyDigest = null;
      if (idempotencyKey !== undefined) {
        const normalizedKey = requiredString(
          idempotencyKey,
          "workflow idempotency key",
          { max: 200 }
        );
        idempotencyDigest = digestObject({
          workflowId: definition.id,
          workflowVersion: definition.version,
          requestedBy: normalizedActor.id,
          key: normalizedKey
        });
        const existing = [...this.#state.runs.values()].find(
          (run) => run.idempotencyDigest === idempotencyDigest
        );
        if (existing) {
          if (existing.requestDigest !== requestDigest) {
            throw new ConflictError(
              "Idempotency key was already used with another request."
            );
          }
          return {
            created: false,
            run: this.viewRun(existing.id, normalizedActor)
          };
        }
      }

      const runId = this.#idFactory("run");
      const createdAt = this.now().toISOString();
      const inputDigest = digestObject(normalizedInput);
      const taskIdByStep = new Map(
        definition.steps.map((step) => [step.id, this.#idFactory("task")])
      );
      const tasks = definition.steps.map((step) => {
        const taskId = taskIdByStep.get(step.id);
        const dependencies = step.dependencies.map((dependency) =>
          taskIdByStep.get(dependency)
        );
        const actionIntent = createActionIntent({
          catalog: this.#actionCatalog,
          actionType: step.action.actionType,
          target: step.action.target,
          parameters: {
            workflowDefinitionDigest: definition.digest,
            workflowInputDigest: inputDigest,
            workflowStepId: step.id,
            stepParameters: step.action.parameters
          },
          declaredRiskClass: step.action.riskClass,
          sensitivity: step.action.sensitivity
        });
        this.#roleRegistry.assertCapability(
          step.roleId,
          actionIntent.capability
        );
        return {
          id: taskId,
          runId,
          stepId: step.id,
          title: step.title,
          instructions: step.instructions,
          desiredOutcome: step.desiredOutcome,
          ownerRoleId: step.roleId,
          createdBy: normalizedActor.id,
          dependencies,
          parentTaskId: null,
          rootTaskId: taskId,
          childTaskIds: [],
          handoffDepth: 0,
          handoffContext: null,
          status: dependencies.length ? "blocked" : "ready",
          waitingReason: dependencies.length
            ? "workflow_dependencies"
            : null,
          actionIntent,
          outputContract: jsonClone(step.output),
          attempt: 1,
          maxAttempts: 2,
          claimedBy: null,
          claimedAt: null,
          result: null,
          resultDigest: null,
          failure: null,
          createdAt,
          updatedAt: createdAt,
          completedAt: null
        };
      });
      const run = {
        id: runId,
        workflowDefinitionId: definition.id,
        workflowDefinitionVersion: definition.version,
        workflowDefinitionDigest: definition.digest,
        definitionSnapshot: definition,
        objective: normalizedObjective,
        input: normalizedInput,
        inputDigest,
        requestDigest,
        idempotencyDigest,
        requestedBy: normalizedActor.id,
        ownerRoleId: definition.ownerRoleId,
        status: "active",
        taskIds: tasks.map((task) => task.id),
        handoffCount: 0,
        evidenceDigest: null,
        evidenceBaseHeadHash: null,
        createdAt,
        updatedAt: createdAt,
        completedAt: null
      };

      await this.append(
        "workflow.run.started",
        normalizedActor,
        runId,
        { run, tasks }
      );
      return {
        created: true,
        run: this.viewRun(runId, normalizedActor)
      };
    });
  }

  listReadyTasks(actor) {
    this.assertOpen();
    const normalizedActor = normalizeActor(actor, this.#agentRegistry, {
      human: false,
      agent: true
    });
    return [...this.#state.tasks.values()]
      .filter(
        (task) =>
          task.ownerRoleId === normalizedActor.roleId && task.status === "ready"
      )
      .map(jsonClone);
  }

  getTask(taskId, actor) {
    this.assertOpen();
    const normalizedActor = normalizeActor(actor, this.#agentRegistry);
    const task = this.findTask(taskId);
    this.#roleRegistry.assertTaskRead(normalizedActor, task);
    return jsonClone(task);
  }

  getTaskContext(taskId, actor) {
    this.assertOpen();
    const normalizedActor = normalizeActor(actor, this.#agentRegistry);
    const task = this.findTask(taskId);
    this.#roleRegistry.assertTaskRead(normalizedActor, task);
    const run = this.findRun(task.runId);
    const dependencyResults = task.dependencies.map((dependencyId) => {
      const dependency = this.findTask(dependencyId);
      return {
        taskId: dependency.id,
        stepId: dependency.stepId,
        ownerRoleId: dependency.ownerRoleId,
        result: dependency.status === "completed" ? jsonClone(dependency.result) : null,
        resultDigest: dependency.resultDigest
      };
    });
    const handoffResults = task.childTaskIds.map((childId) => {
      const child = this.findTask(childId);
      return {
        taskId: child.id,
        ownerRoleId: child.ownerRoleId,
        result: child.status === "completed" ? jsonClone(child.result) : null,
        resultDigest: child.resultDigest
      };
    });
    return {
      run: {
        id: run.id,
        objective: run.objective,
        input: jsonClone(run.input),
        inputDigest: run.inputDigest
      },
      task: jsonClone(task),
      dependencyResults,
      handoffResults
    };
  }

  viewRun(runId, actor) {
    this.assertOpen();
    const normalizedActor = normalizeActor(actor, this.#agentRegistry);
    const run = this.findRun(runId);
    const mayReadAll =
      normalizedActor.type === "human" ||
      (normalizedActor.type === "agent" &&
        this.#roleRegistry.hasCapability(
          normalizedActor.roleId,
          "task:read:any"
        ));
    const tasks = run.taskIds.map((taskId) => {
      const task = this.findTask(taskId);
      if (mayReadAll || task.ownerRoleId === normalizedActor.roleId) {
        return jsonClone(task);
      }
      return {
        id: task.id,
        runId: task.runId,
        stepId: task.stepId,
        ownerRoleId: task.ownerRoleId,
        status: task.status,
        resultDigest: task.resultDigest
      };
    });
    const visibleRun = jsonClone(run);
    if (!mayReadAll && normalizedActor.roleId !== run.ownerRoleId) {
      delete visibleRun.input;
      visibleRun.inputRedacted = true;
    }
    visibleRun.tasks = tasks;
    return visibleRun;
  }

  async claimTask(taskId, actor) {
    return this.mutate(async () => {
      const normalizedActor = normalizeActor(actor, this.#agentRegistry, {
        human: false,
        agent: true
      });
      const task = this.findTask(taskId);
      const run = this.findRun(task.runId);
      if (run.status !== "active") {
        throw new ConflictError(
          `Run ${run.id} cannot execute tasks while ${run.status}.`
        );
      }
      if (task.status !== "ready") {
        throw new ConflictError(
          `Task ${task.id} cannot be claimed from ${task.status}.`
        );
      }
      if (
        task.dependencies.some(
          (dependencyId) =>
            this.findTask(dependencyId).status !== "completed"
        )
      ) {
        throw new ConflictError(`Task ${task.id} has incomplete dependencies.`);
      }
      if (
        task.childTaskIds.some(
          (childId) => this.findTask(childId).status !== "completed"
        )
      ) {
        throw new ConflictError(`Task ${task.id} has incomplete handoffs.`);
      }

      const now = this.now();
      const approval = [...this.#state.approvals.values()]
        .filter(
          (candidate) =>
            candidate.taskId === task.id &&
            candidate.taskAttempt === task.attempt &&
            candidate.intentDigest === task.actionIntent.digest &&
            candidate.status === "granted" &&
            new Date(candidate.expiresAt) > now
        )
        .sort((left, right) =>
          String(right.decidedAt).localeCompare(String(left.decidedAt))
        )[0];
      const decision = this.#policy.evaluateTaskExecution({
        actor: normalizedActor,
        task,
        approval,
        now
      });
      if (!decision.allowed) {
        throw new PolicyError("Exact human approval is required.", {
          taskId: task.id,
          reason: decision.reason
        });
      }
      const claimedAt = now.toISOString();
      if (decision.consumeApprovalId) {
        await this.append(
          "approval.consumed",
          normalizedActor,
          task.id,
          {
            approvalId: decision.consumeApprovalId,
            taskId: task.id,
            intentDigest: task.actionIntent.digest,
            consumedAt: claimedAt
          }
        );
      }
      await this.append("task.claimed", normalizedActor, task.id, {
        taskId: task.id,
        claimedBy: normalizedActor.id,
        attempt: task.attempt,
        actionIntentDigest: task.actionIntent.digest,
        claimedAt
      });
      return jsonClone(this.findTask(task.id));
    });
  }

  async completeTask(taskId, actor, result) {
    return this.mutate(async () => {
      const normalizedActor = normalizeActor(actor, this.#agentRegistry, {
        human: false,
        agent: true
      });
      const task = this.findTask(taskId);
      const run = this.findRun(task.runId);
      if (run.status !== "active") {
        throw new ConflictError(
          `Run ${run.id} cannot complete tasks while ${run.status}.`
        );
      }
      if (
        task.status !== "in_progress" ||
        task.claimedBy !== normalizedActor.id
      ) {
        throw new ConflictError(
          `Task ${task.id} is not claimed by ${normalizedActor.id}.`
        );
      }
      verifyActionIntent(task.actionIntent, this.#actionCatalog);
      if (this.#connectorRegistry.hasActionType(task.actionIntent.actionType)) {
        const deliveries = [...this.#state.outbox.values()].filter(
          (delivery) =>
            delivery.intent.task.id === task.id &&
            delivery.intent.task.attempt === task.attempt &&
            delivery.intent.task.actionIntentDigest ===
              task.actionIntent.digest
        );
        if (deliveries.length !== 1) {
          throw new PolicyError(
            `Contracted connector task ${task.id} requires one exact delivery.`
          );
        }
        if (
          deliveries[0].status !== "simulated" ||
          deliveries[0].intent.requestedBy !== normalizedActor.id
        ) {
          throw new PolicyError(
            `Contracted connector task ${task.id} has no completed dry-run delivery.`
          );
        }
      }
      assertResultContract(task, result);
      const normalizedResult = jsonClone(result);
      const completedAt = this.now().toISOString();
      await this.append("task.completed", normalizedActor, task.id, {
        taskId: task.id,
        attempt: task.attempt,
        actionIntentDigest: task.actionIntent.digest,
        result: normalizedResult,
        resultDigest: digestObject(normalizedResult),
        completedAt
      });

      await this.releaseHandoffParents(task.runId, normalizedActor);
      await this.releaseWorkflowDependencies(task.runId, normalizedActor);
      await this.finalizeRunIfComplete(task.runId, normalizedActor);
      return jsonClone(this.findTask(task.id));
    });
  }

  async releaseHandoffParents(runId, triggerActor = systemActor) {
    const parents = [...this.#state.tasks.values()].filter(
      (task) =>
        task.runId === runId &&
        task.status === "waiting_handoff" &&
        task.childTaskIds.length > 0 &&
        task.childTaskIds.every(
          (childId) => this.findTask(childId).status === "completed"
        )
    );
    for (const parent of parents) {
      const returnedAt = this.now().toISOString();
      await this.append(
        "task.handoff.returned",
        attributedSystemActor(triggerActor),
        parent.id,
        {
          parentTaskId: parent.id,
          childTaskIds: [...parent.childTaskIds],
          returnedAt
        }
      );
    }
  }

  async releaseWorkflowDependencies(runId, triggerActor = systemActor) {
    const run = this.findRun(runId);
    const ready = run.taskIds
      .map((taskId) => this.findTask(taskId))
      .filter(
        (task) =>
          task.status === "blocked" &&
          task.dependencies.every(
            (dependencyId) =>
              this.findTask(dependencyId).status === "completed"
          )
      );
    for (const task of ready) {
      const readyAt = this.now().toISOString();
      await this.append(
        "task.ready",
        attributedSystemActor(triggerActor),
        task.id,
        {
          taskId: task.id,
          reason: "dependencies_completed",
          readyAt
        }
      );
    }
  }

  async finalizeRunIfComplete(runId, triggerActor = systemActor) {
    const run = this.findRun(runId);
    if (run.status === "completed") return;
    const tasks = run.taskIds.map((taskId) => this.findTask(taskId));
    if (!tasks.every((task) => task.status === "completed")) return;
    const completedAt = this.now().toISOString();
    const evidenceBaseHeadHash = this.#eventLog.lastHash();
    const deliveries = [...this.#state.outbox.values()]
      .filter((delivery) => delivery.intent.task.runId === run.id)
      .map(deliveryEvidence)
      .sort((left, right) =>
        left.deliveryId.localeCompare(right.deliveryId)
      );
    const evidenceDigest = digestObject({
      schemaVersion: "1.0",
      runId: run.id,
      workflowDefinitionDigest: run.workflowDefinitionDigest,
      inputDigest: run.inputDigest,
      tasks: tasks.map(taskEvidence).sort((left, right) =>
        left.taskId.localeCompare(right.taskId)
      ),
      deliveries,
      evidenceBaseHeadHash
    });
    await this.append(
      "workflow.run.completed",
      attributedSystemActor(triggerActor),
      run.id,
      {
        runId: run.id,
        evidenceDigest,
        evidenceBaseHeadHash,
        completedAt
      }
    );
  }

  async failTask(taskId, actor, { reason, retryable = true }) {
    return this.mutate(async () => {
      const normalizedActor = normalizeActor(actor, this.#agentRegistry, {
        human: false,
        agent: true
      });
      const task = this.findTask(taskId);
      if (
        task.status !== "in_progress" ||
        task.claimedBy !== normalizedActor.id
      ) {
        throw new ConflictError(
          `Task ${task.id} is not claimed by ${normalizedActor.id}.`
        );
      }
      const failedAt = this.now().toISOString();
      await this.append("task.failed", normalizedActor, task.id, {
        taskId: task.id,
        attempt: task.attempt,
        reason: requiredString(reason, "task failure reason", { max: 2_000 }),
        retryable: Boolean(retryable),
        failedAt
      });
      return jsonClone(this.findTask(task.id));
    });
  }

  async retryTask(taskId, actor) {
    return this.mutate(async () => {
      const human = requireHuman(actor, this.#agentRegistry);
      const task = this.findTask(taskId);
      if (task.status !== "failed" || !task.failure?.retryable) {
        throw new ConflictError(`Task ${task.id} is not retryable.`);
      }
      const activeDelivery = [...this.#state.outbox.values()].find(
        (delivery) =>
          delivery.intent.task.id === task.id &&
          delivery.intent.task.attempt === task.attempt &&
          ["claimed", "prepared", "uncertain"].includes(delivery.status)
      );
      if (activeDelivery) {
        throw new PolicyError(
          `Resolve or cancel delivery ${activeDelivery.id} before retrying task ${task.id}.`
        );
      }
      if (task.attempt >= task.maxAttempts) {
        throw new PolicyError(`Task ${task.id} exhausted its retry budget.`);
      }
      const authorizedAt = this.now().toISOString();
      await this.append("task.retry.authorized", human, task.id, {
        taskId: task.id,
        previousAttempt: task.attempt,
        attempt: task.attempt + 1,
        authorizedAt
      });
      return jsonClone(this.findTask(task.id));
    });
  }

  async cancelTask(taskId, actor, reason) {
    return this.mutate(async () => {
      const human = requireHuman(actor, this.#agentRegistry);
      const task = this.findTask(taskId);
      if (["completed", "cancelled"].includes(task.status)) {
        throw new ConflictError(`Task ${task.id} cannot be cancelled.`);
      }
      const activeDelivery = [...this.#state.outbox.values()].find(
        (delivery) =>
          delivery.intent.task.id === task.id &&
          delivery.intent.task.attempt === task.attempt &&
          ["claimed", "prepared", "uncertain"].includes(delivery.status)
      );
      if (activeDelivery) {
        throw new PolicyError(
          `Resolve or cancel delivery ${activeDelivery.id} before cancelling task ${task.id}.`
        );
      }
      const cancelledAt = this.now().toISOString();
      await this.append("task.cancelled", human, task.id, {
        taskId: task.id,
        reason: requiredString(reason, "cancellation reason", { max: 2_000 }),
        cancelledAt
      });
      return jsonClone(this.findTask(task.id));
    });
  }

  async handoffTask({
    taskId,
    actor,
    targetRoleId,
    title,
    context,
    desiredOutcome,
    actionType = "specialist.analysis",
    target = "internal:handoff",
    parameters = {},
    riskClass,
    sensitivity = "internal",
    requiredOutputFields = []
  }) {
    return this.mutate(async () => {
      const normalizedActor = normalizeActor(actor, this.#agentRegistry, {
        human: false,
        agent: true
      });
      const parent = this.findTask(taskId);
      if (
        parent.status !== "in_progress" ||
        parent.claimedBy !== normalizedActor.id
      ) {
        throw new ConflictError(
          `Task ${parent.id} is not claimed by ${normalizedActor.id}.`
        );
      }
      this.#roleRegistry.assertCapability(
        normalizedActor.roleId,
        "task:delegate"
      );
      this.#roleRegistry.get(targetRoleId);
      const run = this.findRun(parent.runId);
      if (run.status !== "active") {
        throw new ConflictError(
          `Run ${run.id} cannot delegate tasks while ${run.status}.`
        );
      }
      const definition = run.definitionSnapshot;
      if (run.handoffCount >= definition.maxHandoffsPerRun) {
        throw new PolicyError(`Run ${run.id} exhausted its handoff budget.`);
      }
      const handoffDepth = parent.handoffDepth + 1;
      if (handoffDepth > definition.maxHandoffDepth) {
        throw new PolicyError(`Task ${parent.id} exceeds handoff depth.`);
      }
      const normalizedContext = requiredString(context, "handoff context", {
        max: 8_000
      });
      const childId = this.#idFactory("task");
      const actionIntent = createActionIntent({
        catalog: this.#actionCatalog,
        actionType,
        target,
        parameters: {
          parentTaskId: parent.id,
          contextDigest: digestObject(normalizedContext),
          delegatedParameters: assertPlainObject(
            parameters,
            "handoff parameters"
          )
        },
        declaredRiskClass: riskClass,
        sensitivity
      });
      if (compareRisk(actionIntent.riskClass, "A3") >= 0) {
        throw new PolicyError("A3/A4 handoffs are blocked.");
      }
      this.#roleRegistry.assertCapability(
        targetRoleId,
        actionIntent.capability
      );
      const createdAt = this.now().toISOString();
      const childTask = {
        id: childId,
        runId: parent.runId,
        stepId: `handoff-${run.handoffCount + 1}`,
        title: requiredString(title, "handoff title", { max: 200 }),
        instructions: normalizedContext,
        desiredOutcome: requiredString(
          desiredOutcome,
          "handoff desired outcome",
          { max: 1_000 }
        ),
        ownerRoleId: targetRoleId,
        createdBy: normalizedActor.id,
        dependencies: [],
        parentTaskId: parent.id,
        rootTaskId: parent.rootTaskId,
        childTaskIds: [],
        handoffDepth,
        handoffContext: normalizedContext,
        status: "ready",
        waitingReason: null,
        actionIntent,
        outputContract: {
          requiredFields: uniqueStrings(
            requiredOutputFields,
            "handoff required output fields",
            {
              maximum: 32,
              pattern: /^[a-z][a-zA-Z0-9]{0,63}$/
            }
          ).sort()
        },
        attempt: 1,
        maxAttempts: 2,
        claimedBy: null,
        claimedAt: null,
        result: null,
        resultDigest: null,
        failure: null,
        createdAt,
        updatedAt: createdAt,
        completedAt: null
      };
      await this.append(
        "task.handoff.created",
        normalizedActor,
        parent.id,
        {
          parentTaskId: parent.id,
          childTask,
          createdAt
        }
      );
      return jsonClone(childTask);
    });
  }

  async requestApproval({
    taskId,
    actor,
    reason,
    ttlMinutes = 30
  }) {
    return this.mutate(async () => {
      const normalizedActor = normalizeActor(actor, this.#agentRegistry);
      const task = this.findTask(taskId);
      const run = this.findRun(task.runId);
      if (run.status !== "active") {
        throw new ConflictError(
          `Run ${run.id} cannot request approvals while ${run.status}.`
        );
      }
      if (
        normalizedActor.type === "agent" &&
        normalizedActor.roleId !== task.ownerRoleId
      ) {
        throw new AuthorizationError(
          `${normalizedActor.id} cannot request approval for ${task.id}.`
        );
      }
      verifyActionIntent(task.actionIntent, this.#actionCatalog);
      if (task.actionIntent.riskClass !== "A2") {
        throw new PolicyError(
          compareRisk(task.actionIntent.riskClass, "A3") >= 0
            ? "A3/A4 actions cannot be approved in the Level 1 runtime."
            : "A0/A1 actions do not require human approval."
        );
      }
      if (
        !Number.isInteger(ttlMinutes) ||
        ttlMinutes < 1 ||
        ttlMinutes > 240
      ) {
        throw new ValidationError("Approval TTL must be 1–240 minutes.");
      }
      const now = this.now();
      const matching = [...this.#state.approvals.values()].filter(
        (approval) =>
          approval.taskId === task.id &&
          approval.taskAttempt === task.attempt
      );
      for (const approval of matching.filter(
        (candidate) =>
          ["requested", "granted"].includes(candidate.status) &&
          !activeApproval(candidate, now)
      )) {
        await this.append(
          "approval.expired",
          attributedSystemActor(normalizedActor),
          task.id,
          {
            approvalId: approval.id,
            expiredAt: now.toISOString()
          }
        );
      }
      const existing = matching.find((approval) => activeApproval(approval, now));
      if (existing) {
        throw new ConflictError(
          `Task ${task.id} already has active approval ${existing.id}.`
        );
      }
      if (this.findTask(task.id).status !== "ready") {
        throw new ConflictError(
          `Task ${task.id} cannot request approval from ${task.status}.`
        );
      }
      const requestedAt = now.toISOString();
      const approval = {
        id: this.#idFactory("approval"),
        taskId: task.id,
        taskAttempt: task.attempt,
        intentDigest: task.actionIntent.digest,
        riskClass: task.actionIntent.riskClass,
        reason: requiredString(reason, "approval reason", { max: 2_000 }),
        requestedBy: normalizedActor.id,
        requestedAt,
        expiresAt: new Date(
          now.getTime() + ttlMinutes * 60 * 1_000
        ).toISOString(),
        status: "requested",
        decidedBy: null,
        decidedAt: null,
        decisionReason: null,
        consumedAt: null
      };
      await this.append(
        "approval.requested",
        normalizedActor,
        task.id,
        { approval }
      );
      return jsonClone(approval);
    });
  }

  async decideApproval({ approvalId, actor, decision, reason }) {
    return this.mutate(async () => {
      const human = requireHuman(actor, this.#agentRegistry);
      const normalizedDecision = enumValue(
        decision,
        "approval decision",
        ["granted", "denied"]
      );
      const approval = this.findApproval(approvalId);
      if (approval.status !== "requested") {
        throw new ConflictError(
          `Approval ${approval.id} is already ${approval.status}.`
        );
      }
      const task = this.findTask(approval.taskId);
      if (
        task.attempt !== approval.taskAttempt ||
        task.actionIntent.digest !== approval.intentDigest
      ) {
        throw new PolicyError("Approval request no longer matches the task.");
      }
      const now = this.now();
      if (!activeApproval(approval, now)) {
        await this.append(
          "approval.expired",
          attributedSystemActor(human),
          task.id,
          {
            approvalId: approval.id,
            expiredAt: now.toISOString()
          }
        );
        throw new PolicyError(`Approval ${approval.id} has expired.`);
      }
      const decidedAt = now.toISOString();
      if (normalizedDecision === "granted") {
        await this.append("approval.granted", human, task.id, {
          approvalId: approval.id,
          decidedBy: human.id,
          decidedAt,
          expiresAt: approval.expiresAt
        });
      } else {
        await this.append("approval.denied", human, task.id, {
          approvalId: approval.id,
          decidedBy: human.id,
          decidedAt,
          reason: requiredString(reason, "approval denial reason", {
            max: 2_000
          })
        });
      }
      return jsonClone(this.findApproval(approval.id));
    });
  }

  listApprovals(actor, taskId = null) {
    this.assertOpen();
    const normalizedActor = normalizeActor(actor, this.#agentRegistry);
    if (
      normalizedActor.type !== "human" &&
      !this.#roleRegistry.hasCapability(normalizedActor.roleId, "audit:read")
    ) {
      throw new AuthorizationError("Approval review requires audit access.");
    }
    if (taskId) this.findTask(taskId);
    return [...this.#state.approvals.values()]
      .filter((approval) => !taskId || approval.taskId === taskId)
      .map(jsonClone);
  }

  async prepareDelivery({
    actor,
    taskId,
    connectorId,
    operationId,
    parameters,
    idempotencyKey
  }) {
    return this.mutate(async () => {
      const normalizedActor = normalizeActor(actor, this.#agentRegistry, {
        human: false,
        agent: true
      });
      this.assertAuthenticatedOperation(normalizedActor, "outbox.prepare");
      const task = this.findTask(taskId);
      if (
        task.status !== "in_progress" ||
        task.claimedBy !== normalizedActor.id
      ) {
        throw new ConflictError(
          `Task ${task.id} is not claimed by ${normalizedActor.id}.`
        );
      }
      const run = this.findRun(task.runId);
      if (run.status !== "active") {
        throw new ConflictError(
          `Run ${run.id} cannot prepare delivery while ${run.status}.`
        );
      }
      const resolvedConnector = this.#connectorRegistry.resolveOperation(
        connectorId,
        operationId
      );
      this.#roleRegistry.assertCapability(
        normalizedActor.roleId,
        resolvedConnector.operation.capability
      );
      const normalizedParameters =
        this.#connectorRegistry.normalizeParameters(
          resolvedConnector.operation,
          parameters
        );
      const requestedAt = this.now().toISOString();
      const intent = createDeliveryIntent({
        actionCatalog: this.#actionCatalog,
        resolvedConnector,
        task,
        parameters: normalizedParameters,
        requestedBy: normalizedActor.id,
        requestedAt,
        idempotencyKey
      });
      const existing = [...this.#state.outbox.values()].find(
        (candidate) =>
          candidate.intent.idempotencyDigest === intent.idempotencyDigest
      );
      if (existing) {
        if (existing.intent.requestDigest !== intent.requestDigest) {
          throw new ConflictError(
            "Delivery idempotency key was used with another request."
          );
        }
        return immutableJson({
          created: false,
          delivery: jsonClone(existing)
        });
      }
      const existingTaskDelivery = [...this.#state.outbox.values()].find(
        (candidate) =>
          candidate.intent.task.id === task.id &&
          candidate.intent.task.attempt === task.attempt &&
          candidate.intent.task.actionIntentDigest ===
            task.actionIntent.digest
      );
      if (existingTaskDelivery) {
        throw new ConflictError(
          `Task ${task.id} already has delivery ${existingTaskDelivery.id}.`
        );
      }
      const delivery = {
        id: this.#idFactory("delivery"),
        status: "prepared",
        intent,
        attempt: 0,
        maxAttempts: intent.connector.maxAttempts,
        claim: null,
        lastOutcome: null,
        resolution: null,
        retryable: false,
        createdAt: requestedAt,
        updatedAt: requestedAt,
        completedAt: null
      };
      await this.append(
        "connector.delivery.prepared",
        normalizedActor,
        delivery.id,
        { delivery }
      );
      return immutableJson({
        created: true,
        delivery: jsonClone(this.findDelivery(delivery.id))
      });
    });
  }

  getDelivery(deliveryId, actor) {
    this.assertOpen();
    const normalizedActor = normalizeActor(actor, this.#agentRegistry);
    this.assertAuthenticatedOperation(normalizedActor, "outbox.get");
    const delivery = this.findDelivery(deliveryId);
    this.#roleRegistry.assertTaskRead(
      normalizedActor,
      this.findTask(delivery.intent.task.id)
    );
    return jsonClone(delivery);
  }

  listOutbox(actor, status = null) {
    this.assertOpen();
    const normalizedActor = normalizeActor(actor, this.#agentRegistry);
    this.assertAuthenticatedOperation(normalizedActor, "outbox.list");
    const normalizedStatus =
      status === null
        ? null
        : enumValue(status, "outbox status", OUTBOX_STATUSES);
    return [...this.#state.outbox.values()]
      .filter(
        (delivery) =>
          !normalizedStatus || delivery.status === normalizedStatus
      )
      .filter((delivery) => {
        if (normalizedActor.type === "human") return true;
        const task = this.findTask(delivery.intent.task.id);
        return (
          task.ownerRoleId === normalizedActor.roleId ||
          this.#roleRegistry.hasCapability(
            normalizedActor.roleId,
            "task:read:any"
          )
        );
      })
      .map(jsonClone);
  }

  async claimDelivery({
    actor,
    deliveryId,
    leaseSeconds
  }) {
    return this.mutate(async () => {
      const connector = this.authenticatedConnectorActor(
        actor,
        "outbox.claim"
      );
      if (
        !Number.isSafeInteger(leaseSeconds) ||
        leaseSeconds < 5 ||
        leaseSeconds > 300
      ) {
        throw new ValidationError(
          "Connector claim lease must be 5–300 seconds."
        );
      }
      const delivery = this.findDelivery(deliveryId);
      if (delivery.intent.connector.id !== connector.id) {
        throw new AuthorizationError(
          `Connector ${connector.id} cannot claim delivery ${delivery.id}.`
        );
      }
      this.assertCurrentConnectorBinding(delivery);
      const now = this.now();
      if (delivery.status === "claimed") {
        if (new Date(delivery.claim.expiresAt) <= now) {
          const detectedAt = now.toISOString();
          const outcome = {
            ...normalizeDeliveryOutcome("uncertain", {
              externalEffect: "none",
              reasonCode: "CLAIM_LEASE_EXPIRED",
              evidenceDigest: digestObject({
                deliveryId: delivery.id,
                claimId: delivery.claim.id,
                expiredAt: delivery.claim.expiresAt,
                detectedAt
              })
            }),
            recordedBy: connector.id,
            recordedAt: detectedAt
          };
          await this.append(
            "connector.delivery.claim-expired",
            connector,
            delivery.id,
            {
              deliveryId: delivery.id,
              claimId: delivery.claim.id,
              expiredAt: delivery.claim.expiresAt,
              detectedAt,
              outcome
            }
          );
          throw new ConflictError(
            `Delivery ${delivery.id} entered uncertain review after lease expiry.`
          );
        }
        throw new ConflictError(
          `Delivery ${delivery.id} already has an active claim.`
        );
      }
      if (delivery.status !== "prepared") {
        throw new ConflictError(
          `Delivery ${delivery.id} cannot be claimed from ${delivery.status}.`
        );
      }
      this.assertDeliveryTaskActive(delivery);
      if (delivery.attempt >= delivery.maxAttempts) {
        throw new PolicyError(
          `Delivery ${delivery.id} exhausted its attempt budget.`
        );
      }
      const claimedAt = now.toISOString();
      const claim = {
        id: this.#idFactory("claim"),
        connectorId: connector.id,
        attempt: delivery.attempt + 1,
        claimedAt,
        expiresAt: new Date(
          now.getTime() + leaseSeconds * 1_000
        ).toISOString()
      };
      await this.append(
        "connector.delivery.claimed",
        connector,
        delivery.id,
        {
          deliveryId: delivery.id,
          claim
        }
      );
      return jsonClone(this.findDelivery(delivery.id));
    });
  }

  async recordDeliveryOutcome({
    actor,
    deliveryId,
    claimId,
    outcome,
    evidence
  }) {
    return this.mutate(async () => {
      const connector = this.authenticatedConnectorActor(
        actor,
        "outbox.record-outcome"
      );
      const delivery = this.findDelivery(deliveryId);
      if (delivery.intent.connector.id !== connector.id) {
        throw new AuthorizationError(
          `Connector ${connector.id} cannot report delivery ${delivery.id}.`
        );
      }
      this.assertCurrentConnectorBinding(delivery);
      if (delivery.status !== "claimed") {
        throw new ConflictError(
          `Delivery ${delivery.id} has no active claim.`
        );
      }
      const normalizedClaimId = assertId(
        claimId,
        "connector delivery claim id"
      );
      if (
        delivery.claim.id !== normalizedClaimId ||
        delivery.claim.connectorId !== connector.id
      ) {
        throw new AuthorizationError(
          `Connector claim does not own delivery ${delivery.id}.`
        );
      }
      const now = this.now();
      if (new Date(delivery.claim.expiresAt) <= now) {
        const detectedAt = now.toISOString();
        const uncertainOutcome = {
          ...normalizeDeliveryOutcome("uncertain", {
            externalEffect: "none",
            reasonCode: "OUTCOME_AFTER_LEASE",
            evidenceDigest: digestObject({
              deliveryId: delivery.id,
              claimId: delivery.claim.id,
              expiredAt: delivery.claim.expiresAt,
              detectedAt
            })
          }),
          recordedBy: connector.id,
          recordedAt: detectedAt
        };
        await this.append(
          "connector.delivery.claim-expired",
          connector,
          delivery.id,
          {
            deliveryId: delivery.id,
            claimId: delivery.claim.id,
            expiredAt: delivery.claim.expiresAt,
            detectedAt,
            outcome: uncertainOutcome
          }
        );
        throw new ConflictError(
          `Delivery ${delivery.id} entered uncertain review after lease expiry.`
        );
      }
      const recordedAt = now.toISOString();
      const normalizedOutcome = {
        ...normalizeDeliveryOutcome(outcome, evidence),
        recordedBy: connector.id,
        recordedAt
      };
      await this.append(
        "connector.delivery.outcome-recorded",
        connector,
        delivery.id,
        {
          deliveryId: delivery.id,
          claimId: normalizedClaimId,
          outcome: normalizedOutcome
        }
      );
      return jsonClone(this.findDelivery(delivery.id));
    });
  }

  async reconcileExpiredDelivery({ actor, deliveryId }) {
    return this.mutate(async () => {
      const human = requireHuman(actor, this.#agentRegistry);
      this.assertAuthenticatedOperation(
        human,
        "outbox.reconcile-expired"
      );
      const delivery = this.findDelivery(deliveryId);
      if (delivery.status !== "claimed") {
        throw new ConflictError(
          `Delivery ${delivery.id} has no claim to reconcile.`
        );
      }
      const now = this.now();
      if (new Date(delivery.claim.expiresAt) > now) {
        throw new ConflictError(
          `Delivery ${delivery.id} claim has not expired.`
        );
      }
      const detectedAt = now.toISOString();
      const outcome = {
        ...normalizeDeliveryOutcome("uncertain", {
          externalEffect: "none",
          reasonCode: "CLAIM_LEASE_RECONCILED",
          evidenceDigest: digestObject({
            deliveryId: delivery.id,
            claimId: delivery.claim.id,
            expiredAt: delivery.claim.expiresAt,
            detectedAt
          })
        }),
        recordedBy: delivery.claim.connectorId,
        recordedAt: detectedAt
      };
      await this.append(
        "connector.delivery.claim-expired",
        attributedSystemActor(human),
        delivery.id,
        {
          deliveryId: delivery.id,
          claimId: delivery.claim.id,
          expiredAt: delivery.claim.expiresAt,
          detectedAt,
          outcome
        }
      );
      return jsonClone(this.findDelivery(delivery.id));
    });
  }

  async retryDelivery({ actor, deliveryId, reason }) {
    return this.mutate(async () => {
      const human = requireHuman(actor, this.#agentRegistry);
      this.assertAuthenticatedOperation(human, "outbox.retry");
      const delivery = this.findDelivery(deliveryId);
      if (delivery.status !== "failed" || !delivery.retryable) {
        throw new ConflictError(
          `Delivery ${delivery.id} is not retryable.`
        );
      }
      this.assertCurrentConnectorBinding(delivery);
      this.assertDeliveryTaskActive(delivery);
      if (delivery.attempt >= delivery.maxAttempts) {
        throw new PolicyError(
          `Delivery ${delivery.id} exhausted its attempt budget.`
        );
      }
      const authorizedAt = this.now().toISOString();
      await this.append(
        "connector.delivery.retry-authorized",
        human,
        delivery.id,
        {
          deliveryId: delivery.id,
          reason: requiredString(reason, "delivery retry reason", {
            max: 2_000
          }),
          authorizedBy: human.id,
          authorizedAt
        }
      );
      return jsonClone(this.findDelivery(delivery.id));
    });
  }

  async cancelDelivery({ actor, deliveryId, reason }) {
    return this.mutate(async () => {
      const human = requireHuman(actor, this.#agentRegistry);
      this.assertAuthenticatedOperation(human, "outbox.cancel");
      const delivery = this.findDelivery(deliveryId);
      if (!["prepared", "failed"].includes(delivery.status)) {
        throw new ConflictError(
          `Delivery ${delivery.id} cannot be cancelled from ${delivery.status}.`
        );
      }
      const cancelledAt = this.now().toISOString();
      await this.append(
        "connector.delivery.cancelled",
        human,
        delivery.id,
        {
          deliveryId: delivery.id,
          reason: requiredString(reason, "delivery cancellation reason", {
            max: 2_000
          }),
          cancelledBy: human.id,
          cancelledAt
        }
      );
      return jsonClone(this.findDelivery(delivery.id));
    });
  }

  async resolveUncertainDelivery({
    actor,
    deliveryId,
    decision,
    reason,
    evidenceDigest,
    resultDigest,
    retryable
  }) {
    return this.mutate(async () => {
      const human = requireHuman(actor, this.#agentRegistry);
      this.assertAuthenticatedOperation(
        human,
        "outbox.resolve-uncertain"
      );
      const delivery = this.findDelivery(deliveryId);
      if (delivery.status !== "uncertain") {
        throw new ConflictError(
          `Delivery ${delivery.id} is not awaiting uncertainty review.`
        );
      }
      const normalizedDecision = enumValue(
        decision,
        "delivery uncertainty decision",
        ["cancelled", "confirmed_simulated", "failed"]
      );
      const normalizedEvidenceDigest = requiredString(
        evidenceDigest,
        "delivery resolution evidence digest",
        {
          max: 71,
          pattern: /^sha256:[0-9a-f]{64}$/
        }
      );
      let normalizedResultDigest = null;
      let normalizedRetryable = false;
      if (normalizedDecision === "confirmed_simulated") {
        normalizedResultDigest = requiredString(
          resultDigest,
          "confirmed simulated result digest",
          {
            max: 71,
            pattern: /^sha256:[0-9a-f]{64}$/
          }
        );
        if (retryable !== undefined) {
          throw new ValidationError(
            "Confirmed simulation resolution cannot be retryable."
          );
        }
      } else if (normalizedDecision === "failed") {
        if (typeof retryable !== "boolean") {
          throw new ValidationError(
            "Failed uncertainty resolution requires retryable."
          );
        }
        if (resultDigest !== undefined) {
          throw new ValidationError(
            "Failed uncertainty resolution cannot include a result digest."
          );
        }
        normalizedRetryable = retryable;
      } else if (
        resultDigest !== undefined ||
        retryable !== undefined
      ) {
        throw new ValidationError(
          "Cancelled uncertainty resolution has unexpected fields."
        );
      }
      const resolvedAt = this.now().toISOString();
      const resolution = {
        decision: normalizedDecision,
        reason: requiredString(
          reason,
          "delivery uncertainty resolution reason",
          { max: 2_000 }
        ),
        evidenceDigest: normalizedEvidenceDigest,
        resultDigest: normalizedResultDigest,
        retryable: normalizedRetryable,
        resolvedBy: human.id,
        resolvedAt
      };
      await this.append(
        "connector.delivery.uncertainty-resolved",
        human,
        delivery.id,
        {
          deliveryId: delivery.id,
          resolution
        }
      );
      return jsonClone(this.findDelivery(delivery.id));
    });
  }

  async proposeMemory({
    actor,
    scope,
    title,
    content,
    sensitivity = "internal",
    sourceReferences = [],
    sourceEvidence = []
  }) {
    return this.mutate(async () => {
      const normalizedActor = normalizeActor(actor, this.#agentRegistry);
      const normalizedSensitivity = enumValue(
        sensitivity,
        "memory sensitivity",
        SENSITIVITY_CLASSES
      );
      const normalizedScope = this.#roleRegistry.assertMemoryAccess(
        normalizedActor,
        scope,
        normalizedSensitivity,
        "propose"
      );
      const normalizedContent = requiredString(content, "memory content", {
        max: MAX_MEMORY_BYTES
      });
      if (Buffer.byteLength(normalizedContent, "utf8") > MAX_MEMORY_BYTES) {
        throw new ValidationError("Memory content exceeds the 32 KiB limit.");
      }
      const normalizedSourceEvidence =
        normalizeSourceEvidence(sourceEvidence);
      const declaredSourceReferences = uniqueStrings(
        sourceReferences,
        "memory source references",
        { maximum: 20 }
      );
      const combinedSourceReferences = [
        ...declaredSourceReferences,
        ...normalizedSourceEvidence.flatMap((entry) => [
          entry.sourceReference,
          entry.evidenceDigest
        ])
      ];
      const proposedAt = this.now().toISOString();
      const candidate = {
        id: this.#idFactory("memory"),
        scope: normalizedScope,
        title: requiredString(title, "memory title", { max: 200 }),
        content: normalizedContent,
        contentDigest: digestObject(normalizedContent),
        sensitivity: normalizedSensitivity,
        sourceReferences: uniqueStrings(
          [...new Set(combinedSourceReferences)],
          "memory source references",
          { maximum: 20 }
        ),
        sourceEvidence: normalizedSourceEvidence,
        proposedBy: normalizedActor.id,
        proposedAt,
        status: "candidate",
        reviewedBy: null,
        reviewedAt: null,
        reviewReason: null
      };
      await this.append(
        "memory.candidate.proposed",
        normalizedActor,
        candidate.id,
        { candidate }
      );
      return jsonClone(candidate);
    });
  }

  async reviewMemory({ candidateId, actor, decision, reason }) {
    return this.mutate(async () => {
      const human = requireHuman(actor, this.#agentRegistry);
      const candidate = this.#state.memoryCandidates.get(candidateId);
      if (!candidate) {
        throw new NotFoundError(`Unknown memory candidate: ${candidateId}.`);
      }
      if (candidate.status !== "candidate") {
        throw new ConflictError(
          `Memory candidate ${candidate.id} is already ${candidate.status}.`
        );
      }
      const normalizedDecision = enumValue(
        decision,
        "memory review decision",
        ["accepted", "rejected"]
      );
      const reviewedAt = this.now().toISOString();
      await this.append(
        "memory.candidate.reviewed",
        human,
        candidate.id,
        {
          candidateId: candidate.id,
          decision: normalizedDecision,
          reviewedBy: human.id,
          reviewedAt,
          reason: requiredString(reason, "memory review reason", {
            max: 2_000
          })
        }
      );
      return jsonClone(this.#state.memoryCandidates.get(candidate.id));
    });
  }

  readMemory({ actor, scope }) {
    this.assertOpen();
    const normalizedActor = normalizeActor(actor, this.#agentRegistry);
    const normalizedScope = this.#roleRegistry.assertMemoryAccess(
      normalizedActor,
      scope,
      "internal",
      "read"
    );
    const visible = [];
    for (const candidate of this.#state.memoryCandidates.values()) {
      if (
        candidate.scope !== normalizedScope ||
        candidate.status !== "accepted"
      ) {
        continue;
      }
      this.#roleRegistry.assertMemoryAccess(
        normalizedActor,
        candidate.scope,
        candidate.sensitivity,
        "read"
      );
      visible.push(jsonClone(candidate));
    }
    return visible;
  }

  listMemoryCandidates(actor) {
    this.assertOpen();
    const human = requireHuman(actor, this.#agentRegistry);
    void human;
    return [...this.#state.memoryCandidates.values()].map(jsonClone);
  }

  auditTrail(actor, { runId = null } = {}) {
    this.assertOpen();
    const normalizedActor = normalizeActor(actor, this.#agentRegistry);
    if (
      normalizedActor.type !== "human" &&
      !this.#roleRegistry.hasCapability(normalizedActor.roleId, "audit:read")
    ) {
      throw new AuthorizationError("Audit access is not authorized.");
    }
    let subjects = null;
    if (runId) {
      const run = this.findRun(runId);
      const deliveryIds = [...this.#state.outbox.values()]
        .filter((delivery) => delivery.intent.task.runId === run.id)
        .map((delivery) => delivery.id);
      subjects = new Set([run.id, ...run.taskIds, ...deliveryIds]);
    }
    return this.#eventLog
      .all()
      .filter((event) => !subjects || subjects.has(event.subject));
  }

  exportEvidenceBundle(runId, actor) {
    this.assertOpen();
    const normalizedActor = normalizeActor(actor, this.#agentRegistry);
    if (
      normalizedActor.type !== "human" &&
      !this.#roleRegistry.hasCapability(
        normalizedActor.roleId,
        "evidence:export"
      )
    ) {
      throw new AuthorizationError("Evidence export is not authorized.");
    }
    const run = this.findRun(runId);
    if (run.status !== "completed") {
      throw new ConflictError(`Run ${run.id} is not completed.`);
    }
    const integrity = this.#eventLog.verify();
    const deliveries = [...this.#state.outbox.values()]
      .filter((delivery) => delivery.intent.task.runId === run.id)
      .map(deliveryEvidence)
      .sort((left, right) =>
        left.deliveryId.localeCompare(right.deliveryId)
      );
    const subjects = new Set([
      run.id,
      ...run.taskIds,
      ...deliveries.map((delivery) => delivery.deliveryId)
    ]);
    const eventReferences = this.#eventLog
      .all()
      .filter((event) => subjects.has(event.subject))
      .map((event) => ({
        sequence: event.sequence,
        eventId: event.id,
        type: event.type,
        subject: event.subject,
        invocationId: event.actor.invocationId || null,
        correlationId: event.actor.correlationId || null,
        transactionId: event.transactionId || null,
        previousHash: event.previousHash,
        hash: event.hash
      }));
    const unsigned = {
      schemaVersion: "1.0",
      kind: "fdos-runtime-workflow-evidence",
      generatedAt: this.now().toISOString(),
      run: {
        id: run.id,
        workflowDefinitionId: run.workflowDefinitionId,
        workflowDefinitionVersion: run.workflowDefinitionVersion,
        workflowDefinitionDigest: run.workflowDefinitionDigest,
        inputDigest: run.inputDigest,
        evidenceDigest: run.evidenceDigest,
        status: run.status,
        createdAt: run.createdAt,
        completedAt: run.completedAt
      },
      tasks: run.taskIds
        .map((taskId) => taskEvidence(this.findTask(taskId)))
        .sort((left, right) => left.taskId.localeCompare(right.taskId)),
      deliveries,
      eventReferences,
      audit: {
        algorithm: "sha256",
        eventCount: integrity.eventCount,
        headHash: integrity.headHash,
        verified: integrity.valid,
        persistence: this.#eventLog.status()
      },
      limitations: [
        this.#invocationVerifier &&
        this.#eventLog.status().transactional
          ? "experimental Ed25519 trust root and local SQLite transaction boundary"
          : this.#invocationVerifier
            ? "experimental Ed25519 invocation trust root and non-transactional persistence"
            : "caller-asserted identity and non-transactional persistence",
        "no networked connector execution; dry-run Outbox only",
        "no production-security claim"
      ]
    };
    const bundle = {
      ...unsigned,
      bundleDigest: digestObject(unsigned)
    };
    return immutableJson(bundle);
  }

  verifyIntegrity() {
    return this.#eventLog.verify();
  }

  status() {
    const runs = [...this.#state.runs.values()];
    const tasks = [...this.#state.tasks.values()];
    const deliveries = [...this.#state.outbox.values()];
    return {
      validationLevel: "Level 1 — Experimental",
      productionReady: false,
      externalActionsEnabled: false,
      connectorDryRunEnabled:
        this.#connectorRegistry.listInstances().length > 0,
      connectorNetworkAccessEnabled: false,
      connectorExternalEffectsEnabled: false,
      authenticatedInvocationVerifierConfigured:
        this.#invocationVerifier !== null,
      runtimeLeaseHeld: !this.#closed,
      acceptedInvocations: this.#state.acceptedInvocations.size,
      persistence: this.#eventLog.status(),
      runs: {
        total: runs.length,
        active: runs.filter((run) => run.status === "active").length,
        completed: runs.filter((run) => run.status === "completed").length,
        failed: runs.filter((run) => run.status === "failed").length
      },
      tasks: {
        total: tasks.length,
        ready: tasks.filter((task) => task.status === "ready").length,
        inProgress: tasks.filter((task) => task.status === "in_progress").length,
        completed: tasks.filter((task) => task.status === "completed").length
      },
      outbox: {
        total: deliveries.length,
        prepared: deliveries.filter(
          (delivery) => delivery.status === "prepared"
        ).length,
        claimed: deliveries.filter(
          (delivery) => delivery.status === "claimed"
        ).length,
        simulated: deliveries.filter(
          (delivery) => delivery.status === "simulated"
        ).length,
        failed: deliveries.filter(
          (delivery) => delivery.status === "failed"
        ).length,
        uncertain: deliveries.filter(
          (delivery) => delivery.status === "uncertain"
        ).length,
        cancelled: deliveries.filter(
          (delivery) => delivery.status === "cancelled"
        ).length
      },
      audit: this.verifyIntegrity()
    };
  }
}
