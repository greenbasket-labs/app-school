# GREEN BASKET GLOBAL LIMITED

## App-School

**App-School is the school application.** Every school uses the same product, then configures its own school inside the application. The platform is multi-tenant: school data, access, settings and operational records remain isolated by school.

Fresh production implementation. No inherited application code.

## Founding problem — why App-School exists

The starting point is not "build another school-management system." The starting point is the economic problem around technology access.

Many schools operate in an environment where the technology they need already exists, but the school cannot reasonably afford to assemble and maintain all of it independently. A school may otherwise need to pay separately for:

- a developer or technical staff
- domain registration
- hosting/server infrastructure
- database and backups
- software development and updates
- security and maintenance
- student, teacher, parent and school records
- attendance and academic workflows
- communication and reports
- ongoing technical support

The fundamental question is:

> **If the technology already exists, why should every individual school have to pay separately to build and maintain its own technology?**

App-School is the answer to that problem. GREEN BASKET GLOBAL LIMITED builds and maintains the shared platform once, then makes that technology accessible to many schools through one school service rather than requiring every school to build its own stack.

The intended customer experience is simple:

```text
School
  ↓
One App-School service
  ↓
Software + shared infrastructure + updates + backups + security + support
  ↓
School configures and operates its own environment
```

The platform should connect the school as a whole:

```text
Owner        → visibility, control, configuration
Teachers     → daily teaching, attendance, academic records
Students     → identity, enrollment, academic and school records
Parents      → information, communication and school visibility
School data  → organized, persistent and auditable
```

This is especially important in an economically constrained environment: **the goal is not to make schools buy more technology; it is to make existing technology economically accessible through shared infrastructure and reusable software.**

## Product direction

The product is intentionally built as a configurable school operating platform rather than a collection of separate school apps.

- One App-School product for every school.
- Each school configures its own academic structure, people, workflows and enabled modules.
- **Settings is the control surface for school configuration, access and module updates.**
- Future capabilities are delivered as modules.
- **Only the school owner can enable or disable modules.**
- Disabling a module hides/stops its operational surface; it does not delete historical records.
- Staff access is controlled separately through capabilities. Enabling a module does not automatically give every staff member access.
- The database remains the server source of truth. Settings control product behavior, not ownership of the underlying records.
- **Offline-first is a platform requirement for the entire application.** The school should be able to continue supported operational work when internet connectivity is unavailable, using durable local data and synchronization rather than depending on a live request for every action.

## Offline-first product requirement

App-School is designed for school environments where internet connectivity may be slow, intermittent or temporarily unavailable.

The target product behavior is:

```text
ONLINE
UI → Local durable data → immediate result
                       ↘ Sync → Server → PostgreSQL → Audit

OFFLINE
UI → Local durable data → immediate result
                       ↘ Durable pending change / outbox

BACK ONLINE
Pending changes → Sync → server validation/authorization
               → persist + audit → acknowledgement
```

### Application-wide offline-first rules

- Offline-first applies to the whole application, not only attendance or assessments.
- Operational screens should read from a local durable working set when the needed data is available on the device.
- Important writes should be saved locally first and survive refresh, browser restart and temporary loss of connectivity.
- Pending changes must have an explicit synchronization state; **local save is not the same as server confirmation**.
- Sync retries must be idempotent and must not create duplicate records or duplicate side effects.
- Failed synchronization must preserve the pending work for retry or resolution.
- Conflicts involving important school records must be detected and handled according to domain rules; silent overwrites are not acceptable without an explicit product decision.
- Offline data and queued operations must respect school tenancy and capability boundaries.
- Server authorization, important validation, approvals/publication and audit remain authoritative when a queued operation reaches the server.
- Actions that inherently require current server authority may remain online-only, but this must be deliberate and documented rather than an accidental network dependency.
- Modules must reuse the shared offline/local-data/outbox/sync architecture rather than implementing unrelated offline mechanisms.

## Product development philosophy

App-School is **problem-first, not feature-first**.

Do not copy another school application and rename its features. Start from the real school problem, understand the people and workflow involved, identify what the software should prevent/detect/remember/calculate/connect/communicate, then design the smallest reliable mechanism that solves it.

The development loop is:

```text
Real problem
   ↓
Understand the workflow
   ↓
Identify rules, states and ownership
   ↓
Design the smallest useful slice
   ↓
Implement
   ↓
Validate security + data boundaries
   ↓
Test online + offline + reconnect behavior
   ↓
Record the decision
   ↓
Next slice
```

The goal is not the largest feature list. The goal is a strong platform that can safely absorb new modules over time.

## Current vertical slices

1. **Identity foundation** — User → Organization → unique CAC identity → School → Membership → audit history.
2. **Authentication** — password authentication, database-backed sessions and secure session cookie.
3. **Capability authorization** — school-scoped capability checks rather than hardcoded role behavior.
4. **School structure** — academic sessions, terms, class levels, class arms, subjects and subject-to-class assignments.
5. **Student operations** — student records and session/class enrollment.
6. **Attendance** — school-scoped daily attendance roster, quick marking, bulk save and audited correction.
7. **School setup** — owner/manager workflow for configuring the academic foundation.
8. **Module configuration foundation** — school module catalog plus owner-only enable/disable settings with audit history.
9. **Module enforcement** — enabled module state is checked by the backend before student, enrollment and attendance operations are allowed; capabilities still apply separately.
10. **Academic session lifecycle** — sessions move forward from draft → active → closed with validation and audit history.
11. **Staff & access foundation** — owner-managed staff accounts, school memberships and explicit capability assignment with audit history.
12. **Setup readiness** — live checklist verifies the minimum academic foundation required before a school is considered ready.
13. **School profile configuration** — owner-managed school name and basic contact details with audited changes.
14. **Attendance history & correction** — historical attendance search plus capability-controlled corrections with previous/current state audit evidence.
15. **Parent/guardian records** — school-scoped guardian records plus many-to-many student relationships, with relationship metadata and audited link/unlink actions.
16. **Student status lifecycle** — controlled active/inactive/withdrawn transitions with terminal withdrawal and audit history.
17. **Assessment definitions and initial score capture** — assessment roster, per-student score validation and audited score persistence.

## Module model

The application has a central module catalog and a school-specific configuration layer.

Current module catalog:

| Module | Purpose | Initial state for a new school |
|---|---|---|
| Academics | Sessions, terms, classes, arms and subjects | Enabled |
| Students | Student records and enrollment | Enabled |
| Attendance | Daily attendance | Enabled |
| Assessments & Results | Assessment, scores, approval and results | Disabled |
| Fees & Finance | Fees, invoices, payments and finance | Disabled |
| Communication | School/family/internal communication | Disabled |
| Reports | Operational and management reports | Disabled |

This catalog will grow as new product modules are implemented. A module can be added to the catalog before its full operational workflow is released.

### Configuration rules

- Module definitions are platform-level product definitions.
- `SchoolModule` stores each school's enabled/disabled state.
- Module state is scoped by `schoolId` and cannot cross tenant boundaries.
- The initial school owner is explicitly marked as the owner during onboarding.
- Only an active owner membership can change module state.
- Every enable/disable action creates an audit event.
- Disabling is reversible; records are preserved.
- Module enablement and staff capability are separate concerns.
- Operational APIs must enforce both module state and capability authorization.

### School profile rules

- Profile data belongs to the `School` tenant, not the platform `User` or `Organization` identity.
- Current profile fields are school name, address, phone and email.
- Only the active school owner can change profile data in this first slice.
- School name changes also update the normalized school name used for tenant-safe lookup behavior.
- Profile changes create an audit event containing the previous and current state.
- Profile data is configuration/identity context; it does not replace the organization's CAC identity.

### Staff & access rules

- Staff accounts are created inside the school's Settings control surface.
- Each staff account receives a school membership; the account itself remains a platform `User` identity.
- Staff access is granted through explicit capabilities, not role-name assumptions.
- Only the active school owner can create staff accounts or change staff capabilities in this first access-management slice.
- The owner membership cannot be edited as ordinary staff access.
- Staff passwords are hashed; plaintext passwords are never stored.
- Staff creation and capability changes create audit events.
- Staff access administration is separate from module enablement.

### Setup readiness rules

- Readiness is calculated from the school's actual records; it is not a manually entered flag.
- The minimum foundation checks are: academic session, academic term, class level, class arm, subject, and subject-to-class assignment.
- The readiness API is school-scoped and requires the school-management capability.
- The setup workspace displays the live checklist and missing requirements.
- Readiness does not delete or mutate configuration records.

