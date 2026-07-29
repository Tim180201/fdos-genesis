# Agent and Role Model

Status: Experimental Design  
Related Knowledge Candidate:
`../../../05_Knowledge/Cross_Project_Patterns/KP-001_Role_vs_Agent_Instance.md`

## Rule

A Role Definition and an Agent Instance are different objects.

A Personality Profile is a third, non-authoritative object. It shapes how one
Agent Instance communicates within its role; it never changes what that
instance may do.

## Role Definition

A role describes stable organizational responsibility:

- role identifier and name;
- department;
- capabilities;
- allowed memory scopes;
- maximum information sensitivity;
- communication style.

Tasks and workflow steps are assigned to roles.

## Agent Instance

An agent instance describes one runtime participant:

- unique instance identifier;
- assigned role identifier;
- exact Personality Profile identifier, version and digest;
- display name;
- lifecycle status: active, suspended or retired.

Claims, completions, handovers and audit events are attributed to the instance.

## Relationship

```text
Role Definition: Operations
        │
        ├── Agent Instance: operations-primary
        │       └── Personality: reliability-guardian
        └── Agent Instance: operations-secondary
                └── Personality: another role-compatible profile
```

Multiple instances may share a role without duplicating the role definition.
Changing or suspending one instance does not silently change the permissions of
the role or the identity of another instance.

Changing a Personality Profile changes its digest but grants no capability.
See `AGENT_PERSONALITY_MODEL.md`.

## Enforcement

The authenticated gateway verifies a signed principal containing an
agent-instance identifier and no role claim.

The runtime:

1. resolves the instance in the Agent Registry;
2. rejects unknown, suspended or retired instances;
3. derives the role from the registered assignment;
4. rejects a conflicting caller-provided role claim;
5. evaluates permissions against the derived role;
6. resolves the exact role-compatible Personality Profile separately;
7. records instance and role in audit events.

## Current Limitation

The local registry and public-key bootstrap are trusted configuration. The
ephemeral demo signer proves the invocation mechanism, not a production
workload identity. Production operation requires an independent identity
provider, protected key custody, revocation and a governed agent lifecycle
service. Personality validation currently proves configuration and binding,
not model behavior.
