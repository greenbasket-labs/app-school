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