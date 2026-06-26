# Architectural Dependency Model

Status: Canonical Dependency Model
Release: Repository Maturity R4.1

## Purpose

This document defines the dependency hierarchy of the FDOS architecture.

It establishes clear ownership of concepts and minimizes architectural coupling.

## Canonical Dependency Hierarchy

Organizational Vocabulary
        ↓
Organizational Object Model
        ↓
FDOS Architecture Map
        ↓
Learning System
        ↓
Knowledge
        ↓
Evidence
        ↓
AI Collaboration
        ↓
Projects

## Dependency Rules

- Lower layers may depend on higher layers.
- Higher layers shall not depend on lower layers.
- Canonical definitions shall never be duplicated.
- Dependencies should remain acyclic.
- Architectural responsibilities shall have a single owner.

## Change Impact Principle

Changes to upper layers require constitutional review because they may affect all dependent layers.

Changes to lower layers should not require changes to canonical architecture unless new organizational evidence justifies it.

## Architectural Principle

FDOS evolves by extending stable foundations rather than modifying dependent implementations.