# FDOS Metrics Automation Model

Status: Released  
Version: 3.7

## Purpose

Distinguish between manually maintained and automatically generated FDOS metrics.

Long-term, FDOS metrics should emerge from project work rather than manual reporting overhead.

## Automatically Derivable Metrics

These should be generated from projects, repositories or workflow artifacts whenever possible:

- Sprint duration
- Lead time
- Time-to-Go-Live
- Bugs per sprint
- QA pass/fail rate
- Number of completed cases
- Number of reopened cases
- Release frequency
- Evidence item count

## Semi-Automatic Metrics

These require workflow structure plus human review:

- Validated learnings
- Knowledge reuse rate
- Pattern adoption
- Capability maturity
- Architecture change count
- Quality escape rate

## Manual Metrics

These require judgment and should remain intentionally limited:

- organizational debt assessment
- confidence level assignment
- strategic relevance
- standard approval readiness
- capability retirement decision

## Rule

A metric should be automated when measurement can be extracted reliably from normal project work.

A metric should remain manual when interpretation, judgment or governance approval is required.

## Warning

FDOS must not become KPI-heavy.

Metrics are only valuable when they improve learning, quality or delivery reliability.
