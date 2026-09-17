# App-School V1 Roadmap

## V1 goal

App-School V1 is not intended to contain every feature a school could ever need. It is the smallest reliable school operating platform that solves the core daily pains of four groups:

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

Anything that does not materially support these workflows or protect the platform's correctness, security, tenancy or recoverability should remain outside V1.

## Cross-cutting requirement — offline-first

**Offline-first is a core App-School requirement, not a module-specific enhancement.** The application should remain operational during temporary connectivity loss for supported workflows and data already available on the device.

```text
ONLINE
UI → local durable data → sync engine → server → PostgreSQL → audit
       ↓ immediate work

OFFLINE
UI → local durable data → durable outbox / pending change
       ↓ immediate work

CONNECTION RETURNS
pending changes → sync → server authorization/validation → persistence/audit → acknowledgement
server pull → reconciliation → authoritative local working copy / conflict
```

The offline architecture is shared. Modules do not create separate offline databases or synchronization engines.

## V1 finish line

V1 is complete when these conditions are true:

1. A school can configure and operate its core academic structure.
2. The owner can manage staff access, school settings, modules and important school information.
3. Teachers can manage students, attendance and assessment scores with clear saved/sync states.
4. Parents/guardians can securely access the student's published school information and receive important notifications.
5. Students have correct enrollment and academic records inside the school boundary.
6. Results can move through the controlled lifecycle: capture → submit → approve → publish.
7. Core attendance/academic data survives temporary connectivity loss where the device has the required working data, with automatic synchronization when online.
8. Finance records are correct and never falsely presented as server-confirmed when they are only locally queued.
9. Management has useful operational reports and exports without requiring a large analytics platform.
10. School tenancy, capabilities, important invariants, audit history and recoverability are protected.
11. The application can be deployed and operated with verified migrations, backups, observability, security and recovery procedures.

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
- [x] Offline-first platform foundation: durable browser persistence, schema/versioning, local repository boundary, durable outbox, shared sync engine, retry/backoff, connectivity scheduling, reconciliation contract and school-workspace sync status wiring
- [ ] Offline authentication/session lifecycle policy and hardening

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

## Phase 2 — Identity, joining & daily operations

### SkulGo identity model

- [x] School registers as an organization and creates the initial owner account
- [ ] Personal account registration for teachers, staff, students and guardians
- [ ] Authenticated school search by school name
- [ ] Student admission application from personal account
- [ ] Teacher/staff job application from personal account
- [ ] Owner application review and decision workflow
- [ ] Accepted student application creates/links the student's school identity and enrollment
- [ ] Accepted staff application creates/activates school membership
- [ ] Staff workspace assignment is explicit; capabilities remain the authorization boundary
- [ ] Login resolves the authenticated person to the correct active school/workspace automatically
- [ ] No role-picker query parameter and no generic "switch role" flow

### School operations

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

## Phase 3 — Assessments, results & academic trust
- [x] Assessment definitions
- [x] Score capture — initial roster + per-student save slice
- [x] Score validation — school/class/session/enrollment/max-score validation
- [x] Offline-capable assessment score capture foundation — local-first mutation, central sync registry/executor, retry/backoff, authoritative acknowledgement and pull/reconciliation are implemented
- [ ] Browser end-to-end verification of assessment offline save → reload → reconnect → sync
- [ ] Assessment conflict-resolution UI
- [ ] Result submission — authenticated API route + domain service implemented; runtime/CI verification required
- [ ] Result approval — authenticated API route + domain service implemented; runtime/CI verification required; submitter cannot approve the same assessment result
- [x] Result publication — approved-result gate plus owner/default or owner-assigned `RESULT.PUBLISH` capability; deliberately online/server-authoritative
- [ ] Verify complete submit → approve → publish runtime workflow
- [ ] Report cards — authenticated published-report-card API/domain boundary implemented; runtime verification required
- [ ] Academic history — authenticated published-history API/domain boundary implemented; runtime verification required

