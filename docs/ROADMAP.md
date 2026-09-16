# App-School Roadmap

## Cross-cutting product requirement — offline-first

**Offline-first is a core App-School requirement, not a module-specific enhancement.** The entire application should remain operational during loss of internet connectivity for the school workflows and data already available on the device.

The target behavior is:

```text
                    INTERNET AVAILABLE
                           │
                           ▼
UI → Local durable data → Sync engine → Server → PostgreSQL
     ▲                    │
     │                    ▼
     └──── immediate local operation

                    INTERNET UNAVAILABLE
                           │
                           ▼
UI → Local durable data → Local outbox / pending changes
     │                         │
     └── school continues ─────┘

                    CONNECTION RETURNS
                           │
                           ▼
Pending changes → Sync → server validation → audit → acknowledgement
```

This requirement applies across the platform, including school setup, students, enrollment, attendance, assessments/results, finance, communication, reports and future modules.

### Offline-first rules

- The UI should read operational data from a local durable store rather than requiring a network request for every screen or action.
- Important user changes should be written locally first and represented by a durable pending/sync state.
- Synchronization is responsible for sending pending changes when connectivity returns.
- Sync actions must be idempotent so retries do not create duplicate records or duplicate effects.
- Server-side authorization, validation and audit rules remain authoritative when a pending operation reaches the server.
- Local state must never falsely present an unacknowledged server action as server-confirmed.
- Conflicts must be detected and resolved explicitly for operations where concurrent changes are possible.
- A failed sync must preserve the local pending work rather than silently discarding it.
- Offline support must be shared platform infrastructure; individual modules must reuse the same local-data, outbox and synchronization foundation.
- Online-only operations must be identified deliberately where server authority is required, such as final publication or other actions whose meaning depends on current server state.
- No module is considered fully production-ready if it becomes unusable merely because connectivity is temporarily unavailable when the needed data is already on the device.

## Phase 0 — Foundation & trust
- [x] User / organization / school identity
- [x] CAC identity claim
- [x] School membership
- [x] Capability primitives
- [x] Audit history
- [x] Password authentication
- [x] Database-backed sessions
- [ ] Production migration baseline and verification
- [ ] Automated typecheck/lint/build CI
- [ ] Tenant-isolation integration tests
- [ ] Offline-first platform foundation: local durable database, schema/versioning and repository abstraction — **implemented at primitive level; browser verification remains**
- [ ] Offline mutation/outbox model with durable pending states — **implemented at primitive level; browser verification remains**
- [ ] Shared sync engine with retry, backoff and idempotency — **implemented at primitive level; browser verification remains**
- [ ] Connectivity/sync status model and application-wide UI treatment — **implemented at vocabulary + school-workspace UI level; active worker telemetry and browser verification remain**

## Phase 1 — School configuration
- [x] Academic session foundation
- [x] Academic terms configuration UI/API
- [x] Class levels
- [x] Class arms
- [x] Subjects
- [x] Subject-to-class assignment
- [x] School setup workspace
- [x] Owner-only module settings foundation
- [x] Backend module enforcement for implemented modules
- [x] Session lifecycle: draft → active → closed
- [x] Formal setup readiness calculation
- [x] School profile/configuration settings — first slice
- [ ] Offline-capable school setup and configuration workflows

## Phase 2 — Core daily operations
- [x] Student records
- [x] Student enrollment
- [x] Daily attendance
- [x] Attendance history and correction workflow
- [x] Staff accounts and school membership management — initial owner-managed slice
- [x] Capability assignment UI — initial owner-managed slice
- [x] Parent/guardian records and student relationships — initial slice
- [x] Student status lifecycle
- [ ] Offline-capable student and enrollment workflows
- [ ] Offline-capable attendance workflows and reconciliation

## Phase 3 — Academic engine
- [x] Assessment definitions
- [x] Score capture — initial roster + per-student save slice
- [x] Score validation — school/class/session/enrollment/max-score validation
- [ ] Offline-capable assessment and score capture foundation — **implemented as local-first reference workflow; reconciliation + browser tests remain**
- [ ] Result submission — **authenticated API route + domain service implemented; runtime/CI verification remains**
- [ ] Result approval — **authenticated API route + domain service implemented; runtime/CI verification remains; submitter cannot approve the same assessment result**
- [x] Result publication — approved-result gate plus owner/default or owner-assigned `RESULT.PUBLISH` capability; publication remains deliberately online/server-authoritative
- [ ] Report cards
- [ ] Academic history

## Phase 4 — Finance
- [x] Fee structures
- [x] Student fee assignments
- [x] Invoices / obligations
- [x] Payment recording
- [x] Payment provider integration — Paystack, Flutterwave and Monnify foundation
- [x] Receipts
- [x] Balances and reconciliation
- [x] Finance audit trail
- [ ] Offline-capable finance workflows with explicit server-confirmed payment states

