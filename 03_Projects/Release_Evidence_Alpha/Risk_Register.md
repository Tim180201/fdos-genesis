# Release Evidence Alpha — Risk Register

Status: Active Planning
Review Date: 2026-11-09

| ID | Risk | Severity | Mitigation / Test | Status |
|---|---|---|---|---|
| REA-R-001 | Reported handoff leak exposes confidential content | Critical | Reproduce first; provenance, sensitivity inheritance and transfer authorization | Open — blocks G1 |
| REA-R-002 | False Git path/blob binding creates invalid source evidence | Critical | Trusted Git reconstruction and substitution tests | Open — blocks G1 |
| REA-R-003 | Canonicalization collision undermines digests and approvals | Critical | Versioned canonicalizer, property tests and migration decision | Open — blocks G1 |
| REA-R-004 | Host-dependent OCI fixture keeps supported suite red | High | Small controlled fixture; retain explicit production size limits | Open — blocks G1 |
| REA-R-005 | Existing runtime complexity costs more than selective replacement | High | Measure repair effort; permit small module replacement behind stable contracts | Open |
| REA-R-006 | Native GitHub/CI features provide equivalent value | High | Implement identical reference case with native controls and compare | Open — commercial kill risk |
| REA-R-007 | Evidence applicability rules create false green | Critical | Adversarial corpus, mutation matrix and unknown-fails-closed rule | Open |
| REA-R-008 | Excess false blocks make product unusable | High | Explainable findings, golden cases and measured operator intervention | Open |
| REA-R-009 | Agent prompt injection alters scope or claims | High | Closed contracts, isolated context and deterministic validation | Open |
| REA-R-010 | Reviewer is not meaningfully independent | High | Separate identity/context; prohibit self-review; human gate | Open |
| REA-R-011 | Shared documents leak beyond task need | High | Context Projection and classification/provenance tests | Open |
| REA-R-012 | Multi-agent parallelism causes conflicting implementation | Medium | One Programmer first; isolated worktrees and dependency graph before expansion | Mitigated by scope |
| REA-R-013 | GitHub permissions or credentials are too broad | Critical | Minimal manifest, no source write, secret lifecycle before G5 | Open — external gate |
| REA-R-014 | Local controls are mistaken for production security | High | Explicit Level 1 status and repeated known-gap disclosure | Open interpretation risk |
| REA-R-015 | Setup and support destroy margins | High | One supported stack; time every setup/support action; no bundled custom connectors | Open commercial risk |
| REA-R-016 | LLM usage becomes necessary for every gate decision | High | Deterministic verifier; optional separately budgeted assistance only | Mitigated by architecture |
| REA-R-017 | Teams value the idea but do not pay or reuse it | High | Bounded paid pilots and renewal evidence; no vanity validation | Open commercial risk |
| REA-R-018 | Price hypothesis is too low for onboarding cost | High | Paid setup/pilot experiment and measured support cost | Open commercial risk |
| REA-R-019 | Broad FDOS vision expands Alpha scope | High | ADR boundaries, weekly gate review and explicit non-goals | Open governance risk |
| REA-R-020 | Product claims imply compliance or certification | High | Position as evidence organization and verification only | Mitigated by product wording |
| REA-R-021 | No production identity, tenant isolation or recovery exists | Critical | Keep internal only until G5 controls are accepted | Open — external gate |
| REA-R-022 | Eight-week schedule is treated as SaaS launch promise | Medium | Separate internal Alpha, pilot hardening and sellable-product gates | Mitigated by plan |

## Review Rule

Review this register at every gate and whenever a new critical finding, scope
change or external dependency appears. A risk cannot become `Closed` solely
because implementation exists; linked acceptance evidence is required.
