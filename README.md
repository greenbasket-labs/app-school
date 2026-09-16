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
Pending changes → Sync → Server validation/authorization
               → persist + audit → acknowledgement
```

### Application-wide offline-first rules

- Offline-first applies to the whole application, not only attendance or assessments.
- Operational screens should read from a local durable working set when the needed data is available on the device.
- Important writes should be saved locally first and survive refresh, browser restart and temporary loss of connectivity.
- Pending changes must have an explicit synchronization state; **local save is not the same as server confirmation**.
- Sync retries must be idempotent and must not create duplicate records or duplicate side effects.
- Failed synchronization must preserve pending work for retry or resolution.
- Conflicts involving important school records must be detected and handled according to domain rules; silent overwrites are not acceptable without an explicit product decision.
- Offline data and queued operations must respect school tenancy and capability boundaries.
- Server authorization, important validation, approvals/publication and audit remain authoritative when a queued operation reaches the server.
- Actions that inherently require current server authority may remain online-only, but this must be deliberate and documented rather than an accidental network dependency.
- Modules must reuse the shared offline/local-data/outbox/sync architecture rather than implementing unrelated offline mechanisms.

## Offline implementation checkpoint

The shared offline platform foundation is being built incrementally. The repository currently contains:

- versioned IndexedDB local persistence;
- shared school-scoped local repository primitives;
- durable outbox persistence;
- shared synchronization lifecycle states;
- executor-based pending-operation sync engine;
- connectivity/reconnect scheduling primitives;
- an initial authoritative pull/reconciliation contract using server versions and explicit `APPLY`, `CONFLICT` and `IGNORE` classification;
- a common sync-status model for application-wide UI semantics;
- assessment score local-first mutation and an idempotent server-save boundary as the first reference-workflow foundation.

These pieces are **platform foundations, not a claim that App-School is already fully offline-ready**. The remaining work includes real authenticated executor wiring, live pull/reconciliation endpoints, browser persistence/reconnect tests, visible sync UI, offline authentication/session handling, and complete end-to-end adoption by each operational module.

The canonical offline implementation contract is `docs/OFFLINE-FIRST-HANDOFF.md`.

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
18. **Offline platform foundation** — shared local persistence, outbox, sync lifecycle, scheduler, reconciliation contract, status model and assessment-score idempotency boundary.
19. **Commercial plan foundation** — centralized Free/Basic/Starter/Pro/Premium/Custom pricing and deterministic result-access revenue allocation.
20. **Commercial persistence foundation** — database-backed school subscription and Result Access configuration; new schools initialize to Free/disabled defaults, existing schools are safely materialized on first access, and owner changes are audited.
21. **Guardian account security foundation** — school-captured Guardian records can bootstrap a linked User through a single-use invitation; the account receives a temporary password, first-login password change is mandatory, email verification is established through the invitation factor, and phone verification has an explicit durable token/state boundary.
22. **Result lifecycle API foundation** — result submission and approval now have authenticated, school-scoped API boundaries using `RESULT.SUBMIT` and `RESULT.APPROVE`; approval remains server-authoritative and the domain prevents the submitting user from approving the same assessment result. Publication remains separately protected by `RESULT.PUBLISH` and its approved-result gate. End-to-end runtime/CI verification remains pending.

## Academic result lifecycle

The academic workflow is deliberately stateful:

```text
Score capture
    ↓
Validation
    ↓
Submission — RESULT.SUBMIT
    ↓
Approval — RESULT.APPROVE
    ↓
Publication — RESULT.PUBLISH
    ↓
Parent/guardian access to the published result
```

Submission and approval are authenticated server operations and important transitions are audited. The same user cannot approve an assessment result they submitted. Publication remains online/server-authoritative; the school owner can publish through ownership authority, while staff require the owner-assigned `RESULT.PUBLISH` capability.

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

## Commercial model

App-School now has a centralized starting commercial configuration and persisted school-level commercial state, while the live billing/transaction system remains incremental.

### School plans

| Plan | Monthly price | School share of paid result access |
|---|---:|---:|
| Free | ₦0 | 0% |
| Basic | ₦5,000 | 25% |
| Starter | ₦10,000 | 50% |
| Pro | ₦20,000 | 75% |
| Premium | ₦35,000 | 100% |
| Custom | Negotiated | 100% by default until negotiated terms are configured |

These are starting commercial values. They are centralized in `src/domain/commercial/plans.ts` and must not be hard-coded across the UI or payment flows.

### Result Access

A school may choose to make official published results free or charge a configurable amount. The result fee is not fixed at ₦200.

The current persistence boundary stores one Result Access policy per school. New schools start with access disabled and a ₦0 fee. Only the school owner can change the setting, and changes produce audit evidence.

When paid result access is implemented, the transaction will snapshot the active plan and actual monetary split so later plan changes cannot rewrite history.

Payment does not bypass result authorization: the user must independently be authorized to the student's published result before an entitlement can be used.

### Commercial boundaries

School fees/payment records remain school-finance records. App-School subscriptions, result-access transactions, revenue allocation, provider fees, refunds and school settlements will be maintained as a separate commercial bounded context while reusing existing payment-provider infrastructure where appropriate.

The implementation contract is `docs/COMMERCIAL-BILLING-HANDOFF.md`.

## Roadmap and handoff

The implementation roadmap lives in `docs/ROADMAP.md`. Offline-specific runtime contracts and takeover rules live in `docs/OFFLINE-FIRST-HANDOFF.md`. Commercial billing and result-access rules live in `docs/COMMERCIAL-BILLING-HANDOFF.md`. Guardian account and contact-verification rules live in `docs/GUARDIAN-ACCOUNT-SECURITY.md`.

**Takeover rule:** a developer or AI joining the repository should be able to read the product boundary, architecture, roadmap, product decisions, offline handoff, commercial handoff and guardian-account security boundary and continue from the current repository state without reconstructing decisions from chat history.

At each slice, keep code and documentation synchronized. Never mark a roadmap item complete solely because a design contract exists; completion requires implemented and verified runtime behavior.
