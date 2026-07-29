import assert from "node:assert/strict";
import {
  mkdir,
  mkdtemp,
  rm,
  symlink,
  writeFile
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  ConflictError,
  IntegrityError,
  openPilotRuntime,
  RuntimeDirectoryLease
} from "../src/index.js";

async function leaseDirectory(testContext) {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "fdos-runtime-lease-")
  );
  testContext.after(async () => {
    await rm(directory, { recursive: true, force: true });
  });
  return directory;
}

test("runtime lease grants one exact owner and requires exact release", async (t) => {
  const directory = await leaseDirectory(t);
  const first = new RuntimeDirectoryLease(directory);
  const second = new RuntimeDirectoryLease(directory);
  const ownership = await first.acquire();

  await assert.rejects(() => second.acquire(), ConflictError);
  assert.equal(
    await second.release("00000000-0000-4000-8000-000000000000"),
    false
  );
  assert.equal(await first.release(ownership.id), true);
  assert.equal(await first.release(ownership.id), false);
});

test("expired lease is reclaimed only when its process is no longer alive", async (t) => {
  const directory = await leaseDirectory(t);
  const oldTime = new Date("2026-07-29T08:00:00.000Z");
  const later = new Date("2026-07-29T08:00:02.000Z");
  const first = new RuntimeDirectoryLease(directory, {
    ttlMs: 1_000,
    clock: () => oldTime
  });
  const ownership = await first.acquire(oldTime);

  const aliveProbe = new RuntimeDirectoryLease(directory, {
    ttlMs: 1_000,
    clock: () => later,
    processIsAlive: () => true
  });
  await assert.rejects(() => aliveProbe.acquire(later), ConflictError);

  const deadProbe = new RuntimeDirectoryLease(directory, {
    ttlMs: 1_000,
    clock: () => later,
    processIsAlive: () => false
  });
  const replacement = await deadProbe.acquire(later);
  assert.notEqual(replacement.id, ownership.id);
  assert.equal(await first.release(ownership.id), false);
  assert.equal(await deadProbe.release(replacement.id), true);
});

test("malformed or non-directory lease paths fail closed", async (t) => {
  const malformedDirectory = await leaseDirectory(t);
  const lockDirectory = path.join(
    malformedDirectory,
    ".fdos-runtime.lock"
  );
  await mkdir(lockDirectory);
  await writeFile(path.join(lockDirectory, "owner.json"), "{broken}\n");
  const malformed = new RuntimeDirectoryLease(malformedDirectory);
  await assert.rejects(() => malformed.acquire(), IntegrityError);

  if (process.platform === "win32") return;
  const symlinkDirectory = await leaseDirectory(t);
  await symlink(
    malformedDirectory,
    path.join(symlinkDirectory, ".fdos-runtime.lock")
  );
  const linked = new RuntimeDirectoryLease(symlinkDirectory);
  await assert.rejects(() => linked.acquire(), IntegrityError);
});

test("FDOS runtime prevents a concurrent process owner and reopens after close", async (t) => {
  const directory = await leaseDirectory(t);
  const first = await openPilotRuntime({ directory });
  await assert.rejects(
    () => openPilotRuntime({ directory }),
    ConflictError
  );
  assert.equal(first.status().runtimeLeaseHeld, true);
  assert.equal(await first.close(), true);
  assert.equal(await first.close(), false);

  const reopened = await openPilotRuntime({ directory });
  assert.equal(reopened.status().runtimeLeaseHeld, true);
  await reopened.close();
});

test("closed runtime rejects queued mutation instead of writing without a lease", async (t) => {
  const directory = await leaseDirectory(t);
  const runtime = await openPilotRuntime({ directory });
  await runtime.close();
  await assert.rejects(
    () =>
      runtime.startWorkflow({
        actor: { type: "human", id: "human:test-owner" },
        workflowId: "company.software-change-readiness",
        version: "1.0.0-experimental",
        objective: "Must remain closed.",
        input: {}
      }),
    ConflictError
  );
});
