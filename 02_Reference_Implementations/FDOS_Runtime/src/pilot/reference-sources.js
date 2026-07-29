import { ValidationError } from "../kernel/errors.js";
import { GitReferenceSource } from "../integrations/git-reference-source.js";

const TAPTIME_ALLOWED_FILES = Object.freeze([
  "AGENTS.md",
  "README.md",
  "package.json",
  "ADO/README.md",
  "ADO/00_Core/Project_Status.md",
  "ADO/00_Core/Decision_Log.md",
  "ADO/00_Core/Risk_Register.md",
  "ADO/00_Core/Roadmap.md",
  "ADO/00_Governance/AVR-001_Artifact_Validation_Register.md",
  "ADO/01_Architecture/Product_Vision.md",
  "ADO/01_Architecture/Role_Model.md",
  "ADO/01_Architecture/Agent_Registry.md",
  "ADO/01_Architecture/Agent_Lifecycle.md",
  "ADO/01_Architecture/Engineering_Operating_Model.md",
  "ADO/01_Architecture/Development_Task_Profile.md",
  "ADO/01_Architecture/Repository_Health_Standard.md",
  "ADO/03_Testing/Adaptive_Verification_Standard.md"
]);

const COMPANY_AI_ALLOWED_FILES = Object.freeze([
  "AGENTS.md",
  "README.md",
  "package.json",
  "docs/governance/PROJECT_PRINCIPLES.md",
  "docs/governance/DECISIONS.md",
  "docs/agents/CHIEF_OF_STAFF.md",
  "docs/agents/KNOWLEDGE_STEWARD.md",
  "docs/architecture/TARGET_ARCHITECTURE.md",
  "docs/architecture/WORK_AUTOMATION.md",
  "docs/architecture/KNOWLEDGE_ARCHITECTURE.md",
  "docs/architecture/POSTGRES_RUNTIME.md",
  "docs/architecture/DATA_MIGRATION.md",
  "docs/architecture/SECURITY_RECOVERY.md",
  "docs/architecture/TEAMS_ROLLOUT.md",
  "src/taptime-reader.js",
  "src/run-lease.js",
  "src/handoffs.js",
  "src/teams/inbound-policy.js",
  "src/teams/inbound-gateway.js",
  "src/teams/delivery-worker.js",
  "src/postgres/task-queue.js",
  "src/security/envelope-encryption.js"
]);

export const PILOT_REFERENCE_POLICIES = Object.freeze({
  taptime: Object.freeze({
    sourceId: "taptime",
    allowedFiles: TAPTIME_ALLOWED_FILES,
    maxDocumentBytes: 384 * 1024
  }),
  "company-ai": Object.freeze({
    sourceId: "company-ai",
    allowedFiles: COMPANY_AI_ALLOWED_FILES,
    maxDocumentBytes: 384 * 1024
  })
});

export async function openPilotReferenceSource(
  sourceId,
  root,
  options = {}
) {
  const policy = PILOT_REFERENCE_POLICIES[sourceId];
  if (!policy) {
    throw new ValidationError(
      `Unknown pilot reference source: ${sourceId || "<empty>"}.`
    );
  }
  return GitReferenceSource.open({
    ...policy,
    ...options,
    sourceId: policy.sourceId,
    root,
    allowedFiles: policy.allowedFiles
  });
}
