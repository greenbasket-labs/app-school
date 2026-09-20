# SkulGo V1 Engineering Handover

**Date:** 19 Sep 2026
**Product:** SkulGo / App-School
**Company:** GREEN BASKET GLOBAL LIMITED

## Current position

The Find a school relationship UX has been completed as a small vertical slice while preserving the existing page. Teacher/Staff/Cashier use the existing application flow. Student uses the existing admission flow. Parent / Guardian was added only to the existing Requested relationship dropdown and its UI appears only when selected.

Parent / Guardian is intentionally not connected to the generic worker join-request POST yet. The repository already has Guardian, StudentGuardian, guardian account verification and parent access infrastructure; the eventual backend must reuse those boundaries.

## Engineering method

```text
Inspect existing implementation
→ define ONE narrow slice
→ preserve working UX and architecture
→ implement smallest useful change
→ typecheck + focused browser/runtime verification
→ document actual status
→ commit
→ next slice
```

Rules:
- Do not redesign a working screen while adding a new flow unless a product decision requires it.
- Build one relationship/workflow at a time.
- Inspect and reuse existing models, services, authorization and audit infrastructure before creating new systems.
- Clearly distinguish UI-only work from completed backend/domain behavior.
- Use evidence from tests and runtime behavior.
- Document and commit a slice before moving to the next dependent slice.

## Current next slice — Personal account → school → role workspace

Register-a-school implementation exists and reuses the existing authenticated personal SkulGo account. The next verification slice is the complete school-entry experience.

```text
Personal SkulGo account
→ Your schools
→ School + approved relationship
→ Open school
→ Correct operational dashboard
```

### Confirmed role destinations

- Owner / Admin → Owner operational dashboard.
- Teacher → Teacher dashboard.
- Cashier / Accountant → Cashier dashboard.
- Parent / Guardian → Parent dashboard.
- Student → Student dashboard.
- Principal / Headmaster → owner-assigned role; a person may first join through the teacher/staff path, then receive Principal.
- Staff → dashboard to be defined from a concrete product sample.

The same SkulGo account and school membership remain in place when the school owner changes a person's role. The dashboard changes because the authorized role/capabilities change.

### Owner setup state

While a newly registered school still requires setup, the owner's personal account may show **Continue setup**. After required setup is complete, that temporary setup entry should no longer be shown as the primary school entry. The owner then uses the same **Open school** path as other connected users.

The setup page is for school administration/configuration; it is not the permanent owner operational dashboard.

### Find a school vs Applications

Find a school establishes a relationship. The school handles incoming requests in **Applications**.

- Teacher / Staff / Cashier → application.
- Student → admission request.
- Parent / Guardian → verified student connection.
- Existing active relationships must not be offered inappropriate duplicate relationships for the same school.

The backend, not UI labels or role query parameters, remains authoritative.

## Sequence after this slice

1. Verify personal account → school → correct role dashboard routing.
2. Verify owner setup state and ← Account routing.
3. Verify owner review/acceptance in Applications.
4. Verify membership + capabilities, including owner-assigned Principal/Headmaster.
5. Implement Parent/Guardian verified connection backend using existing Guardian/StudentGuardian infrastructure.
6. Continue remaining V1 runtime and production gates.

## Important boundaries

- One personal SkulGo account can have multiple legitimate school relationships.
- School-owned data is scoped by schoolId.
- PostgreSQL remains the authoritative server source of truth.
- Offline local state is not server confirmation until synchronized and acknowledged.
- Module enablement and staff capabilities remain separate.
- Do not introduce role-switching URL parameters as an identity mechanism.
- Do not create a parallel parent system.

## Known test/tooling state

- Typecheck passes.
- Identity E2E passes.
- School-access E2E passes.
- School-setup E2E remains a known failing tooling/test-state item; it is intentionally left for later rather than changing working product behavior to satisfy it.

## Dashboard reference samples

