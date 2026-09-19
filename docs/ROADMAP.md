# App-School Roadmap

## Core identity rule — every person has a SkulGo account first

**Every person starts with a personal SkulGo account.** A school relationship is established after that identity exists.

```text
PERSON
  ↓
SkulGo personal account
  ↓
school relationship / membership
  ↓
workspace + capabilities
```

This is an identity rule, not a role simulation. Do not create role-only accounts in place of the person's SkulGo account.

### Relationship flows

### Completed identity/joining UX slice

The completed identity/joining slice made the existing personal-account model concrete without adding separate role account systems:

- [x] Make **Find a school** the universal school-discovery page for all users.
- [x] Keep one existing page for the relationship-driven flow after a school is selected.
- [x] Teacher / staff / cashier use the existing application/request flow.
- [x] Student uses the existing admission-request flow.
- [x] Parent / Guardian is added only to the existing **Requested relationship** dropdown and appears only when selected.
- [ ] Connect Parent / Guardian submission to the existing verified Guardian + StudentGuardian backend flow.
- [x] Make **Register a school** reuse the existing personal SkulGo account when the person is already signed in.
- [x] Keep school registration as school information + the person's relationship; do not create a second school-specific person login.
- [x] Use **← Account** to return from a school workspace to the personal account page; remove the role-switching navigation concept.

These are UX/workflow changes to the existing identity architecture, not new identity layers.

### Engineering method for remaining V1 work

```text
Inspect current implementation → define one narrow slice → preserve working behavior
→ implement → typecheck + focused browser/runtime verification
→ document actual status → commit → next slice
```

Do not redesign a working flow while adding a new relationship. Reuse existing domain/security/audit infrastructure. Do not mark UI-only behavior as backend-complete.
- **School owner:** personal SkulGo account + school registration → Organization + School + owner membership.
- **Student:** personal SkulGo account → discover school → submit admission application → school review → admission/acceptance → school membership/student relationship.
- **Teacher/staff:** personal SkulGo account → discover school → submit job/application → school review → offer/acceptance → school membership/staff relationship.
- **Parent/guardian:** personal SkulGo account → verified student/guardian relationship → parent access. This is not an admission-style application.

A school membership must never be treated as the prerequisite for the person's SkulGo identity. The current owner registration UX may create the personal account and school together, but the resulting person remains a normal SkulGo user account.

### Personal account → school → role workspace

The school entry experience is now defined as a single clean relationship-driven flow:

```text
Personal SkulGo account
        ↓
Your schools
        ↓
School name + approved relationship
        ↓
Open school
        ↓
Authorized operational dashboard
```

The confirmed dashboard references are:

- **Owner / Admin** → Owner operational dashboard (GB School demo reference)
- **Teacher** → Teacher dashboard (GB School demo reference)
- **Cashier / Accountant** → Cashier dashboard (GB School demo reference)
- **Parent / Guardian** → Parent dashboard (GB School demo reference)
- **Student** → Student dashboard (GB School demo reference)
- **Principal / Headmaster** → may be assigned later by the school owner; the person can initially join through the teacher/staff path and then receive the Principal role.
- **Staff** → staff workspace to be defined from a concrete sample; do not invent a dashboard before that requirement is defined.

A person does not create a second account when their school role changes. The same SkulGo account and school membership remain in place; the owner's role/capability assignment changes the authorized workspace.

The demo's **Switch role** concept is not part of the SkulGo identity model. The school workspace uses **← Account** to return to the personal account. URL parameters such as `?role=teacher` are never the source of authorization or identity.

### Owner setup state

School registration creates the owner relationship immediately. While required school setup is incomplete, the personal account may show a clear setup entry for that school. Once setup is complete, that setup prompt is no longer shown as the primary school entry; the owner simply opens the school like every other connected person.

Setup remains a school administration/configuration surface. It is not the owner's permanent operational dashboard.

### Find a school and Applications

