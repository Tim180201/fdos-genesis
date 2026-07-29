import assert from "node:assert/strict";
import {
  generateKeyPairSync,
  sign
} from "node:crypto";
import test from "node:test";
import {
  canonicalJson,
  createAuthenticatedWorkerResponse,
  createWorkloadResponseSignatureRequest,
  createWorkloadSession,
  createWorkloadSessionObservation,
  ConflictError,
  digestObject,
  IntegrityError,
  normalizeAuthenticatedWorkerResponse,
  normalizeWorkloadSessionChallenge,
  ValidationError,
  verifyAuthenticatedWorkerResponse,
  verifyWorkloadSessionObservation
} from "../src/index.js";
import {
  createEphemeralWorkloadSessionAuthority
} from "../src/workers/ephemeral-workload-session.js";

const challenge =
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const workerPackage = Object.freeze({
  packageId: "worker-package:connector-dry-run",
  packageVersion: "2.0.0-experimental",
  packageDigest: digestObject({
    package: "workload-session-test"
  }),
  artifactId: "worker:connector-dry-run",
  artifactVersion: "3.0.0-experimental",
  artifactDigest: digestObject({
    artifact: "workload-session-test"
  }),
  attestationDigest: digestObject({
    attestation: "workload-session-test"
  }),
  trustAnchorDigest: digestObject({
    trustAnchor: "workload-session-test"
  }),
  issuerId: "issuer:fdos-workload-session-test",
  keyId: "key:fdos-workload-session-test"
});
const responseUnsigned = Object.freeze({
  schemaVersion: "1.4",
  kind: "fdos-process-worker-response",
  requestDigest: digestObject({
    request: "workload-session-test"
  })
});
const response = Object.freeze({
  ...responseUnsigned,
  digest: digestObject(responseUnsigned)
});

function mutableClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function redigestEnvelope(value) {
  const unsigned = mutableClone(value);
  delete unsigned.digest;
  return {
    ...unsigned,
    digest: digestObject(unsigned)
  };
}

test("ephemeral workload session signs one challenge-bound response", () => {
  const authority =
    createEphemeralWorkloadSessionAuthority({
      challenge,
      workerPackage
    });
  const envelope = authority.signResponse(response);
  const evidence = verifyAuthenticatedWorkerResponse(
    envelope,
    {
      expectedChallenge: challenge,
      expectedWorkerPackage: workerPackage
    }
  );
  assert.equal(evidence.responseSignatureVerified, true);
  assert.equal(evidence.challengeMatched, true);
  assert.equal(evidence.packageBindingMatched, true);
  assert.equal(evidence.externallyAttested, false);
  assert.equal(
    evidence.packageBindingDigest,
    digestObject(workerPackage)
  );
  assert.match(
    evidence.keyId,
    /^key:session-[0-9a-f]{24}$/
  );
  assert.match(
    evidence.sessionDigest,
    /^sha256:[0-9a-f]{64}$/
  );
  assert.deepEqual(
    Object.keys(authority).sort(),
    ["signResponse", "workloadSession"]
  );
  const observation = createWorkloadSessionObservation(
    authority.workloadSession
  );
  assert.equal(
    verifyWorkloadSessionObservation(observation, {
      expectedChallenge: challenge,
      expectedWorkerPackage: workerPackage
    }),
    true
  );
  assert.throws(
    () => authority.signResponse(response),
    ConflictError
  );
  const secondAuthority =
    createEphemeralWorkloadSessionAuthority({
      challenge,
      workerPackage
    });
  assert.notEqual(
    secondAuthority.workloadSession.keyId,
    authority.workloadSession.keyId
  );
  assert.doesNotMatch(
    JSON.stringify(authority),
    /PRIVATE KEY/
  );
});

test("workload response verification rejects content and signature tampering", () => {
  const authority =
    createEphemeralWorkloadSessionAuthority({
      challenge,
      workerPackage
    });
  const envelope = authority.signResponse(response);
  const changedResponse = mutableClone(envelope);
  changedResponse.response.kind = "tampered-response";
  assert.throws(
    () =>
      verifyAuthenticatedWorkerResponse(
        redigestEnvelope(changedResponse),
        {
          expectedChallenge: challenge,
          expectedWorkerPackage: workerPackage
        }
      ),
    IntegrityError
  );

  const changedSignature = mutableClone(envelope);
  changedSignature.signature =
    `${changedSignature.signature.startsWith("A") ? "B" : "A"}` +
    changedSignature.signature.slice(1);
  assert.throws(
    () =>
      verifyAuthenticatedWorkerResponse(
        redigestEnvelope(changedSignature),
        {
          expectedChallenge: challenge,
          expectedWorkerPackage: workerPackage
        }
      ),
    IntegrityError
  );
});

test("workload session response cannot replay across parent challenges", () => {
  const authority =
    createEphemeralWorkloadSessionAuthority({
      challenge,
      workerPackage
    });
  const envelope = authority.signResponse(response);
  const otherChallenge =
    "BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
  assert.throws(
    () =>
      verifyAuthenticatedWorkerResponse(envelope, {
        expectedChallenge: otherChallenge,
        expectedWorkerPackage: workerPackage
      }),
    IntegrityError
  );
  assert.throws(
    () =>
      verifyAuthenticatedWorkerResponse(envelope, {
        expectedChallenge: challenge,
        expectedWorkerPackage: {
          ...workerPackage,
          packageDigest: digestObject({
            package: "different-package"
          })
        }
      }),
    IntegrityError
  );
});

test("detached workload response API accepts only canonical Ed25519 material", () => {
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
  const statement =
    createWorkloadResponseSignatureRequest({
      response,
      workloadSession
    });
  const signature = sign(
    null,
    Buffer.from(canonicalJson(statement), "utf8"),
    privateKey
  ).toString("base64url");
  const envelope = createAuthenticatedWorkerResponse({
    response,
    workloadSession,
    signature
  });
  assert.deepEqual(
    normalizeAuthenticatedWorkerResponse(envelope),
    envelope
  );
  assert.throws(
    () =>
      createAuthenticatedWorkerResponse({
        response,
        workloadSession,
        signature: `${signature}A`
      }),
    ValidationError
  );
  assert.throws(
    () =>
      normalizeWorkloadSessionChallenge(
        `${challenge}=`
      ),
    ValidationError
  );
  assert.throws(
    () =>
      createWorkloadSession({
        challenge,
        workerPackage,
        publicKeyPem: workloadSession.publicKeyPem.replaceAll(
          "\n",
          "\r\n"
        )
      }),
    ValidationError
  );
});

test("workload session schema and injected bad signature fail closed", () => {
  const authority =
    createEphemeralWorkloadSessionAuthority({
      challenge,
      workerPackage,
      faultMode: "signature-mismatch"
    });
  const envelope = authority.signResponse(response);
  assert.throws(
    () =>
      verifyAuthenticatedWorkerResponse(envelope, {
        expectedChallenge: challenge,
        expectedWorkerPackage: workerPackage
      }),
    IntegrityError
  );
  assert.throws(
    () =>
      normalizeAuthenticatedWorkerResponse({
        ...envelope,
        externalAttestation: "not-proven"
      }),
    IntegrityError
  );
  assert.throws(
    () =>
      createEphemeralWorkloadSessionAuthority({
        challenge,
        workerPackage,
        faultMode: "accept-any-response"
      }),
    ValidationError
  );
});
