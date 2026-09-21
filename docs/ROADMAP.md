# App-School Roadmap

## Why App-School exists

App-School is built to make useful school technology economically accessible through shared software and infrastructure rather than requiring each school to independently assemble and maintain developers, hosting, databases, backups, security, updates and support.

The product is problem-first, not feature-first:

```
Real problem
  ↓
Understand the workflow
  ↓
Identify rules, states and ownership
  ↓
Build the smallest useful slice
  ↓
Validate security + tenancy + audit
  ↓
Test online + offline + reconnect
  ↓
Record the decision
  ↓
Next slice
```

The goal is a strong multi-tenant school operating platform that can safely absorb additional modules over time.

## Core identity rule — every person has a SkulGo account first

Every person starts with one personal SkulGo account. A person can have one or more legitimate relationships with schools.

```
PERSON
  ↓
SkulGo personal account
  ↓
school relationship / membership
  ↓
workspace
  ↓
capabilities + resource scope
```

This is an identity rule, not a role simulation.

Do not create separate role-only accounts for owners, teachers, students, parents or cashiers.

Do not infer identity or permissions from URL query parameters such as `?role=teacher`.

### Relationship flows

- **School owner:** personal SkulGo account + school registration → Organization + School + owner membership.
- **Student:** personal SkulGo account → discover school → submit admission application → school review → admission/acceptance → school membership/student relationship.
- **Teacher/staff:** personal SkulGo account → discover school → submit job/application → school review → approval/offer → school membership/staff relationship.
- **Parent/guardian:** personal SkulGo account → verified guardian/student relationship → parent access. This is not an admission-style application.
- **Cashier/finance staff:** personal SkulGo account → approved school membership → finance capabilities/workspace.

A school membership is not the person's identity. The person remains the same SkulGo user even when school relationships change.

## Personal account and school selection

After an application is approved:

1. The existing SkulGo account remains unchanged.
2. An active school membership/relationship is created or activated.
3. The person first reaches the SkulGo account/school relationship view.
4. The person's school(s), relationship(s), and status are shown.
5. The person selects a school.
6. The selected school's workspace is derived from the approved relationship and access state.

This is the current product decision. Do not automatically bypass the personal account page merely because only one active school exists.

## Workspace model

Owner, teacher, student, parent/guardian and cashier experiences are different views over the same school-scoped platform.

They share:

- one User identity model;
- school-scoped records;
- the same authorization foundation;
- the same audit model;
- the same offline/local-data/sync infrastructure.

They do not share an owner UI with controls merely hidden.

### Authorization chain

The intended server-side security chain is:

```
Authenticated User
  ↓
Active Membership
  ↓
School / tenant context
  ↓
Capability
  ↓
Resource scope
  ↓
Action
  ↓
Audit where required
```

Capabilities remain the authorization boundary, but some domains also require resource scope.

For teacher academic work:

```
Capability
  +
Teacher assignment
  +
Class/subject enrollment scope
```

## V1 goal

App-School V1 is the smallest reliable school operating platform for:

```
OWNER / PRINCIPAL
→ school visibility, configuration, access control, finance,
  trusted results and management information.

TEACHER
→ subject teaching work, students in assigned subject scope,
  assessment/score work, and attendance when separately responsible.

STUDENT
→ correct school identity, enrollment, attendance and academic records.

PARENT / GUARDIAN
→ authorized child information, notifications and published results.

CASHIER / FINANCE STAFF
→ school-scoped finance work using explicit finance access.
```

Anything that does not materially support these workflows or protect correctness, security, tenancy, audit or recoverability remains outside V1.

## Teacher workspace contract

The detailed handover source for these decisions is:

**`docs/V1-ROLE-WORKSPACE-CONTRACT.md`**

The current teacher contract is:

### Teacher workspace

- Teacher has a genuinely separate Teacher workspace.
- It is not the owner workspace with owner controls hidden.
- Navigation is dynamically derived from the teacher's effective capabilities.
- If the teacher lacks attendance access, attendance is not shown in the teacher navigation.
- Dashboard structure may be consistent across teachers, but cards/actions must respect the person's access.
- The previously reviewed GB School screen is only a UX reference. Do not copy its URL-based `?role=teacher` identity simulation.