**Find a school** establishes relationships; it is not a second dashboard.

- Teacher / Staff / Cashier → application/request.
- Student → admission request.
- Parent / Guardian → verified student connection request.
- Existing active school relationships must not be offered an inappropriate duplicate relationship for the same school.

Incoming school requests are handled through the owner's/authorized administrator's **Applications** area. Approval establishes the authoritative school relationship and capabilities.

The backend remains authoritative for all of these rules; hiding an option in the UI is not sufficient authorization.

### Workspace routing rule

After login:

- one active school relationship → automatically open that school's dashboard;
- multiple active school relationships → show a school selector;
- no active school relationship → show the account/workspace state and available joining paths.

Capabilities remain the authorization boundary. School/module access must not be inferred from URL parameters such as `?role=teacher`.

School setup remains web-only onboarding. Offline-first applies to supported operational workflows, not as a reason to make registration/setup unnecessarily complex.

## V1 goal

App-School V1 is the smallest reliable school operating platform that solves the core daily pains of four groups:

```text
SCHOOL OWNER
→ know what is happening, control staff/access, manage money, configure the school,
  publish trusted results and receive useful management information.

TEACHER
→ teach/manage students, take attendance, record scores and continue working when
  connectivity is poor.

PARENT / GUARDIAN
→ securely access the child's school information, receive important updates,
  and access published results without unnecessary friction.

STUDENT
→ have a correct school identity/enrollment record, attendance and academic history,
  and see the information the school has legitimately published.
```

Anything that does not materially support these workflows or protect correctness, security, tenancy or recoverability remains outside V1.

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

This requirement applies across the platform, including students, enrollment, attendance, assessments/results, finance, communication, reports and future modules.

### Offline-first rules

- Read operational data from a local durable store when that working data already exists on the device.
- Important user changes are written locally first and represented by an explicit pending/sync state.
- Synchronization sends pending changes when connectivity returns.
- Sync actions are idempotent so retries do not create duplicate effects.
- Server authorization, validation and audit remain authoritative.
- Local state must never falsely present an unacknowledged server action as server-confirmed.
- Conflicts must be detected and resolved explicitly where concurrent edits matter.
- Failed sync preserves pending work rather than silently discarding it.
- Modules reuse the same platform persistence/outbox/sync infrastructure.
- Server-authoritative actions such as final publication remain intentionally online-only.

## Verification checkpoint — 18 Sep 2026

**Engineering gate:** passed.

### Domain checkpoint — SkulGo identity acquired

- [x] `skulgo.com` registered for 1 year through Namecheap on 18 Sep 2026.
- [x] Promotional registration price: $6.79.
- [x] ICANN fee: $0.20.
- [x] Total charged: $6.99.
- [x] Free Domain Privacy retained.
- [x] No Namecheap hosting, PremiumDNS or paid add-ons purchased.
- [ ] Configure DNS for the production application.
- [ ] Verify `skulgo.com` and `www.skulgo.com` against the production deployment.

The domain is an acquired product asset; it does not by itself mean the application is deployed or production-ready.

- [x] GitHub Actions clean-checkout CI merged to `main`.
- [x] CI install + Prisma generation + PostgreSQL migrations.
- [x] CI typecheck.
- [x] CI tests: 16/16.
- [x] CI production build.
- [x] Local tests: 16/16.
- [x] Local production build: 28/28 static pages.
- [ ] Local multiple-lockfile warning cleanup; non-blocking.

Remaining work is now primarily **browser/runtime acceptance, tenant/security/recovery verification, and production deployment readiness**.

## Long-term vision — Transparent and Secure Records

**Recorded for future direction only — not part of current V1 implementation.**

SkulGo is intended to eventually become a trusted record of a person's verifiable school journey across legitimate school relationships. The long-term product can evolve from a school operating platform into a user-centered educational record that carries verified history forward between participating schools.

> **Transparent and Secure Records.**

