import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  rm,
  symlink,
  writeFile
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import {
  AuthorizationError,
  digestObject,
  GitReferenceSource,
  IntegrityError,
  PolicyError,
  ValidationError,
  verifyReferenceDocumentEvidence,
  verifyReferenceSnapshot
} from "../src/index.js";
import { createPilotHarness } from "../test-support/helpers.js";

const execute = promisify(execFile);
const fixedClock = () => new Date("2026-07-29T12:00:00.000Z");

async function git(directory, ...argumentsList) {
  return execute("git", argumentsList, {
    cwd: directory,
    env: {
      ...process.env,
      GIT_CONFIG_GLOBAL: os.devNull,
      GIT_CONFIG_NOSYSTEM: "1",
      GIT_TERMINAL_PROMPT: "0"
    }
  });
}

async function createRepository(testContext, files = {}) {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "fdos-reference-source-")
  );
  testContext.after(async () => {
    await rm(directory, { recursive: true, force: true });
  });
  await git(directory, "init", "--quiet");
  for (const [relativePath, content] of Object.entries(files)) {
    const filePath = path.join(directory, relativePath);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, content, "utf8");
  }
  await git(directory, "add", "--all");
  await git(
    directory,
    "-c",
    "user.name=FDOS Test",
    "-c",
    "user.email=fdos-test@example.invalid",
    "commit",
    "--quiet",
    "-m",
    "test baseline"
  );
  return directory;
}

async function openSource(directory, options = {}) {
  return GitReferenceSource.open({
    sourceId: "test-source",
    root: directory,
    allowedFiles: ["docs/status.md"],
    clock: fixedClock,
    ...options
  });
}

test("reference snapshot binds the complete committed tree without exposing content", async (t) => {
  const directory = await createRepository(t, {
    "docs/status.md": "# Status\nReady\n",
    "src/index.js": "export const ready = true;\n"
  });
  const source = await openSource(directory);
  const snapshot = await source.captureSnapshot();

  assert.equal(verifyReferenceSnapshot(snapshot), true);
  assert.equal(snapshot.sourceId, "test-source");
  assert.equal(snapshot.sourceState, "clean");
  assert.equal(snapshot.trackedEntryCount, 2);
  assert.equal(snapshot.trackedBlobCount, 2);
  assert.equal(snapshot.trackedChangeCount, 0);
  assert.equal(snapshot.untrackedFileCount, 0);
  assert.equal(snapshot.allowedDocuments.length, 1);
  assert.equal(snapshot.allowedDocuments[0].path, "docs/status.md");
  assert.match(snapshot.manifestDigest, /^sha256:[0-9a-f]{64}$/);
  assert.doesNotMatch(JSON.stringify(snapshot), /Ready/);
});

test("allowed document is read from its exact Git object with verifiable evidence", async (t) => {
  const directory = await createRepository(t, {
    "docs/status.md": "# Status\nCommitted truth\n"
  });
  const source = await openSource(directory);
  const snapshot = await source.captureSnapshot();
  const document = await source.readDocument("docs/status.md", { snapshot });

  assert.equal(document.content, "# Status\nCommitted truth\n");
  assert.equal(verifyReferenceDocumentEvidence(document.evidence), true);
  assert.equal(document.evidence.commit, snapshot.commit);
  assert.equal(document.evidence.tree, snapshot.tree);
  assert.equal(document.evidence.snapshotDigest, snapshot.snapshotDigest);
  assert.match(document.evidence.sourceReference, /^fdos-ref:test-source:/);
});

test("untracked files are counted but never become source content", async (t) => {
  const directory = await createRepository(t, {
    "docs/status.md": "Committed\n"
  });
  await writeFile(path.join(directory, "private-notes.md"), "UNTRACKED SECRET");
  const source = await openSource(directory);
  const snapshot = await source.captureSnapshot();

  assert.equal(snapshot.sourceState, "tracked-clean-with-untracked");
  assert.equal(snapshot.trackedChangeCount, 0);
  assert.equal(snapshot.untrackedFileCount, 1);
  const document = await source.readDocument("docs/status.md", { snapshot });
  assert.equal(document.content, "Committed\n");
  assert.doesNotMatch(document.content, /SECRET/);
});