## Phase 5 — Communication
- [x] In-app notifications — school-scoped notices, selected active-member recipients, read state and inbox
- [x] Notification channel preferences — in-app, SMS, email and WhatsApp preference controls; only in-app delivery is live
- [x] Parent/guardian authenticated recipients — one-time owner-created access link for existing guardians with email
- [x] Guardian account security — durable identity link, first-login password change and email/phone verification state
- [x] Guardian result authorization — server-side guardian/student relationship, publication and entitlement boundary
- [x] Attendance absence alert — linked parent in-app notification when a student is marked absent
- [x] Payment confirmation alert — linked parent in-app notification when a payment is recorded
- [x] Result publication alert — linked parent in-app notification when a result is published
- [ ] Offline-capable communication drafts and queued outbound actions
- [ ] Staff communication expansion — broaden only when a real workflow requires it
- [ ] Delivery/status history for external channels
- [ ] WhatsApp/SMS/email integrations where justified

## Phase 6 — Reports & management
- [x] Attendance report — date-range summary with school-scoped student totals
- [x] Academic report — published assessment performance by session, term and optional class
- [x] Finance report — recorded invoices, payments and outstanding obligations
- [x] Operational dashboards — initial V1 slice
- [x] Management summaries — initial V1 slice
- [x] Export workflows — authenticated management CSV export
- [ ] Offline-capable report generation from locally available trusted data

## Phase 7 — Platform intelligence
- [x] Rules/configuration engine — owner-controlled rule foundation
- [x] Background jobs — durable queue record and claim primitive
- [x] Reliable notification processing — idempotent queue foundation
- [ ] Offline-first platform completion — application-wide module adoption and reconciliation verification
- [x] Idempotent sync actions — school-scoped idempotency foundation
- [x] Anomaly/delay detection — deterministic operational anomaly checks
- [x] AI assistance above trusted records, never as the source of truth — deterministic AI-ready management context boundary
- [ ] Conflict resolution policies and operator-visible reconciliation tools
- [ ] Offline security/session lifecycle hardening

## Phase 8 — Production platform
- [ ] PostgreSQL migration/deployment process — migration baseline exists; production verification remains
- [ ] Object/file storage
- [ ] Backups and recovery procedures, including recovery of sync/outbox state where required
- [ ] Observability and operational alerts
- [ ] Security hardening
- [ ] Performance/load testing
- [ ] Offline/online transition testing at production scale
- [ ] Render production deployment
- [ ] Tenant-safe onboarding and support operations

## Commercial billing & result access — cross-cutting product layer

The commercial layer is separate from school finance and separate from module/capability authorization.

Initial plans:

| Plan | Monthly | School share of paid result access |
|---|---:|---:|
| Free | ₦0 | 0% |
| Basic | ₦5,000 | 25% |
| Starter | ₦10,000 | 50% |
| Pro | ₦20,000 | 75% |
| Premium | ₦35,000 | 100% |
| Custom | Negotiated | 100% by default until negotiated terms exist |

Rules:

- [x] Centralized commercial plan configuration
- [x] Deterministic result revenue allocation from any configured result fee
- [x] Zero result fee normalizes to no payment required
- [x] Persist school subscription + plan state
- [x] Persist school Result Access setting and configurable fee
- [x] Result authorization boundary
- [x] Persist result payment attempt with school-scoped idempotency
- [x] Paystack/Flutterwave result checkout initialization
- [x] Server-side Paystack/Flutterwave payment verification
- [x] Immutable verified transaction + revenue allocation
- [x] Provider event replay/idempotency boundary
- [x] Result access entitlement persistence and lookup
- [x] Paystack/Flutterwave callback route adapters using provider verification before entitlement grant
- [ ] Monnify result-access adapter
- [ ] School transaction/revenue view
- [ ] App-School commercial administration dashboard
- [ ] Subscription lifecycle
- [ ] Settlement/refund operations
- [ ] Commercial analytics/admin

## Role/workspace rules

Role workspaces remain a presentation/workflow layer over the same school-scoped records, modules and capabilities. They must not create separate role-specific databases or authorization systems.

- A disabled school module is unavailable to every user in that school.
- Enabled modules still require the user's capabilities.
- Parent/guardian result access uses the durable guardian identity + student relationship boundary; payment does not bypass result authorization.
- Government schools and universities remain future deployment contexts, not product forks.
- Result publication is an explicit capability boundary: the school owner may publish by ownership authority, while non-owner staff require the owner-assigned `RESULT.PUBLISH` capability.

## Current V1 sequence

1. Assessment definitions — complete.
2. Score capture + validation — complete initial slice.
3. Result submission — implemented API/domain boundary; verify runtime behavior before marking complete.
4. Result approval — implemented API/domain boundary; verify runtime behavior before marking complete.
5. Result publication — authorization route established; verify the complete submit → approve → publish workflow before treating the academic publication slice as fully production-ready.
6. Report cards.
7. Academic history.
8. Offline-first foundation — platform primitives established; browser/reconciliation verification remains.
9. Role-based workspaces — cross-cutting layer after core V1 sequence.
10. Commercial billing/result access — payment-attempt, checkout, verification, transaction, provider-event and entitlement boundaries established incrementally; settlement/subscription lifecycle remain.

## V1 completion rule

Finish the remaining roadmap items before expanding the product beyond V1. Work forward from the current phase; do not reopen completed phases unless verification exposes a real defect. Keep each slice small, production-oriented and tied to an actual school workflow.

Every completed slice must preserve school-scoped ownership, capability authorization, module enforcement, important invariants, audit evidence, historical truth and offline continuity where expected.
