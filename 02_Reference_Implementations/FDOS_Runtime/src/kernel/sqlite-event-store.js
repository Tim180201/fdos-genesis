import { AsyncLocalStorage } from "node:async_hooks";
import { DatabaseSync } from "node:sqlite";
import {
  chmod,
  lstat,
  mkdir,
  open as openFile
} from "node:fs/promises";
import path from "node:path";
import {
  canonicalJson,
  immutableJson,
  jsonClone
} from "./canonical-json.js";
import {
  ConflictError,
  IntegrityError,
  PersistenceError,
  ValidationError
} from "./errors.js";
import { assertId, createId } from "./ids.js";
import {
  createAuditEvent,
  verifyAuditEventChain
} from "./event-log.js";
import {
  isoDate,
  requiredString
} from "./validation.js";

const STORE_SCHEMA_VERSION = "1.0";
const STORE_KIND = "fdos-sqlite-event-store";
const APPLICATION_ID = 0x46444f53;
const USER_VERSION = 1;
const SAVEPOINT_NAME = "fdos_command_effects";

const INITIAL_SCHEMA = `
  CREATE TABLE fdos_metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  ) STRICT;

  CREATE TABLE fdos_transactions (
    id TEXT PRIMARY KEY,
    started_at TEXT NOT NULL,
    committed_at TEXT,
    event_count INTEGER NOT NULL DEFAULT 0,
    first_sequence INTEGER,
    last_sequence INTEGER,
    head_hash TEXT,
    CHECK (
      (event_count = 0 AND first_sequence IS NULL AND
        last_sequence IS NULL AND head_hash IS NULL) OR
      (event_count > 0 AND first_sequence > 0 AND
        last_sequence >= first_sequence AND head_hash IS NOT NULL)
    )
  ) STRICT;

  CREATE TABLE fdos_events (
    sequence INTEGER PRIMARY KEY,
    id TEXT NOT NULL UNIQUE,
    transaction_id TEXT,
    event_json TEXT NOT NULL,
    hash TEXT NOT NULL UNIQUE,
    previous_hash TEXT,
    FOREIGN KEY (transaction_id)
      REFERENCES fdos_transactions(id)
      ON DELETE RESTRICT
  ) STRICT;

  CREATE INDEX fdos_events_transaction
    ON fdos_events(transaction_id, sequence);

  INSERT INTO fdos_metadata(key, value)
    VALUES ('kind', '${STORE_KIND}');
  INSERT INTO fdos_metadata(key, value)
    VALUES ('schema_version', '${STORE_SCHEMA_VERSION}');

  PRAGMA application_id = ${APPLICATION_ID};
  PRAGMA user_version = ${USER_VERSION};
`;

function validClockValue(clock, field) {
  const value = clock();
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
    throw new ValidationError(`${field} returned an invalid date.`);
  }
  return value;
}

function transactionId(value) {
  const normalized = assertId(value, "event-store transaction id");
  if (!normalized.startsWith("transaction_")) {
    throw new IntegrityError(
      "Event-store transaction identifier is invalid."
    );
  }
  return normalized;
}

function sqliteValue(database, pragma) {
  const row = database.prepare(pragma).get();
  return row ? Object.values(row)[0] : undefined;
}

function persistenceFailure(message, cause) {
  return new PersistenceError(message, {
    causeName: cause?.name || "Error",
    causeMessage: String(cause?.message || cause || "unknown")
  });
}

function quickCheck(database) {
  let rows;
  try {
    rows = database.prepare("PRAGMA quick_check").all();
  } catch (cause) {
    throw persistenceFailure("SQLite quick-check could not run.", cause);
  }
  if (
    rows.length !== 1 ||
    String(Object.values(rows[0])[0]).toLowerCase() !== "ok"
  ) {
    throw new IntegrityError("SQLite quick-check reported corruption.");
  }
}

function parseEventRows(rows) {
  const events = rows.map((row, index) => {
    let event;
    try {
      event = JSON.parse(row.event_json);
    } catch (cause) {
      throw new IntegrityError(
        `SQLite event ${index + 1} contains malformed JSON.`,
        { cause: cause.message }
      );
    }
    if (
      row.sequence !== event.sequence ||
      row.id !== event.id ||
      row.transaction_id !== (event.transactionId || null) ||
      row.hash !== event.hash ||
      row.previous_hash !== event.previousHash ||
      row.event_json !== canonicalJson(event)
    ) {
      throw new IntegrityError(
        `SQLite event ${index + 1} metadata does not match its content.`
      );
    }
    return immutableJson(event);
  });
  verifyAuditEventChain(events);
  return events;
}

