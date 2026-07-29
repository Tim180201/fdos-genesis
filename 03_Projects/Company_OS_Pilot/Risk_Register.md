# Company OS Pilot — Risk Register

Status: Active  
Review Date: 2026-07-29

| ID | Risk | Severity | Mitigation | Status |
|---|---|---|---|---|
| PILOT-R-001 | Experimental controls mistaken for production security | High | Explicit status and known-gap documentation | Open |
| PILOT-R-002 | Caller forges local actor identity | High | No external operation; replace with authenticated identity before Level 2 | Open |
| PILOT-R-003 | Event log exposes confidential content to host user | High | Local 0600 permissions; reject restricted data; add encryption before production | Open |
| PILOT-R-004 | Partial append or multiple writers corrupt state | Medium | Exact runtime-directory lease prevents a second cooperating process; hash verification remains; transactional store still required | Mitigated in Level 1 / residual open |
| PILOT-R-005 | Action classification is incomplete | High | Closed action catalogue; unknown actions denied | Mitigated in experiment |
| PILOT-R-006 | Workflow automation expands autonomy too early | High | A3/A4 blocked; no connectors or model providers | Mitigated in experiment |
| PILOT-R-007 | Test success causes premature Core promotion | Medium | ADR-0043 promotion rule and evidence governance | Mitigated |
| PILOT-R-008 | Role and concrete agent identity are conflated | High | Separate Role and Agent registries; derive role from registered instance | Mitigated in experiment |
| PILOT-R-009 | Mutable or changing reference state becomes organizational evidence | High | Pre/post HEAD and status check; exact tree/blob binding; tracked drift blocks intake | Mitigated in experiment |
| PILOT-R-010 | Valid source bytes are summarized incorrectly or treated as authority | High | Source evidence creates only a Memory Candidate; Human Governance reviews meaning, scope and sensitivity | Open human-control risk |
| PILOT-R-011 | Local Git, host account or unsigned evidence is compromised | High | No external action; content minimization; explicit Level 1 trust boundary; authenticated/signed evidence required later | Open |
| PILOT-R-012 | Stale filesystem lease or PID reuse blocks or misattributes ownership | Medium | Exact lease ID, expiry plus liveness check, malformed-state fail-closed behavior; transactional fencing later | Open residual risk |
