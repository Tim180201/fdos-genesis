import assert from "node:assert/strict";
import {
  createHash,
  generateKeyPairSync,
  sign
} from "node:crypto";
import {
  chmod,
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  buildDryRunWorkerPackage,
  canonicalJson,
  createDryRunWorkerArtifact,
  createDryRunWorkerPackage,
  createWorkerPackageAttestation,
  createWorkerPackageAttestationRequest,
  createWorkerPackageBinding,
  inspectDryRunWorkerPackageRelease,
  IntegrityError,
  PILOT_DRY_RUN_WORKER_PACKAGE_ATTESTATION,
  PILOT_DRY_RUN_WORKER_PACKAGE_PATH,
  PILOT_DRY_RUN_WORKER_PACKAGE_RELEASE,
  PILOT_DRY_RUN_WORKER_PACKAGE_TRUST,
  PILOT_DRY_RUN_WORKER_PACKAGE_TRUST_ANCHOR_DIGEST,
  ProcessSeparatedDryRunWorker,
  readDryRunWorkerPackageFile,
  serializeDryRunWorkerPackage,
  ValidationError,
  verifyDryRunWorkerSourceGraph,
  verifyWorkerPackageAttestation,
  workerPackageTrustAnchorDigest
} from "../src/index.js";

function mutableClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function sha256Buffer(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function changedPackage(workerPackage, sourceSuffix) {
  const modules = workerPackage.modules.map((module, index) => ({
    path: module.path,
    source:
      index === 0
        ? `${module.source}${sourceSuffix}`
        : module.source
  }));
  const artifact = createDryRunWorkerArtifact({
    files: modules.map((module) => {
      const bytes = Buffer.from(module.source, "utf8");
      return {
        path: module.path,
        size: bytes.length,
        digest: sha256Buffer(bytes)
      };
    })
  });
  return createDryRunWorkerPackage({
    artifact,
    modules
  });
}

async function copiedPackageFixture(t, label) {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), `fdos-worker-package-${label}-`)
  );
  await chmod(directory, 0o700);
  const packagePath = path.join(
    directory,
    "connector-dry-run.fdos-package.json"
  );
  await copyFile(
    PILOT_DRY_RUN_WORKER_PACKAGE_PATH,
    packagePath
  );
  await chmod(packagePath, 0o600);
  t.after(async () => {
    await rm(directory, {
      recursive: true,
      force: true
    });
  });
  return {
    directory,
    packagePath,
    release: {
      ...PILOT_DRY_RUN_WORKER_PACKAGE_RELEASE,
      packagePath
    }
  };
}

test("recorded worker package is reproducible and release-bound", async () => {
  const recorded = await readDryRunWorkerPackageFile(
    PILOT_DRY_RUN_WORKER_PACKAGE_PATH
  );
  const rebuilt = await buildDryRunWorkerPackage();
  assert.equal(rebuilt.digest, recorded.digest);
  assert.equal(
    rebuilt.artifact.digest,
    recorded.artifact.digest
  );
  assert.equal(recorded.modules.length, 12);
  assert.equal(
    Buffer.byteLength(
      await readFile(
        PILOT_DRY_RUN_WORKER_PACKAGE_PATH,
        "utf8"
      ),
      "utf8"
    ) > recorded.modules.reduce(
      (total, module) => total + module.size,
      0
    ),
    true
  );

  const release = await inspectDryRunWorkerPackageRelease(
    PILOT_DRY_RUN_WORKER_PACKAGE_RELEASE
  );
  assert.equal(release.binding.packageDigest, recorded.digest);
  assert.equal(
    release.binding.artifactDigest,
    recorded.artifact.digest
  );
  assert.equal(
    release.binding.trustAnchorDigest,
    PILOT_DRY_RUN_WORKER_PACKAGE_TRUST_ANCHOR_DIGEST
  );
  assert.equal(
    release.binding.issuerId,
    PILOT_DRY_RUN_WORKER_PACKAGE_TRUST.issuerId
  );
  assert.equal(
    verifyWorkerPackageAttestation(
      PILOT_DRY_RUN_WORKER_PACKAGE_ATTESTATION,
      {
        workerPackage: recorded,
        trustedKeys: [
          PILOT_DRY_RUN_WORKER_PACKAGE_TRUST
        ],
        expectedTrustAnchorDigest:
          PILOT_DRY_RUN_WORKER_PACKAGE_TRUST_ANCHOR_DIGEST
      }
    ),
    true
  );
  const sourceGraph = new Map(
    recorded.modules.map((module) => [
      module.path,
      module.source
    ])
  );
  const missingSource = new Map(sourceGraph);
  missingSource.delete(recorded.modules[0].path);
  assert.throws(
    () => verifyDryRunWorkerSourceGraph(missingSource),
    IntegrityError
  );
  const additionalSource = new Map(sourceGraph);
  additionalSource.set(
    "src/workers/unapproved-worker.js",
    "export const unapproved = true;\n"
  );
  assert.throws(
    () => verifyDryRunWorkerSourceGraph(additionalSource),
    IntegrityError
  );
  assert.doesNotMatch(
    JSON.stringify(PILOT_DRY_RUN_WORKER_PACKAGE_RELEASE),
    /PRIVATE KEY/
  );
  assert.throws(() => {
    recorded.modules[0].source = "tampered";
  }, TypeError);
});

