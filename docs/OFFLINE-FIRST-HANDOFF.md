# App-School Offline-First Handoff

## Status

This document defines the implementation contract for application-wide offline-first behavior. It is a design/handoff document, not a claim that the offline runtime is already implemented.

## Product requirement

App-School must continue normal supported school workflows when the internet is unavailable and the device already has the data required for those workflows.

When connectivity is available, local work should synchronize automatically with the server.

```text
ONLINE
UI → local durable data → sync → server → PostgreSQL
       ↓ immediate work                 ↓ audit

OFFLINE
UI → local durable data → durable outbox
       ↓ immediate work

ONLINE AGAIN
outbox → sync → authorization/validation → PostgreSQL → audit → acknowledgement
```

Offline-first is application-wide. It applies to school setup, students, enrollment, attendance, assessments/results, finance, communication, reports and future modules.

## Authority model

- PostgreSQL remains the server source of truth for authoritative school records.
- The device keeps a durable working copy for continuity.
- A local save means **saved locally**, not **server confirmed**.
- Server confirmation happens only after the server accepts the operation and applies the relevant authorization, validation, persistence and audit rules.
- Local data and queued operations must remain inside the authorized school context.

## Shared layers

### 1. Local durable store

Use IndexedDB or another browser-supported durable database. Do not use React state, memory or `localStorage` as the operational store.

The local store should be able to persist:

- authorized school reference data needed by supported workflows;
- operational records required for offline continuity;
- local record metadata such as sync state and last server version where needed;
- pending mutations in the outbox;
- conflict/failure information required for recovery.

### 2. Repository boundary

UI and domain workflows should not call `fetch()` directly for every operation.

Introduce shared repositories/services with a shape equivalent to:

```text
UI
 ↓
Domain repository/service
 ├── local read/write
 └── sync-aware server operation
```

The repository decides whether an operation can be completed locally, queued for synchronization, or must be deferred until current server authority is available.

### 3. Outbox

Every mutation that must reach the server later needs a durable outbox record.

Minimum conceptual fields:

```text
operationId       stable client-generated idempotency key
schoolId          tenant context
actorUserId       acting user context when appropriate
entityType        domain entity/aggregate
entityId          local/server entity identity
operationType     create/update/state-transition/etc.
payload           validated mutation payload
createdAt         local creation time
attemptCount      retry count
status            pending/syncing/failed/conflict/acknowledged
lastError         recoverable error information
```

Exact persistence shape should be chosen with the implementation after reviewing the existing Prisma/domain conventions.

### 4. Sync engine

The sync engine is shared by all modules.

Required behavior:

1. detect or be notified when connectivity is available;
2. discover pending operations;
3. send operations using stable idempotency identities;
4. retry transient failures safely;
5. process server acknowledgements;
6. update local records from authoritative server results;
7. preserve failed/conflicted operations for recovery;
8. continue processing independently of the current page where practical.

Connectivity restoration must not require the user to manually re-save work.

### 5. Pull/reconciliation

Sync is not only push.

When online, the client must also be able to receive authoritative changes made elsewhere so the local working copy converges toward the server state.

The exact pull protocol is intentionally open until the first implementation slice establishes the required cursor/version contract.

## State model

Local UI should represent operational state explicitly:

```text
DRAFT
  ↓ local save
SAVED_LOCAL / PENDING_SYNC
  ↓ server accepted
SYNCED

PENDING_SYNC
  ↓ transient failure
RETRYING / FAILED

PENDING_SYNC
  ↓ server detects incompatible state
CONFLICT
```

A conflict is not equivalent to a network error.

## Idempotency

Retries are expected. Duplicate effects are not.

Every server-bound mutation needs a stable client operation identity/idempotency key that remains unchanged across retries.

The server must recognize a repeated operation identity and avoid applying the same logical mutation twice.

Existing school-scoped idempotency foundations should be reused rather than introducing a second concept.

## Conflict handling

Conflict strategy is domain-specific.

Do not adopt global silent last-write-wins for important records without an explicit product decision.

Examples:

- simple reference/cache refresh may safely replace stale local data;
- attendance or score correction may require server-version comparison and a visible conflict state;
- final approval/publication should remain server-authoritative and may require the user to reconnect before completion.

Each operational module must document its conflict behavior as part of acceptance criteria.

## Security and tenancy

Offline support must preserve the existing App-School security chain:

```text
authenticated identity
        ↓
active school membership
        ↓
capability
        ↓
authorized school working set
        ↓
local operation
        ↓
server authorization + validation
        ↓
persistence + audit
```

A browser route, local cache key or queued payload must never be treated as sufficient authorization.

When the active school context changes, the local data layer must not accidentally expose the previous school's data to the new context.

## Authentication and sessions

Offline continuity does not mean bypassing identity security.

The implementation must deliberately decide how an authenticated user can reopen an already-authorized school workspace while temporarily offline, including session expiry and device reauthentication behavior.

Do not silently weaken authentication to make offline mode work.

## Service worker / application shell

The application should eventually cache the minimum application shell and static assets needed to reopen supported workflows during network loss.

Service-worker behavior should be introduced deliberately rather than treating browser caching as equivalent to local operational data persistence.

## Module acceptance rule

A new operational module is incomplete until it can answer:

- What data is available offline?
- Which actions work offline?
- Which actions are queued?
- What does the user see after a local save?
- How is synchronization triggered?
- How are retries handled?
- How are conflicts handled?
- Which actions require current server authority?
- What happens after refresh or browser restart?
- What is audited when synchronization succeeds?
- How is tenant isolation preserved locally?

## First implementation sequence

1. Choose and add the browser durable database layer.
2. Create shared local schema/versioning conventions.
3. Create repository interfaces for local-first reads/writes.
4. Create the durable outbox.
5. Create the sync state machine and idempotency contract.
6. Add connectivity detection and automatic retry.
7. Add authoritative pull/reconciliation contract.
8. Add application-wide sync status UI.
9. Add service-worker/application-shell support where appropriate.
10. Convert one real existing workflow end-to-end as the reference implementation, then migrate the remaining modules using the shared foundation.

## Reference workflow candidate

Assessment score capture is a useful first end-to-end reference because it already has:

- a bounded school/class/session roster;
- validation rules;
- individual save behavior;
- audit evidence;
- a natural bulk-save workflow;
- an observable distinction between local save and server confirmation.

The workflow must be redesigned around the shared offline foundation rather than receiving a module-specific offline implementation.

## Do not do

- Do not create one offline database per module.
- Do not store authoritative operational state only in React state.
- Do not treat `localStorage` as the main operational database.
- Do not silently discard pending work after a failed request.
- Do not display local saves as server-confirmed.
- Do not retry mutations without stable idempotency identities.
- Do not use offline mode to bypass authorization or server validation.
- Do not claim a module is offline-ready merely because its page is cached.
- Do not invent module-specific synchronization protocols when the shared platform foundation can handle them.

## Handoff rule

A future developer or AI should read this document together with:

- `README.md`
- `ARCHITECTURE.md`
- `docs/ROADMAP.md`
- `docs/PRODUCT-DECISION-HISTORY.md`

Before implementing offline behavior in a module, update this document or the relevant decision history when a new cross-cutting rule is established.
