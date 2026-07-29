export const PILOT_CONNECTOR_CONTRACT_DEFINITIONS = Object.freeze([
  {
    id: "reference-metadata",
    version: "1.0.0-experimental",
    name: "Reference Metadata Dry-Run Contract",
    description:
      "Exercises a content-minimized repository-metadata request without network access or external effects.",
    executionMode: "dry_run",
    networkAccess: false,
    externalEffects: false,
    maxAttempts: 2,
    operations: [
      {
        id: "repository.metadata.read",
        description:
          "Prepare a repository and revision metadata read for an isolated future adapter.",
        actionType: "connector.reference.read",
        targetPrefix: "reference:",
        riskClass: "A1",
        sensitivity: "internal",
        parameterFields: [
          {
            name: "repositoryId",
            type: "string",
            required: true,
            maxLength: 120
          },
          {
            name: "revision",
            type: "string",
            required: true,
            maxLength: 160
          },
          {
            name: "includeCommitMetadata",
            type: "boolean",
            required: false,
            maxLength: 0
          }
        ]
      }
    ]
  }
]);

export const PILOT_CONNECTOR_INSTANCE_DEFINITIONS = Object.freeze([
  {
    id: "connector:reference:primary",
    name: "Primary Reference Metadata Dry-Run Connector",
    contractId: "reference-metadata",
    contractVersion: "1.0.0-experimental",
    status: "active"
  }
]);

export const CONNECTOR_OUTBOX_DRY_RUN_WORKFLOW = Object.freeze({
  id: "company.reference-metadata-dry-run",
  version: "1.0.0-experimental",
  name: "Reference Metadata Dry-Run",
  purpose:
    "Exercise a bounded connector delivery intent without network access or an external effect.",
  ownerRoleId: "chief-of-staff",
  maxHandoffDepth: 1,
  maxHandoffsPerRun: 1,
  steps: [
    {
      id: "intake",
      title: "Bound the dry-run request",
      roleId: "chief-of-staff",
      instructions:
        "Confirm the request is internal-only and carries no connector execution authority.",
      desiredOutcome: "A bounded internal request.",
      dependencies: [],
      actionType: "work.intake.analyze",
      target: "internal:connector-dry-run-intake",
      parameters: {
        externalEffects: false
      },
      riskClass: "A0",
      sensitivity: "internal",
      output: {
        requiredFields: ["scope"]
      }
    },
    {
      id: "reference-read",
      title: "Prepare reference metadata read",
      roleId: "operations",
      instructions:
        "Prepare only the contracted repository metadata request. Do not access a network.",
      desiredOutcome: "A content-minimized dry-run result.",
      dependencies: ["intake"],
      actionType: "connector.reference.read",
      target: "reference:repository-metadata",
      parameters: {
        dryRun: true,
        networkAccess: false
      },
      riskClass: "A1",
      sensitivity: "internal",
      output: {
        requiredFields: ["deliveryStatus"]
      }
    }
  ]
});