### Teacher assignment

A teaching assignment is:

```
Teacher → Class → Subject → Academic session / term
```

A teacher can have multiple simultaneous assignments.

Examples:

```
Teacher A
  SS1 → Mathematics
  SS2 → Mathematics
  SS1 → Physics

Teacher B
  SS1 → Chemistry
  SS2 → Chemistry
```

Assignments answer:

> Where and which subject does this teacher teach?

Normal subject-teaching actions automatically follow a valid teaching assignment.

Teacher assignments are managed by the owner/admin or authorized staff with academic-management access.

Assignments can carry forward into the next session/term. Authorized staff can change current assignments while preserving historical assignment versions.

### Subject enrollment

The subject roster is controlled by the school, not the teacher.

```
Class → Subject
      ↓
students enrolled in that subject
```

A teacher opening a subject sees only students currently enrolled in that subject.

A teacher cannot individually add/remove students from the subject roster.

### Class teacher / class master

Class teacher is a separate class-level responsibility:

```
Teacher → Class → Class-teacher responsibility → Academic session / term
```

A teacher can be both class teacher and subject teacher.

A class teacher can record attendance for the entire assigned class.

A normal subject teacher who is not a class teacher does not automatically receive attendance responsibility.

### Teacher academic workflow

For a teacher assigned to a class and subject:

```
Class
  ↓
Subject
  ↓
Enrolled students
  ↓
School-configured assessment type
  ↓
Enter scores
  ↓
Submit
  ↓
Explicit confirmation
  ↓
Submitted
```

Assessment types are school-specific. SkulGo provides defaults, and each school can customize its types.

The maximum score/weight is configured by the school for the assessment type and is enforced as a hard validation limit.

After submission, the teacher cannot edit the result.

A controlled correction workflow may later change a locked score. Correction requires a reason and preserves audit history.

Correction history records:

- original submitting teacher;
- original submission time;
- correcting user;
- correction time;
- old score;
- new score;
- reason.

Teachers and administrators can see the full correction history.

If a teacher is removed from an assignment, they do not retain access to the previous class/subject records through that old assignment. The school records remain intact.

## Other workspace contracts

### Owner / principal

Owner controls include:

- staff and access administration;
- school profile/configuration;
- module enable/disable settings;
- application review/approval;
- finance and management visibility;
- trusted result workflow.

Owner controls must remain outside teacher/student/parent/cashier workspaces.

### Student

Student access is based on the personal SkulGo account plus active school relationship/enrollment. Student information is limited to the student's legitimate school scope and publication state.

### Parent / guardian

Parent access is based on a verified guardian relationship and active child enrollment. A parent sees only authorized child data. Published results and important notifications remain school-authoritative.

### Cashier / finance staff

Finance staff are capability-controlled and school-scoped. Working with money does not imply owner access.

Offline finance must never show locally queued activity as confirmed payment.

## Cross-cutting product requirement — offline-first

Offline-first is a platform requirement, not a module-specific enhancement.

```
ONLINE
UI → local durable data → sync → server → PostgreSQL

OFFLINE
UI → local durable data → durable outbox / pending state

RECONNECT
pending changes → server validation/authorization → audit → acknowledgement
```

Rules:

- operational data may be read locally when already available on the device;
- important writes should persist locally first where offline support is intended;
- pending state is distinct from server confirmation;
- synchronization is idempotent;
- server authorization/validation/audit remain authoritative;
- failed sync preserves pending work;
- conflicts must not be silently overwritten;
- shared local-data/outbox/sync infrastructure is reused across modules;
- server-authoritative publication remains online/server controlled.

## Verification checkpoint — 18 Sep 2026

**Engineering gate:** passed for the basic implementation gate.

Completed checkpoints include:

- [x] `skulgo.com` registered and retained as the public product domain.
- [x] GitHub Actions clean-checkout verification merged to `main`.
- [x] CI install + Prisma generation + PostgreSQL migrations.
- [x] CI typecheck.
- [x] CI tests: 16/16.
- [x] CI production build.
- [x] Local tests: 16/16.
- [x] Local production build: 28/28 static pages generated.
- [ ] Local multiple-lockfile warning cleanup.
- [ ] Production DNS.
- [ ] Production HTTPS/domain verification.

