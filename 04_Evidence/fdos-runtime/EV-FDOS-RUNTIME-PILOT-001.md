# Evidence Record — FDOS Runtime Three-Role Vertical Slice

Status: Evidence Item / Human Review Required  
Project: FDOS Company OS Pilot  
Date: 2026-07-29  
Confidence: Medium for tested local behavior; Low for production fitness  
FDOS Validation Level: Level 1 — Experimental  
Core Impact: None

## 1. Purpose

Record the first executable evidence for a governed FDOS runtime coordinating
Chief of Staff, Operations and Marketing as one bounded organizational
workflow.

## 2. Reference State

- FDOS starting baseline: `09a1703`
- Implementation:
  `02_Reference_Implementations/FDOS_Runtime/`
- Project application: `03_Projects/Company_OS_Pilot/`
- Source and test binding:
  `EV-FDOS-RUNTIME-PILOT-001_Source_Manifest.sha256`
- Runtime: Node.js `v24.17.0`
- Network connectors: disabled
- External actions: disabled

The implementation was an uncommitted working-tree change when this record was
created. The SHA-256 manifest binds the evaluated source and tests until a
future repository commit provides the stronger repository-level binding.

## 3. Commands and Results

### Complete check

```text
npm run check
tests 49
pass 49
fail 0
skipped 0
```

### Built-in test coverage

```text
npm run coverage
line coverage:     91.05%
branch coverage:   79.77%
function coverage: 90.15%
```

Coverage describes exercised JavaScript implementation paths. It is not a
security certification.

### Deterministic pilot demo

```text
npm run demo
workflow status: completed
workflow tasks: 4
audit events: 15
external actions executed: false
audit verification: valid
```

The exact hashes and identifiers vary per fresh demo because each run receives
new identifiers.

## 4. Verified Behaviors

### Role and agent-instance separation

- Role Definitions own responsibilities and capabilities.
- Agent Instances own runtime attribution.
- Two active instances can hold the same role.
- A suspended instance is rejected.
- An instance cannot claim a different role identity.

### Workflow and handover control

- Only dependency-free tasks become ready.
- Operations and Marketing become ready only after executive intake.
- Executive synthesis becomes ready only after both specialist results exist.
- Dynamic handovers suspend the parent task and return an explicit result.
- Handover depth is bounded.
- Concurrent claims serialize; exactly one succeeds.

### Action policy and approvals

- Unknown action types are denied.
- An action cannot be classified below its registered minimum risk.
- A3 and A4 execution is blocked.
- A2 execution requires one exact human approval.
- Approval binds task, attempt and canonical Action Intent.
- Approval expires and is consumed once.
- A retry requires a new approval.
- An agent cannot approve its own request.

### Information and memory boundaries

- Marketing cannot read an Operations-owned task.
- Cross-role result access occurs through an explicit workflow dependency.
- Department memory is isolated.
- Unreviewed and rejected Memory Candidates are not readable as long-term
  memory.
- Restricted memory is rejected.
- Confidential memory cannot be placed into company-wide scope.

### Evidence integrity

- Every material transition is appended to a SHA-256 hash chain.
- Payload tampering and malformed persisted events are rejected on reopen.
- Evidence-bundle mutation invalidates its digest.
- Completed state rehydrates from the verified event log after restart.

## 5. Negative Evidence and Limits

The experiment does not demonstrate:

- authenticated human or agent identities;
- production tenant isolation;
- encryption at rest;
- multi-process or distributed consistency;
- database transactions;
- secret management;
- connector sandboxing;
- real Slack, Teams, email, CRM, GitHub or MCP behavior;
- real model-provider behavior;
- incident response or disaster recovery;
- operational usefulness in a live company.

The local event chain is tamper-evident, not cryptographically anchored against
an attacker who controls the host.

## 6. Interpretation

The result supports one limited conclusion:

> The tested FDOS concepts can be represented as a small, deterministic,
> fail-closed local runtime for an internal three-role workflow.

The result does not support these conclusions:

- the runtime is production ready;
- the runtime is secure against hostile infrastructure;
- autonomous company operation is safe;
- the implementation should become FDOS Core;
- external connectors should now be enabled.

## 7. Recommended Next Evidence

1. Human review of this Evidence Item and the project Validation Report.
2. A real, non-critical internal project run with authenticated human input.
3. Replacement of caller-asserted identities with authenticated workload
   identities.
4. Transactional persistence and multi-process concurrency tests.
5. One sandboxed read-only connector before any write connector.
6. Threat review and incident model before Level 2 consideration.

## 8. Governance

This record is project evidence.

It is not Validated Evidence, Organizational Knowledge, a release approval or
an FDOS Core change.

## 9. Follow-Up

The later reference-intake, source-provenance and process-lease controls are
recorded separately in `EV-FDOS-REFERENCE-INTAKE-002.md`. That evidence does
not retroactively change this record's original 49-test source binding. The
original manifest is a historical binding and is not expected to match the
expanded runtime; the current candidate is bound separately by
`EV-FDOS-REFERENCE-INTAKE-002_Source_Manifest.sha256`.

The still later authenticated-invocation controls are recorded in
`EV-FDOS-AUTHENTICATED-INVOCATION-003.md`. They do not change this record's
historical conclusions or source manifest.