Future records could include school identity/enrollment history, attendance and participation where appropriate, academic results and achievements, certificates, and other school-issued educational records. The authoritative source remains the school that created the record.

A future SkulGo CV/profile should distinguish clearly between **school-verified records** and **user-entered claims**. It should expose provenance and record status—such as who issued a record, which school it belongs to, when it was created or changed, and who is authorized to see it—without turning self-claims into verified facts.

**This is intentionally deferred. Do not build the portable CV/profile, public profiles, ratings, endorsements, recommendations or cross-school portable-history layer during current V1.**


## Engineering toolchain

The project will adopt a deliberately small verification/operations toolbox. Tools are introduced when they close a real release or reliability gap; they are not requirements to add every service immediately.

| Area | Tool | Status | Purpose |
|---|---|---|---|
| Browser E2E | Playwright | Planned — Now | Verify real owner, teacher, student and parent journeys in a browser |
| Database integration | Testcontainers | Planned — Now | Run integration tests against real disposable PostgreSQL, including tenant isolation |
| Security scanning | GitHub CodeQL | Planned — Now | Static security analysis for the TypeScript/JavaScript codebase |
| Dependency security | GitHub Dependabot | Planned — Now | Detect dependency vulnerabilities and stale dependencies |
| Error monitoring | Sentry | Planned — Soon | Capture production runtime failures with useful request/context data |
| Runtime/API checks | Playwright API + browser checks | Planned — Now | Exercise authorization, module enforcement, tenant boundaries and important API contracts |
| Load testing | k6 | Planned — Later | Validate representative V1 scale before production growth |
| Database backup | Managed PostgreSQL/Render backups | Planned — Before launch | Backup and recovery protection for authoritative records |
| Uptime monitoring | Better Uptime or UptimeRobot | Planned — Before launch | Detect production availability failures |
| Distributed observability | OpenTelemetry | Planned — Later | Adopt only when service/runtime complexity justifies it |

### Tool adoption rule

1. Prefer GitHub-native controls for repository security and dependency hygiene.
2. Prefer Playwright for real browser acceptance and API/runtime verification rather than maintaining separate overlapping E2E stacks.
3. Prefer real PostgreSQL integration coverage for tenant/security invariants; unit tests remain useful but are not sufficient evidence for database behavior.
4. Keep production observability proportional to the current modular-monolith architecture.
5. Do not add Redis, Kafka, Kubernetes, a data warehouse or microservices merely to satisfy a tooling checklist.

### Recommended adoption sequence

```text
NOW
Playwright
Testcontainers
CodeQL
Dependabot
  ↓
SOON
Sentry
backup/recovery
uptime monitoring
  ↓
LATER
k6
OpenTelemetry
```

These tools are engineering infrastructure. Their presence never overrides the product requirement that school tenancy, authorization, audit, server truth and offline state remain correct.

## Current execution roadmap — September 2026

The detailed domain phases below describe product capability maturity. The current execution roadmap is the order in which the SkulGo implementation should now be advanced.

The immediate goal is to move from school setup → Owner/Admin operational dashboard → real daily operations, while preserving the existing personal-account, membership, capability, audit and offline-first architecture.

### Phase 3 — Owner/Admin operational control center

**Status: NEXT**

The setup workspace is temporary. Once the required school foundation is ready, the owner enters the normal operational dashboard.

- [ ] Replace the basic SkulGo dashboard with the Owner/Admin control-center layout.
- [ ] Keep ← Account as the return path to the personal SkulGo account.
- [ ] Show the school name and Owner/Admin relationship from the authenticated school membership.
- [ ] Add navigation for Students, Classes, Attendance, Fees & Payments, Results, Reports, Announcements, Staff & Teachers, Parents, Subjects & Setup, School Settings, Applications, Users & Roles and Audit History.
- [ ] Build dashboard summary cards from real school-scoped database records; do not hardcode demo numbers.
- [ ] Add today's attendance, fee collection and result-processing summaries from authoritative records.
- [ ] Add useful quick actions without creating duplicate business logic.
- [ ] Verify setup-complete → owner dashboard routing in a real browser.

