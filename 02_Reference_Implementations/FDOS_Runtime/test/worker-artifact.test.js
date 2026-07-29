import assert from "node:assert/strict";
import {
  appendFile,
  chmod,
  copyFile,
  mkdir,
  mkdtemp,
  rm,
  symlink
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  createDryRunWorkerArtifact,
  createWorkerArtifactBinding,
  DRY_RUN_WORKER_ARTIFACT_FILES,
  DRY_RUN_WORKER_ENTRYPOINT,
  DryRunWorkerArtifactInspector,
  inspectDryRunWorkerArtifact,
  IntegrityError,
  LocalWorkerArtifactAuthority,
  ValidationError,
  verifyWorkerArtifactAttestation
} from "../src/index.js";

const RUNTIME_ROOT = fileURLToPath(
  new URL("../", import.meta.url)
);

function mutableClone(value) {
  return JSON.parse(JSON.stringify(value));
}

async function copiedArtifactFixture(t, label) {
  const rootDirectory = await mkdtemp(
    path.join(os.tmpdir(), `fdos-worker-artifact-${label}-`)
  );
  t.after(async () => {
    await rm(rootDirectory, {
      recursive: true,
      force: true
    });
  });
  for (const relativePath of DRY_RUN_WORKER_ARTIFACT_FILES) {
    const destination = path.join(rootDirectory, relativePath);
    await mkdir(path.dirname(destination), {
      recursive: true,
      mode: 0o700
    });
    await copyFile(
      path.join(RUNTIME_ROOT, relativePath),
      destination
    );
    await chmod(destination, 0o600);
  }
  return rootDirectory;
}

test("worker source inspection reconstructs one exact closed artifact", async () => {
  const artifact = await inspectDryRunWorkerArtifact();
  assert.equal(
    artifact.entrypoint,
    DRY_RUN_WORKER_ENTRYPOINT
  );
  assert.deepEqual(
    artifact.files.map((file) => file.path),
    [...DRY_RUN_WORKER_ARTIFACT_FILES].sort()
  );
  assert.throws(
    () =>
      createDryRunWorkerArtifact({
        files: artifact.files.slice(1)
      }),
    ValidationError
  );
  const authority = LocalWorkerArtifactAuthority.create({
    issuerId: "issuer:fdos-worker-source-test",
    keyId: "key:fdos-worker-source-test",
    clock: () => new Date("2026-07-29T15:00:00.000Z")
  });
  const attestation = authority.issue({ artifact });
  const trust = authority.trustDescriptor();
  assert.equal(
    verifyWorkerArtifactAttestation(
      attestation,
      {
        artifact,
        trustedKeys: [trust]
      }
    ),
    true
  );

  const binding = createWorkerArtifactBinding({
    artifact,
    attestation,
    trustedKeys: [trust]
  });
  assert.equal(binding.artifactDigest, artifact.digest);
  assert.equal(
    binding.issuerId,
    trust.issuerId
  );
  assert.equal(
    binding.keyId,
    trust.keyId
  );
  assert.doesNotMatch(
    JSON.stringify({
      binding,
      trust,
      attestation
    }),
    /PRIVATE KEY/
  );
  assert.throws(() => {
    artifact.files[0].path = "src/tampered.js";
  }, TypeError);
});

test("signed artifact attestation rejects source, signature and trust tampering", async (t) => {
  const rootDirectory = await copiedArtifactFixture(
    t,
    "attestation"
  );
  const inspector = new DryRunWorkerArtifactInspector({
    rootDirectory
  });
  const original = await inspector.inspect();
  const authority = LocalWorkerArtifactAuthority.create({
    issuerId: "issuer:fdos-worker-release-test",
    keyId: "key:fdos-worker-release-test",
    clock: () => new Date("2026-07-29T12:00:00.000Z")
  });
  const attestation = authority.issue({
    artifact: original
  });
  const trust = authority.trustDescriptor();
  assert.equal(
    verifyWorkerArtifactAttestation(attestation, {
      artifact: original,
      trustedKeys: [trust]
    }),
    true
  );

  await appendFile(
    path.join(
      rootDirectory,
      "src/domain/action-catalog.js"
    ),
    "\nconst FDOS_TAMPER_PROBE = true;\n",
    "utf8"
  );
  const changed = await inspector.inspect();
  assert.notEqual(changed.digest, original.digest);
  assert.throws(
    () =>
      verifyWorkerArtifactAttestation(attestation, {
        artifact: changed,
        trustedKeys: [trust]
      }),
    IntegrityError
  );

  const changedSignature = mutableClone(attestation);
  changedSignature.signature =
    `${changedSignature.signature.startsWith("A") ? "B" : "A"}` +
    changedSignature.signature.slice(1);
  assert.throws(
    () =>
      verifyWorkerArtifactAttestation(changedSignature, {
        artifact: original,
        trustedKeys: [trust]
      }),
    IntegrityError
  );

  const otherAuthority = LocalWorkerArtifactAuthority.create({
    issuerId: "issuer:fdos-worker-release-other",
    keyId: "key:fdos-worker-release-other"
  });
  assert.throws(
    () =>
      verifyWorkerArtifactAttestation(attestation, {
        artifact: original,
        trustedKeys: [otherAuthority.trustDescriptor()]
      }),
    IntegrityError
  );

  const extraField = {
    ...attestation,
    buildSystem: "untrusted-claim"
  };
  assert.throws(
    () =>
      verifyWorkerArtifactAttestation(extraField, {
        artifact: original,
        trustedKeys: [trust]
      }),
    IntegrityError
  );
});

