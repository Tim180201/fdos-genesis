# Reference Implementation Separation Policy

Status: Released  
Version: 3.7

## Purpose

Define the final separation between FDOS Specification, Reference Implementations and Projects.

## Architecture

```text
FDOS Specification
→ Reference Implementations
→ Projects
→ Evidence
→ FDOS Revision
```

## Rule

Reference Implementations are reusable organizational implementations.

Projects apply Reference Implementations.

Projects never own Reference Implementations.

## ADO Rule

ADO is the first official Reference Implementation of FDOS.

ADO must live outside individual projects.

Project-specific ADO structures inside projects are considered project applications, not the canonical ADO Reference Implementation.

## Project Rule

Projects may contain:

- project-specific ADO usage
- project-specific decisions
- project-specific risks
- project-specific evidence
- project-specific learnings

Projects must not define canonical ADO behavior.

## Rationale

This separation prevents duplicated truth and enables reuse across frogs., TimeTap and future projects.
