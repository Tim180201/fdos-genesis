import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import {
  readFile,
  mkdtemp,
  rm,
  stat,
  symlink,
  writeFile
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  ConflictError,
  IntegrityError,
  SqliteEventStore,
  ValidationError,
  deterministicIdFactory
} from "../src/index.js";

const actor = Object.freeze({
  type: "system",
  id: "sqlite-test-system"
});

async function storeDirectory(testContext) {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "fdos-sqlite-store-")
  );
  testContext.after(async () => {
    await rm(directory, { recursive: true, force: true });
  });
  return directory;
}

async function childExit(child) {
  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });
  return new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      resolve({ code, signal, stderr });
    });
  });
}

test("SQLite store commits a contiguous hash-chained transaction", async (t) => {
  const directory = await storeDirectory(t);
  const store = await SqliteEventStore.open({
    directory,
    clock: () => new Date("2026-07-29T10:00:00.000Z"),
    idFactory: deterministicIdFactory("sqlite")
  });
  const transaction = await store.transaction(async (control) => {
    const first = await store.append({
      type: "test.first",
      actor,
      subject: "subject_000001",
      payload: { value: 1 }
    });
    const second = await store.append({
      type: "test.second",
      actor,
      subject: "subject_000002",
      payload: { value: 2 }
    });
    return { id: control.id, first, second };
  });
  assert.equal(transaction.first.transactionId, transaction.id);
  assert.equal(transaction.second.transactionId, transaction.id);
  assert.equal(
    transaction.second.previousHash,
    transaction.first.hash
  );
  assert.deepEqual(store.status(), {
    kind: "sqlite",
    schemaVersion: "1.0",
    transactional: true,
    transactionCount: 1,
    committedTransactionCount: 1,
    transactionActive: false,
    recoveryRequired: false
  });
  assert.equal(store.verify().eventCount, 2);
  assert.equal((await stat(store.filePath)).mode & 0o777, 0o600);
  await store.close();

  const reopened = await SqliteEventStore.open({ directory });
  assert.equal(reopened.all().length, 2);
  assert.equal(reopened.status().transactionCount, 1);
  assert.equal(reopened.verify().headHash, transaction.second.hash);
  await reopened.close();
});

test("SQLite store rejects a symbolic-link database path without touching its target", async (t) => {
  const directory = await storeDirectory(t);
  const targetPath = path.join(directory, "protected-target");
  const storePath = path.join(directory, "events.sqlite");
  await writeFile(targetPath, "protected-content", { mode: 0o600 });
  await symlink(targetPath, storePath);

  await assert.rejects(
    () => SqliteEventStore.open({ directory }),
    IntegrityError
  );
  assert.equal(
    await readFile(targetPath, "utf8"),
    "protected-content"
  );
});

test("SQLite transaction rollback removes every staged event", async (t) => {
  const directory = await storeDirectory(t);
  const store = await SqliteEventStore.open({ directory });
  await assert.rejects(
    () =>
      store.transaction(async () => {
        await store.append({
          type: "test.must-rollback",
          actor,
          subject: "subject_000001",
          payload: { staged: true }
        });
        throw new ValidationError("Controlled rollback.");
      }),
    ValidationError
  );
  assert.equal(store.all().length, 0);
  assert.equal(store.status().transactionCount, 0);
  const later = await store.append({
    type: "test.after-rollback",
    actor,
    subject: "subject_000002",
    payload: { staged: false }
  });
  assert.equal(later.sequence, 1);
  assert.equal(later.previousHash, null);
  assert.equal(later.transactionId, undefined);
  await store.close();
});

test("SQLite store rejects empty transactions and stale transaction contexts", async (t) => {
  const directory = await storeDirectory(t);
  const store = await SqliteEventStore.open({ directory });
  await assert.rejects(
    () => store.transaction(async () => {}),
    IntegrityError
  );
  assert.equal(store.status().transactionCount, 0);

  let delayedAppend;
  await store.transaction(async () => {
    await store.append({
      type: "test.accepted",
      actor,
      subject: "subject_000001",
      payload: { accepted: true }
    });
    assert.deepEqual(store.status(), {
      kind: "sqlite",
      schemaVersion: "1.0",
      transactional: true,
      transactionCount: 1,
      committedTransactionCount: 0,
      transactionActive: true,
      recoveryRequired: false
    });
    await assert.rejects(
      () =>
        store.transaction(() =>
          store.append({
            type: "test.nested",
            actor,
            subject: "subject_000001",
            payload: { accepted: false }
          })
        ),
      ConflictError
    );
    delayedAppend = new Promise((resolve) => {
      setImmediate(async () => {
        try {
          await store.append({
            type: "test.stale-context",
            actor,
            subject: "subject_000001",
            payload: { accepted: false }
          });
          resolve(null);
        } catch (error) {
          resolve(error);
        }
      });
    });
  });
  assert.ok((await delayedAppend) instanceof ConflictError);
  assert.deepEqual(
    store.all().map((event) => event.type),
    ["test.accepted"]
  );
  await store.close();
});

