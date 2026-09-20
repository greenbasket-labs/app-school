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
## Personal account and school relationship model


**Every person starts with a personal SkulGo account.** The personal account is independent from any school and remains the person's identity even when the person belongs to one or more schools.

```text
Personal SkulGo account
        ↓
Find a school OR Register a school
        ↓
School relationship
        ↓
School workspace + capabilities
```

### Find a school

The school-discovery page is shared by all users. Finding a school does not mean every person sends the same kind of request:

- **Teacher / staff / cashier / other worker:** send a request to join the school; the school reviews and decides the relationship and access.
- **Student:** submit an admission request; the school handles admission/acceptance and creates the appropriate school relationship.
- **Parent / guardian:** request or complete a verified connection to a student; this is not a worker join request or student admission.

### Register a school

A person who registers a school uses their existing personal SkulGo account when one already exists. Registration collects the school information and the person's relationship to the school, then creates the school relationship. It must not create a separate person-only school login.

This keeps identity stable when a person changes schools or has more than one legitimate school relationship.

### Role-based school entry

After a person has an approved relationship with a school, the personal account shows the school and the person's relationship. **Open school** enters the authorized operational workspace for that relationship.

Confirmed dashboard references from the GB School demo:

- Owner / Admin → Owner operational dashboard
- Teacher → Teacher dashboard
- Cashier / Accountant → Cashier dashboard
- Parent / Guardian → Parent dashboard
- Student → Student dashboard
- Principal / Headmaster → owner-assigned role; a person may first join through the teacher/staff path and later be assigned Principal
- Staff → role to be defined from a concrete product requirement/sample

The same personal account and school membership remain in place when a school owner changes a person's role. The authorized dashboard changes with the role/capabilities.

The school workspace uses **← Account** to return to the personal account. The demo's `Switch role` and `?role=` URL parameters are not part of the SkulGo authorization model.

### Owner setup state

A newly registered school can temporarily show a **Continue setup** entry while required school configuration is incomplete. After setup is complete, the owner sees the normal school entry and opens the operational owner dashboard like other connected users. School setup remains a configuration/admin surface, not the permanent operational dashboard.

### School workspace return

Inside a school workspace, **← Account** returns the person to the personal SkulGo account page. It replaces role-switching as the navigation concept. The workspace is derived from the person's approved school relationship and capabilities; role-selection URL parameters are not an identity mechanism.


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

## Current handoff snapshot — 19 Sep 2026

### Repository state

- Branch: `feat/personal-account-school-relationship-flow`
- Latest remote commit: `a763243` — school discovery query normalization fix.
- CI branch is clean and up to date with its remote branch.
- A local working tree may contain an uncommitted change in `src/domain/reports/operational-summary.ts`; inspect it before discarding or committing it.
- Do not assume a clean local working tree just because the remote branch is clean.

### Current verified product state

- Personal SkulGo account → school relationship foundation is implemented.
- School registration reuses an existing personal account.
- Owner/Admin operational dashboard is implemented and loads school-scoped operational data.
- Student admission persistence, lifecycle service, review APIs, owner review page and transactional approval into Student + Enrollment are implemented.
- The current admission workflow is **not yet end-to-end browser verified**.
- CAC is optional during current school onboarding; it can be supplied and uniquely claimed when present.
- `skulgo.com` is registered; DNS/production deployment remain pending.

### Current runtime investigation

The current manual browser test is focused on **Find a school / Join a school**.

Observed behavior:
- The user can reach `/app/schools/join`.
- School discovery previously worked for existing test schools.
- A recent discovery-query normalization change is now under investigation because a school search can return no match even though the school exists.
- The current API searches normalized school names and only includes schools with `status` `SETUP` or `ACTIVE`.
- Do not change database records or normalization code until the stored school `name`, `normalizedName`, `status`, and `setupStatus` values have been verified.
- A separate join-request list mismatch is also known: the Join page requests `/api/schools/join-requests`, while the existing route is school-scoped at `/api/schools/[schoolId]/join-requests`. Treat that as a separate slice after school discovery is verified.

### Dashboard/finance boundary

The current operational dashboard must not invent invoice/payment data. The current Prisma schema used by the dashboard does not contain the invoice/payment models that an earlier dashboard query expected, so finance summary values remain zero until the authoritative finance records are confirmed and wired. Do not mark finance reporting as runtime-complete merely because older roadmap entries say so.

