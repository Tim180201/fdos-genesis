import crypto from "node:crypto";
import {
  constants,
  lstat,
  mkdir,
  open,
  readdir,
  rename,
  rmdir,
  unlink
} from "node:fs/promises";
import path from "node:path";
import { immutableJson } from "./canonical-json.js";
import {
  ConflictError,
  IntegrityError,
  ValidationError
} from "./errors.js";
import {
  assertPlainObject,
  isoDate,
  requiredString
} from "./validation.js";

const LEASE_SCHEMA_VERSION = "1.0";
const OWNER_FILE = "owner.json";
const RECLAIM_FILE = "reclaim.json";
const RELEASE_FILE = "release.json";
const DEFAULT_TTL_MS = 30 * 60 * 1000;
const MAX_LEASE_FILE_BYTES = 4 * 1024;

function defaultProcessIsAlive(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code !== "ESRCH";
  }
}

function clockValue(clock) {
  const now = clock();
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
    throw new ValidationError("Runtime-lease clock returned an invalid date.");
  }
  return now;
}

function validateLease(value) {
  assertPlainObject(value, "runtime lease");
  const keys = Object.keys(value).sort();
  const expectedKeys = [
    "acquiredAt",
    "expiresAt",
    "id",
    "pid",
    "schemaVersion"
  ];
  if (
    keys.length !== expectedKeys.length ||
    keys.some((key, index) => key !== expectedKeys[index])
  ) {
    throw new IntegrityError("Runtime lease has an unexpected shape.");
  }
  if (value.schemaVersion !== LEASE_SCHEMA_VERSION) {
    throw new IntegrityError("Runtime lease schema is unsupported.");
  }
  const id = requiredString(value.id, "runtime lease id", {
    max: 64,
    pattern: /^[0-9a-f-]{36}$/
  });
  if (!Number.isSafeInteger(value.pid) || value.pid <= 0) {
    throw new IntegrityError("Runtime lease PID is invalid.");
  }
  const acquiredAt = isoDate(value.acquiredAt, "runtime lease acquiredAt");
  const expiresAt = isoDate(value.expiresAt, "runtime lease expiresAt");
  if (Date.parse(expiresAt) <= Date.parse(acquiredAt)) {
    throw new IntegrityError("Runtime lease expiration is invalid.");
  }
  return immutableJson({
    schemaVersion: LEASE_SCHEMA_VERSION,
    id,
    pid: value.pid,
    acquiredAt,
    expiresAt
  });
}

