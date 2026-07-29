# Pilot Workflow — Software Change Readiness

Status: Experimental  
Roles: Chief of Staff, Operations, Marketing  
External Actions: Disabled

## Goal

Transform one bounded software-change objective into a traceable internal
release-readiness decision pack.

## Flow

```text
Chief of Staff: intake and constraints
        │
        ├───────────────┐
        ▼               ▼
Operations:          Marketing:
readiness review     internal draft
        │               │
        └───────┬───────┘
                ▼
Chief of Staff: synthesis and recommendation
```

## Step Contract

| Step | Owner | Action | Expected Output |
|---|---|---|---|
| `executive-intake` | Chief of Staff | Analyze | scope, success criteria, constraints |
| `operations-readiness` | Operations | Assess | readiness, checks, blockers |
| `marketing-draft` | Marketing | Prepare internal draft | audience, draft, claims to verify |
| `executive-synthesis` | Chief of Staff | Synthesize | recommendation, unresolved risks, approval requests |

Operations and Marketing begin only after the intake. Final synthesis begins
only after both specialist results exist.

The table names organizational roles. Runtime events additionally identify the
specific agent instance that claimed or completed each role-owned task.

## Safety

- All outputs are internal preparation artifacts.
- The Marketing step drafts content but cannot publish it.
- No email is sent.
- No repository or product is changed.
- A recommendation is not a release approval.
- Any future publication or release connector remains a separate A3 action and
  is blocked by this experiment.

## Success Criteria

- every step is attributable to its role;
- every gateway command is bound to a verified one-time Invocation;
- agent roles are derived from registered Agent Instances;
- one correlation ID links the authenticated pilot;
- each accepted Invocation and its internal effects share one local
  transaction;
- no step executes before its dependencies;
- each output satisfies its declared contract;
- unauthorized roles cannot read specialist-private results;
- final synthesis receives only explicitly declared dependency results;
- completion exports a verifiable evidence bundle;
- the event chain verifies after process restart.

## Authenticated Demonstration

`npm run demo` creates an ephemeral local Ed25519 authority, passes only its
public trust descriptor to the runtime and completes the four steps through
`AuthenticatedRuntimeGateway`.

The deterministic flow accepts 14 signed Invocations in 14 committed
transactions and ends with 29 audit events. The exported bundle contains the
28 events present at export time; the final authenticated memory read is
recorded immediately afterward. These counts are regression assertions, not
production identity or database evidence.