### Attendance history & correction rules

- Attendance history is filtered by school, academic session, class and date range.
- Viewing history requires `ATTENDANCE.VIEW`; corrections require `ATTENDANCE.RECORD`.
- A correction updates the authoritative `AttendanceRecord`; it does not create a duplicate attendance record or delete history.
- Corrections record previous and current attendance state in `AuditEvent` with the acting user and school.
- Bulk attendance saves also produce per-record correction audit events when an existing status or note changes.
- Attendance module state is enforced before history or correction operations.

### Parent/guardian rules

- Guardian records belong to the `School` tenant.
- A student can have multiple guardians, and a guardian can be linked to multiple students.
- The relationship is stored explicitly through `StudentGuardian`, including optional relationship text and primary-contact flag.
- Guardian and student IDs are validated against the same `schoolId` before a relationship is created.
- Guardian operations use the existing `STUDENTS.VIEW` / `STUDENTS.MANAGE` capability boundary; no new capability is introduced.
- The Students module must be enabled before guardian operations are available.
- Creating a guardian and linking/unlinking a guardian are audited; relationships are not silently deleted from historical audit evidence.
- No parent portal, messaging, payments or notifications are included in this slice.

### Student lifecycle rules

- Student status is authoritative on the `Student` record.
- Supported statuses are `ACTIVE`, `INACTIVE`, and `WITHDRAWN`.
- `ACTIVE` can move to `INACTIVE` or `WITHDRAWN`.
- `INACTIVE` can move to `ACTIVE` or `WITHDRAWN`.
- `WITHDRAWN` is terminal in this first lifecycle slice and cannot be reactivated through the status API.
- Status changes require `STUDENTS.MANAGE` and the Students module to be enabled.
- Every actual status transition records previous and current status in `AuditEvent`.
- Student records are never deleted as part of lifecycle management.
- Existing enrollment history remains preserved; inactive/withdrawn students are not offered as new enrollment candidates by the current student workspace.

## Roadmap

### Phase 0 — Foundation & trust
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
- [ ] Offline-first platform foundation: local durable database, schema/versioning and repository abstraction
- [ ] Offline mutation/outbox model with durable pending states
- [ ] Shared sync engine with retry, backoff and idempotency
- [ ] Connectivity/sync status model and application-wide UI treatment

### Phase 1 — School configuration
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

### Phase 2 — Core daily operations
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

### Phase 3 — Academic engine
- [x] Assessment definitions
- [x] Score capture — initial roster + per-student save slice
- [x] Score validation — school/class/session/enrollment/max-score validation
- [ ] Offline-capable assessment and score capture foundation
- [ ] Result submission
- [ ] Result approval
- [ ] Result publication
- [ ] Report cards
- [ ] Academic history

### Phase 4 — Finance
- [x] Fee structures
- [x] Student fee assignments
- [x] Invoices / obligations
- [x] Payment recording
- [x] Payment provider integration — Paystack, Flutterwave and Monnify foundation
- [x] Receipts
- [x] Balances and reconciliation
- [x] Finance audit trail
- [ ] Offline-capable finance workflows with explicit server-confirmed payment states

### Phase 5 — Communication
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

### Phase 6 — Reports & management
- [x] Attendance report — date-range summary with school-scoped student totals
- [x] Academic report — published assessment performance by session, term and optional class
- [x] Finance report — recorded invoices, payments and outstanding obligations
- [x] Operational dashboards — initial V1 slice
- [x] Management summaries — initial V1 slice
- [x] Export workflows — authenticated management CSV export
- [ ] Offline-capable report generation from locally available trusted data

### Phase 7 — Platform intelligence
- [x] Rules/configuration engine — owner-controlled rule foundation
- [x] Background jobs — durable queue record and claim primitive
- [x] Reliable notification processing — idempotent queue foundation
- [ ] Offline-first platform completion — application-wide module adoption and reconciliation verification
- [x] Idempotent sync actions — school-scoped idempotency foundation
- [x] Anomaly/delay detection — deterministic operational anomaly checks
- [x] AI assistance above trusted records, never as the source of truth — deterministic AI-ready management context boundary
- [ ] Conflict resolution policies and operator-visible reconciliation tools
- [ ] Offline security/session lifecycle hardening

