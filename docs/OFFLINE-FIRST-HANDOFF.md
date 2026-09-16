# App-School Offline-First Handoff

## Status

This document is the implementation contract for application-wide offline-first behavior. It is a design/handoff document, not a claim that the runtime is already implemented.

The repository currently contains a small server-side synchronization/idempotency foundation and the first browser durable-store/outbox foundation. The shared sync worker, application-wide offline UI and module end-to-end migration are still implementation work. Keep the checklist in `docs/ROADMAP.md` and this document aligned with actual code, not intended architecture.

## Handoff principle

A new developer or AI must be able to take ownership from the current commit and continue without reconstructing product decisions from chat history.

Before changing offline behavior, read in this order:

1. `README.md` — product boundary and current implementation narrative.
2. `ARCHITECTURE.md` — security, tenancy, module and data-boundary rules.
3. `docs/ROADMAP.md` — what is complete, what is pending, and the current V1 sequence.
4. `docs/PRODUCT-DECISION-HISTORY.md` — decisions that should not be silently reversed.
5. This file — offline-specific implementation contract.
6. The current module/domain implementation and its tests — actual code is authoritative over stale prose.

When a slice is completed, update the documentation in the same change so the repository remains self-explanatory.

## Current implementation checkpoint

The first browser persistence slice now provides a versioned IndexedDB database named `app-school-local` (version 1) with shared `records` and `outbox` stores.

```text
Browser
  ↓
IndexedDB: app-school-local v1
  ├── records
  └── outbox
```

The shared local layer defines durable record metadata and explicit synchronization states. The outbox layer defines durable school-scoped mutation records, retry metadata and status mapping, and prevents duplicate insertion of an already-known operation ID in the local store.

This checkpoint does **not** make any module offline-capable by itself. No module should be marked offline-ready until its repository, mutation, synchronization, reconciliation and tests are actually wired.

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

## Current implementation boundary

The repository has reusable server-side primitives for synchronization identity and school-scoped idempotent results. The existing `offline-sync` primitive validates `schoolId`, operation and key, and produces a stable sync identity. The existing idempotency primitive reads and records results using the school + operation + key identity.

The browser persistence layer now gives modules a shared durable place for local records and pending mutations. The missing piece is the orchestration that connects those local operations to server-side validation, authorization, idempotency, audit and authoritative acknowledgement.

Do not mark offline-first complete merely because these foundations exist. The roadmap remains the source of truth for which runtime layers are actually implemented.

## Authority model

- PostgreSQL remains the server source of truth for authoritative school records.
- The device keeps a durable working copy for continuity.
- A local save means **saved locally**, not **server confirmed**.
- Server confirmation happens only after the server accepts the operation and applies the relevant authorization, validation, persistence and audit rules.
- Local data and queued operations must remain inside the authorized school context.

## Shared layers

### 1. Local durable store

Use IndexedDB or another browser-supported durable database. Do not use React state, memory or `localStorage` as the operational store.

The current foundation uses an explicit database name/version and shared object-store conventions:

- `records` — durable local working records plus synchronization metadata;
- `outbox` — durable pending mutations and retry/conflict state.

Schema/version changes must be explicit and migration-safe. A developer must be able to identify the current local schema version and how a user moves from an older version to a newer one.

The browser local store is a working copy. It must never be presented as a second server authority.

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

Existing online APIs should remain usable while a workflow is being migrated. Do not rewrite every module at once.

### 3. Durable outbox

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

The current shared outbox foundation persists these fields in IndexedDB and provides operations for enqueueing, finding pending work and changing synchronization status. Domain mutation contracts remain module-specific and must be documented when a real workflow is migrated.

### 4. Shared sync engine

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

Retry policy must distinguish transient failures from authorization, validation and conflict failures. Never retry a permanent validation/authorization failure forever.

**Implementation status:** not yet implemented.

### 5. Pull/reconciliation

Sync is not only push.

When online, the client must also be able to receive authoritative changes made elsewhere so the local working copy converges toward the server state.

The exact pull protocol is intentionally open until the first implementation slice establishes the required cursor/version contract.

Do not invent a fake `synced` state from local timestamps alone. A record is synchronized only when the server acknowledgement and authoritative state are known.

**Implementation status:** not yet implemented.

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

Recommended visible meanings:

| State | Meaning |
|---|---|
| Draft | User has changed the form but has not committed the local working copy. |
| Saved locally | The device has durably persisted the change; server confirmation is not available yet. |
| Pending sync | The local mutation is queued for server synchronization. |
| Syncing | A worker is currently attempting the server operation. |
| Synced | The server accepted the operation and the local record reflects the acknowledged authoritative result. |
| Failed | Synchronization could not complete and the operation remains recoverable. |
| Conflict | The server cannot safely apply the local mutation without an explicit resolution path. |

## Idempotency

