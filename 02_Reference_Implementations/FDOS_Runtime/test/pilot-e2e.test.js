import assert from "node:assert/strict";
import test from "node:test";
import {
  executeSoftwareChangeReadinessDemo,
  openPilotRuntime,
  verifyEvidenceBundle
} from "../src/index.js";
import { createPilotHarness } from "../test-support/helpers.js";

test("three-role demo completes without an external action", async (t) => {
  const harness = await createPilotHarness(t);
  const result = await executeSoftwareChangeReadinessDemo(harness.runtime);
  assert.equal(result.run.status, "completed");
  assert.equal(result.run.tasks.length, 4);
  assert.equal(result.run.tasks.every((task) => task.status === "completed"), true);
  assert.equal(result.acceptedOperationsMemory.length, 1);
  assert.equal(verifyEvidenceBundle(result.evidence), true);
  assert.deepEqual(
    new Set(result.run.tasks.map((task) => task.ownerRoleId)),
    new Set(["chief-of-staff", "operations", "marketing"])
  );
  assert.equal(
    result.run.tasks.some((task) => ["A3", "A4"].includes(task.actionIntent.riskClass)),
    false
  );
  assert.equal(harness.runtime.status().externalActionsEnabled, false);
});

test("demo audit survives restart with the same head hash", async (t) => {
  const harness = await createPilotHarness(t);
  await executeSoftwareChangeReadinessDemo(harness.runtime);
  const before = harness.runtime.verifyIntegrity();
  await harness.runtime.close();
  const reopened = await openPilotRuntime({ directory: harness.directory });
  const after = reopened.verifyIntegrity();
  assert.deepEqual(after, before);
  assert.equal(reopened.status().runs.completed, 1);
  assert.equal(reopened.status().tasks.completed, 4);
  await reopened.close();
});
