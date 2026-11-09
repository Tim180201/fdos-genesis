# Canonical JSON v2 Migration Boundary

Status: Breaking Experimental Format Change

Effective Runtime Version: `0.14.0-experimental`

Canonical JSON Format: `2.0`

Production Status: Not Production Ready

## Why Version 2 Exists

Canonical JSON v1 copied object properties into an ordinary JavaScript object
before serialization. Assigning an own property named `__proto__` changed that
temporary object's prototype instead of retaining the property. Consequently,
two distinct inputs could produce the same canonical JSON and SHA-256 digest.

Version 2 removes that ambiguity and treats the canonicalization rules as an
explicit cryptographic protocol rather than an implementation detail.

## Version 2 Data Model

The supported value graph is deliberately narrower than arbitrary JavaScript:

- `null`, strings, booleans and finite numbers are supported;
- negative zero is normalized to zero;
- arrays must be dense and contain only ordinary indexed data properties;
- objects must have `Object.prototype` or a null prototype;
- every own object property must be enumerable, string-keyed and data-backed;
- `__proto__` is retained as an ordinary own property;
- accessors, symbol keys, hidden properties, extended arrays, sparse arrays,
  functions, `undefined`, `bigint`, cycles and non-plain objects are rejected.

Object keys are sorted before JSON serialization. Validation reads property
descriptors rather than executing accessors.

## Integrity Domain

`canonicalJson(value)` remains the canonical UTF-8 JSON representation used
for storage and transport checks.

Every v2 digest or signature contract instead consumes:

```text
fdos-canonical-json:2.0\0<canonical JSON bytes>
```

The domain prefix makes the format version participate directly in integrity
bindings. `digestObject` and every FDOS Ed25519 signing or verification path
use these domain-separated bytes.

## Affected Persistent and Signed Contracts

The breaking format change advances the following identities:

| Contract | Version after migration |
|---|---:|
| Runtime package | `0.14.0-experimental` |
| Audit event schema | `2.0` |
| SQLite event-store schema | `2.0` |
| SQLite `user_version` | `2` |
| SQLite canonical-format metadata | `2.0` |
| Worker source artifact | `4.0.0-experimental` |
| Worker package | `3.0.0-experimental` |

Invocation signatures, action and evidence digests, worker release
attestations, workload-session signatures and event hashes are therefore not
interchangeable between v1 and v2.

## Fail-Closed Compatibility Rule

FDOS does not silently reinterpret, rewrite or re-sign v1 integrity material.
A non-empty v1 SQLite store is rejected by the v2 runtime because its schema,
`user_version` and canonical-format metadata do not match exactly.

The repository retains historical worker packages and evidence as historical
records. Their signatures must be verified only by the code and trust policy
that defined their original format. They are not v2 releases.

## Experimental Migration Procedure

There is no automated migration command. For experimental data that must be
retained:

1. stop all writers and preserve the complete v1 runtime directory read-only;
2. record its filesystem manifest, byte digests, runtime version and verification
   result using the original compatible runtime;
3. independently review the semantic records to be carried forward;
4. initialize an empty v2 runtime directory;
5. re-ingest approved facts as new v2 records with explicit provenance to the
   archived v1 source;
6. obtain new Human Governance decisions where an approval, memory promotion
   or authority claim is required;
7. retain the v1 archive and v2 store as separate histories.

Never recompute a v1 digest or signature under v2 and present it as continuity
of the original authorization. Migration creates new evidence; it does not
retroactively upgrade old evidence.

## Promotion Requirements

Before a production migration tool can exist, FDOS requires:

- exact source and target manifests;
- offline backup and restore evidence;
- source verification with the original format implementation;
- typed conversion rules for every persisted record;
- before/after event-count and semantic reconciliation;
- rollback and interruption testing;
- independent security review;
- explicit Human Governance approval.

Until those requirements are met, starting a new v2 store is the only
supported path.