test("tracked worktree drift blocks document intake by default", async (t) => {
  const directory = await createRepository(t, {
    "docs/status.md": "Committed\n"
  });
  await writeFile(path.join(directory, "docs/status.md"), "Uncommitted\n");
  const source = await openSource(directory);
  const snapshot = await source.captureSnapshot();

  assert.equal(snapshot.sourceState, "tracked-dirty");
  assert.equal(snapshot.trackedChangeCount, 1);
  assert.equal(snapshot.allowlistedChangeCount, 1);
  await assert.rejects(
    () => source.readDocument("docs/status.md", { snapshot }),
    PolicyError
  );
  const explicitCommitRead = await source.readDocument("docs/status.md", {
    snapshot,
    requireTrackedClean: false
  });
  assert.equal(explicitCommitRead.content, "Committed\n");
});

test("old snapshot keeps reading the old object after HEAD advances", async (t) => {
  const directory = await createRepository(t, {
    "docs/status.md": "Version one\n"
  });
  const source = await openSource(directory);
  const firstSnapshot = await source.captureSnapshot();
  await writeFile(path.join(directory, "docs/status.md"), "Version two\n");
  await git(directory, "add", "docs/status.md");
  await git(
    directory,
    "-c",
    "user.name=FDOS Test",
    "-c",
    "user.email=fdos-test@example.invalid",
    "commit",
    "--quiet",
    "-m",
    "second version"
  );

  const oldDocument = await source.readDocument("docs/status.md", {
    snapshot: firstSnapshot
  });
  const currentDocument = await source.readDocument("docs/status.md");
  assert.equal(oldDocument.content, "Version one\n");
  assert.equal(currentDocument.content, "Version two\n");
  assert.notEqual(
    oldDocument.evidence.gitObjectId,
    currentDocument.evidence.gitObjectId
  );
});

test("allowlist denies other files and rejects traversal configuration", async (t) => {
  const directory = await createRepository(t, {
    "docs/status.md": "Allowed\n",
    "docs/secret.md": "Denied\n"
  });
  const source = await openSource(directory);
  await assert.rejects(
    () => source.readDocument("docs/secret.md"),
    AuthorizationError
  );
  await assert.rejects(
    () =>
      GitReferenceSource.open({
        sourceId: "test-source",
        root: directory,
        allowedFiles: ["../outside.md"]
      }),
    ValidationError
  );
});

test("allowlisted symbolic links and oversized documents fail closed", async (t) => {
  if (process.platform === "win32") {
    t.skip("Symbolic-link behavior is platform-specific.");
    return;
  }
  const directory = await createRepository(t, {
    "docs/target.md": "Target\n"
  });
  await symlink("target.md", path.join(directory, "docs/status.md"));
  await git(directory, "add", "docs/status.md");
  await git(
    directory,
    "-c",
    "user.name=FDOS Test",
    "-c",
    "user.email=fdos-test@example.invalid",
    "commit",
    "--quiet",
    "-m",
    "tracked symlink"
  );
  const symlinkSource = await openSource(directory);
  await assert.rejects(
    () => symlinkSource.readDocument("docs/status.md"),
    PolicyError
  );

  const largeDirectory = await createRepository(t, {
    "docs/status.md": "123456"
  });
  const sizeLimitedSource = await openSource(largeDirectory, {
    maxDocumentBytes: 5
  });
  await assert.rejects(
    () => sizeLimitedSource.readDocument("docs/status.md"),
    PolicyError
  );
});