Retries are expected. Duplicate effects are not.

Every server-bound mutation needs a stable client operation identity/idempotency key that remains unchanged across retries.

The server must recognize a repeated operation identity and avoid applying the same logical mutation twice.

Reuse the existing school-scoped idempotency foundation rather than creating a second concept. The browser outbox must store and resend the same operation identity.

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

Local storage keys, repository queries, outbox records and synchronization requests must all carry sufficient tenant identity to prevent cross-school leakage.

## Authentication and sessions

Offline continuity does not mean bypassing identity security.

The implementation must deliberately decide how an authenticated user can reopen an already-authorized school workspace while temporarily offline, including session expiry and device reauthentication behavior.

Do not silently weaken authentication to make offline mode work.

## Service worker / application shell

The application should eventually cache the minimum application shell and static assets needed to reopen supported workflows during network loss.

Service-worker behavior should be introduced deliberately rather than treating browser caching as equivalent to local operational data persistence.

The application shell may be cached before all data workflows are offline-capable, but documentation and UI must not imply that cached pages alone provide offline support.

## Testing contract

Every offline foundation change should be testable without depending on an external network.

At minimum, test these invariants for the reference workflow:

1. local save survives refresh;
2. local save survives browser/page restart within the supported device storage boundary;
3. offline mutation creates exactly one durable pending operation;
4. reconnect sends the operation automatically;
5. retrying the same operation does not duplicate the server effect;
6. permanent validation/authorization failures remain recoverable and do not loop forever;
7. a conflict is represented as conflict rather than silently overwritten;
8. local data is isolated by school context;
9. server acknowledgement moves the local record to `SYNCED` with authoritative values;
10. meaningful server-side completion is audited once according to domain rules.

Use unit tests for state transitions and idempotency behavior, plus integration/e2e tests for browser persistence and reconnect behavior as the tooling is added.

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
- What tests prove those behaviors?

## First implementation sequence

1. ~~Choose and add the browser durable database layer.~~ **Started: IndexedDB v1 with shared `records` and `outbox` stores is implemented.**
2. ~~Create shared local schema/versioning conventions.~~ **Started: explicit database/version/store constants are implemented.**
3. Create repository interfaces for local-first reads/writes.
4. ~~Create the durable outbox.~~ **Started: durable school-scoped outbox primitives are implemented.**
5. Create the sync state machine and idempotency contract using the existing server foundation.
6. Add connectivity detection and automatic retry.
7. Add authoritative pull/reconciliation contract.
8. Add application-wide sync status UI.
9. Add service-worker/application-shell support where appropriate.
10. Convert one real existing workflow end-to-end as the reference implementation.
11. Migrate remaining modules incrementally, recording module-specific conflict/authority rules as each slice is converted.

## Reference workflow candidate

Assessment score capture is the first reference candidate because it already has:

- a bounded school/class/session roster;
- validation rules;
- individual save behavior;
- audit evidence;
- a natural bulk-save workflow;
- an observable distinction between local save and server confirmation.

For the first offline conversion, prefer the smallest score-capture path that can demonstrate local persistence → outbox → automatic sync → server validation/audit → acknowledgement. Do not expand result approval/publication at the same time.

## Do not do

- Do not create one offline database per module.
- Do not store authoritative operational state only in React state.
- Do not use `localStorage` as the main operational database.
- Do not silently discard pending work after a failed request.
- Do not display local saves as server-confirmed.
- Do not retry mutations without stable idempotency identities.
- Do not use offline mode to bypass authorization or server validation.
- Do not claim a module is offline-ready merely because its page is cached.
- Do not invent module-specific synchronization protocols when the shared platform foundation can handle them.
- Do not mark roadmap checkboxes complete because a design or handoff document exists; mark them complete only after the corresponding runtime behavior is implemented and tested.
- Do not rewrite the Prisma schema with `prisma db pull` as part of ordinary offline development; inspect migrations/schema deliberately and preserve the checked-in canonical schema.

## Checkpoint / takeover rule

At the end of every implementation slice:

```text
Code changed
   ↓
Tests run + result recorded
   ↓
README updated if product boundary changed
   ↓
ROADMAP updated only for verified status
   ↓
Handoff/decision history updated for new cross-cutting rules
   ↓
Commit is self-describing
   ↓
Next developer can continue from repository state alone
```

A future developer should be able to stop at any checkpoint and determine:

- what is implemented;
- what is intentionally not implemented;
- which invariants must not be broken;
- what the next smallest slice is;
- which tests prove the current behavior.

## Handoff rule

A future developer or AI should read this document together with:

- `README.md`
- `ARCHITECTURE.md`
- `docs/ROADMAP.md`
- `docs/PRODUCT-DECISION-HISTORY.md`

Before implementing offline behavior in a module, update this document or the relevant decision history when a new cross-cutting rule is established.
