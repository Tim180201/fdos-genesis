import assert from "node:assert/strict";
import {
  chmod,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  EventLog,
  IntegrityError,
  deterministicIdFactory
} from "../src/index.js";

async function eventDirectory(testContext) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "fdos-event-log-"));
  testContext.after(async () => {
    await rm(directory, { recursive: true, force: true });
  });
  return directory;
}

const actor = Object.freeze({ type: "system", id: "test-system" });

test("event log persists and verifies an ordered hash chain", async (t) => {
  const directory = await eventDirectory(t);
  const log = await EventLog.open({
    directory,
    clock: () => new Date("2026-07-29T09:00:00.000Z"),
    idFactory: deterministicIdFactory("eventlog")
  });
  const results = await Promise.all([
    log.append({
      type: "test.first",
      actor,
      subject: "subject_000001",
      payload: { value: 1 }
    }),
    log.append({
      type: "test.second",
      actor,
      subject: "subject_000002",
      payload: { value: 2 }
    })
  ]);
  assert.deepEqual(
    results.map((event) => event.sequence),
    [1, 2]
  );
  assert.equal(results[1].previousHash, results[0].hash);
  assert.deepEqual(log.verify(), {
    valid: true,
    eventCount: 2,
    headHash: results[1].hash
  });

  const reopened = await EventLog.open({ directory });
  assert.equal(reopened.all().length, 2);
  assert.equal(reopened.verify().headHash, results[1].hash);
});

test("event log file is restricted to the local account", async (t) => {
  const directory = await eventDirectory(t);
  const log = await EventLog.open({ directory });
  const mode = (await stat(log.filePath)).mode & 0o777;
  assert.equal(mode, 0o600);
});

test("event log detects payload tampering on reopen", async (t) => {
  const directory = await eventDirectory(t);
  const log = await EventLog.open({ directory });
  await log.append({
    type: "test.recorded",
    actor,
    subject: "subject_000001",
    payload: { approved: false }
  });
  const source = await readFile(log.filePath, "utf8");
  await writeFile(log.filePath, source.replace('"approved":false', '"approved":true'));
  await assert.rejects(() => EventLog.open({ directory }), IntegrityError);
});

test("event log rejects malformed persisted JSON", async (t) => {
  const directory = await eventDirectory(t);
  const log = await EventLog.open({ directory });
  await chmod(log.filePath, 0o600);
  await writeFile(log.filePath, "{not-json}\n", "utf8");
  await assert.rejects(() => EventLog.open({ directory }), IntegrityError);
});