### Immediate next step

Work one case at a time:

```text
Verify school discovery data
        ↓
Fix only the discovery regression
        ↓
Verify Join request list
        ↓
Complete admission browser flow
        ↓
Continue core daily operations
```

Do not delete test schools or join requests while diagnosing these issues.

## Product development philosophy

App-School is **problem-first, not feature-first**.

### Engineering method — one verified vertical slice at a time

We build through small, evidence-driven vertical slices:

```text
Inspect current implementation → define ONE slice → preserve working UX
→ implement → typecheck + focused runtime/browser test
→ document actual status → commit → next slice
```

Rules:
- Do not redesign working screens while adding a new flow unless the product decision explicitly changes the UX.
- Add one relationship/workflow at a time and verify it before dependent work.
- Reuse existing domain models, services, authorization and audit infrastructure before creating new systems.
- Clearly distinguish UI-only work from completed server/domain behavior.
- Use evidence from tests/runtime behavior; do not change product code merely to satisfy an unrelated test.
- Finish and document a slice before starting the next one.

**Current execution slice: verify the personal-account school-relationship flow, then finish student admissions end-to-end.** The Owner/Admin operational dashboard and admission foundation are implemented. Current browser verification has exposed a school-discovery regression that must be diagnosed before dependent join-request testing. The next work remains applicant/parent submission, edit/reject actions, browser approval verification, and retirement/demotion of the legacy manual student-creation path.

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
18. **Result lifecycle & parent delivery** — result submission/approval/publication, published-result access, guardian authorization and parent in-app notification path.
19. **Personal account → school relationship UX** — relationship-driven school discovery with worker application, student admission, and Parent/Guardian available only through the existing relationship dropdown. Parent/Guardian UI remains pending backend verification integration.
20. **Student admission workflow foundation** — school-scoped admission applications with lifecycle states, applicant ownership, requested session/class, owner review, editable application data, audited approval/rejection/status changes, and transactional approval into an official Student + Enrollment record. Applicant submission UI and full browser verification remain pending.

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

## Long-term vision — Transparent and Secure Records

**Recorded for future direction only — not part of current V1 implementation.**

SkulGo is intended to eventually become a trusted record of a person's verifiable school journey across legitimate school relationships. The long-term product can evolve from a school operating platform into a user-centered educational record that carries verified history forward between participating schools.

> **Transparent and Secure Records.**

Future records could include school identity/enrollment history, attendance and participation where appropriate, academic results and achievements, certificates, and other school-issued educational records. The authoritative source remains the school that created the record.

A future SkulGo CV/profile should distinguish clearly between **school-verified records** and **user-entered claims**. It should expose provenance and record status—such as who issued a record, which school it belongs to, when it was created or changed, and who is authorized to see it—without turning self-claims into verified facts.

**This is intentionally deferred. Do not build the portable CV/profile, public profiles, ratings, endorsements, recommendations or cross-school portable-history layer during current V1.**


## Verification checkpoint — 18 Sep 2026

The implementation has crossed the basic engineering gate.

### Product domain checkpoint

- [x] `skulgo.com` registered on 18 Sep 2026.
- [x] Total charged: $6.99 including ICANN fee.
- [x] Free Domain Privacy retained.
- [x] No Namecheap hosting or PremiumDNS purchased.
- [ ] Production DNS configuration.
- [ ] Production HTTPS/domain verification.

`skulgo.com` is the public product domain; domain ownership does not mean the production application is deployed yet.

- [x] GitHub Actions clean-checkout verification merged to `main`.
- [x] CI install, Prisma generation and PostgreSQL migration deployment.
- [x] CI typecheck.
- [x] CI automated tests: 16/16 passing.
- [x] CI production build.
- [x] Local automated tests: 16/16 passing.
- [x] Local production build: 28/28 static pages generated.
- [ ] Local Next.js workspace-root warning caused by multiple lockfiles — cleanup only; not a current build failure.

The current product sequence has moved beyond the initial personal-account registration implementation. The Owner/Admin dashboard foundation is now implemented. The immediate runtime work is verifying school discovery/join behavior, then completing the student admission browser flow before advancing through core daily operations. Focused browser/runtime acceptance remains explicitly tracked in docs/ROADMAP.md.

We continue with: **one small slice → test → document → commit → next slice**.

## Product domain

