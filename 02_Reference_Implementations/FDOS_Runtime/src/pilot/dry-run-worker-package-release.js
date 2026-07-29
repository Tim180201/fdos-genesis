import { fileURLToPath } from "node:url";
import { immutableJson } from "../kernel/canonical-json.js";

export const PILOT_DRY_RUN_WORKER_PACKAGE_PATH =
  fileURLToPath(
    new URL(
      "../../artifacts/worker-packages/connector-dry-run-v2.fdos-package.json",
      import.meta.url
    )
  );

export const PILOT_DRY_RUN_WORKER_PACKAGE_TRUST =
  immutableJson({
    algorithm: "Ed25519",
    issuerId: "issuer:fdos-worker-package-pilot",
    keyId: "key:449d04c19a66d93bc574d99b",
    publicKeyPem:
      "-----BEGIN PUBLIC KEY-----\n" +
      "MCowBQYDK2VwAyEAFyoMgSeB0+mVNhZ7qvT8h93kh6HYjUlCdYLa1mvYf7w=\n" +
      "-----END PUBLIC KEY-----"
  });

export const PILOT_DRY_RUN_WORKER_PACKAGE_TRUST_ANCHOR_DIGEST =
  "sha256:c70b21a175dbfa514447d1de2476a7931e52632446abcaee6cba3c8a5da92c39";

export const PILOT_DRY_RUN_WORKER_PACKAGE_ATTESTATION =
  immutableJson({
    schemaVersion: "1.0",
    kind: "fdos-signed-worker-package-attestation",
    algorithm: "Ed25519",
    issuerId: "issuer:fdos-worker-package-pilot",
    keyId: "key:449d04c19a66d93bc574d99b",
    packageId: "worker-package:connector-dry-run",
    packageVersion: "2.0.0-experimental",
    packageDigest:
      "sha256:51cd86533646d78353ed91fc86e0d16f74fc7b4eb404c722c77d3b4a3d67d196",
    artifactId: "worker:connector-dry-run",
    artifactVersion: "3.0.0-experimental",
    artifactDigest:
      "sha256:59933e5c2830b0a63d32c2938cb00175431495862a2c948af8d3d4c105a7db8a",
    issuedAt: "2026-07-29T14:17:25.900Z",
    signature:
      "kUunQbbwAPYV4qTXWTmhANCKOmmXXjDi-SW6huXPhtt-nvVUT3EmrFa2Z_vrpNiLnSgfElzn8AFdjHojL3bCBQ"
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
