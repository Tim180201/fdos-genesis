# FDOS Core Object Definitions

Status: Active  
Repository Baseline: v3.12.0 Clean LTS

## Purpose

Define stable meanings for core FDOS objects.

The Object Library does not expand the FDOS Core.

It prevents ambiguity by giving frequently used concepts a single organizational meaning.

## Evidence

**Definition:** A traceable record derived from real project activity, review, implementation, test, incident or operational result.

**Owner:** Project initially; Research Agent may analyze; human governance validates.

**Lifecycle:** Observation -> Evidence Item -> Review -> Validated Evidence -> Knowledge Candidate

**Rules:**

- Evidence must remain traceable to source.
- Evidence may be positive, negative or inconclusive.
- Evidence alone does not modify the FDOS Core.

## Knowledge Candidate

**Definition:** A proposed organizational learning derived from reviewed evidence.

**Owner:** Research Agent drafts; human governance reviews.

**Lifecycle:** Evidence -> Knowledge Candidate -> Review -> Validated Knowledge

**Rules:**

- A Knowledge Candidate is not organizational truth.
- Confidence must match evidence quality.
- Project context must remain attached.

## Validated Knowledge

**Definition:** Organizational knowledge accepted through review as reusable beyond its original project context.

**Owner:** Knowledge Owner / human governance.

**Lifecycle:** Knowledge Candidate -> Validated Knowledge -> Pattern Candidate or Proposal

**Rules:**

- Validated Knowledge must retain evidence traceability.
- Validation does not automatically create a standard.

## Pattern Candidate

**Definition:** A reusable practice or structure that appears valuable across contexts but is not yet an organizational standard.

**Owner:** Research Agent drafts; Architecture Review validates.

**Lifecycle:** Validated Knowledge -> Pattern Candidate -> Validated Pattern -> Standard Proposal

**Rules:**

- Patterns require demonstrated reuse potential.
- Anti-patterns are equally valuable when evidence shows failure.

## Proposal

**Definition:** A formal recommendation to change knowledge, patterns, reference implementations, governance or the FDOS Core.

**Owner:** Research Agent may generate; human governance decides.

**Lifecycle:** Validated Knowledge or Pattern -> Proposal -> Human Review -> Accept / Reject / Defer

**Rules:**

- A Proposal is not a decision.
- Every Proposal requires evidence, impact and migration assessment.

## Capability

**Definition:** A stable organizational ability defined, governed and improved through evidence.

**Owner:** Capability Owner / Architecture Board.

**Lifecycle:** Concept -> Experimental -> Validated -> Core Standard -> Maintenance -> Retirement

**Rules:**

- Capabilities enter the Core only through validated evidence and governance.
- Capabilities should remain few and stable.

## Reference Implementation

**Definition:** A reusable operational implementation of FDOS concepts used to validate and apply FDOS in practice.

**Owner:** Reference Implementation Owner.

**Lifecycle:** Candidate -> Implemented -> Validated -> Maintained -> Retired

**Rules:**

- Reference Implementations are outside projects.
- Projects apply Reference Implementations; they do not own them.

## Project ADO

**Definition:** The authoritative operational memory of a project, containing project decisions, risks, evidence, status and learning.

**Owner:** Project / Development Agent maintains.

**Lifecycle:** Initialized -> Maintained during project -> Reviewed -> Evidence source -> Archived

**Rules:**

- Project ADO is project truth, not FDOS Core truth.
- Project ADO is the collaboration interface between Development and Research.

## Decision

**Definition:** A documented choice with rationale, alternatives, expected consequences and evidence.

**Owner:** Responsible human or delegated project role; Development Agent may draft.

**Lifecycle:** Proposed -> Accepted -> Implemented -> Reviewed -> Superseded / Archived

**Rules:**

- Important decisions must explain why, not only what.
- Decisions should remain traceable to resulting evidence.

## Risk

**Definition:** A documented uncertainty or threat that may affect delivery, quality, maintainability, governance or organizational learning.

**Owner:** Project / Governance depending on scope.

**Lifecycle:** Identified -> Assessed -> Mitigated / Accepted -> Reviewed -> Closed

**Rules:**

- Risks should not remain hidden in implementation.
- Material risks require owner and status.

## Metric

**Definition:** A measurement used to improve learning, quality, delivery reliability or organizational capability.

**Owner:** Project or organization depending on metric scope.

**Lifecycle:** Defined -> Captured -> Reviewed -> Used for learning -> Retired if no longer useful

**Rules:**

- Metrics exist for learning, not bureaucracy.
- Metrics should be automated where reliable and manual where judgment is required.