**SkulGo public domain:** `skulgo.com`

The domain is registered and reserved for the product. DNS should be connected only after the production deployment target is ready. Namecheap is acting as the registrar; it is not the SkulGo application host.

## Engineering toolchain

SkulGo uses a deliberately small engineering toolbox. The current repository already has clean-checkout GitHub Actions CI; the next additions are Playwright, real PostgreSQL integration coverage, CodeQL and Dependabot. Sentry, backup/recovery monitoring and uptime monitoring are production-readiness additions; k6 and OpenTelemetry remain later-stage tools.

| Area | Tool | Timing |
|---|---|---|
| Browser E2E | Playwright | Now |
| Database integration | Testcontainers | Now |
| Security scanning | CodeQL | Now |
| Dependency security | Dependabot | Now |
| Production errors | Sentry | Soon |
| Backups/recovery | Managed PostgreSQL/Render backups | Before launch |
| Uptime | Better Uptime / UptimeRobot | Before launch |
| Load testing | k6 | Later |
| Deep tracing | OpenTelemetry | Later |

## Roadmap

### Phase 0 — Foundation & trust
- [x] User / organization / school identity
- [x] CAC identity claim
- [x] School membership
- [x] Capability primitives
- [x] Audit history
- [x] Password authentication
- [x] Database-backed sessions
- [ ] Production migration baseline and verification — CI migration deployment passes; production environment verification remains
- [x] Automated typecheck/lint/build CI — GitHub Actions clean-checkout verification merged to `main`
- [ ] Tenant-isolation integration tests
- [x] Offline-first platform foundation: local durable persistence, schema/versioning, repository abstraction
- [x] Offline mutation/outbox model with durable pending states
- [x] Shared sync engine with retry, backoff and idempotency
- [x] Connectivity/sync status model and application-wide UI treatment — initial workspace wiring

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
- [x] Offline-capable assessment and score capture foundation — shared local/outbox/sync path implemented; browser E2E remains
- [x] Result submission — implementation complete; browser/runtime verification remains
- [x] Result approval — implementation complete; browser/runtime verification remains
- [x] Result publication — implementation complete; browser/runtime verification remains
- [x] Report cards — implementation complete; browser/runtime verification remains
- [x] Academic history — implementation complete; browser/runtime verification remains

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
- [x] Public product domain acquired — `skulgo.com` registered 18 Sep 2026.
- [ ] PostgreSQL migration/deployment process — migration baseline exists; production verification remains
- [ ] Object/file storage
- [ ] Backups and recovery procedures, including recovery of sync/outbox state where required
- [ ] Observability and operational alerts
- [ ] Security hardening
- [ ] Performance/load testing
- [ ] Offline/online transition testing at production scale
- [ ] Render production deployment
- [ ] Connect `skulgo.com` / `www.skulgo.com` to production and verify HTTPS
- [ ] Tenant-safe onboarding and support operations

## Current V1 execution sequence

The detailed functional phases remain the product capability map. The active implementation order is now:

1. **Owner/Admin operational dashboard** — replace the basic dashboard with the real school control center and verify setup-complete → owner dashboard routing.
2. **Core daily operations** — Students, Classes, Attendance, Fees & Payments, Results and Reports, using real school-scoped records.
3. **People and communication** — Staff & Teachers, Parents, Applications, Users & Roles and Announcements.
4. **Role-specific workspaces** — Teacher, Cashier, Parent and Student experiences over the same school-scoped data and capabilities.
5. **Production readiness** — browser acceptance, tenant/security testing, migrations, backups/recovery, observability, deployment and skulgo.com verification.

Do not build these as five giant projects. Each item is a sequence of small vertical slices. Complete and verify one slice before starting the next.

The existing academic/finance/result foundations remain valuable implementation assets and should be reused rather than rebuilt.

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

This is an actively developed school platform, not yet a production-ready complete school application. The basic engineering gate has passed, and the public product domain `skulgo.com` has now been acquired. Remaining release work includes browser/runtime verification, tenant/security testing, production migration and recovery, observability, production deployment, DNS/HTTPS configuration, and representative offline/online verification.

See `docs/PRODUCT-DECISION-HISTORY.md` for the product reasoning and durable decisions. See `ARCHITECTURE.md` for frozen technical architecture. See `docs/ROADMAP.md` for the current execution roadmap, detailed capability phases, verification status and offline-first work.

