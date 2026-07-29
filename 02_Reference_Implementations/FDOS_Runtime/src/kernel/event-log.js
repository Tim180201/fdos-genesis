import { open as openFile, mkdir, readFile, chmod } from "node:fs/promises";
import path from "node:path";
import {
  canonicalJson,
  digestObject,
  immutableJson,
  jsonClone
} from "./canonical-json.js";
import { IntegrityError, ValidationError } from "./errors.js";
import { assertId, createId } from "./ids.js";
import { assertPlainObject, isoDate, requiredString } from "./validation.js";

const EVENT_SCHEMA_VERSION = "1.0";

function unsignedEvent(event) {
  const { hash: _hash, ...unsigned } = event;
  return unsigned;
}

function validateActor(actor) {
  assertPlainObject(actor, "event actor");
  const type = requiredString(actor.type, "event actor type", {
    max: 32,
    pattern: /^(human|agent|system)$/
  });
  const id = requiredString(actor.id, "event actor id", {
    max: 160,
    pattern: /^[a-zA-Z0-9][a-zA-Z0-9:._-]+$/
  });
  const hasInvocationId = actor.invocationId !== undefined;
  const hasCorrelationId = actor.correlationId !== undefined;
  if (hasInvocationId !== hasCorrelationId) {
    throw new IntegrityError(
      "Event actor invocation attribution is incomplete."
    );
  }
  const attribution = hasInvocationId
    ? {
        invocationId: assertId(
          actor.invocationId,
          "event actor invocation id"
        ),
        correlationId: assertId(
          actor.correlationId,
          "event actor correlation id"
        )
      }
    : {};
  const allowedKeys = new Set([
    "type",
    "id",
    ...(type === "agent" ? ["roleId"] : []),
    ...(hasInvocationId ? ["invocationId", "correlationId"] : [])
  ]);
  if (Object.keys(actor).some((key) => !allowedKeys.has(key))) {
    throw new IntegrityError("Event actor has an unexpected shape.");
  }
  if (type === "agent") {
    return {
      type,
      id,
      roleId: requiredString(actor.roleId, "event actor role id", {
        max: 64,
        pattern: /^[a-z][a-z0-9-]{1,63}$/
      }),
      ...attribution
    };
  }
  return { type, id, ...attribution };
}

function validateEvent(event, index, expectedPreviousHash) {
  assertPlainObject(event, `event line ${index + 1}`);
  if (event.schemaVersion !== EVENT_SCHEMA_VERSION) {
    throw new IntegrityError(`Unsupported event schema at line ${index + 1}.`);
  }
  if (event.sequence !== index + 1) {
    throw new IntegrityError(`Invalid event sequence at line ${index + 1}.`);
  }
  requiredString(event.id, "event id", { max: 128 });
  requiredString(event.type, "event type", {
    max: 120,
    pattern: /^[a-z][a-z0-9.-]+$/
  });
  isoDate(event.timestamp, "event timestamp");
  validateActor(event.actor);
  requiredString(event.subject, "event subject", { max: 160 });
  assertPlainObject(event.payload, "event payload");

  if (event.previousHash !== expectedPreviousHash) {
    throw new IntegrityError(`Broken event link at line ${index + 1}.`);
  }

  const calculated = digestObject(unsignedEvent(event));
  if (event.hash !== calculated) {
    throw new IntegrityError(`Invalid event hash at line ${index + 1}.`);
  }
  return event.hash;
}

export class EventLog {
  static async open({
    directory,
    fileName = "events.jsonl",
    clock = () => new Date(),
    idFactory = createId
  }) {
    const normalizedDirectory = path.resolve(
      requiredString(directory, "event-log directory", { max: 4_096 })
    );
    const normalizedFileName = requiredString(fileName, "event-log filename", {
      max: 120,
      pattern: /^[a-zA-Z0-9][a-zA-Z0-9._-]+$/
    });
    await mkdir(normalizedDirectory, { recursive: true, mode: 0o700 });
    const filePath = path.join(normalizedDirectory, normalizedFileName);
    const handle = await openFile(filePath, "a", 0o600);
    await handle.close();
    await chmod(filePath, 0o600);

    const source = await readFile(filePath, "utf8");
    const lines = source.split("\n").filter((line) => line.trim());
    const events = lines.map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (cause) {
        throw new IntegrityError(`Invalid JSON event at line ${index + 1}.`, {
          cause: cause.message
        });
      }
    });

    let previousHash = null;
    for (const [index, event] of events.entries()) {
      previousHash = validateEvent(event, index, previousHash);
    }

    return new EventLog({
      filePath,
      events: events.map(immutableJson),
      clock,
      idFactory
    });
  }

  constructor({ filePath, events, clock, idFactory }) {
    this.filePath = filePath;
    this.events = events;
    this.clock = clock;
    this.idFactory = idFactory;
    this.pending = Promise.resolve();
  }

  async append({ type, actor, subject, payload }) {
    const operation = this.pending.then(async () => {
      const timestampValue = this.clock();
      if (!(timestampValue instanceof Date) || !Number.isFinite(timestampValue.getTime())) {
        throw new ValidationError("Event clock returned an invalid date.");
      }

      const unsigned = {
        schemaVersion: EVENT_SCHEMA_VERSION,
        sequence: this.events.length + 1,
        id: this.idFactory("event"),
        type: requiredString(type, "event type", {
          max: 120,
          pattern: /^[a-z][a-z0-9.-]+$/
        }),
        timestamp: timestampValue.toISOString(),
        actor: validateActor(actor),
        subject: requiredString(subject, "event subject", { max: 160 }),
        payload: jsonClone(assertPlainObject(payload, "event payload")),
        previousHash: this.lastHash()
      };
      const event = immutableJson({
        ...unsigned,
        hash: digestObject(unsigned)
      });

      const handle = await openFile(this.filePath, "a", 0o600);
      try {
        await handle.writeFile(`${canonicalJson(event)}\n`, "utf8");
        await handle.sync();
      } finally {
        await handle.close();
      }
      this.events.push(event);
      return jsonClone(event);
    });

    this.pending = operation.catch(() => undefined);
    return operation;
  }

  all() {
    return this.events.map(jsonClone);
  }

  since(sequence = 0) {
    if (!Number.isInteger(sequence) || sequence < 0) {
      throw new ValidationError("Event sequence must be a non-negative integer.");
    }
    return this.events.slice(sequence).map(jsonClone);
  }

  lastHash() {
    return this.events.at(-1)?.hash || null;
  }

  verify() {
    let previousHash = null;
    for (const [index, event] of this.events.entries()) {
      previousHash = validateEvent(event, index, previousHash);
    }
    return {
      valid: true,
      eventCount: this.events.length,
      headHash: this.lastHash()
    };
  }
}