test("artifact inspection rejects undeclared imports and mutable source files", async (t) => {
  const importRoot = await copiedArtifactFixture(
    t,
    "import"
  );
  await appendFile(
    path.join(importRoot, DRY_RUN_WORKER_ENTRYPOINT),
    '\nimport /* policy-evasion probe */ "../domain/unapproved-source.js";\n',
    "utf8"
  );
  await assert.rejects(
    () =>
      inspectDryRunWorkerArtifact({
        rootDirectory: importRoot
      }),
    IntegrityError
  );

  const builtinRoot = await copiedArtifactFixture(
    t,
    "builtin"
  );
  await appendFile(
    path.join(builtinRoot, DRY_RUN_WORKER_ENTRYPOINT),
    '\nimport "node:child_process";\n',
    "utf8"
  );
  await assert.rejects(
    () =>
      inspectDryRunWorkerArtifact({
        rootDirectory: builtinRoot
      }),
    IntegrityError
  );

  const writableRoot = await copiedArtifactFixture(
    t,
    "writable"
  );
  await chmod(
    path.join(
      writableRoot,
      "src/kernel/canonical-json.js"
    ),
    0o620
  );
  await assert.rejects(
    () =>
      inspectDryRunWorkerArtifact({
        rootDirectory: writableRoot
      }),
    IntegrityError
  );
});

test("artifact inspection rejects source symlinks", async (t) => {
  const rootDirectory = await copiedArtifactFixture(
    t,
    "file-symlink"
  );
  const relativePath = "src/kernel/errors.js";
  const target = path.join(rootDirectory, relativePath);
  await rm(target);
  await symlink(
    path.join(RUNTIME_ROOT, relativePath),
    target
  );
  await assert.rejects(
    () =>
      inspectDryRunWorkerArtifact({
        rootDirectory
      }),
    IntegrityError
  );

  const directoryRoot = await copiedArtifactFixture(
    t,
    "directory-symlink"
  );
  const kernelDirectory = path.join(
    directoryRoot,
    "src/kernel"
  );
  await rm(kernelDirectory, {
    recursive: true
  });
  await symlink(
    path.join(RUNTIME_ROOT, "src/kernel"),
    kernelDirectory,
    "dir"
  );
  await assert.rejects(
    () =>
      inspectDryRunWorkerArtifact({
        rootDirectory: directoryRoot
      }),
    IntegrityError
  );

  const writableDirectoryRoot =
    await copiedArtifactFixture(
      t,
      "writable-directory"
    );
  await chmod(
    path.join(writableDirectoryRoot, "src/domain"),
    0o720
  );
  await assert.rejects(
    () =>
      inspectDryRunWorkerArtifact({
        rootDirectory: writableDirectoryRoot
      }),
    IntegrityError
  );

  const wrapper = await mkdtemp(
    path.join(os.tmpdir(), "fdos-worker-artifact-root-link-")
  );
  t.after(async () => {
    await rm(wrapper, {
      recursive: true,
      force: true
    });
  });
  const rootLink = path.join(wrapper, "runtime");
  await symlink(directoryRoot, rootLink, "dir");
  await assert.rejects(
    () =>
      inspectDryRunWorkerArtifact({
        rootDirectory: rootLink
      }),
    IntegrityError
  );
});
