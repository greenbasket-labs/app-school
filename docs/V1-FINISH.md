# SkulGo V1 Finish Plan

This document is the release checklist for V1. It is intentionally narrower than the full product roadmap.

## V1 product boundary

The V1 product is:

```text
One person
  ↓
One SkulGo personal account
  ↓
One or more legitimate school relationships
  ↓
Correct school workspace
```

A school controls the person's relationship inside its organization. The person does not self-assign an authoritative school role.

When a person leaves, the school disables that school membership. The personal SkulGo account remains available for other schools or future relationships.

## Current verification checkpoint — 18 Sep 2026

The basic engineering gate is complete.

### Domain checkpoint

- [x] `skulgo.com` purchased and registered for 1 year on 18 Sep 2026.
- [x] Total charged: $6.99 including the $0.20 ICANN fee.
- [x] Free Domain Privacy retained.
- [x] No Namecheap hosting or PremiumDNS was purchased.
- [ ] DNS configuration.
- [ ] Production deployment connected to the domain.
- [ ] HTTPS and `www` behavior verified.

The domain purchase is a production-readiness prerequisite, not completion of the deployment gate.



- [x] GitHub Actions clean-checkout verification merged to `main`.
- [x] CI install, Prisma generation and migrations.
- [x] CI typecheck.
- [x] CI tests: 16/16.
- [x] CI production build.
- [x] Local tests: 16/16.
- [x] Local production build: 28/28 static pages generated.

The remaining checklist below is intentionally focused on **runtime acceptance and production trust**.

## Ship-critical gates

### Engineering method for completing the gates

V1 is completed through narrow, verified vertical slices. Preserve working UX; do not turn one release gate into a broad redesign.

```text
Inspect evidence → define one slice → implement smallest change
→ typecheck → focused browser/runtime verification
→ document status → commit → next slice
```

UI-only work must be clearly separated from server/domain completion. Reuse existing Guardian, authorization, membership and audit infrastructure before creating new systems.

### Immediate next slice: Register a school

```text
Personal SkulGo account
→ Register a school
→ school information + relationship
→ Organization + School + owner Membership
→ correct school workspace
→ ← Account returns to personal account
```

### 1. Identity and school joining

- [ ] Personal SkulGo account can be created independently of school membership.
- [x] User can discover a school organization — UI/browser slice verified.
- [x] Student admission-request UI works from the existing relationship flow.
- [x] Teacher/staff/cashier application UI works from the existing relationship flow.
- [x] Parent/Guardian exists only as an option in the existing Requested relationship dropdown; its conditional UI works.
- [ ] Parent/Guardian backend request → school verification → Guardian/StudentGuardian linkage.
- [ ] Register a school from the existing personal SkulGo account — **NEXT SLICE**.
- [x] Join-request persistence and authenticated requester APIs exist on the implementation branch.
- [x] Owner-only pending-request list and review API exist on the implementation branch.
- [x] Approval path reuses the existing SkulGo `User` and stores the owner's authoritative relationship on `Membership`.
- [ ] School owner can review pending requests in a real browser/runtime.
- [ ] Owner determines the school relationship and grants the appropriate capabilities.
- [ ] Approval creates/activates the school membership and required relationship records.
- [x] Owner can disable/deactivate a school membership when the person leaves.
- [x] Disabled membership is excluded from active-workspace access while the personal User remains intact.
- [ ] Login routes one-school users directly to the correct workspace.
- [ ] Multiple active school relationships show a selector.
- [ ] No role-selection URL parameters are used.

### 2. Academic trust

- [x] Assessment definitions.
- [x] Score capture and validation.
- [x] Result submission service and authenticated route.
- [x] Result approval service and authenticated authorization rule.
- [x] Result publication service and authenticated authorization rule.
- [ ] Verify capture → submit → approve → publish in a real browser/runtime.
- [ ] Verify published report card access.
- [ ] Verify academic history access.

### 3. Daily teacher workflow

- [ ] Teacher can enter the correct school workspace.
- [ ] Teacher can access the students/classes they are authorized to use.
- [ ] Teacher can record attendance.
- [ ] Teacher can enter assessment scores.
- [ ] Teacher can see clear saved/pending/synced states.
- [ ] Teacher can continue supported work during temporary connectivity loss.
- [ ] Reconnection synchronizes pending work without duplicate effects.

### 4. Parent/guardian workflow

- [x] Guardian records and student relationships.
- [x] Guardian account bootstrap/security.
- [x] Parent authorization boundary.
- [x] In-app attendance/payment/result alerts.
- [ ] Verify SkulGo account → verified guardian relationship → authorized child → notification → published result → academic history.
- [ ] Verify access remains restricted to linked children and schools.

### 5. Student experience

- [ ] Student has a correct school relationship/enrollment record.
- [ ] Student can see their authorized school information.
- [ ] Student can see published academic information/history required for V1.
- [ ] No student access is inferred from a URL role parameter.

### 6. Finance

- [x] Fee structures, assignments and invoices.
- [x] Payment recording.
- [x] Receipts.
- [x] Balances/reconciliation foundation.
- [ ] Verify critical finance paths against a real school scenario.
- [ ] Confirm locally queued activity is never presented as confirmed payment.

### 7. Offline release gate

- [x] Shared durable local store.
- [x] Shared outbox and synchronization engine.
- [x] Connectivity-aware synchronization.
- [x] Attendance offline save → reload → reconnect → sync → reload verified.
- [ ] Assessment offline save → reload → reconnect → sync verified.
- [ ] Focused assessment conflict handling.
- [ ] Minimum student/enrollment offline continuity needed for teacher/admin work.
- [ ] Define and verify safe offline authentication/session behavior.

