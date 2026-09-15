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
- [x] Score capture
- [x] Score validation
- [x] Result submission
- [x] Result approval
- [x] Result publication
- [x] Report cards
- [x] Academic history

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
- [ ] Operational dashboards
- [ ] Management summaries
- [ ] Export workflows

## Phase 7 — Platform intelligence
- [ ] Rules/configuration engine
- [ ] Background jobs
- [ ] Reliable notification processing
- [ ] Offline-first workflows where useful
- [ ] Idempotent sync actions
- [ ] Anomaly/delay detection
- [ ] AI assistance above trusted records, never as the source of truth

## Phase 8 — Production platform
- [ ] PostgreSQL migration/deployment process
- [ ] Object/file storage
- [ ] Backups and recovery procedures
- [ ] Observability and operational alerts
- [ ] Security hardening
- [ ] Performance/load testing
- [ ] Render production deployment
- [ ] Tenant-safe onboarding and support operations

## V1 completion rule
Finish the remaining roadmap items before expanding the product beyond V1. Work forward from the current phase; do not reopen completed phases unless verification exposes a real defect. Keep each slice small, production-oriented and tied to an actual school workflow.

## Rule
Do not build reports merely because other school systems have them. Each report must turn trusted school records into a decision or action the school actually needs. Keep reports school-scoped, capability-controlled, module-controlled and derived from authoritative records.
