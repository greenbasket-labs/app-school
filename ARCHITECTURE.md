# Architecture

## Current foundation

This project is a fresh implementation. Existing application code was deliberately not inherited.

## Decision: modular monolith

Start as one deployable application with explicit domain boundaries. Split services only when operational evidence justifies it.

## Decision: PostgreSQL is the server source of truth

Important identity, tenancy, authorization and audit invariants belong in the database as well as application code. Offline-first does not replace PostgreSQL as the server authority; it adds a durable local operational layer for continuity and synchronization.

## Decision: application-wide offline-first

Offline-first is a platform requirement for the entire App-School application, not a feature that individual modules may implement independently.

The local device should maintain a durable working set of school data needed by the workflows assigned to that device. The UI should read from and write to this local store first. A shared synchronization layer reconciles pending changes with the server when connectivity is available.

```text
                         SERVER
                 PostgreSQL source of truth
                           ▲
                           │
                  server validation/audit
                           │
                     Sync protocol
                           ▲
                           │
                    Outbox / pending ops
                           ▲
                           │
                 Local durable data store
                           ▲
                           │
                    App-School UI
```

### Offline-first architectural rules

1. **Local-first interaction:** reads and important writes should not require a live network request when the required data is already available locally.
2. **Durable local state:** IndexedDB or an equivalent durable local database should be used rather than treating `localStorage` or in-memory state as the operational database.
3. **Shared repository boundary:** modules should use repositories/services that can resolve data from the local store and synchronize with the server; modules must not invent separate offline storage systems.
4. **Durable outbox:** local mutations that need server synchronization must be represented by durable pending operations that survive refresh, browser restart and transient connectivity loss.
5. **Idempotent synchronization:** every sync operation needs a stable client operation identity/idempotency key so retries cannot create duplicate records or duplicate effects.
6. **Server remains authoritative:** authentication, capability authorization, important invariant validation, final approvals/publication and server audit remain authoritative when synchronization reaches the server.
7. **Explicit state:** the UI must distinguish local saved, pending synchronization, server-confirmed, conflict and failed/retry states. A local save must never be displayed as server-confirmed.
8. **Conflict handling:** concurrent or incompatible changes must be detected and resolved according to domain rules; silent last-write-wins is not acceptable for important school records without an explicit decision.
9. **No silent data loss:** failed synchronization preserves the pending local operation and makes the problem recoverable.
10. **Connectivity is an input, not the application state:** loss/restoration of the network must not require the school to restart its workflow.
11. **Offline scope is deliberate:** each device receives the data it is authorized and configured to work with; offline caching must respect school tenancy and capability boundaries.
12. **Sensitive actions may remain online-only:** operations whose correctness depends on current server state can be queued or explicitly blocked until online, but that behavior must be deliberate and documented.

### Application behavior target

```text
ONLINE
UI → Local data → immediate result
             ↘ sync → server → PostgreSQL → audit

OFFLINE
UI → Local data → immediate result
             ↘ durable pending operation

BACK ONLINE
pending operation → sync → validate/authorize → persist/audit → acknowledge
```

This architecture is intended to support school work during unreliable internet connectivity without creating a second competing source of truth.

## Decision: organization and school are separate identities

A human User can have Memberships. An Organization represents the customer/legal ownership context. A School is the operational tenant. A user is never made a tenant merely by storing `schoolId` on the user record.

## Decision: CAC is a one-time organization identity claim

`OrganizationIdentity.normalizedCacNumber` is globally unique when a CAC is supplied. CAC is optional during current organization/school onboarding. When supplied, the raw value is retained while a canonical normalized value enforces uniqueness.

A supplied CAC number is not represented as externally verified. `verificationStatus=SUPPLIED` means the customer supplied it. A future legitimate verification integration may move that state to VERIFIED.

CAC is identity evidence, not a password or secret credential.

## Decision: immutable internal identity

User, Organization, School and Membership use generated UUID identifiers. CAC is never used as a primary key. `createdAt` is generated by PostgreSQL/server persistence and is not accepted from the registration client.

School identity history begins with an audit event containing the generated school identity, organization identity, server-generated creation time and original owner membership.

## Decision: tenant security chain

Sensitive operations must establish:

1. authenticated user/session;
2. active membership;
3. organization/school context;
4. required capability;
5. resource ownership by that school;
6. durable audit/history when the operation is important.

A school identifier supplied by the browser is never sufficient authorization.

Offline local data must be treated as a cache/working copy of only the authorized school context. A device must not expose another school's records merely because another identifier is placed in a route, local query or queued operation.

## Decision: capability authorization

Authorization is capability-based and membership-scoped. Domain code must not spread role-name checks such as `role === "teacher"`.

## Decision: atomic onboarding

Initial owner + organization + CAC identity + school + owner membership + creation audit event are created in one database transaction. A failure rolls back the entire registration.

The database unique constraint on normalized CAC is the final concurrency barrier against two requests claiming the same CAC.

## Current implementation handoff checkpoint — 19 Sep 2026

The identity architecture is now implemented beyond the initial foundation: personal accounts, school relationships, owner registration, school discovery, capability-based membership and the Owner/Admin operational dashboard exist in the current branch.

Current runtime verification is focused on school discovery/search. The discovery API filters by eligible school status and normalized school name. Before changing this query or test data, verify the stored school `name`, `normalizedName`, `status`, and `setupStatus`. A separate join-request list route mismatch is tracked independently.

The current dashboard intentionally does not fabricate finance totals when authoritative invoice/payment records are unavailable in the current schema. Derived dashboards must remain schema-backed and truthful.

CAC is optional at onboarding; supplied CAC identity remains globally unique.

## Current vertical slice

The first vertical slice was intentionally small:

- User
- Organization
- OrganizationIdentity/CAC
- School
- Membership
- Capability primitives
- Session persistence primitive
- AuditEvent
- atomic owner/school registration API

The current implementation has progressed beyond this initial slice; use README.md and docs/ROADMAP.md for the live product status. Do not use this historical section as a claim that later authentication, setup or school operations are unimplemented.

## Implementation consequence for new modules

Before building a new operational module:

1. define its authoritative server records and state transitions;
2. define the local durable representation needed for authorized offline work;
3. define mutations and stable operation identities for the outbox;
4. define synchronization and conflict rules;
5. define which operations can be performed offline and which require current server authority;
6. reuse the shared offline repository/sync foundation rather than creating module-specific infrastructure;
7. test offline → online transitions as part of the module's acceptance criteria.