### Phase 8 — Production platform
- [ ] PostgreSQL migration/deployment process — migration baseline exists; production verification remains
- [ ] Object/file storage
- [ ] Backups and recovery procedures, including recovery of sync/outbox state where required
- [ ] Observability and operational alerts
- [ ] Security hardening
- [ ] Performance/load testing
- [ ] Offline/online transition testing at production scale
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
8. **Offline-first foundation** — before expanding many more operational workflows, establish the shared local-data/outbox/sync architecture and then migrate existing modules onto it.

## V1 completion rule

Finish the remaining roadmap items before expanding the product beyond V1. Work forward from the current phase; do not reopen completed phases unless verification exposes a real defect. Keep each slice small, production-oriented and tied to an actual school workflow.

Every completed slice must preserve the existing platform boundaries: school-scoped ownership, capability authorization, module enforcement, validation of important invariants, audit evidence for meaningful changes, historical truth, and offline continuity where the workflow is expected to operate offline.

## Rule

Do not build reports merely because other school systems have them. Each report must turn trusted school records into a decision or action the school actually needs. Keep reports school-scoped, capability-controlled, module-controlled and derived from authoritative records.

Do not treat offline-first as a later UI enhancement. It is a platform architecture requirement that must shape persistence, mutation handling, synchronization, conflict handling and module design from this point forward.

## Developer / AI continuation contract

**A new developer, coding agent, or AI must be able to take this repository and continue from the current state without needing the original conversation.**

Before changing code:

1. Read `README.md` completely.
2. Read `docs/PRODUCT-DECISION-HISTORY.md` to understand why the product exists and which decisions are intentional.
3. Read `ARCHITECTURE.md` before changing shared architecture, identity, authorization, tenancy, persistence or module boundaries.
4. Inspect the current implementation before assuming a model, service, route, capability or UI exists.
5. Check the current roadmap and choose the smallest next coherent vertical slice.
6. Preserve existing tenant, capability, audit and module boundaries.
7. Preserve the application-wide offline-first architecture; do not implement a module's persistence/sync system in isolation.
8. Do not invent a second architecture for a new module.

### Required approach for every new module

```text
Understand the school problem
        ↓
Identify the real actors and ownership
        ↓
Define the school-scoped data
        ↓
Define lifecycle/state transitions
        ↓
Define validation rules
        ↓
Define who can view/change/approve
        ↓
Decide whether the module belongs in Settings
        ↓
Define what must work offline
        ↓
Define local durable records + pending operations
        ↓
Define synchronization + conflict rules
        ↓
Add/reuse capability boundaries
        ↓
Add module catalog/configuration if needed
        ↓
Implement service/repository boundaries
        ↓
Implement school-scoped API + sync path
        ↓
Implement the smallest useful UI
        ↓
Audit meaningful state changes
        ↓
Test online + offline + reconnect + retry
        ↓
Test tenant isolation and authorization
        ↓
Update README + roadmap in the same change
```

### Non-negotiable rules for new development

- **One product:** never fork App-School for an individual school unless an explicit platform decision says otherwise.
- **One tenant boundary:** every school-owned read/write must be tied to the correct `schoolId`.
- **Four identity boundaries:** `userId`, `organizationId`, `schoolId`, `membershipId` remain distinct.
- **Settings is the control plane:** school configuration and module controls belong there.
- **Owner-only module control:** only the school owner can enable/disable a module.
- **Module ≠ permission:** a module being enabled does not grant staff access; capability authorization remains separate.
- **Historical truth survives configuration:** disabling a module must not delete its records.
- **Capture → validate → automate:** do not build automation on untrusted data.
- **Audit meaningful changes:** preserve actor, school, action and relevant previous/current state.
- **Offline-first is platform-wide:** do not make network availability a hidden prerequisite for normal supported workflows when the required data is already local.
- **Local save ≠ server confirmation:** expose pending/synced/conflict/error state explicitly.
- **Durable outbox:** pending operations must survive refresh/restart and retry safely.
- **Idempotent sync:** retries must not duplicate records or effects.
- **No silent conflict overwrite:** important records require deliberate conflict rules.
- **No silent data loss:** a failed sync preserves recoverable work.
- **No role-name shortcuts:** use capabilities for authorization decisions.
- **No speculative features:** do not build a large module before its problem, boundary and workflow are understood.
- **No copied feature lists:** another product can provide research context, but its feature list is not the product specification.
- **AI is an assistant, not the record authority:** AI may explain, summarize and assist above trusted records.
- **Small vertical slices:** prefer a complete, understandable slice over many partially implemented screens.
- **Update documentation:** a meaningful architectural/product change is incomplete until the README and relevant decision documentation explain it.

