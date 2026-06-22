# Knowledge Confidence Model

Status: Released  
Version: 3.7

## Purpose

Define how confidence in organizational knowledge is evaluated.

Not every learning has the same reliability.

FDOS distinguishes between early observations, validated learnings and core standards.

## Confidence Levels

### Low

A single observation exists, but evidence is limited.

Criteria:
- source is known
- impact is unclear or unvalidated
- no repeated use yet

### Medium

The learning appears useful and has some evidence.

Criteria:
- source is documented
- impact is described
- at least one review occurred
- limitations are known

### High

The learning is supported by strong practical evidence.

Criteria:
- repeated usefulness or strong project impact
- reviewed by responsible owner
- risks and limitations documented
- reusable outside original context

### Validated

The knowledge is formally accepted as reusable organizational knowledge.

Criteria:
- evidence package exists
- reviewed and approved
- traceable to project or reference implementation
- clear reuse potential

### Core Standard

The knowledge has become a stable standard.

Criteria:
- validated evidence exists
- repeated organizational value is demonstrated
- approved through governance
- maintained with versioning and owner

## Transitions

Low → Medium:
Requires documented evidence and reviewer acknowledgement.

Medium → High:
Requires stronger evidence, reuse potential and risk assessment.

High → Validated:
Requires formal review and approval.

Validated → Core Standard:
Requires governance approval and demonstrated organizational value.

## Responsibilities

Knowledge Owner:
Maintains quality and lifecycle.

Capability Owner:
Assesses capability impact.

Architecture Board:
Approves promotion to standard when architecture is affected.

## Rule

Confidence must be earned through evidence, not assigned by opinion.