## Phase 4 — Parent / guardian value
- [x] Guardian records + student relationships
- [x] Guardian account bootstrap/security
- [x] Guardian result authorization
- [x] Published result access boundary
- [x] Attendance absence alert — in-app
- [x] Payment confirmation alert — in-app
- [x] Result publication alert — in-app
- [ ] Verify the complete parent journey: account → authorized child → notification → published result → academic history
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
- [ ] Verify that the reports answer the owner's core operational questions
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

- [ ] Automated CI for typecheck/lint/test/build
- [ ] Tenant-isolation integration tests
- [ ] Production migration/deployment verification
- [ ] Backup and recovery procedure
- [ ] Observability and operational alerts
- [ ] Security hardening
- [ ] Performance/load testing appropriate to expected V1 scale
- [ ] Offline/online transition testing across representative workflows
- [ ] Render production deployment
- [ ] Tenant-safe onboarding/support procedure

## Conflict handling

The platform already represents `PENDING_SYNC`, `SYNCING`, `SYNCED`, `FAILED` and `CONFLICT`.

V1 only needs focused conflict handling for important workflows such as attendance and assessment scores. Do not build a generalized enterprise reconciliation console unless real operational experience demonstrates the need.

Minimum V1 behavior:

```text
local edit + server changed
        ↓
      CONFLICT
        ↓
show both local and server values
        ↓
user chooses / retries / reloads according to domain rule
```

## Role/workspace rule

Owner, teacher, parent/guardian and student experiences are different views over the same school-scoped platform. They must not create separate databases, duplicate domain rules or separate offline engines.

The platform identifies the user's school relationship and assigned workspace after authentication. `Membership.isOwner` identifies the owner relationship; guardian and student identity links identify portal users; staff workspace assignment determines the staff-facing dashboard. Capabilities and school module configuration remain the authorization boundary.

## Dashboard rule

Every authenticated person should land directly in the workspace appropriate to the active school relationship:

```text
/login
  ↓
/authenticated user
  ↓
/app
  ↓
active school relationship
  ↓
assigned workspace
  ↓
/dashboard
```

There is no role picker, no `?role=teacher`, and no generic role-switching control in the V1 product. A multi-school user may choose a school when more than one active relationship exists; that is school selection, not role selection.

The dashboard is a core platform surface and must not require the Reports module to be enabled. Individual cards, metrics and actions remain capability/module-aware.

## Current V1 execution order

### Gate A — Product entry and identity

1. Make the dashboard a core surface independent of Reports.
2. Implement personal-account registration.
3. Implement authenticated school search.
4. Implement student admission application and owner decision flow.
5. Implement teacher/staff application and owner offer/acceptance flow.
6. Resolve accepted relationships into the correct school/workspace dashboard automatically.

### Gate B — Academic trust

7. Verify result submission runtime.
8. Verify result approval runtime.
9. Verify submit → approve → publish lifecycle.
10. Verify report card runtime.
11. Verify academic history runtime.

### Gate C — Offline platform release gate

12. Verify assessment browser offline lifecycle.
13. Add focused assessment conflict UI.
14. Define and implement safe offline authentication/session behavior.
15. Convert the minimum student/enrollment workflows needed for teacher/admin continuity.

### Gate D — Human value

16. Verify the parent journey end-to-end.
17. Verify teacher daily workflow end-to-end.
18. Verify owner configuration, finance and reports against real operational questions.
19. Keep student-facing behavior limited to information and workflows genuinely needed in V1.

### Gate E — Production trust

20. CI.
21. Tenant-isolation integration coverage.
22. Migration verification.
23. Backups/recovery.
24. Observability.
25. Security hardening.
26. Production deployment and representative offline/online transition verification.

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
- dozens of role-specific workflows that duplicate the same underlying records.

## V1 completion rule

Call V1 complete only when the core owner, teacher, parent/guardian and student journeys work reliably, the academic result lifecycle is trusted, offline continuity works for the supported operational workflows, financial states remain honest, and production safety gates are verified.

The principle is simple:

> **Solve the painful daily school problems first. Build the smallest trustworthy platform that can solve them. Stop adding features when the V1 problem is solved.**
