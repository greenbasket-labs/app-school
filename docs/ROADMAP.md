# App-School Roadmap

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

## Phase 2 — Core daily operations
- [x] Student records
- [x] Student enrollment
- [x] Daily attendance
- [x] Attendance history and correction workflow
- [x] Staff accounts and school membership management — initial owner-managed slice
- [x] Capability assignment UI — initial owner-managed slice
- [x] Parent/guardian records and student relationships — initial slice
- [x] Student status lifecycle

## Phase 3 — Academic engine
- [x] Assessment definitions
- [x] Score capture — initial roster + per-student save slice
- [x] Score validation — school/class/session/enrollment/max-score validation
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

## Phase 5 — Communication
- [x] In-app notifications — school-scoped notices, selected active-member recipients, read state and inbox
- [x] Notification channel preferences — in-app, SMS, email and WhatsApp preference controls; only in-app delivery is live
- [x] Parent/guardian authenticated recipients — one-time owner-created access link for existing guardians with email
- [x] Attendance absence alert — linked parent in-app notification when a student is marked absent
- [x] Payment confirmation alert — linked parent in-app notification when a payment is recorded
- [x] Result publication alert — linked parent in-app notification when a result is published
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

## Phase 7 — Platform intelligence
- [x] Rules/configuration engine — owner-controlled rule foundation
- [x] Background jobs — durable queue record and claim primitive
- [x] Reliable notification processing — idempotent queue foundation
- [x] Offline-first workflows where useful — stable sync identity contract
- [x] Idempotent sync actions — school-scoped idempotency foundation
- [x] Anomaly/delay detection — deterministic operational anomaly checks
- [x] AI assistance above trusted records, never as the source of truth — deterministic AI-ready management context boundary

## Phase 8 — Production platform
- [ ] PostgreSQL migration/deployment process — migration baseline exists; production verification remains
- [ ] Object/file storage
- [ ] Backups and recovery procedures
- [ ] Observability and operational alerts
- [ ] Security hardening
- [ ] Performance/load testing
- [ ] Render production deployment
- [ ] Tenant-safe onboarding and support operations

## Current V1 sequence

1. **Assessment definitions** — complete and tested against Greenfield Heritage Academy.
2. **Score capture + validation** — current slice: assessment roster loads from active enrollment and individual scores are validated and saved with audit evidence.
3. **Result submission** — next.
4. **Result approval** — after submission.
5. **Result publication** — after approval.
6. **Report cards** — derive from trusted published academic records.
7. **Academic history** — preserve and present results across sessions.

## V1 completion rule

Finish the remaining roadmap items before expanding the product beyond V1. Work forward from the current phase; do not reopen completed phases unless verification exposes a real defect. Keep each slice small, production-oriented and tied to an actual school workflow.

Every completed slice must preserve the existing platform boundaries: school-scoped ownership, capability authorization, module enforcement, validation of important invariants, audit evidence for meaningful changes, and historical truth.

## Rule

Do not build reports merely because other school systems have them. Each report must turn trusted school records into a decision or action the school actually needs. Keep reports school-scoped, capability-controlled, module-controlled and derived from authoritative records.