## Current handoff — owner navigation parity — 20 Sep 2026

### How the remaining owner workspace is being built
The GB School demo is primarily a frontend/operational reference. We study what the owner sees and does, then connect that experience to App-School's existing backend/domain records. We do not copy the demo repository's backend or database architecture.

### Setup/backend vs operational/frontend
Setup/control-plane work includes school configuration, academic structure, fee definitions and assignments, module configuration, payment-provider configuration, and staff/capability administration.

Operational owner frontend includes current students, classes, attendance activity, live finance position, results, reports, communication, and staff/parent/application activity.

A setup page existing does not mean the corresponding owner operational page is complete. An operational page may also be frontend-complete while deeper backend actions still require verification.

### Owner navigation verification
- Students: working.
- Classes: working and browser verified through dedicated /academics.
- Attendance: working.
- Fees & Payments: route exists and reaches finance when FINANCE is enabled, but the main page currently mixes setup/configuration with the operational register. The next slice is to make /finance the owner-facing finance overview while retaining existing setup/payment/invoice/balance pages.
- Results: route exists; browser verification pending.
- Remaining owner sidebar items: verify one at a time.

### Handoff rule
Do not mark an owner sidebar item complete solely because a page file exists. Use: Frontend exists; Frontend + backend verified; Setup/backend exists; or Missing/broken.

The next developer should continue from the current sidebar item rather than redesigning the whole workspace.


## Product architecture rule: Settings is the control plane

App-School separates **school configuration** from **school operation**.

### School Settings / Setup

The school owner configures the school's foundation here, especially during initial school setup and later administration:

- academic sessions and terms;
- classes and class arms;
- subjects;
- fee structures and finance configuration;
- assessment definitions;
- staff and roles;
- parent access;
- enabled modules;
- future module-specific configuration.

### School Operations

The owner operational sidebar is the daily working surface:

- Dashboard
- Students
- Classes
- Attendance
- Fees & Payments
- Results
- Reports
- Announcements
- Staff & Teachers
- Parents
- Applications
- Users & Roles
- Audit History

The operational frontend uses the authoritative records established by Settings/Setup. It should not turn configuration screens into daily-operation screens.

### Extensible module model

School Settings is intentionally the control plane for future reusable modules:

```text
Reusable module
      ↓
School Settings
      ↓
Owner enables/configures
      ↓
Operational module surface
```

This lets App-School grow without creating separate school applications or redesigning the owner control plane for every new feature.

Module enablement is owner-controlled and enforced server-side. Staff capability is a separate authorization boundary. Disabling a module preserves historical records.

### Developer handoff rule

When adding a module, build its **configuration/control-plane slice** and its **operational slice** as distinct responsibilities. Reuse the same domain services and authoritative records rather than duplicating business logic.


---

## Current authoritative handoff checkpoint — 20 Sep 2026

> This section supersedes older dated handoff snapshots above. It records the state actually verified during the current Owner/Admin build sequence.

### Verified engineering checkpoint

- Local branch checkpoint: 27466a1 — feat: add permanent school person identity.
- The permanent school person-identity slice is committed locally; it has not yet been published from the local working tree in this checkpoint.
- npm test: 11 test files / 25 tests passed.
- npm run typecheck: passed.
- Prisma migration status: 32 migrations, database schema up to date.

### Permanent school person identity

The platform now has a permanent human-readable person identifier for school relationships.

    [SCHOOL PREFIX]/[YEAR]/[CATEGORY]/[RANDOM UNIQUE CODE]

Examples:

    AHA/2026/AC/K7M4Q9
    AHA/2026/N/P4X8QM

Rules:
- School prefix is generated from the school name and stored on School.personIdPrefix.
- Academic/teaching relationship uses AC.
- Non-academic staff/cashier relationship uses N.
- Owner receives a permanent person identifier as part of school registration.
- Internal UUIDs remain the database identity; the person identifier is the stable human-facing school identity.
- Role changes must not change the identifier.
- No sequential counter and no detailed job title is encoded into the identifier.

### Owner product architecture now established

    SCHOOL SETTINGS / SETUP
        ↓
    Configuration and control plane
        ↓
    Authoritative school records
        ↓
    SCHOOL OPERATIONS
        ↓
    Owner dashboard / daily work / reports