The current GB School demo is the reference source for the five already-defined operational dashboards: Owner/Admin, Teacher, Cashier/Accountant, Parent and Student. Preserve their role-specific information hierarchy when implementing SkulGo. Do not copy the demo's `?role=` routing as an authorization mechanism.

## Handoff rule

Read README.md, docs/ROADMAP.md, docs/PRODUCT-DECISION-HISTORY.md, docs/V1-FINISH.md and ARCHITECTURE.md before making architectural changes.

> One small slice → test → document → commit → next slice.

---

## Authoritative handover update — 20 Sep 2026

This section supersedes the older dated handover status where it conflicts.

### Verified checkpoint

- Permanent school person identity: implemented and committed locally as 27466a1.
- npm test: 11 test files / 25 tests passed.
- npm run typecheck: passed.
- Prisma: 32 migrations; database schema up to date.
- Permanent identity has both unit coverage and a real PostgreSQL registration integration test.

### Identity model

Every person keeps a platform User identity. A school relationship can also carry a permanent human-readable school person identifier:

    SCHOOL PREFIX / YEAR / CATEGORY / RANDOM UNIQUE CODE

Examples:

    AHA/2026/AC/K7M4Q9
    AHA/2026/N/P4X8QM

The prefix comes from the school name. AC means academic/teaching; N means non-academic staff/cashier. Do not encode detailed job titles or sequential counters.

The internal UUID remains authoritative for database relationships. The human-readable identifier is for stable school-facing identity and history.

### Owner/Admin operating model

Owner/Admin is the current build phase.

Owner:
- configures the school;
- establishes rules and access;
- monitors operational work;
- reviews reports/history.

Existing staff/teachers:
- perform the daily operational work allowed by their existing capabilities.

The Owner dashboard should observe the resulting authoritative records rather than forcing the owner to perform staff work.

### Settings vs Operations

Settings/Setup is the control plane:

- academic sessions/terms
- class structure
- subjects
- fee structures
- assessment definitions
- staff/access
- parent access
- modules
- other school configuration

Operations is the daily working plane:

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

A domain may share services between the two planes. Do not duplicate backend logic just to separate the UI.

### Verified Owner slices

- Dashboard: read-only operational summary.
- Classes: real ClassLevel → ClassArm → Enrollment → Student data; no fabricated class-teacher relation.
- Attendance report: real school-scoped report.
- Results: operational workflow separated from assessment-definition setup.
- Finance: operational reconciliation/overview separated from finance configuration.
- Communication: in-app notice sending verified.
- School Settings/Setup: established as the configuration/control surface.

### Current queue

Finish Owner/Admin first. Follow the existing queue; do not invent a different order.

Remaining dedicated Owner slices include:

- Staff & Teachers
- Parents
- Applications
- Users & Roles
- Audit History
- any remaining stale navigation destinations

After Owner/Admin is complete, begin full user journeys from personal sign-in through completion:

    Teacher/Staff
    application → approval → capabilities → workspace → daily work

    Student
    admission → review → approval → Student + Enrollment → workspace

    Parent/Guardian
    verified relationship → parent workspace → authorized child visibility

    Cashier/Accountant
    existing relationship → capabilities → workspace → daily finance work

### Important rule about the queue

If implementation reveals a dependency that should be done earlier, suggest the queue change explicitly. Do not silently jump to a different feature.

### Current working-tree discipline

The local working tree contains other previously developed Owner work and inspection artifacts that were intentionally kept separate from the permanent identity commit. Review each logical slice before staging. Never use git add . blindly for a checkpoint.

### Developer workflow

    Inspect reference
        ↓
    Inspect current App-School
        ↓
    Select one small slice
        ↓
    Reuse existing domain/backend
        ↓
    Implement
        ↓
    Typecheck + tests
        ↓
    Browser/runtime verification
        ↓
    Update roadmap/handover
        ↓
    Commit
        ↓
    Next slice

One small slice at a time is now the standard development method.
