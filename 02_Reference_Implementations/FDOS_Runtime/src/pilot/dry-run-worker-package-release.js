import { fileURLToPath } from "node:url";
import { immutableJson } from "../kernel/canonical-json.js";

export const PILOT_DRY_RUN_WORKER_PACKAGE_PATH =
  fileURLToPath(
    new URL(
      "../../artifacts/worker-packages/connector-dry-run-v3.fdos-package.json",
      import.meta.url
    )
  );

export const PILOT_DRY_RUN_WORKER_PACKAGE_TRUST =
  immutableJson({
    algorithm: "Ed25519",
    issuerId: "issuer:fdos-worker-package-pilot-v3",
    keyId: "key:3e80c4b6f855915a67e70d23",
    publicKeyPem:
      "-----BEGIN PUBLIC KEY-----\n" +
      "MCowBQYDK2VwAyEAS39w2DDyZYTSfUPqOiyKdtn3pTADuGEhcKXbMmrYiuo=\n" +
      "-----END PUBLIC KEY-----"
  });

export const PILOT_DRY_RUN_WORKER_PACKAGE_TRUST_ANCHOR_DIGEST =
  "sha256:cc0f819ae182836b859213ab5f660f9f07f18557b42a9169263c83009bc011d1";

export const PILOT_DRY_RUN_WORKER_PACKAGE_ATTESTATION =
  immutableJson({
    schemaVersion: "1.0",
    kind: "fdos-signed-worker-package-attestation",
    algorithm: "Ed25519",
    issuerId: "issuer:fdos-worker-package-pilot-v3",
    keyId: "key:3e80c4b6f855915a67e70d23",
    packageId: "worker-package:connector-dry-run",
    packageVersion: "3.0.0-experimental",
    packageDigest:
      "sha256:afc2612336bc34f8c1da817be814f40ed713de8b13ad4380a29cd75c2d343700",
    artifactId: "worker:connector-dry-run",
    artifactVersion: "4.0.0-experimental",
    artifactDigest:
      "sha256:5b138ba1405ff1f8d6dd011d24053b97db6a0a37aa083ec49acfd875da12ca2d",
    issuedAt: "2026-11-09T12:00:00.000Z",
    signature:
      "H0wIPqvY0pgZWtqd2LiSHu7utOCWK1KHp0qtja0hxmnTN4DlZEdOXNzlFwneBV-5KQaP0XqN-VkzxJVnJv_SBw"
  });

export const PILOT_DRY_RUN_WORKER_PACKAGE_RELEASE =
  immutableJson({
    packagePath: PILOT_DRY_RUN_WORKER_PACKAGE_PATH,
    attestation:
      PILOT_DRY_RUN_WORKER_PACKAGE_ATTESTATION,
    trustedKeys: [
      PILOT_DRY_RUN_WORKER_PACKAGE_TRUST
    ],
    expectedTrustAnchorDigest:
      PILOT_DRY_RUN_WORKER_PACKAGE_TRUST_ANCHOR_DIGEST
  });