test("detached signer request keeps private keys outside the release API", async () => {
  const workerPackage = await buildDryRunWorkerPackage();
  const { privateKey, publicKey } =
    generateKeyPairSync("ed25519");
  const trust = {
    algorithm: "Ed25519",
    issuerId: "issuer:fdos-external-signer-test",
    keyId: "key:fdos-external-signer-test",
    publicKeyPem: publicKey
      .export({
        type: "spki",
        format: "pem"
      })
      .trim()
  };
  const request = createWorkerPackageAttestationRequest({
    workerPackage,
    issuerId: trust.issuerId,
    keyId: trust.keyId,
    issuedAt: "2026-07-29T15:30:00.000Z"
  });
  const signature = sign(
    null,
    Buffer.from(canonicalJson(request), "utf8"),
    privateKey
  ).toString("base64url");
  const attestation = createWorkerPackageAttestation({
    request,
    signature
  });
  const noncanonicalLastCharacter = {
    A: "B",
    Q: "R",
    g: "h",
    w: "x"
  }[signature.at(-1)];
  assert.ok(noncanonicalLastCharacter);
  const noncanonicalSignature =
    `${signature.slice(0, -1)}${noncanonicalLastCharacter}`;
  assert.deepEqual(
    Buffer.from(noncanonicalSignature, "base64url"),
    Buffer.from(signature, "base64url")
  );
  assert.throws(
    () =>
      createWorkerPackageAttestation({
        request,
        signature: noncanonicalSignature
      }),
    ValidationError
  );
  const expectedTrustAnchorDigest =
    workerPackageTrustAnchorDigest(trust);
  assert.equal(
    verifyWorkerPackageAttestation(attestation, {
      workerPackage,
      trustedKeys: [trust],
      expectedTrustAnchorDigest
    }),
    true
  );
  const binding = createWorkerPackageBinding({
    workerPackage,
    attestation,
    trustedKeys: [trust],
    expectedTrustAnchorDigest
  });
  assert.equal(binding.packageDigest, workerPackage.digest);
  assert.equal(
    binding.trustAnchorDigest,
    expectedTrustAnchorDigest
  );
  assert.deepEqual(
    Object.keys(request).sort(),
    [
      "algorithm",
      "artifactDigest",
      "artifactId",
      "artifactVersion",
      "issuedAt",
      "issuerId",
      "keyId",
      "kind",
      "packageDigest",
      "packageId",
      "packageVersion",
      "schemaVersion"
    ]
  );
});