test("SQLite store rejects close and append outside the active transaction context", async (t) => {
  const directory = await storeDirectory(t);
  const store = await SqliteEventStore.open({ directory });
  let enterTransaction;
  let releaseTransaction;
  const entered = new Promise((resolve) => {
    enterTransaction = resolve;
  });
  const release = new Promise((resolve) => {
    releaseTransaction = resolve;
  });
  const transaction = store.transaction(async () => {
    await store.append({
      type: "test.inside",
      actor,
      subject: "subject_000001",
      payload: { inside: true }
    });
    enterTransaction();
    await release;
  });
  await entered;
  await assert.rejects(
    () =>
      store.append({
        type: "test.outside",
        actor,
        subject: "subject_000002",
        payload: { outside: true }
      }),
    ConflictError
  );
  await assert.rejects(
    () => store.close(),
    ConflictError
  );
  releaseTransaction();
  await transaction;
  assert.deepEqual(
    store.all().map((event) => event.type),
    ["test.inside"]
  );
  await store.close();
});

test("SQLite savepoint keeps acceptance but removes failed command effects", async (t) => {
  const directory = await storeDirectory(t);
  const store = await SqliteEventStore.open({ directory });
  await store.transaction(async (transaction) => {
    await store.append({
      type: "test.accepted",
      actor,
      subject: "subject_000001",
      payload: { accepted: true }
    });
    await assert.rejects(
      () =>
        transaction.savepoint(async () => {
          await store.append({
            type: "test.partial-effect",
            actor,
            subject: "subject_000001",
            payload: { mustPersist: false }
          });
          throw new ConflictError("Controlled business failure.");
        }),
      ConflictError
    );
    await store.append({
      type: "test.failed",
      actor,
      subject: "subject_000001",
      payload: { failed: true }
    });
  });
  const events = store.all();
  assert.deepEqual(
    events.map((event) => event.type),
    ["test.accepted", "test.failed"]
  );
  assert.equal(events[0].transactionId, events[1].transactionId);
  assert.equal(store.status().transactionCount, 1);
  await store.close();
});

test("process exit rolls back an uncommitted SQLite transaction", async (t) => {
  const directory = await storeDirectory(t);
  const moduleUrl = new URL(
    "../src/kernel/sqlite-event-store.js",
    import.meta.url
  ).href;
  const script = `
    import { SqliteEventStore } from ${JSON.stringify(moduleUrl)};
    const store = await SqliteEventStore.open({
      directory: ${JSON.stringify(directory)}
    });
    await store.transaction(async () => {
      await store.append({
        type: "test.crash",
        actor: { type: "system", id: "crash-test-system" },
        subject: "subject_000001",
        payload: { committed: false }
      });
      process.exit(23);
    });
  `;
  const child = spawn(
    process.execPath,
    ["--input-type=module", "-e", script],
    { stdio: ["ignore", "ignore", "pipe"] }
  );
  const outcome = await childExit(child);
  assert.equal(outcome.code, 23, outcome.stderr);

  const reopened = await SqliteEventStore.open({ directory });
  assert.equal(reopened.all().length, 0);
  assert.equal(reopened.status().transactionCount, 0);
  assert.equal(reopened.verify().eventCount, 0);
  await reopened.close();
});

test("SQLite event-content tampering is rejected on reopen", async (t) => {
  const directory = await storeDirectory(t);
  const store = await SqliteEventStore.open({ directory });
  await store.transaction(() =>
    store.append({
      type: "test.recorded",
      actor,
      subject: "subject_000001",
      payload: { approved: false }
    })
  );
  const filePath = store.filePath;
  await store.close();

  const database = new DatabaseSync(filePath);
  database
    .prepare(
      `UPDATE fdos_events
       SET event_json = replace(
         event_json,
         '"approved":false',
         '"approved":true'
       )
       WHERE sequence = 1`
    )
    .run();
  database.close();
  await assert.rejects(
    () => SqliteEventStore.open({ directory }),
    IntegrityError
  );
});

test("SQLite transaction-metadata tampering is rejected on reopen", async (t) => {
  const directory = await storeDirectory(t);
  const store = await SqliteEventStore.open({ directory });
  await store.transaction(() =>
    store.append({
      type: "test.recorded",
      actor,
      subject: "subject_000001",
      payload: { value: 1 }
    })
  );
  const filePath = store.filePath;
  await store.close();

  const database = new DatabaseSync(filePath);
  database
    .prepare(
      `UPDATE fdos_transactions
       SET event_count = 2`
    )
    .run();
  database.close();
  await assert.rejects(
    () => SqliteEventStore.open({ directory }),
    IntegrityError
  );

  const versionTamper = new DatabaseSync(filePath);
  versionTamper
    .prepare(
      `UPDATE fdos_transactions
       SET event_count = 1`
    )
    .run();
  versionTamper.exec("PRAGMA user_version = 2");
  versionTamper.close();
  await assert.rejects(
    () => SqliteEventStore.open({ directory }),
    IntegrityError
  );
});