The remaining work is primarily browser/runtime acceptance, tenant/security/recovery verification and production deployment readiness.

## Current platform foundation

The repository already contains major V1 foundations for:

- User / Organization / School identity
- CAC identity claim
- school membership
- capability primitives
- audit history
- password authentication
- database-backed sessions
- academic sessions and terms
- class levels and class arms
- subjects and subject-to-class structure
- student records and enrollment
- daily attendance
- attendance history/correction
- staff memberships and capability administration
- parent/guardian records and student relationships
- student lifecycle
- assessment definitions
- score capture and validation
- result submission / approval / publication
- report cards / academic history
- finance foundations
- operational and management reports
- offline durable persistence/outbox/sync foundation

These existing foundations should be reused. Do not rebuild them as parallel systems.

## V1 finish line

V1 is complete when:

1. A school can configure and operate its core academic structure.
2. The owner/principal can manage staff access, school settings, modules and important school information.
3. Teachers have a separate workspace derived from their school relationship and effective capabilities.
4. Teacher teaching work is scoped by explicit class + subject assignments.
5. Subject teachers work only with students enrolled in the subject.
6. Class teachers can handle whole-class attendance when assigned that responsibility.
7. Teachers can capture and submit scores with hard maximum-score validation and final submission confirmation.
8. Locked-score corrections use a controlled, reasoned, auditable process.
9. Parents/guardians can securely access authorized child information and published results.
10. Students have correct enrollment and academic records.
11. Results can move through capture → submit → approve → publish.
12. Supported operational data survives temporary connectivity loss and synchronizes safely.
13. Finance records never present queued local activity as confirmed payment.
14. Management has useful operational reports and exports.
15. School tenancy, capabilities, resource scope, audit history and recoverability are protected.
16. The application can be deployed and operated with verified migrations, backups, observability and recovery procedures.
17. Identity/joining works as one personal SkulGo account → school relationship → account school selection → correct workspace.

## Phase 0 — Foundation & trust

- [x] User / organization / school identity
- [x] CAC identity claim
- [x] School membership
- [x] Capability primitives
- [x] Audit history
- [x] Password authentication
- [x] Database-backed sessions
- [ ] Production migration baseline and verification
- [x] Automated CI for typecheck/test/build
- [ ] Tenant-isolation integration tests
- [x] Offline durable persistence/outbox/sync foundation
- [ ] Offline authentication/session lifecycle hardening
- [x] Personal SkulGo account independent of school membership
- [x] School discovery and relationship/application primitives

## Phase 1 — School configuration & owner control

- [x] Academic session foundation
- [x] Academic terms configuration
- [x] Class levels
- [x] Class arms
- [x] Subjects
- [x] Subject-to-class structure
- [x] School setup workspace
- [x] Owner-only module settings
- [x] Backend module enforcement for implemented modules
- [x] Session lifecycle: draft → active → closed
- [x] Setup readiness calculation
- [x] School profile/configuration foundation
- [ ] Offline-capable school setup where materially useful
- [ ] Teacher class + subject assignment management
- [ ] Class-teacher assignment management
- [ ] Subject enrollment management

## Phase 2 — Students, teachers & daily operations

- [x] Student records
- [x] Student enrollment
- [x] Daily attendance
- [x] Attendance history/correction
- [x] Staff accounts and initial membership management
- [x] Initial capability assignment UI
- [x] Parent/guardian records + student relationships
- [x] Student status lifecycle
- [x] Offline-capable attendance foundation and reconciliation
- [ ] Offline-capable student/enrollment workflows
- [ ] Personal account → school discovery → student admission application
- [ ] Personal account → school discovery → teacher/staff application
- [ ] Owner review → approval/offer → membership creation runtime verification
- [ ] Teacher workspace and capability-derived navigation
- [ ] Teacher class/subject dashboard experience
- [ ] Teacher class/subject access enforcement
- [ ] Class-teacher attendance responsibility enforcement
- [ ] Teacher subject-enrollment roster enforcement

