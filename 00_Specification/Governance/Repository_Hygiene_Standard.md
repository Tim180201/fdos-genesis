# Repository Hygiene Standard

Status: Released  
Version: 3.7

## Purpose

Keep FDOS repositories maintainable, lightweight and historically traceable.

## Principle

Current releases should contain the current operational truth, not every previous version.

Historical versions are preserved through archive, changelog, release notes and ADRs.

## Rules

1. Old full releases must not be copied into every new release.
2. Each release must contain a changelog and release notes.
3. Important architectural decisions must be preserved as ADRs.
4. Deprecated documents must be archived, not silently deleted.
5. The active repository must remain understandable for new contributors.
6. Archive content must never create a second source of truth.

## Recommended Structure

```text
Archive/
├── Releases/
├── Deprecated/
└── Historical_Reviews/
```

## Archive Policy

Archive content is historical evidence.

Archive content is not active specification.

If archived content conflicts with current specification, the current specification wins.

## Repository Health Criteria

A repository is healthy when:

- active documents are easy to find
- old versions are not mixed with current truth
- every major change is traceable
- no duplicated canonical control artifacts exist
- new contributors can understand the structure without prior history
