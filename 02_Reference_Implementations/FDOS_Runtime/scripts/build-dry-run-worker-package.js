#!/usr/bin/env node

import {
  chmod,
  mkdir,
  rename,
  rm,
  writeFile
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildDryRunWorkerPackage,
  serializeDryRunWorkerPackage
} from "../src/integrations/dry-run-worker-package.js";

const runtimeRoot = fileURLToPath(
  new URL("../", import.meta.url)
);
const defaultOutput = path.join(
  runtimeRoot,
  "artifacts",
  "worker-packages",
  "connector-dry-run-v1.fdos-package.json"
);

async function main() {
  const argumentsList = process.argv.slice(2);
  if (argumentsList.length > 1) {
    throw new Error(
      "build-dry-run-worker-package accepts at most one output path."
    );
  }
  const outputPath = argumentsList[0]
    ? path.resolve(argumentsList[0])
    : defaultOutput;
  const outputDirectory = path.dirname(outputPath);
  await mkdir(outputDirectory, {
    recursive: true,
    mode: 0o755
  });
  const workerPackage = await buildDryRunWorkerPackage({
    rootDirectory: runtimeRoot
  });
  const serialized = serializeDryRunWorkerPackage(workerPackage);
  const temporaryPath =
    `${outputPath}.${process.pid}.temporary`;
  try {
    await writeFile(temporaryPath, serialized, {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600
    });
    await rename(temporaryPath, outputPath);
    await chmod(outputPath, 0o644);
  } finally {
    await rm(temporaryPath, {
      force: true
    });
  }
  process.stdout.write(
    `${JSON.stringify(
      {
        outputPath,
        packageId: workerPackage.packageId,
        packageVersion: workerPackage.packageVersion,
        packageDigest: workerPackage.digest,
        artifactId: workerPackage.artifact.artifactId,
        artifactVersion:
          workerPackage.artifact.artifactVersion,
        artifactDigest: workerPackage.artifact.digest,
        modules: workerPackage.modules.length,
        sourceBytes: workerPackage.modules.reduce(
          (total, module) => total + module.size,
          0
        ),
        serializedBytes: Buffer.byteLength(
          serialized,
          "utf8"
        )
      },
      null,
      2
    )}\n`
  );
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