Reference rule: GB-demo-school is the visual/navigation reference; school-management-system is the deeper workflow/business-logic reference. Neither repository is the SkulGo architecture.

### Phase 4 — Core daily school operations

**Status: NEXT AFTER OWNER DASHBOARD**

Build the operational areas behind the dashboard, reusing the existing domain logic where it is already proven.

- [ ] Students operational workspace and profile flow.
- [ ] Classes operational workspace.
- [ ] Resolve the class/arm model so schools can support both Primary 1 and Primary 1A / Primary 1B without fake placeholder arms.
- [ ] Attendance operational workspace and history.
- [ ] Fees & Payments operational workspace.
- [ ] Results operational workspace.
- [ ] Reports operational workspace.
- [ ] Verify each module through school-scoped capabilities and module enforcement.
- [ ] Preserve audit/history for meaningful changes.
- [ ] Extend offline support only through the shared local-data/outbox/sync architecture.

### Phase 5 — People, relationships and communication

**Status: AFTER CORE OPERATIONS**

- [ ] Staff & Teachers workspace.
- [ ] Parents/Guardians workspace.
- [ ] Applications review and approval workflow.
- [ ] Users & Roles / capability administration.
- [ ] Announcements and school communication.
- [ ] Complete the Parent/Guardian verified relationship backend path.
- [ ] Verify that one personal SkulGo account can hold legitimate relationships across schools without duplicate identities.
- [ ] Keep Principal/Headmaster as an owner-assigned capability/role path; do not create a separate identity system.
- [ ] Define a Staff dashboard only after a concrete product requirement exists.

### Phase 6 — Role-specific workspaces

**Status: AFTER PEOPLE / OPERATIONS**

Role dashboards are different views over the same school-scoped platform, not separate applications.

- [ ] Owner/Admin dashboard — operational control center.
- [ ] Teacher dashboard — classes, attendance, subjects and academic work.
- [ ] Cashier dashboard — payments, receipts, balances and finance work.
- [ ] Parent dashboard — authorized children, attendance, results, fees and announcements.
- [ ] Student dashboard — enrollment, attendance, results, fees and announcements.
- [ ] Verify capability boundaries server-side for every role workspace.
- [ ] Verify direct URL access cannot bypass membership, capability or module checks.
- [ ] Verify the same personal account remains stable when a school changes a person's capabilities.

### Phase 7 — Production readiness and controlled launch

**Status: AFTER ROLE WORKSPACES**

- [ ] Complete browser/runtime acceptance for the main owner, teacher, cashier, parent and student journeys.
- [ ] Complete tenant-isolation integration tests against real PostgreSQL.
- [ ] Complete authentication/session hardening, including the offline/session boundary.
- [ ] Verify production migrations and rollback/recovery procedures.
- [ ] Verify backups and restoration, including important pending-sync/outbox considerations.
- [ ] Add production error monitoring and uptime monitoring.
- [ ] Complete security scanning and dependency hygiene.
- [ ] Run representative performance/load tests before scale requires them.
- [ ] Deploy the production application.
- [ ] Connect skulgo.com and www.skulgo.com.
- [ ] Verify HTTPS, tenant-safe onboarding and operational support procedures.
- [ ] Launch only after the core school workflows are verified end-to-end.

### Execution rule

Do not treat these phases as permission to build everything in advance. Complete one narrow vertical slice, verify it, document it, commit it, then move to the next dependent slice.

```text
Current
  ↓
Setup completion + verification
  ↓
Owner/Admin dashboard
  ↓
Students / Classes / Attendance / Finance / Results / Reports
  ↓
Staff / Parents / Applications / Communication
  ↓
Teacher / Cashier / Parent / Student workspaces
  ↓
Production readiness
```
## V1 finish line

V1 is complete when:

1. A school can configure and operate its core academic structure.
2. The owner can manage staff access, school settings, modules and important school information.
3. Teachers can manage students, attendance and assessment scores with clear saved/sync states.
4. Parents/guardians can securely access authorized student information and receive important notifications.
5. Students have correct enrollment and academic records inside the school boundary.
6. Results can move through capture → submit → approve → publish.
7. Supported operational data survives temporary connectivity loss and synchronizes safely.
8. Finance records never present locally queued activity as confirmed payment.
9. Management has useful operational reports and exports without a large analytics platform.
10. School tenancy, capabilities, important invariants, audit history and recoverability are protected.
11. The application can be deployed and operated with verified migrations, backups, observability, security and recovery procedures.
12. The identity/joining model works from personal SkulGo account → school relationship → correct workspace.

## Phase 0 — Foundation & trust
- [x] User / organization / school identity
- [x] CAC identity claim
- [x] School membership
- [x] Capability primitives
- [x] Audit history
- [x] Password authentication
- [x] Database-backed sessions
- [ ] Production migration baseline and verification
- [x] Automated typecheck/lint/build CI — GitHub Actions merged to `main`
- [ ] Tenant-isolation integration tests
- [x] Offline-first platform foundation: durable browser persistence, schema/versioning, local repository boundary, durable outbox, shared sync engine, retry/backoff, connectivity scheduling, reconciliation contract and school-workspace sync status wiring
- [ ] Offline authentication/session lifecycle policy and hardening
- [x] Personal SkulGo account registration independent of school membership
- [x] School discovery and relationship/application primitives
- [x] Universal school discovery UX with relationship-driven worker/student/parent paths
- [x] Existing personal account reused for school registration
- [x] School workspace returns to personal account through ← Account rather than role switching
- [ ] Parent/Guardian verified connection backend and school verification path

## Phase 1 — School configuration & owner control
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
- [x] School profile/configuration settings — initial slice
- [ ] Offline-capable school setup workflows where offline continuity materially helps; do not force every configuration action offline

## Phase 2 — Students, teachers & daily operations
- [x] Student records
- [x] Student enrollment
- [x] Daily attendance
- [x] Attendance history and correction workflow
- [x] Staff accounts and school membership management — initial owner-managed slice
- [x] Capability assignment UI — initial owner-managed slice
- [x] Parent/guardian records and student relationships — initial slice
- [x] Student status lifecycle
- [x] Offline-capable attendance workflow, durable sync and pull reconciliation — real-browser offline save → reload → reconnect → sync → reload verification completed
- [ ] Offline-capable student and enrollment workflows for core teacher/admin operations
- [x] Personal account → school discovery → student admission UI slice verified
- [x] Personal account → school discovery → teacher/staff application UI slice verified
- [x] Parent/Guardian relationship option + conditional UI slice verified
- [x] Register a school from the existing personal SkulGo account — implementation complete; focused browser/runtime acceptance remains.
- [ ] Verify personal account → registered school → owner setup → operational dashboard routing.
- [ ] Owner application review → approval/offer → membership creation in a real browser/runtime.
- [ ] Parent/Guardian self-service request → school verification → Guardian.userId/StudentGuardian linkage

## Phase 3 — Assessments, results & academic trust
- [x] Assessment definitions
- [x] Score capture — initial roster + per-student save slice
- [x] Score validation — school/class/session/enrollment/max-score validation
- [x] Offline-capable assessment score capture foundation — local-first mutation, central sync registry/executor, retry/backoff, authoritative acknowledgement and pull/reconciliation are implemented; browser E2E remains
- [ ] Browser end-to-end verification of assessment offline save → reload → reconnect → sync
- [ ] Assessment conflict-resolution UI
- [x] Result submission — authenticated API route + domain service implemented; runtime verification remains
- [x] Result approval — authenticated API route + domain service implemented; runtime verification remains; submitter cannot approve the same assessment result
- [x] Result publication — approved-result gate plus owner/default or owner-assigned RESULT.PUBLISH capability; deliberately online/server-authoritative; runtime verification remains
- [ ] Verify complete submit → approve → publish runtime workflow
- [x] Report cards — authenticated published-report-card API/domain boundary implemented; runtime verification remains
- [x] Academic history — authenticated published-history API/domain boundary implemented; runtime verification remains

