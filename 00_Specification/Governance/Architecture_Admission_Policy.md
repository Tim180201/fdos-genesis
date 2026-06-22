# Architecture Admission Policy

Status: Released  
Version: 3.6

## Purpose

Define when new major concepts may enter FDOS after the v3.x architecture baseline.

## Principle

FDOS architecture does not grow by invention.
FDOS architecture evolves only through validated organizational need.

## Admission Criteria

A new major concept may be admitted only if all criteria are met:

1. A recurring need is observed in real work.
2. Evidence exists from at least one reference implementation or project.
3. The concept cannot be represented by existing FDOS concepts.
4. The long-term organizational value is documented.
5. The complexity increase is justified.
6. The Architecture Board approves the change.
7. An ADR records the decision.

## Preferred Outcome

Most new ideas should become:

- Project learning
- Candidate knowledge
- Pattern candidate
- Supporting capability
- Reference implementation improvement

Only rarely should they become new architecture.

## Rejected Approach

A hard architecture freeze was rejected because it could block necessary evolution.

Instead, FDOS uses an Architecture Admission Policy:
the architecture is stable, but not dogmatic.
