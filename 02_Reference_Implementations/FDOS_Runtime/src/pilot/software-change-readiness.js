import { FdosRuntime } from "../runtime/fdos-runtime.js";

export const SOFTWARE_CHANGE_READINESS_WORKFLOW = Object.freeze({
  id: "company.software-change-readiness",
  version: "1.0.0-experimental",
  name: "Software Change Readiness",
  purpose:
    "Create an internal, evidence-led readiness and communication decision pack without performing an external action.",
  ownerRoleId: "chief-of-staff",
  maxHandoffDepth: 2,
  maxHandoffsPerRun: 6,
  steps: [
    {
      id: "executive-intake",
      title: "Clarify objective and decision boundary",
      roleId: "chief-of-staff",
      instructions:
        "Translate the request into a bounded scope, measurable success criteria and explicit constraints. Do not authorize release or publication.",
      desiredOutcome:
        "A precise internal brief that Operations and Marketing can use independently.",
      dependencies: [],
      actionType: "work.intake.analyze",
      target: "internal:software-change-brief",
      parameters: {
        externalActions: false,
        decisionAuthority: "human"
      },
      riskClass: "A0",
      sensitivity: "internal",
      output: {
        requiredFields: ["scope", "successCriteria", "constraints"]
      }
    },
    {
      id: "operations-readiness",
      title: "Assess operational readiness",
      roleId: "operations",
      instructions:
        "Assess the supplied scope against verification, rollout, rollback and operational-risk criteria. Separate confirmed facts from unresolved blockers.",
      desiredOutcome:
        "A readiness assessment with checks and blockers that can support a human decision.",
      dependencies: ["executive-intake"],
      actionType: "operations.release.assess",
      target: "internal:release-readiness-assessment",
      parameters: {
        productionChange: false,
        connectorExecution: false
      },
      riskClass: "A0",
      sensitivity: "internal",
      output: {
        requiredFields: ["readiness", "checks", "blockers"]
      }
    },
    {
      id: "marketing-draft",
      title: "Prepare internal communication draft",
      roleId: "marketing",
      instructions:
        "Prepare an internal draft based only on the intake. Mark every claim that still requires operational verification. Do not publish or send.",
      desiredOutcome:
        "An audience-specific unpublished draft with an explicit claim-verification list.",
      dependencies: ["executive-intake"],
      actionType: "marketing.release.draft",
      target: "internal:unpublished-release-draft",
      parameters: {
        publish: false,
        send: false
      },
      riskClass: "A1",
      sensitivity: "internal",
      output: {
        requiredFields: ["audience", "draft", "claimsToVerify"]
      }
    },
    {
      id: "executive-synthesis",
      title: "Synthesize the human decision pack",
      roleId: "chief-of-staff",
      instructions:
        "Reconcile the Operations assessment and Marketing draft. Produce a recommendation, unresolved risks and any human approval requests. A recommendation is not an approval.",
      desiredOutcome:
        "One traceable internal decision pack for Human Governance.",
      dependencies: ["operations-readiness", "marketing-draft"],
      actionType: "executive.release.synthesize",
      target: "internal:human-decision-pack",
      parameters: {
        decisionOwner: "human",
        externalActions: false
      },
      riskClass: "A0",
      sensitivity: "internal",
      output: {
        requiredFields: [
          "recommendation",
          "unresolvedRisks",
          "approvalRequests"
        ]
      }
    }
  ]
});

export async function openPilotRuntime(options = {}) {
  return FdosRuntime.open({
    ...options,
    workflowDefinitions: [
      ...(options.workflowDefinitions || []),
      SOFTWARE_CHANGE_READINESS_WORKFLOW
    ]
  });
}
