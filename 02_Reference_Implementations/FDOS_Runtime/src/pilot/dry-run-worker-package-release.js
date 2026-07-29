import { fileURLToPath } from "node:url";
import { immutableJson } from "../kernel/canonical-json.js";

export const PILOT_DRY_RUN_WORKER_PACKAGE_PATH =
  fileURLToPath(
    new URL(
      "../../artifacts/worker-packages/connector-dry-run-v1.fdos-package.json",
      import.meta.url
    )
  );

export const PILOT_DRY_RUN_WORKER_PACKAGE_TRUST =
  immutableJson({
    algorithm: "Ed25519",
    issuerId: "issuer:fdos-worker-package-pilot",
    keyId: "key:a189dda72dfdc5905ee62a94",
    publicKeyPem:
      "-----BEGIN PUBLIC KEY-----\n" +
      "MCowBQYDK2VwAyEA32Gmk9mS97l4KsxUc1fDjAv3TUEd3fX6STLl78b7/Vg=\n" +
      "-----END PUBLIC KEY-----"
  });

export const PILOT_DRY_RUN_WORKER_PACKAGE_TRUST_ANCHOR_DIGEST =
  "sha256:78dccc7696bb736ab5135ef8c3fc1745dcd413e5a8640b43cd9e5c68935fe01b";

export const PILOT_DRY_RUN_WORKER_PACKAGE_ATTESTATION =
  immutableJson({
    schemaVersion: "1.0",
    kind: "fdos-signed-worker-package-attestation",
    algorithm: "Ed25519",
    issuerId: "issuer:fdos-worker-package-pilot",
    keyId: "key:a189dda72dfdc5905ee62a94",
    packageId: "worker-package:connector-dry-run",
    packageVersion: "1.0.0-experimental",
    packageDigest:
      "sha256:046b7dd22fc2454865139fd6951e2ccc7bfba4f1fa497a5831b164c77794fec4",
    artifactId: "worker:connector-dry-run",
    artifactVersion: "2.0.0-experimental",
    artifactDigest:
      "sha256:b0c0107c2a90919831ab78866eb760e0094f75a34f002c667897e49c516cc59b",
    issuedAt: "2026-07-29T16:15:00.000Z",
    signature:
      "Nqs_XWN2WXy_INtqYPVcOHmyWamnm9QPG-4ZXOMKTjAsJdDsqVjqJSPoWfK--KMM6Jfl8n62aZYSaRCmo_B1BQ"
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
