import { jsonClone } from "../kernel/canonical-json.js";
import {
  ConflictError,
  IntegrityError,
  ValidationError
} from "../kernel/errors.js";
import { createReleaseAuthorization } from "../domain/release-authorization.js";
import {
  createReleaseDomainEvent,
  replayReleaseEvidenceDomain
} from "../domain/release-evidence-ledger.js";

const AUDIT_EVENT_TYPE = "release-evidence.domain-event";

function assertEventStore(value) {
  if (
    !value ||
    typeof value.all !== "function" ||
    typeof value.append !== "function" ||
    typeof value.transaction !== "function"
  ) {
    throw new ValidationError(
      "Release Evidence coordinator requires a transactional event store."
    );
  }
}

function durableActor(actor) {
  if (
    !actor ||
    !["human", "system"].includes(actor.type) ||
    typeof actor.id !== "string"
  ) {
    throw new ValidationError(
      "Durable Release Evidence commands require a human or system actor."
    );
  }
  return { type: actor.type, id: actor.id };
}

export class ReleaseEvidenceCoordinator {
  #eventStore;

  constructor({ eventStore }) {
    assertEventStore(eventStore);
    this.#eventStore = eventStore;
    replayReleaseEvidenceDomain(this.events());
  }

  events() {
    const events = this.#eventStore
      .all()
      .filter((event) => event.type === AUDIT_EVENT_TYPE)
      .map((event, index) => {
        if (
          !event.payload ||
          typeof event.payload !== "object" ||
          Array.isArray(event.payload) ||
          Object.keys(event.payload).length !== 1 ||
          !Object.hasOwn(event.payload, "domainEvent")
        ) {
          throw new IntegrityError(
            `Release Evidence audit event ${index + 1} is malformed.`
          );
        }
        return jsonClone(event.payload.domainEvent);
      });
    replayReleaseEvidenceDomain(events);
    return events;
  }

  state() {
    return replayReleaseEvidenceDomain(this.events());
  }

  async recordDomainEvent({
    eventId,
    eventType,
    actor,
    occurredAt,
    payload
  }) {
    const auditActor = durableActor(actor);
    return this.#eventStore.transaction(async () => {
      const currentEvents = this.events();
      const domainEvent = createReleaseDomainEvent({
        currentEvents,
        eventId,
        eventType,
        actor: auditActor,
        occurredAt,
        payload
      });
      const state = replayReleaseEvidenceDomain([
        ...currentEvents,
        domainEvent
      ]);
      if (!state.workspaceId) {
        throw new ConflictError(
          "Release Evidence event did not establish a workspace."
        );
      }
      await this.#eventStore.append({
        type: AUDIT_EVENT_TYPE,
        actor: auditActor,
        subject: state.workspaceId,
        payload: { domainEvent }
      });
      return jsonClone(domainEvent);
    });
  }

  async authorizeRelease({
    eventId,
    authorizationId,
    consumptionId,
    evaluation,
    candidate,
    changeRevision,
    decisionRevisions = [],
    workOrder,
    evidence = [],
    policy,
    approval,
    previousStatus,
    authorizedBy,
    authorizedAt
  }) {
    const auditActor = durableActor(authorizedBy);
    return this.#eventStore.transaction(async () => {
      const currentEvents = this.events();
      const authorization = createReleaseAuthorization({
        authorizationId,
        consumptionId,
        evaluation,
        candidate,
        changeRevision,
        decisionRevisions,
        workOrder,
        evidence,
        policy,
        approval,
        previousStatus,
        authorizedBy: auditActor,
        authorizedAt
      });
      const domainEvent = createReleaseDomainEvent({
        currentEvents,
        eventId,
        eventType: "release.authorized",
        actor: auditActor,
        occurredAt: authorizedAt,
        payload: { authorization }
      });
      const state = replayReleaseEvidenceDomain([
        ...currentEvents,
        domainEvent
      ]);
      await this.#eventStore.append({
        type: AUDIT_EVENT_TYPE,
        actor: auditActor,
        subject: authorization.workspaceId,
        payload: { domainEvent }
      });
      return {
        authorization: jsonClone(authorization),
        event: jsonClone(domainEvent),
        state: jsonClone(state)
      };
    });
  }
}
