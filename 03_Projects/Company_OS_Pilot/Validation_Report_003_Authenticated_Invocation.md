# Company OS Pilot — Validation Report 003

Status: Technical Slice 3 Passed / Human Review Pending
Date: 2026-07-29
Validation Level: Level 1 — Experimental

## Outcome

The Chief of Staff, Operations and Marketing pilot completed through an
authenticated command gateway. Every demo command was bound to a signed,
short-lived and one-time Invocation Context.

The runtime derived agent roles from its Agent Registry, persisted accepted
Invocation IDs across restart and preserved Invocation/correlation attribution
through resulting audit events.

No model provider, connector, external communication or product repository was
invoked.

## Acceptance Matrix

| Criterion | Result | Evidence |
|---|---|---|
| Complete automated suite | Passed, 79/79 | `../../04_Evidence/fdos-runtime/EV-FDOS-AUTHENTICATED-INVOCATION-003.md` |
| Focused identity/gateway suite | Passed, 16/16 | `test/authenticated-invocation.test.js` |
| Authenticated four-step pilot | Passed | `npm run demo`; end-to-end test |
| Exact command and operation binding | Passed locally | digest and tamper tests |
| Organization and audience binding | Passed locally | wrong-scope tests |
| Signature and trust-key verification | Passed locally | tamper, unknown-key and two-key rotation tests |
| Invocation time window | Passed locally | not-before, expiry and maximum-TTL tests |
| Caller role injection | Rejected | exact principal schema test |
| Agent role derivation | Passed locally | accepted-invocation audit assertion |
| Connector principal | Denied | gateway principal-policy test |
| Sequential and concurrent replay | Rejected | replay integration test |
| Replay after restart | Rejected | persistent rehydration test |
| Failed business command replay | Rejected | consume-before-dispatch test |
| Signed handoff and lifecycle controls | Passed locally | handoff, fail, retry and cancellation tests |
| Signed A2 approval flow | Passed locally | exact human decision and one-time consumption test |
| Identity attribution in system events | Passed locally | completed-run evidence assertion |
| Signature/key material in durable evidence | Absent in tested result | audit and demo minimization assertions |
| External actions | Absent | gateway command allowlist and demo |
| Production identity assurance | Not established | explicitly out of scope |

## Test Quality

- 79 tests passed.
- 90.83% line coverage.
- 77.73% branch coverage.
- 90.48% function coverage.

Coverage is supporting implementation evidence. It is not a
production-security, cryptographic-review or identity-assurance claim.

## Demonstrated Pilot Result

- four workflow tasks completed;
- Chief of Staff, Operations and Marketing participated;
- 14 authenticated Invocations were accepted;
- one correlation ID linked the workflow;
- the final runtime audit contained 29 valid hash-chained events;
- the evidence export contained the 28 events present at export time;
- one later authenticated memory read produced event 29;
- no external action executed.

## Open Findings

1. The local ephemeral signer is not an independent identity provider.
2. Private-key custody, revocation, federation and incident response are
   absent.
3. The host process and trust-store bootstrap remain trusted.
4. Direct lower-level runtime access could bypass the gateway and must not be
   exposed to an untrusted integration.
5. Invocation acceptance and business execution are not one transaction.
6. Replay state is local, unbounded and not distributed.
7. Trusted time, clock-skew monitoring and production tenant isolation are
   absent.
8. Evidence exports are hash-bound but not independently signed.
9. Data remains unencrypted at rest.
10. No connector, model provider or real organizational workload has been
    validated.

## Decision Request

Human Governance may accept Technical Slice 3 as Level 1 identity-boundary
evidence and authorize the next bounded experiment: transactional persistence
with atomic Invocation acceptance and command effects.

This report authorizes no connector, external action, production deployment or
FDOS Core promotion.