test("worker package verification rejects content, signature and trust tampering", async () => {
  const workerPackage = await buildDryRunWorkerPackage();
  const changed = changedPackage(workerPackage, "\n");
  assert.notEqual(changed.digest, workerPackage.digest);
  assert.throws(
    () =>
      verifyWorkerPackageAttestation(
        PILOT_DRY_RUN_WORKER_PACKAGE_ATTESTATION,
        {
          workerPackage: changed,
          trustedKeys: [
            PILOT_DRY_RUN_WORKER_PACKAGE_TRUST
          ],
          expectedTrustAnchorDigest:
            PILOT_DRY_RUN_WORKER_PACKAGE_TRUST_ANCHOR_DIGEST
        }
      ),
    IntegrityError
  );

  const changedSignature = mutableClone(
    PILOT_DRY_RUN_WORKER_PACKAGE_ATTESTATION
  );
  changedSignature.signature =
    `${changedSignature.signature.startsWith("A") ? "B" : "A"}` +
    changedSignature.signature.slice(1);
  assert.throws(
    () =>
      verifyWorkerPackageAttestation(changedSignature, {
        workerPackage,
        trustedKeys: [
          PILOT_DRY_RUN_WORKER_PACKAGE_TRUST
        ],
        expectedTrustAnchorDigest:
          PILOT_DRY_RUN_WORKER_PACKAGE_TRUST_ANCHOR_DIGEST
      }),
    IntegrityError
  );

  assert.throws(
    () =>
      verifyWorkerPackageAttestation(
        PILOT_DRY_RUN_WORKER_PACKAGE_ATTESTATION,
        {
          workerPackage,
          trustedKeys: [
            PILOT_DRY_RUN_WORKER_PACKAGE_TRUST
          ],
          expectedTrustAnchorDigest: sha256Buffer(
            Buffer.from("foreign-anchor", "utf8")
          )
        }
      ),
    IntegrityError
  );

  assert.throws(
    () =>
      verifyWorkerPackageAttestation(
        {
          ...PILOT_DRY_RUN_WORKER_PACKAGE_ATTESTATION,
          transparencyLog: "untrusted-claim"
        },
        {
          workerPackage,
          trustedKeys: [
            PILOT_DRY_RUN_WORKER_PACKAGE_TRUST
          ],
          expectedTrustAnchorDigest:
            PILOT_DRY_RUN_WORKER_PACKAGE_TRUST_ANCHOR_DIGEST
        }
      ),
    IntegrityError
  );
});

test("package file inspection rejects noncanonical, linked and writable input", async (t) => {
  const noncanonical = await copiedPackageFixture(
    t,
    "noncanonical"
  );
  const serialized = await readFile(
    noncanonical.packagePath,
    "utf8"
  );
  await writeFile(
    noncanonical.packagePath,
    `${serialized.trim()} \n`,
    {
      encoding: "utf8",
      mode: 0o600
    }
  );
  await assert.rejects(
    () =>
      inspectDryRunWorkerPackageRelease(
        noncanonical.release
      ),
    IntegrityError
  );

  const linked = await copiedPackageFixture(t, "linked");
  const originalPath = path.join(
    linked.directory,
    "original-package.json"
  );
  await copyFile(linked.packagePath, originalPath);
  await rm(linked.packagePath);
  await symlink(originalPath, linked.packagePath);
  await assert.rejects(
    () =>
      inspectDryRunWorkerPackageRelease(linked.release),
    IntegrityError
  );

  const writable = await copiedPackageFixture(t, "writable");
  await chmod(writable.packagePath, 0o620);
  await assert.rejects(
    () =>
      inspectDryRunWorkerPackageRelease(writable.release),
    IntegrityError
  );

  const writableDirectory = await copiedPackageFixture(
    t,
    "writable-directory"
  );
  await chmod(writableDirectory.directory, 0o720);
  await assert.rejects(
    () =>
      inspectDryRunWorkerPackageRelease(
        writableDirectory.release
      ),
    IntegrityError
  );
});

test("package file inspection rejects a newly packaged undeclared import", async (t) => {
  const fixture = await copiedPackageFixture(
    t,
    "undeclared-import"
  );
  const workerPackage = await buildDryRunWorkerPackage();
  const modules = workerPackage.modules.map((module, index) => ({
    path: module.path,
    source:
      index === 0
        ? `${module.source}\nimport "node:child_process";\n`
        : module.source
  }));
  const artifact = createDryRunWorkerArtifact({
    files: modules.map((module) => {
      const bytes = Buffer.from(module.source, "utf8");
      return {
        path: module.path,
        size: bytes.length,
        digest: sha256Buffer(bytes)
      };
    })
  });
  const changed = createDryRunWorkerPackage({
    artifact,
    modules
  });
  await writeFile(
    fixture.packagePath,
    serializeDryRunWorkerPackage(changed),
    {
      encoding: "utf8",
      mode: 0o600
    }
  );
  await assert.rejects(
    () => readDryRunWorkerPackageFile(fixture.packagePath),
    IntegrityError
  );
});

test("package release configuration rejects incomplete trust envelopes", () => {
  assert.throws(
    () =>
      new ProcessSeparatedDryRunWorker({
        workerPackageRelease: {
          packagePath:
            PILOT_DRY_RUN_WORKER_PACKAGE_PATH,
          attestation:
            PILOT_DRY_RUN_WORKER_PACKAGE_ATTESTATION,
          trustedKeys: [],
          expectedTrustAnchorDigest:
            PILOT_DRY_RUN_WORKER_PACKAGE_TRUST_ANCHOR_DIGEST
        }
      }),
    ValidationError
  );
});
