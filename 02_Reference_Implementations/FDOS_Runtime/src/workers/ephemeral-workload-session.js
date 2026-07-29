import {
  generateKeyPairSync,
  sign as signBytes
} from "node:crypto";
import { canonicalJson } from "../kernel/canonical-json.js";
import {
  ConflictError,
  ValidationError
} from "../kernel/errors.js";
import {
  createAuthenticatedWorkerResponse,
  createWorkloadResponseSignatureRequest,
  createWorkloadSession
} from "../domain/workload-session-contract.js";

const FAULT_MODES = Object.freeze([
  "none",
  "signature-mismatch"
]);

function changedSignature(signature) {
  return (
    `${signature.startsWith("A") ? "B" : "A"}` +
    signature.slice(1)
  );
}

export function createEphemeralWorkloadSessionAuthority({
  challenge,
  workerPackage,
  faultMode = "none"
}) {
  if (!FAULT_MODES.includes(faultMode)) {
    throw new ValidationError(
      "Workload session fault mode is invalid."
    );
  }
  const { privateKey, publicKey } =
    generateKeyPairSync("ed25519");
  const workloadSession = createWorkloadSession({
    challenge,
    workerPackage,
    publicKeyPem: publicKey
      .export({
        type: "spki",
        format: "pem"
      })
      .trim()
  });
  let consumed = false;
  return Object.freeze({
    workloadSession,
    signResponse(response) {
      if (consumed) {
        throw new ConflictError(
          "Workload session may sign only one response."
        );
      }
      consumed = true;
      const statement =
        createWorkloadResponseSignatureRequest({
          response,
          workloadSession
        });
      const signature = signBytes(
        null,
        Buffer.from(canonicalJson(statement), "utf8"),
        privateKey
      ).toString("base64url");
      return createAuthenticatedWorkerResponse({
        response,
        workloadSession,
        signature:
          faultMode === "signature-mismatch"
            ? changedSignature(signature)
            : signature
      });
    }
  });
}
