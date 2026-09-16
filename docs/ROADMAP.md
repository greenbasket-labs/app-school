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
- [ ] Result submission
- [ ] Result approval
- [ ] Result publication
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

## Role-based workspaces — cross-cutting product layer

Role-based workspaces are part of the product surface, but they do **not** replace the module roadmap above. A workspace is a role-specific view over the same school-scoped capabilities, records, modules, notifications, reports and audit history.

The core model is:

```text
                App-School core records + capabilities
                              │
             ┌────────────────┼────────────────┐
             ▼                ▼                ▼
       Management          Teaching        Family/Learner
        workspace          workspace          workspace
             │                │                │
       owner / principal    teacher       parent / guardian
       school admin         subject/class      student
```

Planned role/workspace surfaces:

- [ ] Owner / Principal / School Administrator workspace — school health, setup readiness, staffing/capabilities, academic/attendance/finance summaries, alerts, audit-sensitive actions
- [ ] Teacher workspace — assigned classes/subjects, attendance, score capture, pending sync/conflicts, relevant communication and task queue
- [ ] Parent / Guardian workspace — linked students, attendance, published results, invoices/payments, notices and school communication
- [ ] Student workspace — own timetable/academic context where supported, attendance, published results, notices and permitted self-service actions
- [ ] Shared role-aware navigation and landing experience
- [ ] Capability-driven workspace composition — users only see actions/data their active school membership permits
- [ ] Multi-role account handling — one identity may hold different capabilities/roles in different schools or contexts without weakening tenant isolation
- [ ] Institutional context adapters — allow the same core to support school-wide use first, then constrained contexts such as a government school through a principal/administrator and a university through an eligible department/unit rather than requiring the entire institution to adopt App-School at once

### Role/workspace design rules

- Roles are presentation and workflow groupings; **capabilities remain the authorization source of truth**.
- Do not create a separate data model or database for each role.
- A role workspace must derive from the same authoritative records and existing modules.
- A user may have different capabilities in different schools or institutional units.
- Government schools and universities are future deployment contexts; they do not require a fork of the App-School core.
- University support should initially be scoped to an authorized department/unit context where appropriate rather than assuming institution-wide administration.
- Role dashboards must not cause completed V1 modules to be reopened unnecessarily; build them from existing trusted records and current workflows.

## Current V1 sequence

1. **Assessment definitions** — complete and tested against Greenfield Heritage Academy.
2. **Score capture + validation** — current slice: assessment roster loads from active enrollment and individual scores are validated and saved with audit evidence.
3. **Result submission** — next.
4. **Result approval** — after submission.
5. **Result publication** — after approval.
6. **Report cards** — derive from trusted published academic records.
7. **Academic history** — preserve and present results across sessions.
8. **Offline-first foundation** — local persistence, repository, durable outbox, sync engine, connectivity scheduler, durable retry backoff and school-workspace status UI are established at platform level; next prove browser persistence/reconnect behavior, then complete authoritative pull/reconciliation before marking the first module offline-ready.
9. **Role-based workspaces** — cross-cutting product layer after the current V1 sequence is preserved; dashboards should compose existing modules rather than become a new competing product track.

## V1 completion rule

Finish the remaining roadmap items before expanding the product beyond V1. Work forward from the current phase; do not reopen completed phases unless verification exposes a real defect. Keep each slice small, production-oriented and tied to an actual school workflow.

Every completed slice must preserve the existing platform boundaries: school-scoped ownership, capability authorization, module enforcement, validation of important invariants, audit evidence for meaningful changes, historical truth, and offline continuity where the workflow is expected to operate offline.

## Rule

Do not build reports merely because other school systems have them. Each report must turn trusted school records into a decision or action the school actually needs. Keep reports school-scoped, capability-controlled, module-controlled and derived from authoritative records.

Do not treat offline-first as a later UI enhancement. It is a platform architecture requirement that must shape persistence, mutation handling, synchronization, conflict handling and module design from this point forward.
