# KP-007 — External Knowledge Requires Exact Source Binding

Status: Knowledge Candidate  
Source Projects: TapTime, Company AI, FDOS Company OS Pilot  
Validation Level: Level 1 — Experimental application

## Observation

A filesystem allowlist limits which paths an agent may read, but it does not
identify which repository state was read. A changing HEAD, dirty tracked file,
symlink or untracked file can otherwise make a later knowledge claim
irreproducible.

TapTime demonstrates exact commit/tree/artifact evidence discipline. Company
AI demonstrates fixed read-only source allowlists. The FDOS pilot combines and
strengthens both patterns by reading an allowlisted document from its exact Git
blob and binding the complete tracked manifest.

## Candidate Rule

Knowledge derived from an external repository should record:

- registered source identity;
- exact commit and tree;
- complete tracked-manifest digest;
- exact path and Git object identity;
- content digest and byte length;
- capture time and source-state classification;
- derivation and human review status.

Untracked content should remain excluded unless a separate, explicit intake
decision binds it.

## Important Limit

Source integrity is not semantic correctness. A valid digest proves which
bytes were used; it does not prove that an agent summarized them correctly or
that the source is authoritative. Derived knowledge must still enter the
normal candidate/review lifecycle.

## Evidence

- `03_Projects/Company_OS_Pilot/Reference_Adoption_Assessment.md`
- `04_Evidence/fdos-runtime/EV-FDOS-REFERENCE-INTAKE-002.md`

## Next Validation

Validate the pattern with an authenticated, read-only connector and an
independent project before considering promotion.