## Phase 4 — Parent / guardian value
- [x] Guardian records + student relationships
- [x] Guardian account bootstrap/security
- [x] Guardian result authorization
- [x] Published result access boundary
- [x] Attendance absence alert — in-app
- [x] Payment confirmation alert — in-app
- [x] Result publication alert — in-app
- [x] Parent school workspace entry based on Guardian.userId
- [x] Parent child overview constrained by StudentGuardian + active Enrollment
- [ ] Verify the complete parent journey: SkulGo account → verified guardian relationship → authorized child → notification → published result → academic history
- [ ] Only add external SMS/WhatsApp/email delivery when a real V1 operating need is demonstrated; in-app communication is sufficient for the initial V1 surface

## Phase 5 — School finance
- [x] Fee structures
- [x] Student fee assignments
- [x] Invoices / obligations
- [x] Payment recording
- [x] Payment provider integration foundation — Paystack, Flutterwave and Monnify
- [x] Receipts
- [x] Balances and reconciliation
- [x] Finance audit trail
- [ ] Verify critical finance runtime paths and provider verification before production release
- [ ] Offline-capable finance capture only where it is safe; queued local records must never masquerade as confirmed payment
- [ ] Do not expand finance into a full accounting/ERP product in V1

## Phase 6 — Owner reports & operational visibility
- [x] Attendance report
- [x] Academic report
- [x] Finance report
- [x] Operational dashboards — initial V1 slice
- [x] Management summaries — initial V1 slice
- [x] Authenticated management CSV exports
- [ ] Verify that reports answer the owner's core operational questions
- [ ] Offline report access from trusted locally available data only where practical
- [ ] Do not build a large BI/analytics platform in V1

## Phase 7 — Commercial result access

The commercial layer supports a simple initial business model without turning V1 into a billing platform.

| Plan | Monthly | School share of paid result access |
|---|---:|---:|
| Free | ₦0 | 0% |
| Basic | ₦5,000 | 25% |
| Starter | ₦10,000 | 50% |
| Pro | ₦20,000 | 75% |
| Premium | ₦35,000 | 100% |
| Custom | Negotiated | 100% by default until negotiated terms exist |

Already implemented:

- [x] Centralized plan configuration
- [x] Deterministic result revenue allocation
- [x] Zero-fee normalization
- [x] School subscription + plan persistence
- [x] Result Access setting + configurable fee
- [x] Result authorization boundary
- [x] Payment attempt + school-scoped idempotency
- [x] Paystack/Flutterwave checkout initialization
- [x] Server-side provider verification
- [x] Immutable verified transaction + revenue allocation
- [x] Provider event replay/idempotency boundary
- [x] Entitlement persistence + lookup
- [x] Callback adapters with provider verification before entitlement grant

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

- [x] Automated CI for typecheck/test/build from a clean checkout
- [ ] Playwright browser/API acceptance suite
- [ ] Testcontainers-based PostgreSQL integration coverage
- [ ] CodeQL security analysis
- [ ] Dependabot dependency updates
- [ ] Tenant-isolation integration tests
- [ ] Production migration/deployment verification
- [ ] Backup and recovery procedure (managed PostgreSQL/Render)
- [ ] Sentry production error monitoring
- [ ] Uptime monitoring
- [ ] Observability and operational alerts
- [ ] Security hardening
- [ ] Performance/load testing appropriate to expected V1 scale
- [ ] Offline/online transition testing across representative workflows
- [ ] Render production deployment.
- [ ] Connect `skulgo.com` / `www.skulgo.com` to the production deployment and verify HTTPS.
- [ ] Tenant-safe onboarding/support procedure

