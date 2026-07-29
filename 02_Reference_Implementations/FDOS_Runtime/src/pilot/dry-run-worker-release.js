import { immutableJson } from "../kernel/canonical-json.js";

export const PILOT_DRY_RUN_WORKER_TRUST = immutableJson({
  algorithm: "Ed25519",
  issuerId: "issuer:fdos-worker-release-local",
  keyId: "key:3ad79fe92da3585ad472c6c6",
  publicKeyPem:
    "-----BEGIN PUBLIC KEY-----\n" +
    "MCowBQYDK2VwAyEABQmpErlMp80OCkw5Z0Pz4AeFhhqVCFG+BzJ7E65FIFI=\n" +
    "-----END PUBLIC KEY-----\n"
});

export const PILOT_DRY_RUN_WORKER_ATTESTATION = immutableJson({
  schemaVersion: "1.0",
  kind: "fdos-signed-worker-artifact-attestation",
  algorithm: "Ed25519",
  issuerId: "issuer:fdos-worker-release-local",
  keyId: "key:3ad79fe92da3585ad472c6c6",
  artifactId: "worker:connector-dry-run",
  artifactVersion: "1.0.0-experimental",
  artifactDigest:
    "sha256:b1a6b08b65cdbb7042675633f356f0a092ca9227dddd17d79fb4121052234bc9",
  issuedAt: "2026-07-29T14:00:00.000Z",
  signature:
    "lHfNQ6cVXz76wH90DWEP7opfCxSuhJrX0IREGwXTneUIClRmKiJDBKTw2fMxthv_-9npABTUszGQpR4cAyBkDA"
});