function eventGroups(events) {
  const groups = new Map();
  for (const event of events) {
    if (!event.transactionId) continue;
    const id = transactionId(event.transactionId);
    const group = groups.get(id) || {
      eventCount: 0,
      firstSequence: event.sequence,
      lastSequence: event.sequence,
      headHash: event.hash
    };
    group.eventCount += 1;
    group.lastSequence = event.sequence;
    group.headHash = event.hash;
    groups.set(id, group);
  }
  return groups;
}

function verifyTransactionRows(events, rows, activeTransactionId = null) {
  const groups = eventGroups(events);
  const records = new Map();
  for (const row of rows) {
    const id = transactionId(row.id);
    if (records.has(id)) {
      throw new IntegrityError(`Duplicate transaction record ${id}.`);
    }
    const startedAt = isoDate(
      row.started_at,
      "transaction startedAt"
    );
    if (id === activeTransactionId) {
      if (row.committed_at !== null) {
        throw new IntegrityError(
          "Active transaction is unexpectedly committed."
        );
      }
      records.set(id, row);
      continue;
    }
    const committedAt = isoDate(
      row.committed_at,
      "transaction committedAt"
    );
    if (Date.parse(committedAt) < Date.parse(startedAt)) {
      throw new IntegrityError(
        `Transaction ${id} committed before it started.`
      );
    }
    const group = groups.get(id);
    if (
      !group ||
      row.event_count !== group.eventCount ||
      row.first_sequence !== group.firstSequence ||
      row.last_sequence !== group.lastSequence ||
      row.head_hash !== group.headHash
    ) {
      throw new IntegrityError(
        `Transaction ${id} metadata does not match its events.`
      );
    }
    records.set(id, row);
  }
  for (const id of groups.keys()) {
    if (!records.has(id)) {
      throw new IntegrityError(
        `Events reference missing transaction ${id}.`
      );
    }
  }
  if (
    activeTransactionId &&
    !records.has(activeTransactionId)
  ) {
    throw new IntegrityError("Active transaction record is missing.");
  }
}

function validateStoreIdentity(database) {
  const applicationId = sqliteValue(
    database,
    "PRAGMA application_id"
  );
  const userVersion = sqliteValue(database, "PRAGMA user_version");
  if (
    applicationId !== APPLICATION_ID ||
    userVersion !== USER_VERSION
  ) {
    throw new IntegrityError(
      "SQLite event-store identity or version is invalid."
    );
  }
  const metadataRows = database
    .prepare("SELECT key, value FROM fdos_metadata ORDER BY key")
    .all();
  const metadata = Object.fromEntries(
    metadataRows.map((row) => [row.key, row.value])
  );
  if (
    metadataRows.length !== 2 ||
    metadata.kind !== STORE_KIND ||
    metadata.schema_version !== STORE_SCHEMA_VERSION
  ) {
    throw new IntegrityError(
      "SQLite event-store metadata is invalid."
    );
  }
}

function initializeOrValidate(database) {
  const applicationId = sqliteValue(
    database,
    "PRAGMA application_id"
  );
  const userVersion = sqliteValue(database, "PRAGMA user_version");
  const userTableCount = database
    .prepare(
      `SELECT COUNT(*) AS count
       FROM sqlite_master
       WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`
    )
    .get().count;
  if (
    applicationId === 0 &&
    userVersion === 0 &&
    userTableCount === 0
  ) {
    try {
      database.exec(`BEGIN IMMEDIATE; ${INITIAL_SCHEMA} COMMIT;`);
    } catch (cause) {
      try {
        database.exec("ROLLBACK");
      } catch {
        // The initialization transaction may already be closed.
      }
      throw persistenceFailure(
        "SQLite event-store schema initialization failed.",
        cause
      );
    }
  }
  validateStoreIdentity(database);
}