test("repository subdirectories and tampered evidence are rejected", async (t) => {
  const directory = await createRepository(t, {
    "docs/status.md": "Bound\n"
  });
  await assert.rejects(
    () =>
      GitReferenceSource.open({
        sourceId: "test-source",
        root: path.join(directory, "docs"),
        allowedFiles: ["status.md"]
      }),
    PolicyError
  );

  const source = await openSource(directory);
  const snapshot = await source.captureSnapshot();
  const tamperedSnapshot = {
    ...snapshot,
    trackedEntryCount: snapshot.trackedEntryCount + 1
  };
  assert.throws(
    () => verifyReferenceSnapshot(tamperedSnapshot),
    IntegrityError
  );

  const document = await source.readDocument("docs/status.md", { snapshot });
  const tamperedEvidence = {
    ...document.evidence,
    byteLength: document.evidence.byteLength + 1
  };
  assert.throws(
    () => verifyReferenceDocumentEvidence(tamperedEvidence),
    IntegrityError
  );

  const inconsistentUnsigned = {
    ...document.evidence,
    sourceReference:
      "fdos-ref:test-source:000000000000:000000000000000000000000"
  };
  delete inconsistentUnsigned.evidenceDigest;
  const inconsistentlyRehashed = {
    ...inconsistentUnsigned,
    evidenceDigest: digestObject(inconsistentUnsigned)
  };
  assert.throws(
    () => verifyReferenceDocumentEvidence(inconsistentlyRehashed),
    IntegrityError
  );

  const expandedSnapshotUnsigned = {
    ...snapshot,
    unexpectedContent: "must never enter snapshot metadata"
  };
  delete expandedSnapshotUnsigned.snapshotDigest;
  const expandedSnapshot = {
    ...expandedSnapshotUnsigned,
    snapshotDigest: digestObject(expandedSnapshotUnsigned)
  };
  assert.throws(
    () => verifyReferenceSnapshot(expandedSnapshot),
    IntegrityError
  );

  const expandedEvidenceUnsigned = {
    ...document.evidence,
    unexpectedContent: "must never enter memory evidence"
  };
  delete expandedEvidenceUnsigned.evidenceDigest;
  const expandedEvidence = {
    ...expandedEvidenceUnsigned,
    evidenceDigest: digestObject(expandedEvidenceUnsigned)
  };
  assert.throws(
    () => verifyReferenceDocumentEvidence(expandedEvidence),
    IntegrityError
  );
});

test("reference evidence enters memory only as a human-reviewed candidate", async (t) => {
  const referenceDirectory = await createRepository(t, {
    "docs/status.md": "Source material that must not be copied into metadata.\n"
  });
  const source = await openSource(referenceDirectory);
  const document = await source.readDocument("docs/status.md");
  const { runtime, owner, operations } = await createPilotHarness(t);

  const candidate = await runtime.proposeMemory({
    actor: operations,
    scope: "department:operations",
    title: "Evidence-bound observation",
    content: "The committed source supports a bounded operational observation.",
    sourceEvidence: [document.evidence]
  });
  assert.equal(candidate.status, "candidate");
  assert.deepEqual(candidate.sourceEvidence, [document.evidence]);
  assert.ok(
    candidate.sourceReferences.includes(document.evidence.sourceReference)
  );
  assert.ok(
    candidate.sourceReferences.includes(document.evidence.evidenceDigest)
  );
  assert.equal(
    runtime.readMemory({
      actor: operations,
      scope: "department:operations"
    }).length,
    0
  );
  assert.doesNotMatch(
    JSON.stringify(runtime.auditTrail(owner)),
    /Source material that must not be copied/
  );

  await runtime.reviewMemory({
    candidateId: candidate.id,
    actor: owner,
    decision: "accepted",
    reason: "Source binding and bounded claim reviewed."
  });
  assert.equal(
    runtime.readMemory({
      actor: operations,
      scope: "department:operations"
    }).length,
    1
  );

  const tampered = {
    ...document.evidence,
    contentSha256: `sha256:${"0".repeat(64)}`
  };
  await assert.rejects(
    () =>
      runtime.proposeMemory({
        actor: operations,
        scope: "department:operations",
        title: "Tampered evidence",
        content: "Must be rejected.",
        sourceEvidence: [tampered]
      }),
    IntegrityError
  );
});
