# Object Registry Integration Review v3.5

## Context

ADO Reference Implementation v2.1 revealed that ADO had become semantically more explicit than FDOS Genesis v3.4.

ADO contained object-level traceability, but FDOS did not yet provide a canonical Object ID Registry.

## Decision

FDOS Genesis v3.5 introduces the Object Registry.

## Impact

This enables stable semantic linking between:

- FDOS Specification
- ADO Reference Implementation
- future project validations
- evidence packages
- organizational memory
- future platform knowledge graph

## Architectural Assessment

This is not a new conceptual layer.

It is an infrastructure mechanism required to make existing FDOS concepts traceable and machine-readable.

## Status

Accepted.