async function prepareDatabaseFile(directory, fileName) {
  const normalizedDirectory = path.resolve(
    requiredString(directory, "SQLite event-store directory", {
      max: 4_096
    })
  );
  const normalizedFileName = requiredString(
    fileName,
    "SQLite event-store filename",
    {
      max: 120,
      pattern: /^[a-zA-Z0-9][a-zA-Z0-9._-]+$/
    }
  );
  await mkdir(normalizedDirectory, { recursive: true, mode: 0o700 });
  const filePath = path.join(normalizedDirectory, normalizedFileName);
  try {
    const handle = await openFile(filePath, "wx", 0o600);
    await handle.close();
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
  }
  const fileStat = await lstat(filePath);
  if (fileStat.isSymbolicLink() || !fileStat.isFile()) {
    throw new IntegrityError(
      "SQLite event-store path must be a regular file."
    );
  }
  await chmod(filePath, 0o600);
  return filePath;
}

export class SqliteEventStore {
  static async open({
    directory,
    fileName = "events.sqlite",
    clock = () => new Date(),
    idFactory = createId
  }) {
    if (typeof clock !== "function" || typeof idFactory !== "function") {
      throw new ValidationError(
        "SQLite event store requires clock and ID factory functions."
      );
    }
    validClockValue(clock, "SQLite event-store clock");
    const filePath = await prepareDatabaseFile(directory, fileName);
    let database;
    try {
      database = new DatabaseSync(filePath, {
        allowExtension: false,
        enableForeignKeyConstraints: true,
        enableDoubleQuotedStringLiterals: false
      });
      database.exec(`
        PRAGMA journal_mode = DELETE;
        PRAGMA synchronous = FULL;
        PRAGMA foreign_keys = ON;
        PRAGMA trusted_schema = OFF;
      `);
      initializeOrValidate(database);
      quickCheck(database);
      const rows = database
        .prepare(
          `SELECT sequence, id, transaction_id, event_json,
                  hash, previous_hash
           FROM fdos_events
           ORDER BY sequence`
        )
        .all();
      const events = parseEventRows(rows);
      const transactionRows = database
        .prepare(
          `SELECT id, started_at, committed_at, event_count,
                  first_sequence, last_sequence, head_hash
           FROM fdos_transactions
           ORDER BY first_sequence, id`
        )
        .all();
      verifyTransactionRows(events, transactionRows);
      return new SqliteEventStore({
        filePath,
        database,
        events,
        clock,
        idFactory
      });
    } catch (error) {
      try {
        database?.close();
      } catch {
        // Preserve the original open or validation error.
      }
      if (
        error instanceof ValidationError ||
        error instanceof IntegrityError ||
        error instanceof PersistenceError
      ) {
        throw error;
      }
      throw persistenceFailure(
        "SQLite event store could not be opened.",
        error
      );
    }
  }

  #database;
  #events;
  #clock;
  #idFactory;
  #pending;
  #transactionStorage;
  #activeTransaction;
  #recoveryRequired;
  #closed;
  #insertEvent;
  #insertTransaction;
  #commitTransaction;