## Phase 3 — Assessments, results & academic trust

- [x] Assessment definitions
- [x] Score capture
- [x] School/class/session/enrollment/max-score validation
- [x] Offline score-capture foundation
- [ ] Browser E2E assessment offline save → reload → reconnect → sync
- [ ] Assessment conflict-resolution UI
- [x] Result submission API/domain foundation
- [x] Result approval API/domain foundation
- [x] Result publication API/domain foundation
- [ ] Verify complete submit → approve → publish runtime
- [x] Published report-card API/domain boundary
- [x] Published academic-history API/domain boundary
- [ ] Final teacher submission/lock UX
- [ ] Locked-result correction workflow + audit history
- [ ] Assessment-type school configuration UI/runtime
- [ ] Assessment-type maximum/weight configuration enforcement E2E

## Phase 4 — Parent / guardian value

- [x] Guardian records + student relationships
- [x] Guardian account bootstrap/security
- [x] Guardian result authorization
- [x] Published result access boundary
- [x] Attendance absence alert — in-app
- [x] Payment confirmation alert — in-app
- [x] Result publication alert — in-app
- [x] Parent school workspace entry
- [x] Parent child overview constrained by StudentGuardian + active Enrollment
- [ ] Verify complete parent journey end-to-end
- [ ] External SMS/WhatsApp/email only when a demonstrated operating need exists
- [ ] Review parent workspace against the same school relationship/capability principles

## Phase 5 — School finance

- [x] Fee structures
- [x] Student fee assignments
- [x] Invoices / obligations
- [x] Payment recording
- [x] Payment provider integration foundation
- [x] Receipts
- [x] Balances and reconciliation
- [x] Finance audit trail
- [ ] Verify critical finance runtime paths/provider verification before production
- [ ] Safe offline finance capture only where appropriate
- [ ] Basic cashier workspace and capability-derived navigation
- [ ] Do not expand finance into a full ERP in V1

## Phase 6 — Owner reports & operational visibility

- [x] Attendance report
- [x] Academic report
- [x] Finance report
- [x] Initial operational dashboards
- [x] Management summaries
- [x] Authenticated management CSV exports
- [ ] Verify reports against actual owner operational questions
- [ ] Practical offline report access from trusted local data
- [ ] Do not build a large BI platform

## Phase 7 — Commercial result access

The commercial layer supports a simple initial result-access model without turning V1 into a full billing platform.

| Plan | Monthly | School share of paid result access |
|---|---:|---:|
| Free | ₦0 | 0% |
| Basic | ₦5,000 | 25% |
| Starter | ₦10,000 | 50% |
| Pro | ₦20,000 | 75% |
| Premium | ₦35,000 | 100% |
| Custom | Negotiated | 100% by default until negotiated terms exist |

Already implemented foundations include plan configuration, deterministic revenue allocation, result-access settings, payment attempts, provider checkout/verification, idempotency, immutable verified transactions, entitlement persistence and callback verification boundaries.

Remain only where directly useful to V1 operations:

- [ ] School transaction/revenue view
- [ ] Basic commercial administration view
- [ ] Monnify result-access adapter if required by launch operations

Defer beyond V1:

- [ ] Full subscription lifecycle automation
- [ ] Settlement/refund operations platform
- [ ] Commercial analytics/admin suite

## V1 platform safety

These are release gates, not feature expansion:

- [x] Automated CI for typecheck/test/build from clean checkout
- [ ] Playwright browser/API acceptance suite
- [ ] Testcontainers PostgreSQL integration coverage
- [ ] CodeQL security analysis
- [ ] Dependabot dependency updates
- [ ] Tenant-isolation integration tests
- [ ] Production migration/deployment verification
- [ ] Backup/recovery procedure
- [ ] Sentry production error monitoring
- [ ] Uptime monitoring
- [ ] Operational alerts
- [ ] Security hardening
- [ ] Performance/load testing appropriate to expected scale
- [ ] Offline/online transition testing across representative workflows
- [ ] Render production deployment
- [ ] Connect `skulgo.com` / `www.skulgo.com` to production and verify HTTPS
- [ ] Tenant-safe onboarding/support procedure

