# FDOS Object Naming Standard

Status: Released  
Version: 3.5

## Purpose

Define how stable FDOS object IDs are created, maintained and referenced.

## ID Format

```text
FDOS-<DOMAIN>-<NUMBER>
```

or for foundational concepts:

```text
FDOS-<CONCEPT>
```

## Examples

- FDOS-CONSTITUTION
- FDOS-KERNEL
- FDOS-CAP-001
- FDOS-WORKFLOW-SPEC
- FDOS-ADO-RI

## Rules

1. Every stable FDOS concept receives exactly one canonical ID.
2. IDs are never reused.
3. Deprecated objects retain their IDs.
4. Renaming an object does not change its ID.
5. New IDs require Architecture Board approval.
6. Kernel object IDs require Constitutional Governance review.
7. Reference Implementations may define their own IDs but must reference FDOS IDs.

## Relationship to ADO

ADO object IDs use the prefix:

```text
ADO-
```

ADO objects reference FDOS object IDs through semantic metadata.
