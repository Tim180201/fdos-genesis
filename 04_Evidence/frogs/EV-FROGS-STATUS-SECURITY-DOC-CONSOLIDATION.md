# Evidence Record — frogs Status and Security Documentation Consolidation

Status: Evidence Item
Project: frogs. Zeiterfassung
Date: 2026-06-23
Source Repository: Tim180201/frogs-zeiterfassung

## Observation

The frogs project contains contradictory or drifting status and security-related documentation across README, Project ADO, audit documentation and implementation status notes.

This creates release governance risk because humans and AI agents may infer different project truth depending on which document they read.

## Evidence

Observed inconsistencies include:

- Project status is RC-blocked while some documents describe implemented fixes without equivalent runtime validation.
- Security-sensitive topics such as Firebase login, Admin PIN, standard password handling and Firestore Rules are distributed across multiple documents.
- README, ADO and audit references have historically contained differing version and authentication descriptions.
- Project ADO already identifies version and documentation inconsistency as active project risk.

## FDOS Classification

Type: Project Evidence
Confidence: Medium
Scope: Project-specific
Core Impact: None
Recommended Destination: frogs project ADO / documentation cleanup

## Recommendation

Treat this as release hygiene, not as a new FDOS Core concept.

Recommended project action:

1. Establish `ADO/00_Core/Project_Status.md` as the single authoritative project status source.
2. Establish one security status document as the single authoritative security status source.
3. Reduce README to a short project overview and links to authoritative ADO/status documents.
4. Mark older contradictory documentation as superseded or historical.
5. Do not close any risk until runtime, Firebase, Rules or hardware evidence exists.

## FDOS Learning

This reinforces an existing FDOS principle:

Project truth must remain centralized, traceable and evidence-based.

No FDOS Core change is required.