## Concrete verification scenarios

These are the minimum browser/runtime scenarios to execute before marking the corresponding V1 checks complete. They are verification work, not new product scope.

### Identity / access

```text
1. Create/login as an existing SkulGo user with no school membership.
2. Request access to a known school.
3. Login as the school owner and review the pending request.
4. Approve it with the intended school relationship/capabilities.
5. Login as the person and confirm the correct school workspace opens.
6. Disable the school membership from owner settings.
7. Confirm the school no longer appears as an active workspace.
8. Confirm the same SkulGo account can still authenticate and can later join another school.
```

### Academic lifecycle

```text
1. Open an assessment for an authorized class/subject.
2. Enter valid scores and save them.
3. Submit the result as the authorized submitter.
4. Approve it as a different authorized actor.
5. Publish it as the authorized publisher.
6. Confirm the published result/report card is visible only to authorized users.
7. Confirm academic history reflects the published result.
```

### Finance honesty

```text
1. Create or use a real student fee obligation.
2. Record a normal confirmed payment.
3. Verify receipt and balance update.
4. Exercise any queued/offline payment activity supported by the product.
5. Confirm the queued item is visibly pending and is never displayed as confirmed payment before server confirmation.
```

### Offline assessment

```text
1. Load an authorized assessment while online.
2. Enter score changes.
3. Simulate temporary connectivity loss.
4. Save and reload while offline.
5. Confirm the working state persists locally.
6. Restore connectivity.
7. Confirm the outbox syncs once without duplicate server effects.
8. Reload and confirm the authoritative server state is shown.
```

## Engineering verification toolbox

The V1 handover uses the following tool plan:

| Tool | Timing | Handover expectation |
|---|---|---|
| Playwright | Now | Browser E2E for identity, academic lifecycle, parent access and critical runtime/API checks |
| Testcontainers | Now | Real PostgreSQL integration tests, especially tenant-isolation and authorization invariants |
| CodeQL | Now | GitHub security scanning for the application code |
| Dependabot | Now | Dependency vulnerability/update visibility |
| Sentry | Soon | Production runtime error capture |
| Managed PostgreSQL/Render backups | Before launch | Backup/recovery evidence |
| Better Uptime / UptimeRobot | Before launch | Availability monitoring |
| k6 | Later | Representative load/performance testing |
| OpenTelemetry | Later | Add when operational complexity warrants deeper tracing |

### Tooling rule for handoff

A new developer or AI should first inspect the existing scripts/workflows before adding another tool. Prefer one shared mechanism for each concern, keep the modular-monolith architecture intact, and do not add infrastructure whose operational value has not been demonstrated.

## Production release gates

These are required to release V1 but are not new product features:

- [x] CI: install, typecheck, test and build from a clean checkout — merged to `main`
- [ ] Tenant-isolation integration tests.
- [ ] Production migration verification.
- [ ] Backup and recovery procedure.
- [ ] Observability and operational alerts.
- [ ] Security hardening review.
- [ ] Representative performance/load test.
- [ ] Offline/online transition test on production-like deployment.
- [ ] Render production deployment.
- [ ] Connect `skulgo.com` and `www.skulgo.com` to production and verify HTTPS.
- [ ] Tenant-safe onboarding and support procedure.

## Domain / deployment acceptance

Before public release:

```text
GitHub main
→ production build/deploy
→ production PostgreSQL
→ DNS: skulgo.com
→ HTTPS
→ login / signup
→ school workspace
→ core V1 flows
```

The domain is the public entry point only. Academic, identity, authorization and payment truth continue to come from the application and PostgreSQL source of truth.

## Final end-to-end acceptance

A V1 release candidate must demonstrate this real-school journey:

```text
Owner registers school
→ configures school
→ manages access
→ person creates SkulGo account
→ person requests to join
→ owner approves relationship
→ membership/capabilities are created
→ correct workspace opens
→ teacher works with students
→ attendance
→ scores
→ submit
→ approve
→ publish
→ parent receives notification
→ parent views authorized child result/history
→ finance records remain accurate
→ reports answer core operational questions
→ supported workflow works offline
→ reconnect and sync complete safely
```

## Explicitly deferred

Do not add these before V1 release unless a concrete launch requirement makes one unavoidable:

- SkulGo CV/profile generation.
- Public professional profiles.
- Ratings, endorsements, recommendations or experience scoring.
- Social networking or general-purpose chat.
- Full accounting/ERP.
- CRM.
- Timetable, transport, library or hostel systems.
- Native mobile applications.
- Advanced AI making authoritative school decisions.
- Large BI/data warehouse infrastructure.
- General-purpose conflict/reconciliation consoles.
- Large collections of duplicated role-specific workflows.

## Completion rule

### Current sequence

```text
1. Register a school from existing personal account
2. Verify owner workspace + ← Account routing
3. Owner review/acceptance
4. Membership + capabilities
5. Parent/Guardian verified connection backend
6. Remaining V1 runtime and production gates
```

V1 is complete when the core owner, teacher, parent/guardian and student journeys are reliable, the academic lifecycle is trusted, supported offline workflows are reliable, financial states remain honest, school tenancy and access controls are protected, and production release gates are verified.

> **Do not keep building because the roadmap has more boxes. Ship when the V1 problem is solved.**
