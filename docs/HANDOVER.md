# SkulGo V1 Engineering Handover

**Date:** 18 Sep 2026
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

## Next slice — Register a school

```text
Existing personal SkulGo account
→ Register a school
→ school information + person's relationship
→ Organization + School + owner Membership
→ correct school workspace
→ ← Account returns to personal account
```

Acceptance target:
- Existing authenticated User is reused.
- No second person account is created.
- School and organization records are created in the correct tenant boundary.
- Owner membership is created correctly.
- Correct school workspace opens.
- ← Account returns to the personal account.
- Typecheck and focused browser verification pass before moving on.

## Sequence after Register a school

1. Verify owner workspace and Account routing.
2. Owner review / acceptance of applications.
3. Membership and capability creation.
4. Parent/Guardian verified connection backend.
5. Remaining V1 runtime and production gates.

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

## Handoff rule

Read README.md, docs/ROADMAP.md, docs/PRODUCT-DECISION-HISTORY.md, docs/V1-FINISH.md and ARCHITECTURE.md before making architectural changes.

> One small slice → test → document → commit → next slice.