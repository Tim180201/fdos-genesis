import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  AuthorizationError,
  InvocationVerifier,
  LocalInvocationAuthority,
  openAuthenticatedPilotRuntime,
  openPilotRuntime,
  PolicyError,
  ValidationError
} from "../src/index.js";

const owner = Object.freeze({
  type: "human",
  id: "human:personality-owner"
});
const chief = Object.freeze({
  type: "agent",
  id: "agent:chief-of-staff:primary"
});
const operations = Object.freeze({
  type: "agent",
  id: "agent:operations:primary"
});
const marketing = Object.freeze({
  type: "agent",
  id: "agent:marketing:primary"
});

async function personalityHarness(t) {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "fdos-agent-personality-")
  );
  const authority = LocalInvocationAuthority.create();
  const verifier = new InvocationVerifier({
    trustedKeys: [authority.trustDescriptor()],
    organizationId: authority.organizationId,
    audience: authority.audience
  });
  const gateway = await openAuthenticatedPilotRuntime({
    directory,
    invocationVerifier: verifier
  });
  t.after(async () => {
    await gateway.close().catch(() => {});
    await rm(directory, { recursive: true, force: true });
  });

  function request(principal, payload = {}) {
    const command = {
      type: "agent.profile",
      payload
    };
    return {
      command,
      invocation: authority.issue({ principal, command })
    };
  }

  return {
    gateway,
    request,
    execute(principal, payload = {}) {
      return gateway.execute(request(principal, payload));
    }
  };
}

test("each pilot agent resolves a distinct governed operating profile", async (t) => {
  const harness = await personalityHarness(t);
  const profiles = await Promise.all(
    [chief, operations, marketing].map((agent) =>
      harness.execute(agent)
    )
  );

  assert.deepEqual(
    profiles.map((profile) => profile.agent.roleId),
    ["chief-of-staff", "operations", "marketing"]
  );
  assert.equal(
    new Set(profiles.map((profile) => profile.personality.digest)).size,
    3
  );
  assert.equal(
    new Set(profiles.map((profile) => profile.digest)).size,
    3
  );
  assert.deepEqual(profiles[0].personality.traits, [
    "calm",
    "curious",
    "decisive",
    "diplomatic"
  ]);
  assert.equal(profiles[1].personality.pace, "deliberate");
  assert.equal(profiles[2].personality.warmth, "warm");
  assert.equal(
    profiles[0].precedence.at(-1),
    "personality-profile"
  );
  assert.ok(
    profiles.every((profile) =>
      profile.invariants.includes(
        "personality_never_bypasses_data_scope_or_approval"
      )
    )
  );
  assert.ok(
    profiles.every(
      (profile) =>
        profile.personality.capabilities === undefined &&
        profile.personality.permissions === undefined &&
        profile.personality.systemPrompt === undefined
    )
  );
  assert.throws(() => {
    profiles[0].personality.humor = "playful";
  }, TypeError);

  const status = harness.gateway.status();
  assert.equal(status.acceptedInvocations, 3);
  assert.equal(status.persistence.committedTransactionCount, 3);
});

test("profile lookup is self-only, closed-shape and authenticated", async (t) => {
  const harness = await personalityHarness(t);

  assert.throws(
    () => harness.execute(operations, { agentId: chief.id }),
    ValidationError
  );
  assert.equal(harness.gateway.status().acceptedInvocations, 0);

  await assert.rejects(
    () => harness.execute(owner),
    AuthorizationError
  );
  assert.equal(harness.gateway.status().acceptedInvocations, 1);

  const rawDirectory = await mkdtemp(
    path.join(os.tmpdir(), "fdos-raw-personality-")
  );
  const runtime = await openPilotRuntime({
    directory: rawDirectory,
    persistence: "sqlite"
  });
  t.after(async () => {
    await runtime.close().catch(() => {});
    await rm(rawDirectory, { recursive: true, force: true });
  });
  assert.throws(
    () =>
      runtime.getAgentOperatingProfile({
        ...operations,
        invocationId: "invocation_forged_000001",
        correlationId: "correlation_forged_000001"
      }),
    PolicyError
  );
});