  constructor({
    filePath,
    database,
    events,
    clock,
    idFactory
  }) {
    this.filePath = filePath;
    this.#database = database;
    this.#events = events;
    this.#clock = clock;
    this.#idFactory = idFactory;
    this.#pending = Promise.resolve();
    this.#transactionStorage = new AsyncLocalStorage();
    this.#activeTransaction = null;
    this.#recoveryRequired = false;
    this.#closed = false;
    this.#insertEvent = database.prepare(
      `INSERT INTO fdos_events(
         sequence, id, transaction_id, event_json, hash, previous_hash
       ) VALUES (?, ?, ?, ?, ?, ?)`
    );
    this.#insertTransaction = database.prepare(
      `INSERT INTO fdos_transactions(
         id, started_at, committed_at, event_count,
         first_sequence, last_sequence, head_hash
       ) VALUES (?, ?, NULL, 0, NULL, NULL, NULL)`
    );
    this.#commitTransaction = database.prepare(
      `UPDATE fdos_transactions
       SET committed_at = ?, event_count = ?, first_sequence = ?,
           last_sequence = ?, head_hash = ?
       WHERE id = ? AND committed_at IS NULL`
    );
  }

  assertOpen() {
    if (this.#closed) {
      throw new ConflictError("SQLite event store is closed.");
    }
  }

  assertWritable() {
    this.assertOpen();
    if (this.#recoveryRequired) {
      throw new PersistenceError(
        "SQLite event store requires close and reopen before another write.",
        { outcome: "uncertain" }
      );
    }
  }

  async append({ type, actor, subject, payload }) {
    this.assertWritable();
    const context = this.#transactionStorage.getStore();
    if (
      this.#activeTransaction &&
      context !== this.#activeTransaction
    ) {
      throw new ConflictError(
        "Event append is outside the active transaction context."
      );
    }
    if (!this.#activeTransaction && context) {
      throw new ConflictError(
        "Event append uses a stale transaction context."
      );
    }
    const owningTransaction = this.#activeTransaction;
    const operation = this.#pending.then(() => {
      this.assertWritable();
      const event = createAuditEvent({
        currentEvents: this.#events,
        clock: this.#clock,
        idFactory: this.#idFactory,
        type,
        actor,
        subject,
        payload,
        transactionId: owningTransaction?.id || null
      });
      try {
        this.#insertEvent.run(
          event.sequence,
          event.id,
          event.transactionId || null,
          canonicalJson(event),
          event.hash,
          event.previousHash
        );
      } catch (cause) {
        throw persistenceFailure(
          "SQLite event append failed.",
          cause
        );
      }
      this.#events.push(event);
      return jsonClone(event);
    });
    operation.catch((error) => {
      if (owningTransaction) owningTransaction.failure = error;
    });
    this.#pending = operation.catch(() => undefined);
    return operation;
  }

  async #savepoint(activeTransaction, operation) {
    if (
      this.#transactionStorage.getStore() !== activeTransaction ||
      this.#activeTransaction !== activeTransaction
    ) {
      throw new ConflictError(
        "Savepoint is outside the active transaction."
      );
    }
    if (activeTransaction.savepointActive) {
      throw new ConflictError("Nested savepoints are denied.");
    }
    await this.#pending;
    activeTransaction.savepointActive = true;
    const baseLength = this.#events.length;
    try {
      this.#database.exec(`SAVEPOINT ${SAVEPOINT_NAME}`);
      const result = await operation();
      await this.#pending;
      if (activeTransaction.failure) {
        throw activeTransaction.failure;
      }
      this.#database.exec(`RELEASE ${SAVEPOINT_NAME}`);
      return result;
    } catch (error) {
      try {
        await this.#pending;
        this.#database.exec(
          `ROLLBACK TO ${SAVEPOINT_NAME}; RELEASE ${SAVEPOINT_NAME}`
        );
      } catch (cause) {
        activeTransaction.failure = persistenceFailure(
          "SQLite savepoint rollback failed.",
          cause
        );
      }
      this.#events.length = baseLength;
      throw activeTransaction.failure || error;
    } finally {
      activeTransaction.savepointActive = false;
    }
  }

  async transaction(operation) {
    this.assertWritable();
    if (typeof operation !== "function") {
      throw new ValidationError(
        "SQLite transaction requires an operation function."
      );
    }
    await this.#pending;
    if (this.#activeTransaction) {
      throw new ConflictError("Nested SQLite transactions are denied.");
    }
    const id = transactionId(this.#idFactory("transaction"));
    const startedAt = validClockValue(
      this.#clock,
      "SQLite transaction clock"
    ).toISOString();
    const baseLength = this.#events.length;
    const activeTransaction = {
      id,
      startedAt,
      baseLength,
      failure: null,
      savepointActive: false
    };
    let finalizationPhase = null;
    try {
      this.#database.exec("BEGIN IMMEDIATE");
      this.#insertTransaction.run(id, startedAt);
    } catch (cause) {
      try {
        this.#database.exec("ROLLBACK");
      } catch {
        // The transaction may not have started.
      }
      throw persistenceFailure(
        "SQLite transaction could not begin.",
        cause
      );
    }
    this.#activeTransaction = activeTransaction;
    const control = Object.freeze({
      id,
      savepoint: (savepointOperation) =>
        this.#savepoint(activeTransaction, savepointOperation)
    });
    try {
      const result = await this.#transactionStorage.run(
        activeTransaction,
        () => operation(control)
      );
      await this.#pending;
      if (activeTransaction.failure) {
        throw activeTransaction.failure;
      }
      const eventCount = this.#events.length - baseLength;
      if (eventCount === 0) {
        throw new IntegrityError(
          `SQLite transaction ${id} contains no audit event.`
        );
      }
      const firstSequence =
        baseLength + 1;
      const lastSequence =
        this.#events.length;
      const headHash =
        this.#events.at(-1).hash;
      const committedAt = validClockValue(
        this.#clock,
        "SQLite transaction clock"
      ).toISOString();
      finalizationPhase = "metadata";
      const update = this.#commitTransaction.run(
        committedAt,
        eventCount,
        firstSequence,
        lastSequence,
        headHash,
        id
      );
      if (update.changes !== 1) {
        throw new IntegrityError(
          `SQLite transaction ${id} could not be finalized.`
        );
      }
      finalizationPhase = "commit";
      this.#database.exec("COMMIT");
      finalizationPhase = null;
      this.#activeTransaction = null;
      return result;
    } catch (error) {
      let rollbackCompleted = false;
      try {
        await this.#pending;
        this.#database.exec("ROLLBACK");
        rollbackCompleted = true;
      } catch {
        // A failed rollback leaves finalization outcome uncertain.
      }
      this.#activeTransaction = null;
      try {
        this.#reload();
      } catch (reloadError) {
        this.#recoveryRequired = true;
        throw persistenceFailure(
          "SQLite transaction outcome and reload are uncertain.",
          reloadError
        );
      }
      if (!rollbackCompleted) {
        this.#recoveryRequired = true;
        throw new PersistenceError(
          "SQLite rollback was not confirmed; close and reopen are required.",
          {
            transactionId: id,
            outcome: "uncertain",
            causeName: error?.name || "Error",
            causeMessage: String(error?.message || error || "unknown")
          }
        );
      }
      if (
        finalizationPhase &&
        !(error instanceof IntegrityError) &&
        !(error instanceof PersistenceError)
      ) {
        throw new PersistenceError(
          "SQLite transaction finalization failed; visible state was reloaded.",
          {
            transactionId: id,
            phase: finalizationPhase,
            outcome: rollbackCompleted
              ? "rolled-back"
              : "uncertain",
            causeName: error?.name || "Error",
            causeMessage: String(error?.message || error || "unknown")
          }
        );
      }
      throw error;
    }
  }

  #eventRows() {
    return this.#database
      .prepare(
        `SELECT sequence, id, transaction_id, event_json,
                hash, previous_hash
         FROM fdos_events
         ORDER BY sequence`
      )
      .all();
  }

  #transactionRows() {
    return this.#database
      .prepare(
        `SELECT id, started_at, committed_at, event_count,
                first_sequence, last_sequence, head_hash
         FROM fdos_transactions
         ORDER BY first_sequence, id`
      )
      .all();
  }

  #reload() {
    quickCheck(this.#database);
    this.#events = parseEventRows(this.#eventRows());
    verifyTransactionRows(this.#events, this.#transactionRows());
  }

  all() {
    this.assertOpen();
    return this.#events.map(jsonClone);
  }

  since(sequence = 0) {
    this.assertOpen();
    if (!Number.isInteger(sequence) || sequence < 0) {
      throw new ValidationError(
        "Event sequence must be a non-negative integer."
      );
    }
    return this.#events.slice(sequence).map(jsonClone);
  }

  lastHash() {
    this.assertOpen();
    return this.#events.at(-1)?.hash || null;
  }

  verify() {
    this.assertOpen();
    quickCheck(this.#database);
    verifyAuditEventChain(this.#events);
    verifyTransactionRows(
      this.#events,
      this.#transactionRows(),
      this.#activeTransaction?.id || null
    );
    return {
      valid: true,
      eventCount: this.#events.length,
      headHash: this.lastHash()
    };
  }

  status() {
    this.assertOpen();
    const transactionRows = this.#transactionRows();
    const committedTransactions = transactionRows.filter(
      (row) => row.committed_at !== null
    ).length;
    return {
      kind: "sqlite",
      schemaVersion: STORE_SCHEMA_VERSION,
      transactional: true,
      transactionCount: transactionRows.length,
      committedTransactionCount: committedTransactions,
      transactionActive: this.#activeTransaction !== null,
      recoveryRequired: this.#recoveryRequired
    };
  }

  inTransaction() {
    return this.#activeTransaction !== null;
  }

  async close() {
    await this.#pending;
    if (this.#activeTransaction) {
      throw new ConflictError(
        "SQLite event store cannot close during a transaction."
      );
    }
    if (this.#closed) return false;
    try {
      this.#database.close();
    } catch (cause) {
      throw persistenceFailure(
        "SQLite event store could not close.",
        cause
      );
    }
    this.#closed = true;
    return true;
  }
}