### Handoff standard

Every completed development slice should leave the repository in a state where another human or AI can answer:

- What problem was solved?
- Which school owns the data?
- Which records were added or changed?
- What are the valid states and transitions?
- Which capability controls each operation?
- Which module controls availability?
- Who can configure it?
- What is audited?
- What historical data must remain preserved?
- What works offline?
- What remains pending until synchronization?
- What happens during conflict or failed synchronization?
- What is intentionally **not** implemented yet?
- What is the next smallest logical slice?

If those answers cannot be found from the code and repository documentation, the slice is not fully handed off.

## Architectural rules

1. **Fresh implementation:** old school-management repositories are reference material only, not application code to extend or copy.
2. **Multi-tenant by construction:** every school-owned resource must be provably connected to its school before read/write access is allowed.
3. **Organization ≠ School ≠ User:** identities remain separate even when one person owns one school.
4. **Capability-based authorization:** permissions are explicit capabilities, not assumptions based on role names.
5. **Settings as control plane:** school configuration, access administration and module changes belong in Settings rather than scattered through operational screens.
6. **Owner-only module control:** module enable/disable is a school configuration action reserved for the owner.
7. **Configuration does not delete truth:** disabling a module must preserve historical records.
8. **Capture once, derive many:** one real-world event should be recorded once and downstream consequences derived from it.
9. **Do not automate garbage:** capture → validate → automate.
10. **AI is above the record layer:** AI can explain, summarize and assist, but trusted school records remain authoritative.
11. **Offline-first is part of the record layer:** local durable storage and synchronization must be treated as shared platform architecture, not optional UI caching.
12. **Offline security follows tenant security:** the local working set and outbox must remain scoped to authorized school data and capabilities.
13. **Keep the product lean:** do not build future modules before their configuration boundary and real operational need are clear.
14. **Audit meaningful changes:** important state changes record actor, school, action and relevant state.

## Local foundation test

Requirements: Node.js, npm, and a PostgreSQL database.

```powershell
npm install
Copy-Item .env.example .env
notepad .env
npm run db:generate
npm run db:migrate -- --name identity_foundation
npm run typecheck
npm run build
npm run dev
```

Set `DATABASE_URL` in `.env` to a real local/test PostgreSQL database before running the migration.

### Register the first school owner

With the development server running:

```powershell
$body = @{
  email = "owner@example.com"
  password = "ChangeMe-Strong-123"
  organizationName = "Example Education Limited"
  schoolName = "Example Academy"
  cacNumber = "RC1234567"
} | ConvertTo-Json

Invoke-RestMethod `
  -Method POST `
  -Uri http://localhost:3000/api/onboarding/register `
  -ContentType "application/json" `
  -Body $body
```

Expected first request: HTTP 201 with generated `userId`, `organizationId`, `schoolId`, and server/database-generated `schoolCreatedAt`.

Run the same request again with a different email but the same CAC. Expected result: HTTP 409. The database unique constraint prevents a second organization from claiming that CAC identity.

## Important current boundary

This is an actively developed school platform, not yet a production-ready complete school application. The current implementation has the identity/auth foundation, school configuration, setup readiness, school profile, students, enrollment, attendance, attendance history/correction, parent/guardian records, student status lifecycle, module configuration/enforcement, academic session lifecycle, initial staff/access management, assessment definitions and initial score capture/validation. Migration verification, automated tests, application-wide offline-first infrastructure and the remaining operational workflows are still required before production launch.

See `docs/PRODUCT-DECISION-HISTORY.md` for the product reasoning and durable decisions. See `ARCHITECTURE.md` for frozen technical architecture. See `docs/ROADMAP.md` for the current implementation sequence and offline-first work.