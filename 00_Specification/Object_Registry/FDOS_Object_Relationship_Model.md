# FDOS Object Relationship Model

Status: Released  
Version: 3.5

## Purpose

Define canonical relationship types between FDOS objects.

## Relationship Types

| Relationship | Meaning |
|---|---|
| governs | A higher authority defines constraints for another object. |
| implements | An implementation realizes a specification. |
| validates | A real-world application provides evidence for an object. |
| references | An object refers to another object without implementing it. |
| produces | An object creates another object or artifact. |
| consumes | An object uses another object or artifact. |
| evolves | Evidence or knowledge changes an object over time. |
| depends_on | An object requires another object to function. |

## Core Chain

```text
FDOS Specification
→ Reference Implementation
→ Project
→ Evidence
→ Knowledge
→ Specification Revision
```

## Principle

Context is created by relationships.