async function writeExclusiveJson(filePath, value) {
  const handle = await open(
    filePath,
    constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL,
    0o600
  );
  try {
    await handle.writeFile(`${JSON.stringify(value)}\n`, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
}

async function removeKnownDirectory(directory, fileNames) {
  for (const fileName of fileNames) {
    await unlink(path.join(directory, fileName)).catch((error) => {
      if (error?.code !== "ENOENT") throw error;
    });
  }
  await rmdir(directory).catch((error) => {
    if (error?.code !== "ENOENT") throw error;
  });
}

function activeLeaseError(lease) {
  return new ConflictError("Another FDOS runtime owns this event store.", {
    acquiredAt: lease?.acquiredAt || null,
    expiresAt: lease?.expiresAt || null
  });
}

export class RuntimeDirectoryLease {
  constructor(
    directory,
    {
      ttlMs = DEFAULT_TTL_MS,
      clock = () => new Date(),
      processIsAlive = defaultProcessIsAlive,
      lockDirectoryName = ".fdos-runtime.lock"
    } = {}
  ) {
    this.directory = path.resolve(
      requiredString(directory, "runtime lease directory", { max: 4_096 })
    );
    this.lockDirectoryName = requiredString(
      lockDirectoryName,
      "runtime lock directory name",
      {
        max: 120,
        pattern: /^\.[a-z0-9][a-z0-9._-]+$/
      }
    );
    if (
      !Number.isSafeInteger(ttlMs) ||
      ttlMs < 1_000 ||
      ttlMs > 24 * 60 * 60 * 1000
    ) {
      throw new ValidationError(
        "Runtime lease TTL must be between one second and 24 hours."
      );
    }
    if (typeof clock !== "function" || typeof processIsAlive !== "function") {
      throw new ValidationError(
        "Runtime lease clock and process probe must be functions."
      );
    }
    this.ttlMs = ttlMs;
    this.clock = clock;
    this.processIsAlive = processIsAlive;
    this.lockDirectory = path.join(
      this.directory,
      this.lockDirectoryName
    );
  }

  createLease(now = clockValue(this.clock)) {
    return immutableJson({
      schemaVersion: LEASE_SCHEMA_VERSION,
      id: crypto.randomUUID(),
      pid: process.pid,
      acquiredAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + this.ttlMs).toISOString()
    });
  }

  async readOwner(directory = this.lockDirectory) {
    let directoryStat;
    try {
      directoryStat = await lstat(directory);
    } catch (error) {
      if (error?.code === "ENOENT") return null;
      throw error;
    }
    if (!directoryStat.isDirectory() || directoryStat.isSymbolicLink()) {
      throw new IntegrityError("Runtime lease path is not a real directory.");
    }

    const ownerPath = path.join(directory, OWNER_FILE);
    let handle;
    try {
      handle = await open(ownerPath, constants.O_RDONLY | constants.O_NOFOLLOW);
    } catch (error) {
      if (error?.code === "ENOENT") {
        throw new IntegrityError("Runtime lease has no owner record.");
      }
      if (error?.code === "ELOOP") {
        throw new IntegrityError("Runtime lease owner must not be a symlink.");
      }
      throw error;
    }
    try {
      const ownerStat = await handle.stat();
      if (
        !ownerStat.isFile() ||
        ownerStat.size < 2 ||
        ownerStat.size > MAX_LEASE_FILE_BYTES
      ) {
        throw new IntegrityError("Runtime lease owner record is invalid.");
      }
      const source = await handle.readFile("utf8");
      let parsed;
      try {
        parsed = JSON.parse(source);
      } catch {
        throw new IntegrityError("Runtime lease owner record is malformed.");
      }
      return validateLease(parsed);
    } finally {
      await handle.close();
    }
  }

  isSafelyStale(lease, now) {
    return (
      Date.parse(lease.expiresAt) <= now.getTime() &&
      !this.processIsAlive(lease.pid)
    );
  }

  async assertExpectedFiles(expected) {
    const actual = (await readdir(this.lockDirectory)).sort();
    const normalizedExpected = [...expected].sort();
    if (
      actual.length !== normalizedExpected.length ||
      actual.some((entry, index) => entry !== normalizedExpected[index])
    ) {
      throw new IntegrityError(
        "Runtime lease directory contains unexpected files."
      );
    }
  }

  async installFreshLease(lease) {
    const stagingDirectory = path.join(
      this.directory,
      `${this.lockDirectoryName}.acquire-${lease.id}`
    );
    await mkdir(stagingDirectory, { mode: 0o700 });
    try {
      await writeExclusiveJson(
        path.join(stagingDirectory, OWNER_FILE),
        lease
      );
      try {
        await rename(stagingDirectory, this.lockDirectory);
        return true;
      } catch (error) {
        const current = await this.readOwner().catch((readError) => {
          if (readError instanceof IntegrityError) throw readError;
          return null;
        });
        if (!current) throw error;
        await removeKnownDirectory(stagingDirectory, [OWNER_FILE]);
        return false;
      }
    } catch (error) {
      await removeKnownDirectory(stagingDirectory, [OWNER_FILE]).catch(
        () => {}
      );
      throw error;
    }
  }

  async reclaim(current, now) {
    const marker = {
      leaseId: current.id,
      contenderPid: process.pid,
      requestedAt: now.toISOString()
    };
    try {
      await writeExclusiveJson(
        path.join(this.lockDirectory, RECLAIM_FILE),
        marker
      );
    } catch (error) {
      if (error?.code === "EEXIST") throw activeLeaseError(current);
      throw error;
    }

    let moved = false;
    try {
      const lockedOwner = await this.readOwner();
      if (
        lockedOwner.id !== current.id ||
        !this.isSafelyStale(lockedOwner, now)
      ) {
        throw activeLeaseError(lockedOwner);
      }
      await this.assertExpectedFiles([OWNER_FILE, RECLAIM_FILE]);
      const reclaimedDirectory = path.join(
        this.directory,
        `${this.lockDirectoryName}.reclaimed-${crypto.randomUUID()}`
      );
      await rename(this.lockDirectory, reclaimedDirectory);
      moved = true;
      await removeKnownDirectory(reclaimedDirectory, [
        OWNER_FILE,
        RECLAIM_FILE
      ]);
      return true;
    } catch (error) {
      if (!moved) {
        await unlink(path.join(this.lockDirectory, RECLAIM_FILE)).catch(
          () => {}
        );
      }
      throw error;
    }
  }

  async acquire(now = clockValue(this.clock)) {
    if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
      throw new ValidationError("Runtime lease acquisition date is invalid.");
    }
    await mkdir(this.directory, { recursive: true, mode: 0o700 });

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const lease = this.createLease(now);
      if (await this.installFreshLease(lease)) return lease;
      const current = await this.readOwner();
      if (!current) continue;
      if (attempt === 0 && this.isSafelyStale(current, now)) {
        await this.reclaim(current, now);
        continue;
      }
      throw activeLeaseError(current);
    }
    throw activeLeaseError(await this.readOwner());
  }

  async release(leaseId) {
    const normalizedLeaseId = requiredString(
      leaseId,
      "runtime lease release id",
      {
        max: 64,
        pattern: /^[0-9a-f-]{36}$/
      }
    );
    const current = await this.readOwner();
    if (!current || current.id !== normalizedLeaseId) return false;
    try {
      await writeExclusiveJson(
        path.join(this.lockDirectory, RELEASE_FILE),
        {
          leaseId: normalizedLeaseId,
          pid: process.pid,
          requestedAt: clockValue(this.clock).toISOString()
        }
      );
    } catch (error) {
      if (error?.code === "EEXIST") return false;
      throw error;
    }

    let moved = false;
    try {
      const lockedOwner = await this.readOwner();
      if (lockedOwner.id !== normalizedLeaseId) {
        throw new IntegrityError(
          "Runtime lease owner changed during release."
        );
      }
      await this.assertExpectedFiles([OWNER_FILE, RELEASE_FILE]);
      const releasedDirectory = path.join(
        this.directory,
        `${this.lockDirectoryName}.released-${crypto.randomUUID()}`
      );
      await rename(this.lockDirectory, releasedDirectory);
      moved = true;
      await removeKnownDirectory(releasedDirectory, [
        OWNER_FILE,
        RELEASE_FILE
      ]);
      return true;
    } catch (error) {
      if (!moved) {
        await unlink(path.join(this.lockDirectory, RELEASE_FILE)).catch(
          () => {}
        );
      }
      throw error;
    }
  }
}
