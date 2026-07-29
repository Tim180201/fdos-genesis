# Agent and Role Model

Status: Experimental Design  
Related Knowledge Candidate:
`../../../05_Knowledge/Cross_Project_Patterns/KP-001_Role_vs_Agent_Instance.md`

## Rule

A Role Definition and an Agent Instance are different objects.

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
- display name;
- lifecycle status: active, suspended or retired.

Claims, completions, handovers and audit events are attributed to the instance.

## Relationship

```text
Role Definition: Operations
        │
        ├── Agent Instance: operations-primary
        └── Agent Instance: operations-secondary
```

Multiple instances may share a role without duplicating the role definition.
Changing or suspending one instance does not silently change the permissions of
the role or the identity of another instance.

## Enforcement

The caller provides an agent-instance identifier.

The runtime:

1. resolves the instance in the Agent Registry;
2. rejects unknown, suspended or retired instances;
3. derives the role from the registered assignment;
4. rejects a conflicting caller-provided role claim;
5. evaluates permissions against the derived role;
6. records both instance and role in audit events.

## Current Limitation

The local registry is trusted configuration. Actor authentication does not yet
exist. Production operation requires cryptographically authenticated workload
identities and a governed agent lifecycle service.