## Conflict handling

The platform represents:

```
PENDING_SYNC
SYNCING
SYNCED
FAILED
CONFLICT
```

V1 needs focused conflict handling for important workflows such as attendance and assessments. Do not build a generalized enterprise reconciliation console unless real operations demonstrate the need.

## Current V1 execution order

### Gate A — Identity & school relationships

1. Personal SkulGo account creation.
2. School discovery.
3. Student admission application.
4. Teacher/staff application.
5. Owner review and approval/offer.
6. Membership/workspace activation.
7. Account page shows school relationship(s).
8. User selects school.
9. Correct relationship/workspace opens.

### Gate B — Teacher workspace

10. Separate teacher workspace shell.
11. Capability-derived navigation.
12. Teacher class + subject assignments.
13. Class-teacher responsibility.
14. Subject enrollment scope.
15. Teacher daily academic workflow.
16. Teacher score submission/locking.
17. Controlled result correction/audit.

### Gate C — Academic trust

18. Verify result submission runtime.
19. Verify result approval runtime.
20. Verify submit → approve → publish.
21. Verify report card runtime.
22. Verify academic history runtime.

### Gate D — Offline release gate

23. Verify assessment browser offline lifecycle.
24. Add focused assessment conflict UI.
25. Define safe offline authentication/session behavior.
26. Convert minimum student/enrollment workflows needed for teacher/admin continuity.

### Gate E — Parent/student/finance human value

27. Verify parent journey end-to-end.
28. Verify student journey end-to-end.
29. Verify cashier/finance journey end-to-end.
30. Verify owner configuration, finance and reports against real operational questions.

### Gate F — Production trust

31. CI and clean checkout.
32. Tenant-isolation integration coverage.
33. Migration verification.
34. Backups/recovery.
35. Observability.
36. Security hardening.
37. Production deployment.
38. Representative offline/online transition verification.

## Explicit V1 exclusions — do not build now

Do not expand V1 into:

- a full accounting/ERP suite;
- a large CRM;
- a general social/messaging platform;
- native mobile apps before the web workflow proves demand;
- timetable/transport/library/hostel systems without a concrete launch-school requirement;
- advanced AI agents making authoritative school decisions;
- a large BI/data warehouse platform;
- a generalized conflict-management product;
- dozens of duplicated role-specific systems;
- URL role parameters used to simulate identity;
- separate user databases for owners, teachers, students or parents;
- a portable public CV/profile, ratings, endorsements or cross-school public history layer.

## Domain and production boundary

`skulgo.com` is the public product domain. DNS belongs to the deployment/release phase. Domain ownership is not evidence that the production application is live.

The application remains authoritative in GitHub + production PostgreSQL, while the domain is the public entry point.

## Handover instructions

A new developer or AI agent must read these documents before changing identity, authorization, workspace or academic behavior:

1. `README.md`
2. `docs/ROADMAP.md`
3. `docs/V1-ROLE-WORKSPACE-CONTRACT.md`
4. `docs/V1-IDENTITY-JOINING-HANDOFF.md`
5. `docs/V1-FINAL-SLICES.md`
6. `docs/ARCHITECTURE.md`

Before implementing a new feature:

1. Find the existing domain/service/API/schema implementation.
2. Reuse existing identity, membership, capability, module, audit and offline infrastructure.
3. Define ownership, state transitions, school scope and resource scope first.
4. Enforce authorization on the server; UI hiding is not authorization.
5. Add browser/API/integration verification for important cross-tenant and workspace rules.
6. Update this roadmap and the relevant handover document when a product decision changes.
7. Do not solve a new requirement by creating a parallel role/account model.

## Final product principle

> **One person → one SkulGo account → one or more legitimate school relationships → the correct workspace.**

> **Capabilities answer what a person can do. Resource assignments answer where/which records that work applies to.**

> **Solve the painful daily school problems first. Build the smallest trustworthy platform that can solve them. Stop adding features when the V1 problem is solved.**
