# GREEN BASKET GLOBAL LIMITED

## App-School

**App-School is the school application.** Every school uses the same product, then configures its own school inside the application. The platform is multi-tenant: school data, access, settings and operational records remain isolated by school.

Fresh production implementation. No inherited application code.

## Product direction

The product is intentionally built as a configurable school operating platform rather than a collection of separate school apps.

- One App-School product for every school.
- Each school configures its own academic structure, people, workflows and enabled modules.
- **Settings is the control surface for school configuration, access and module updates.**
- Future capabilities are delivered as modules.
- **Only the school owner can enable or disable modules.**
- Disabling a module hides/stops its operational surface; it does not delete historical records.
- Staff access is controlled separately through capabilities. Enabling a module does not automatically give every staff member access.
- The database remains the source of truth. Settings control product behavior, not ownership of the underlying records.

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

### Phase 2 — Core daily operations
- [x] Student records
- [x] Student enrollment
- [x] Daily attendance
- [x] Attendance history and correction workflow
- [x] Staff accounts and school membership management — initial owner-managed slice
- [x] Capability assignment UI — initial owner-managed slice
- [ ] Parent/guardian records
- [ ] Student status lifecycle

### Phase 3 — Academic engine
- [ ] Assessment definitions
- [ ] Score capture
- [ ] Score validation
- [ ] Result submission
- [ ] Result approval
- [ ] Result publication
- [ ] Report cards
- [ ] Academic history

### Phase 4 — Finance
- [ ] Fee structures
- [ ] Student fee assignments
- [ ] Invoices / obligations
- [ ] Payment recording
- [ ] Payment provider integration
- [ ] Receipts
- [ ] Balances and reconciliation
- [ ] Finance audit trail

### Phase 5 — Communication
- [ ] Parent/guardian communication
- [ ] Staff communication
- [ ] Announcements
- [ ] Notifications
- [ ] Delivery/status history
- [ ] WhatsApp/SMS/email integrations where justified

### Phase 6 — Reports & management
- [ ] Operational dashboards
- [ ] Attendance reports
- [ ] Academic reports
- [ ] Finance reports
- [ ] Management summaries
- [ ] Export workflows

### Phase 7 — Platform intelligence
- [ ] Rules/configuration engine
- [ ] Background jobs
- [ ] Reliable notification processing
- [ ] Offline-first workflows where useful
- [ ] Idempotent sync actions
- [ ] Anomaly/delay detection
- [ ] AI assistance above trusted records, never as the source of truth

### Phase 8 — Production platform
- [ ] PostgreSQL migration/deployment process
- [ ] Object/file storage
- [ ] Backups and recovery procedures
- [ ] Observability and operational alerts
- [ ] Security hardening
- [ ] Performance/load testing
- [ ] Render production deployment
- [ ] Tenant-safe onboarding and support operations

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
11. **Keep the product lean:** do not build future modules before their configuration boundary and real operational need are clear.
12. **Audit meaningful changes:** important state changes record actor, school, action and relevant state.

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

This is an actively developed school platform, not yet a production-ready complete school application. The current implementation has the identity/auth foundation, school configuration, setup readiness, school profile, students, enrollment, attendance, attendance history/correction, module configuration/enforcement, academic session lifecycle, and an initial staff/access management slice. Migration verification, automated tests, remaining configuration workflows and the later operational modules are still required before production launch.

See `ARCHITECTURE.md` for frozen architectural decisions.
