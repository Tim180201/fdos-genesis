# KP-006 — Approval Must Bind the Exact Action Intent

Status: Knowledge Candidate  
Source Project: FDOS Company OS Pilot  
Derived From:
`04_Evidence/fdos-runtime/EV-FDOS-RUNTIME-PILOT-001.md`  
Validation Level: Level 1 — Experimental

## Purpose

Capture the security observation that approving a task label or generic action
category does not safely authorize execution when target, parameters, risk,
data sensitivity or attempt may differ.

## Observation

The FDOS Runtime experiment represents an Action Intent as a canonical,
content-addressed contract containing:

- action type;
- required capability;
- target;
- parameter digest;
- risk class;
- sensitivity;
- execution mode.

An A2 approval binds:

- one task;
- one task attempt;
- one exact Action Intent digest;
- one expiration time.

The test suite confirms that missing, expired, consumed and digest-mismatched
approvals fail closed. A retry requires a new approval.

## Organizational Insight

- "Approve this task" is ambiguous if the task's effective action can change.
- Approval scope should be machine-verifiable at execution time.
- Retry is a new execution decision, not an automatic extension of prior
  authority.
- Human review and technical enforcement are complementary: the human decides,
  while the runtime proves what that decision applies to.

## Limits

- The evidence comes from one controlled local implementation.
- No real connector action was executed.
- Caller identity was not cryptographically authenticated.
- Hash binding prevents accidental or ordinary application-level scope drift;
  it does not protect a fully compromised host.

## Recommendation

Retain this as a Knowledge Candidate.

Before using it as an organizational standard:

1. validate it with a sandboxed connector;
2. test target and parameter changes across a real approval interface;
3. test concurrent requests and transactional consumption;
4. complete human review and independent project validation.

## Governance

This candidate is not Validated Knowledge and does not modify the FDOS Core.
