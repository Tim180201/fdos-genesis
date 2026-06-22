# Core Stability Policy

Status: Released  
Version: 3.8 LTS

## Purpose

Protect the FDOS Core from unnecessary expansion after the Genesis architecture phase.

## Principle

The FDOS Core shall remain small, stable and evidence-based.

## Policy

After FDOS Genesis v3.8 LTS:

- no new main areas shall be introduced without validated need
- no new Core Capabilities shall be introduced without validated evidence
- no new governance layer shall be introduced without demonstrated operational need
- no new meta-architecture shall be introduced unless existing structures are insufficient

## Admission Requirements

A new Core concept may only be admitted if:

1. multiple real use cases demonstrate the need, or one strong long-running project provides substantial evidence
2. existing FDOS concepts cannot reasonably represent the need
3. complexity increase is justified
4. long-term organizational value is documented
5. Architecture Board approves the admission
6. ADR records the decision
7. affected Reference Implementations are identified

## Preferred Alternatives

Before admitting a new Core concept, consider:

- project learning
- knowledge asset
- pattern candidate
- supporting capability
- workflow variation
- reference implementation improvement
- documentation clarification

## Final Rule

If a change does not demonstrably improve real product development, it does not belong in the FDOS Core.