Configuration belongs in Settings/Setup. Operational navigation must show what the school is doing and seeing. Do not turn operational pages into setup forms merely because the same domain has configuration records.

The owner flow is:

    Owner setup + rules
            ↓
    Existing staff / teachers perform daily work
            ↓
    Authoritative records
            ↓
    Owner dashboard / reports / audit

Do not introduce new staff categories just to make the demo navigation fit. Reuse the existing relationship, membership and capability model.

### Owner/Admin surfaces verified in this sequence

- Dashboard: read-only operational overview using school-scoped authoritative records.
- Classes: dedicated owner operational page over ClassLevel → ClassArm → Enrollment → Student; no invented class-teacher relation.
- Attendance reports: real school-scoped report route verified in browser.
- Results: operational Results page now separates score capture/review from assessment-definition setup; existing assessment APIs remain authoritative.
- Finance: owner page is an operational reconciliation/overview surface; finance setup remains configuration. Finance/platform schema restoration was applied and verified with Prisma.
- Communication: owner can send an in-app notice; notification ID generation was restored at the database layer.
- School Settings: remains the control plane for academic configuration, staff/access, modules and other school settings.

### Results boundary

Assessment definitions are configured in School Setup. Results is the operational workflow:

    Assessment definition
       ↓
    Enter scores
       ↓
    Submit
       ↓
    Review / approve
       ↓
    Publish

The current demo school has a verified assessment definition for CA1, Primary 1 A, Mathematics, maximum score 20. Score capture currently reports no active enrolled students for that class/session; student enrollment is deliberately deferred until the Owner/Admin phase is complete.

### Owner dashboard boundary

The Owner dashboard is intentionally read-only. It derives operational indicators from authoritative school records and does not create or mutate operational data.

Current dashboard indicators:
- active students
- teaching-staff count
- today's attendance rate/records
- outstanding fees
- fee collection rate
- result-processing rate
- quick links to reports, students, classes and attendance

Do not add speculative dashboard data. If an authoritative record is unavailable, show the honest empty/zero state instead of inventing values.

### Current build method

Every Owner slice follows this exact sequence:

    Reference demo / current requirement
            ↓
    Inspect current App-School implementation
            ↓
    Identify the smallest missing slice
            ↓
    Reuse existing models/services/APIs
            ↓
    Implement only that slice
            ↓
    Typecheck + tests
            ↓
    Browser/runtime verification
            ↓
    Document actual result
            ↓
    Commit checkpoint
            ↓
    Next queue item

The existing Owner queue is followed in order. If a dependency is discovered, it should be suggested before changing the queue; do not silently jump ahead.

### Owner-first execution plan

Phase 1 — Finish Owner/Admin experience

Complete and browser-verify the existing Owner navigation one small slice at a time:

    Dashboard
    Students
    Classes
    Attendance
    Fees & Payments
    Results
    Reports
    Announcements
    Staff & Teachers
    Parents
    Subjects & Setup
    School Settings
    Applications
    Users & Roles
    Audit History

Current state is mixed: several surfaces are verified, while Staff & Teachers, Parents, Applications, Users & Roles and the dedicated Audit History operational surface still require their queued slices.

Phase 2 — Follow every user end-to-end

After Owner/Admin is complete, follow each user from personal sign-in through their full lifecycle:

    Teacher / Staff application
    → approval
    → membership + capabilities
    → teacher/staff workspace
    → daily work
    → Owner sees resulting records

    Student admission
    → review
    → approval
    → Student + Enrollment
    → student workspace
    → Owner sees resulting records

    Parent / Guardian
    → verified relationship
    → parent workspace
    → authorized child visibility
    → Owner sees appropriate relationship state

The same principle applies to Cashier/Accountant and other existing relationships. Do not invent new relationship categories unless a concrete product requirement requires them.

### Current deferred work

- Full applicant/student admission browser flow is not yet the current Owner queue item.
- Student enrollment is intentionally deferred until the Owner/Admin phase reaches it.
- Offline-first remains a platform requirement, but no module should invent a separate offline mechanism.
- Production DNS/deployment and launch hardening remain later gates.

### Working-tree discipline

The permanent-ID checkpoint was deliberately committed separately from the remaining Owner work. The remaining modified/untracked files include previously developed Owner slices, communication/report APIs, Classes page and migration/inspection artifacts. Do not stage all of them blindly. Each logical slice should be reviewed, tested and committed separately.
