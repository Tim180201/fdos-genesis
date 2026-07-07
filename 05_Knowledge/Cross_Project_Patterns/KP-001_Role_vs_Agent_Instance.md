# KP-001 — Role vs. Agent Instance

Status: Knowledge Candidate
Source Project: TapTime

## Purpose

Capture the organizational observation that engineering responsibilities (roles) should remain stable while the executing human or AI agent may change over time.

## Observation

TapTime separates permanent engineering roles from replaceable execution instances.

## Evidence Status

Validated in one project.

## Organizational Insight

- Roles define accountability.
- Agent instances define execution.
- Replacing an AI system should not require redesigning the operating model.

## Known Limitation (added 2026-07-07)

Further evidence from the same source project (`04_Evidence/taptime/EV-TAPTIME-ROLE-SEPARATION-SINGLE-OPERATOR.md`) shows that, in practice, all defined roles (Human Architect, Technical Lead, Review Agent, Development Agent) were executed by a single accountable operator across the project's full history. This does not invalidate the core insight above, but it refines it: the pattern has so far only been validated for "role stability while agent identity changes over time," not for "role independence while multiple roles are held concurrently by one operator." Decision Log language implying independent verification ("Review Agent verified, Human Architect approved") should be read with this limitation in mind until a project demonstrates genuine multi-operator role separation.

## Recommendation

Treat this as a Cross-Project Knowledge Candidate until validated by additional FDOS projects. Future validation should specifically check whether roles are held by distinct accountable parties, not only whether role definitions remain stable over time.

## Governance

Do not promote to FDOS Core until confirmed by multiple independent projects.