## Conflict handling

The platform already represents `PENDING_SYNC`, `SYNCING`, `SYNCED`, `FAILED` and `CONFLICT`.

V1 only needs focused conflict handling for important workflows such as attendance and assessment scores. Do not build a generalized enterprise reconciliation console unless real operational experience demonstrates the need.

## Workspace rule

Owner, teacher, parent/guardian and student experiences are different views over the same school-scoped platform.

They share the same User identity, school records, authorization model and offline infrastructure. The workspace is derived from the person's approved/verified school relationship, not from a URL role parameter.

Capabilities and school module configuration remain the authorization boundary.

## Current V1 execution order

### Gate A — Identity & school joining

1. Personal SkulGo account creation.
2. School discovery.
3. Student admission application.
4. Teacher/staff application.
5. Owner review and acceptance/offer.
6. Membership/workspace creation after approval.
7. Parent/guardian verified relationship path.
8. Automatic dashboard routing after login.

### Gate B — Academic trust

9. Verify result submission runtime.
10. Verify result approval runtime.
11. Verify submit → approve → publish lifecycle.
12. Verify report card runtime.
13. Verify academic history runtime.

### Gate C — Offline platform release gate

14. Verify assessment browser offline lifecycle.
15. Add focused assessment conflict UI.
16. Define and implement safe offline authentication/session behavior.
17. Convert the minimum student/enrollment workflows needed for teacher/admin continuity.

### Gate D — Human value

18. Verify parent journey end-to-end.
19. Verify teacher daily workflow end-to-end.
20. Verify owner configuration, finance and reports against real operational questions.
21. Keep student-facing behavior limited to information and workflows genuinely needed in V1.

### Gate E — Production trust

22. CI.
23. Tenant-isolation integration coverage.
24. Migration verification.
25. Backups/recovery.
26. Observability.
27. Security hardening.
28. Production deployment and representative offline/online transition verification.

## Explicit V1 exclusions — do not build now

Do not expand V1 into:

- a full accounting/ERP suite;
- a large CRM;
- a general-purpose messaging/social platform;
- native mobile applications before the web workflow proves demand;
- complex timetable/transport/library/hostel systems unless a launch school has a concrete requirement;
- advanced AI agents making authoritative school decisions;
- a large BI/data warehouse platform;
- a generalized multi-domain conflict-management product;
- dozens of role-specific workflows that duplicate the same underlying records;
- role-selection URL parameters used to simulate identity;
- separate user databases for owners, teachers, students or parents.

## Domain and production boundary

`skulgo.com` is the public product domain. DNS configuration belongs to the deployment/release phase; domain ownership alone is not evidence that a production app is live. The application remains authoritative in GitHub + the production PostgreSQL environment, while the domain is the public entry point.

## V1 completion rule

### Immediate engineering sequence

```text
CURRENT: Find a school relationship UX
  ✓ worker application UI
  ✓ student admission UI
  ✓ Parent/Guardian dropdown + conditional UI

NEXT: Register a school
  → reuse existing personal SkulGo account
  → collect school information + relationship
  → create Organization + School + owner Membership
  → verify workspace routing and ← Account

THEN: Owner review / acceptance
THEN: Parent/Guardian verified connection backend
```

Call V1 complete only when:

- every person can have a proper SkulGo account;
- school relationships are established through the correct workflow;
- approved members reach the correct school workspace automatically;
- the core owner, teacher, parent/guardian and student journeys work reliably;
- the academic result lifecycle is trusted;
- offline continuity works for supported operational workflows;
- financial states remain honest;
- production safety gates are verified.

> **One person → one SkulGo account → one or more legitimate school relationships → the correct workspace.**

## Principle

> **Solve the painful daily school problems first. Build the smallest trustworthy platform that can solve them. Stop adding features when the V1 problem is solved.**
