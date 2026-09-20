# App-School — Product Decision & History

**Product:** App-School  
**Company:** GREEN BASKET GLOBAL LIMITED  
**Purpose:** Preserve the product questions, decisions and reasoning established before and during the first implementation so future developers, technical collaborators and investors understand what App-School is meant to become.

> This document is a reconstructed decision record from the product direction established for App-School. It is intentionally focused on durable decisions, not a transcript of every earlier conversation.

---

## 0. Product domain acquisition

### Decision
**`skulgo.com` is the public product domain for SkulGo.**

The domain was registered through Namecheap on **18 Sep 2026** for one year at a total charge of **$6.99** ($6.79 registration + $0.20 ICANN fee). Free Domain Privacy was retained. No Namecheap hosting or PremiumDNS was purchased.

### Architectural meaning

The domain is a public addressing layer, not the application itself:

```text
skulgo.com
   ↓
DNS
   ↓
SkulGo production deployment
   ↓
Next.js application
   ↓
PostgreSQL source of truth
```

DNS, HTTPS and production deployment remain release work and must not be treated as complete merely because the domain has been registered.

---

## 1. What are we actually building?

### Question
Are we building a custom school-management system for one school, or a product that can serve many schools?

### Decision
**App-School is one universal school application for many schools.**

Every school uses the same product and configures its own school inside it.

The application is therefore a **multi-tenant school operating platform**, not a collection of individually built school websites or databases.

### Why
The business should compound from one codebase. Improvements made for one school should be capable of becoming improvements available to many schools.

---

## 2. What happens when we visit a new school?

### Question
When GREEN BASKET GLOBAL LIMITED approaches a school, do we build a new system for that school?

### Decision
**No. We introduce App-School.**

The school gets its own tenant/workspace and configures the platform for its operations.

The sales model is therefore product-led rather than custom-development-led:

```text
GREEN BASKET
     ↓
Introduce App-School
     ↓
School gets its own workspace
     ↓
School configures its environment
     ↓
School enables required modules
     ↓
School creates staff/access
     ↓
School operates on App-School
```

---

## 3. What if a school requests a feature App-School does not have?

### Question
Should we build a one-off feature only for that customer?

### Decision
**Do not create one-off application forks by default.**

If the requested capability is useful to other schools, build it as an **App-School module**.

```text
School requests capability
          ↓
Evaluate product usefulness
          ↓
If broadly useful
          ↓
Build one App-School module
          ↓
Add it to the module catalog
          ↓
Any school can enable it
```

A customer request can therefore improve the core product instead of creating permanent custom-development debt.

---

## 4. How do modules work?

### Question
Where should new capabilities appear?

### Decision
**Modules are controlled from Settings.**

The platform has a central module catalog and a school-specific enabled/disabled state.

Current modules:

- Academics
- Students
- Attendance
- Assessments & Results
- Fees & Finance
- Communication
- Reports

Future capabilities should follow the same model rather than creating unrelated configuration systems.

### Critical rule
**Only the school owner can enable or disable modules.**

A staff member cannot activate a module merely because they have operational access to another area.

---

## 5. Who can see Settings?

### Question
Should every teacher/staff member have access to the school Settings area?

### Decision
**Settings is an owner control surface. The school owner is the person who sees and controls the Settings area in the school dashboard.**

Settings contains school-level configuration such as:

- School profile
- Academic setup
- Staff/access administration
- Module configuration
- Future school configuration controls

This is not just a visual convention. Server-side authorization must protect Settings and its write operations.

### Product principle

```text
Staff operate the school.
Owner controls the school.
```

Operational capabilities can be delegated to staff, but ownership-level configuration remains protected.

---

## 5A. Personal account is the clean school doorway

### Decision

The personal SkulGo account is the central doorway to all legitimate school relationships.

```text
Personal SkulGo account
        ↓
Your schools
        ↓
School + relationship
        ↓
Open school
        ↓
Authorized role workspace
```

Owner, Principal/Headmaster, Teacher, Cashier, Staff, Student and Parent/Guardian do not need separate person identities. A person may have multiple legitimate school relationships, and the same personal account remains stable across them.

The public visitor page is intentionally minimal:

> **SkulGo — Transparent and Secure Records**

with only **Sign in** and **Register**. School-specific registration language belongs after entering the personal account.

### Decision

The school workspace is the operational environment. The previous demo concept of **Switch role** is replaced by **← Account**. Role query parameters are not an identity or authorization mechanism.

### Owner setup

A newly registered owner may temporarily see a school setup/continuation entry while required school configuration is incomplete. After setup is complete, the school is presented like the owner's other connected school relationship, with **Open school** leading to the operational owner dashboard.

The setup/backend page remains a configuration surface rather than the permanent operational dashboard.

## 5B. Role assignment and dashboard routing

The confirmed role model is:

| Relationship / role | Workspace |
|---|---|
| Owner / Admin | Owner operational dashboard |
| Principal / Headmaster | Principal dashboard |
| Teacher | Teacher dashboard |
| Cashier / Accountant | Cashier dashboard |
| Staff | Staff dashboard |
| Student | Student dashboard |
| Parent / Guardian | Parent dashboard |

A Principal/Headmaster does not require a separate identity-creation flow. A person may first join through the teacher/staff path. The school owner can later assign Principal/Headmaster through Users & Roles. The same SkulGo account and school membership remain; the authorized workspace changes with the role/capabilities.

The five currently supplied GB School demo dashboards—Owner/Admin, Teacher, Cashier/Accountant, Parent and Student—are reference designs. Principal and Staff dashboards should be defined only when concrete product requirements/samples are available.

## 5C. Find a school versus Applications

### Decision

**Find a school** is for establishing a legitimate school relationship.

- Teacher / Staff / Cashier → application/request.
- Student → admission request.
- Parent / Guardian → verified student connection.
- Existing active school relationships must not be offered inappropriate duplicate relationships for the same school.

The school-side **Applications** area is where authorized school management reviews incoming requests. The backend must enforce relationship and capability rules even when the UI hides an option.

## 6. Is module enablement the same as staff permission?

### Question
If a school enables Attendance, should every staff member automatically be able to use it?

### Decision
**No. These are separate controls.**

There are two different questions:

1. Is the module enabled for this school?
2. Does this user have the capability required for this operation?

Therefore:

```text
Module enabled
      AND
User has capability
      AND
User belongs to school
      ↓
Operation allowed
```

This separation allows a school to enable a module while controlling exactly which staff can view, create, edit, approve or manage its records.

---

## 7. What does multi-tenancy mean for App-School?

### Decision
Every school-owned record must be provably scoped to the correct `schoolId`.

The security chain is:

```text
Authenticated session
        ↓
Active membership
        ↓
School context
        ↓
Capability
        ↓
Resource belongs to school
        ↓
Operation
        ↓
Audit where appropriate
```

A user must never be able to access another school's records by changing an ID in a URL or request body.

Offline local data must follow the same tenant boundary: a device may keep only the authorized school working set, and queued operations must remain tied to that school context.

---

## 8. What are the identity boundaries?

### Decision
The foundation uses four internal identities:

1. `userId` — the human account
2. `organizationId` — the Green Basket customer organization
3. `schoolId` — the school/tenant
4. `membershipId` — the user's relationship to the school/organization

Other values such as CAC information and `createdAt` are attributes/evidence, not additional identity layers.

### Why
Keeping these concepts separate prevents future problems when one person owns multiple schools, an organization has multiple schools, or staff belong to different school contexts.

---

## 8A. What is the user's entry point to school relationships?

### Decision
**Every person starts from a personal SkulGo account.** The account exists independently of any school relationship.

The personal account is the stable identity when a person joins a school, registers a school, changes schools, or has multiple legitimate school relationships.

The universal school-discovery flow is:

```text
Personal account
      ↓
Find a school
      ↓
Choose the correct relationship flow
      ├── worker → join request
      ├── student → admission request
      └── parent/guardian → verified student connection
```

School registration follows the same identity boundary: an already-authenticated person reuses their personal SkulGo account and supplies school information plus their relationship to that school. It does not create a second person identity.

### Navigation decision

A connected user enters a school workspace from the personal account. The school workspace uses **← Account** to return to the personal account page. A role-switching URL is not an identity mechanism and must not be used to simulate a different user or role.

These changes simplify the existing identity model; they do not introduce separate databases or role-specific identities.

---

## 8B. Engineering method — preserve, slice, verify, document

### Decision
App-School is developed through small verified vertical slices.

For each slice:
1. Inspect the current code, schema, APIs and working UX.
2. Define one narrow product change.
3. Preserve working behavior and existing architectural boundaries.
4. Implement only that slice.
5. Run typecheck and focused runtime/browser verification.
6. Record what is complete, UI-only, blocked or intentionally deferred.
7. Update roadmap, README and decision history, then commit.
8. Move to the next dependent slice.

The latest application of this method is the Find a school relationship UX: Parent/Guardian was added only to the existing Requested relationship dropdown. The parent UI appears only when selected. Its backend is intentionally not connected to the generic worker join-request endpoint yet.

**Current execution slice: Student admissions end-to-end.** The Owner/Admin operational dashboard, Students admission-request surface, admission schema/service/APIs, review page and transactional approval flow are implemented and typechecked. Applicant/parent submission, edit/reject UI and real-browser end-to-end verification remain tracked in the roadmap.

## 8C. Student admission workflow boundary

### Decision
Student admissions is part of the Students domain for the current V1 product. It uses a school-scoped AdmissionApplication record rather than creating a second student identity or bypassing the existing Student/Enrollment records.

The intended lifecycle is:

```text
Personal SkulGo account
      ↓
Admission application
      ↓
School review
      ↓
Approval
      ↓
Student + Enrollment
```

The application supports explicit lifecycle states: PENDING, UNDER_REVIEW, APPROVED, REJECTED and WITHDRAWN.

### Approval rule

Approval is performed through the domain service and transactionally creates the official Student and Enrollment before marking the application APPROVED. The current flow requires the school to provide the admission number. The UI must not duplicate Student/Enrollment creation logic.

### Current implementation checkpoint — 19 Sep 2026

Implemented:

- AdmissionApplication schema and Prisma migration.
- Admission domain service and lifecycle validation.
- School-scoped admission list/detail/update/status/approval APIs.
- Students page pending/under-review admission request surface.
- Owner/Admin review page.
- Approval page/form and transactional Student + Enrollment creation.
- Audit events for admission creation and meaningful state changes.
- Typecheck verification after the slice.

Not yet complete:

- Applicant/parent submission UI and runtime verification.
- Edit application UI.
- Rejection/withdrawal UI.
- Full browser acceptance of submit → review → approve → student enrollment.
- Retirement/demotion of the legacy manual student creation path after admissions is proven.

This checkpoint does not claim end-to-end admission completion until the remaining runtime workflow is verified.

---

## 9. Who owns the school's data?## 9. Who owns the school's data?

### Decision
School operational records belong to the **School tenant**.

The platform User is the human identity. The Organization represents the customer organization. The School is the operational tenant.

School profile information must not be confused with the organization's CAC identity.

---

## 10. What happens when a module is disabled?

### Decision
Disabling a module changes availability; **it does not delete historical records**.

```text
Module OFF
   ↓
Operational surface unavailable
   ↓
Historical records preserved
```

Re-enabling the module can restore its operational surface without reconstructing lost history.

---

## 11. How should App-School grow?

### Decision
Grow through **reusable modules**, not separate school-specific applications.

A simplified product evolution is:

```text
Core platform
     +
Reusable modules
     +
School configuration
     +
Staff capabilities
     +
Audit/history
     +
Offline-first platform
     ↓
Many schools on one product
```

The long-term advantage is that the same platform becomes more valuable as the module catalog grows.

---

## 12. Can we eventually have subscription tiers?

### Question
Can different schools pay for different levels of App-School?

### Decision
**Yes, but subscription tiers are deliberately deferred until the core product and module model are mature.**

Possible future structure:

- Starter
- Standard
- Professional
- Enterprise

The exact names, pricing and module allocation are not frozen yet.

### Architectural implication
Do not hard-code today's modules around subscription tiers. Keep module definitions and school enablement separate so that a future subscription layer can determine which modules/features are available to a school.

Future relationship can become:

```text
Module
   ↓
Tier availability
   ↓
School subscription
   ↓
School module enablement
   ↓
Staff capability
```

This is a future commercial layer, not a reason to overbuild the current application.

---

## 13. Why build the product incrementally?

### Decision
Build small, complete vertical slices instead of attempting the entire school system at once.

Each slice should establish a real piece of the product and its boundaries before the next dependent feature is built.

Examples already established include:

- Identity
- Authentication
- Authorization
- School setup
- Module configuration/enforcement
- Academic session lifecycle
- Students
- Enrollment
- Attendance
- Attendance history/correction
- Guardians
- Student status lifecycle
- Assessment definitions
- Initial score capture and validation

Every operational slice must also define its offline behavior before it is considered complete.

---

## 14. Why not build every requested feature immediately?

### Decision
**No over-building.**

Future capabilities should be implemented when their configuration boundary and operational need are sufficiently understood.

The product should remain lean while its core architecture becomes strong.

The goal is not to produce the largest feature list quickly. The goal is to produce a platform that can safely absorb new modules later.

Offline-first is not an excuse to prebuild every possible data model. We should build the shared local-data and synchronization foundation, then add offline support to real workflows as they are implemented and verified.

---

## 15. What is the source of truth?

### Decision
PostgreSQL is the **server source of truth** for authoritative school records.

Offline local data is a durable working copy used for continuity, not a second competing authority. A local change may be immediately usable by the school while still being **pending synchronization** until the server accepts it.

AI, dashboards and derived reports may interpret trusted records, but they must not silently replace authoritative records.

The general operating principle is:

> **Capture → validate → automate.**

Do not automate unreliable or unvalidated information.

---

## 16. Why is audit history important?

### Decision
Important state changes should preserve evidence of:

- Who acted
- Which school was affected
- What changed
- Previous state where relevant
- Current state where relevant
- When the action occurred

This is important for school operations, accountability, support, debugging and future reporting.

Examples already implemented include module changes, student creation/status changes, attendance corrections, guardian relationship changes and other configuration actions.

Offline synchronization must not bypass the audit requirement: when a pending operation is accepted by the server, the resulting authoritative change must retain the appropriate audit evidence and actor/context information.

---

## 19. What should SkulGo become in the long term?

### Product vision — a transparent and secure record of a person's school journey

**Recorded for future product direction; do not build this now.**

SkulGo is intended to become more than a school-management application. Over time, it should become a trusted, user-centered record of a person's verifiable school history across legitimate school relationships.

The long-term idea is that a person's SkulGo account can accumulate trusted records from participating schools over time, while each school remains the authoritative source for the records it creates.

Examples may eventually include:

- verified school identity and enrollment history;
- attendance and participation records where appropriate;
- academic results and achievement history;
- school-issued certificates or other verified records;
- other authenticated educational history that a user is legitimately entitled to carry forward.

The guiding principle is:

> **Transparent and Secure Records.**

This means the future system should make the provenance and status of important records understandable: who issued a record, which school it belongs to, when it was created or changed, what is verified, and who is authorized to see it.

The long-term record model should preserve the existing trust boundaries:

`Person/SkulGo User → legitimate school relationship → authoritative school records → verified portable history`

A future portable profile/CV must **not** become a free-form self-claimed résumé that silently turns claims into facts. School-issued records should remain distinguishable from user-entered information, and corrections/revocations should preserve appropriate history.

This is a future product direction only. **Do not add public CV/profile, ratings, endorsements, recommendations or cross-school portable-history features during the current V1 work unless a concrete launch requirement makes one unavoidable.**

---

## 17. What is the long-term product philosophy?

App-School should become the **operating layer for schools**, rather than merely a collection of CRUD screens.

The platform should progressively answer:

```text
WHO?
WHAT HAPPENED?
WHEN?
WHICH SCHOOL?
WHO DID IT?
WHAT WAS THE PREVIOUS STATE?
WHAT IS THE CURRENT STATE?
WHICH RULE APPLIES?
WHO CAN SEE IT?
WHO CAN CHANGE IT?
WHAT HAPPENS NEXT?
```

This is the foundation for reliable workflows, auditability, automation, reporting and eventually AI assistance.

Offline-first adds one more required question to every operational workflow:

```text
CAN THE SCHOOL CONTINUE IF THE INTERNET DISAPPEARS?
WHAT DATA IS AVAILABLE LOCALLY?
WHAT IS SAVED LOCALLY?
WHAT IS STILL PENDING SYNCHRONIZATION?
WHAT HAPPENS WHEN CONNECTIVITY RETURNS?
```

---

# Developer Handoff

A developer joining App-School should understand these rules before adding code:

1. **Do not create a separate school application for a customer.** Build reusable App-School capabilities.
2. **Every school is a tenant.** School-owned data must be school-scoped.
3. **Settings is the school control plane.** Keep school configuration there.
4. **Only the school owner controls modules.** Enforce this on the server, not only in the UI.
5. **Module state and staff capability are separate.** Enforce both where applicable.
6. **Do not delete historical records when a module is disabled.**
7. **Do not introduce role-name assumptions when a capability boundary is appropriate.**
8. **Audit meaningful state changes.**
9. **Do not add a feature as a customer-specific fork when it can be a reusable module.**
10. **Do not build subscription tiers prematurely.** Preserve a clean module architecture for the future commercial layer.
11. **Prefer small vertical slices.** Avoid speculative infrastructure and unused abstractions.
12. **Offline-first is application-wide.** Do not make internet connectivity a hidden prerequisite for normal supported school workflows when required data is already local.
13. **Use one shared local-data/outbox/sync foundation.** Modules must not create unrelated offline mechanisms.
14. **Local save is not server confirmation.** Represent pending, synced, failed and conflict states explicitly.
15. **Pending operations must be durable and idempotent.** Retries must not create duplicates or duplicate side effects.
16. **Offline data follows tenant/capability boundaries.** Never expose another school's data through local caches or queued operations.
17. **Server validation and audit remain authoritative.** Offline support must not weaken authorization, important invariants or audit history.
18. **Read this document and `README.md` before making architectural changes.**

---

# Investor / Business Handoff

The core business thesis is simple:

> **Build one school platform once, deploy it to many schools, and continuously increase its value through reusable modules.**

A school customer should not require a new codebase. The same App-School product becomes the customer's school environment through configuration and enabled modules.

This creates a compounding product model:

```text
More schools
     ↓
More real operational requirements
     ↓
More reusable modules
     ↓
More valuable App-School product
     ↓
More reasons for schools to adopt App-School
```

Offline-first is part of the product value rather than a separate paid feature by default: a school should be able to keep working through unreliable connectivity, then synchronize trusted changes safely when the connection returns.

A future tiered subscription model can package modules and advanced capabilities without changing the fundamental product architecture.

The strategic asset is therefore **the App-School platform and its reusable module ecosystem**, not a collection of custom school projects.

---

# Current Product Boundary

This history document records product direction and durable decisions. It does not replace the implementation documentation.

For current implementation status and roadmap, see `README.md` and `docs/ROADMAP.md`.

For frozen technical architecture, see `ARCHITECTURE.md`.

When these documents appear to conflict, the implementation should be reviewed deliberately rather than silently changing a foundational rule.


## 20. Current implementation/handoff checkpoint — 19 Sep 2026

### Decision/status

The personal-account/school-relationship foundation and Owner/Admin dashboard foundation are implemented. Current browser verification is deliberately paused on a school-discovery/search regression before dependent join-request testing.

The test database may contain many intentionally created schools. Multiple school records are not evidence of accidental duplication and must not be deleted during this investigation.

Current known boundaries:
- School discovery must use the stored normalized school name and only expose eligible school statuses.
- Join-request listing is a separate route concern and must be verified after discovery.
- Finance/dashboard values must remain honest when authoritative invoice/payment models are not available in the current schema.
- CAC is optional during current onboarding; when supplied, its normalized identity remains unique.

### Handoff rule

Do not infer database state from the UI. Verify the actual school record and schema before changing data or query behavior. One verified case at a time.

## 21. What is the current execution order after identity and setup?

### Decision
The personal-account/school-relationship foundation and Owner/Admin operational dashboard are now implemented. The immediate execution focus is **school discovery/join verification, followed by the student admission workflow**, because it connects the existing personal student path to authoritative Student + Enrollment records.

The execution order is:

```text
School setup
   ↓
Owner/Admin dashboard
   ↓
Student admissions: submit → review → approve → Student + Enrollment
   ↓
Classes / Attendance / Fees / Results / Reports
   ↓
Staff / Parents / Communication
   ↓
Teacher / Cashier / Parent / Student workspaces
   ↓
Production readiness
```

The current admission slice is intentionally narrow. Do not treat the existing review/approval implementation as end-to-end complete until applicant submission, remaining review actions and browser verification are finished.

The Owner/Admin dashboard is the permanent operational home after setup. The setup workspace is temporary configuration. The personal account remains the identity boundary, and **← Account** remains the return path from a school workspace.

The GB School demo remains a reference for navigation and visual organization. The deeper school-management-system repository remains a reference for proven school workflows. SkulGo must continue to implement those ideas inside its own personal-account, membership, capability, tenant and audit architecture rather than copying either repository's architecture.

This execution order is intentionally separate from the detailed domain capability phases in docs/ROADMAP.md. It describes what should be built next, not a claim that every older capability phase is empty.


## 22. Owner navigation as operational frontend — 20 Sep 2026

### Decision
The GB School demo is treated primarily as a frontend/operational reference for the Owner/Admin workspace. It is not a backend architecture to copy.

The owner sidebar represents what the school is doing and seeing, while Setup/Settings represents what the school is configuring.

### Decision: separate setup from operation
Configuration/setup → authoritative school records → owner operational frontend.

Examples:
- fee structures and payment-provider setup belong in configuration surfaces;
- Fees & Payments belongs to the operational finance register;
- academic structure is configured in setup, while Classes shows the resulting current class operation;
- assessment definitions are configuration, while Results shows the operational result lifecycle.

### Decision: completion must distinguish frontend from backend
An owner page may be frontend-present, frontend + backend verified, backed by existing setup/domain infrastructure but not yet represented correctly in the owner frontend, or broken/missing.

A route/file existing is not sufficient evidence of completion.

### Current execution rule
Build and verify one owner sidebar slice at a time: inspect reference → inspect current App-School → identify smallest missing behavior → reuse existing backend/domain logic → implement frontend slice → typecheck/test → browser verification → record status → next item.

This decision is durable handoff guidance for future developers and AI agents.


## 23. School Settings is the extensible control plane — 20 Sep 2026

### Decision

**School Settings / Setup is the authoritative control plane for school configuration. School Operations is the daily working plane.**

A school is configured once during initial setup and can be reconfigured by the owner/admin later. The operational sidebar then represents the school's actual day-to-day work.

```text
SCHOOL SETTINGS
     │
     ├── Backend / Control Plane
     │     ├── Academic sessions & terms
     │     ├── Classes / class arms
     │     ├── Subjects
     │     ├── Fee structures
     │     ├── Assessment definitions
     │     ├── Staff & roles
     │     ├── Parent access
     │     ├── Modules
     │     └── Other school configuration
     │
     └── SCHOOL OPERATIONS
           ├── Dashboard
           ├── Students
           ├── Classes
           ├── Attendance
           ├── Fees & Payments
           ├── Results
           ├── Reports
           ├── Announcements
           ├── Staff & Teachers
           ├── Parents
           ├── Applications
           ├── Users & Roles
           └── Audit History
```

This is a product responsibility boundary, not a requirement to physically move every domain service into a settings directory.

### Future module decision

School Settings must remain extensible because App-School will gain new reusable modules over time.

For every future module:

```text
New module
   ↓
Owner sees module in School Settings
   ↓
Owner enables/configures it
   ↓
Server enforces module state + capability
   ↓
Operational frontend becomes available
```

Only the school owner controls module enablement. Staff permissions/capabilities are separate. Turning a module off changes availability but does not delete historical records.

### Product consequence

The owner sidebar must remain an operational surface. Configuration forms should live in Settings/Setup even when the same underlying domain is used by an operational page.

This prevents the product from becoming a collection of setup screens disguised as daily school software and gives future modules a stable place to plug into the platform.

### Handoff rule

A developer or AI agent adding a new module must first identify its Settings/control-plane requirements and then its operational workflow. Do not implement only a frontend route and call the module complete. Completion requires the configuration boundary, authoritative backend records, authorization/module enforcement, operational frontend and runtime verification to agree.


---

## 24. Permanent school person identity — 20 Sep 2026

### Decision

Each school relationship may carry a permanent human-readable person identifier:

    [SCHOOL PREFIX]/[YEAR]/[CATEGORY]/[RANDOM UNIQUE CODE]

The prefix is derived from the school name and stored on School. Current categories are AC (academic/teaching) and N (non-academic staff/cashier).

The identifier is separate from the internal UUID. It is intended to remain stable across role changes and preserve understandable school-facing identity/history. It must not encode a detailed job title or use a sequential counter.

### Implementation boundary

- School stores personIdPrefix.
- Membership stores personIdentifier with school-scoped uniqueness.
- School registration generates the school prefix and permanent owner identifier.
- The generation utility has unit tests.
- Owner registration has a real PostgreSQL integration test.

---

## 25. Owner-first narrow-slice development method — 20 Sep 2026

The Owner/Admin experience is now the active build phase. Development proceeds through the existing Owner queue, one narrow vertical slice at a time.

    Reference / requirement
            ↓
    Inspect current App-School
            ↓
    Smallest missing slice
            ↓
    Reuse existing models/services/APIs
            ↓
    Implement
            ↓
    Typecheck + tests
            ↓
    Browser/runtime verification
            ↓
    Document
            ↓
    Commit
            ↓
    Next queue item

If a dependency is discovered, propose the queue change explicitly rather than silently jumping ahead.

---

## 26. Settings is the control plane; Owner navigation is the operational plane — 20 Sep 2026

School configuration belongs in Settings/Setup. The Owner sidebar represents daily operational work.

    Settings / Setup
        ↓
    Rules + configuration + access + module enablement
        ↓
    Authoritative school records
        ↓
    Operations
        ↓
    Dashboard / work / reports / history

Assessment definitions belong in Setup; Results is operational score/result work. Fee structures and payment-provider configuration belong in Setup/Settings; Fees & Payments is operational finance work. Academic structure is configured in Setup; Classes shows the resulting current operation.

A future module must establish both its control-plane configuration and its operational workflow before it is considered complete.

---

## 27. Owner dashboard is read-only operational observation — 20 Sep 2026

The Owner dashboard derives metrics from authoritative school records. It must not create operational records or invent missing data.

The Owner is not expected to enter teacher scores or mark daily attendance merely to make the dashboard work. Existing staff/teachers perform daily operations according to their existing capabilities; the Owner sees the resulting state.

---

## 28. Owner phase verified checkpoint — 20 Sep 2026

The following slices have been implemented/verified during the current Owner phase:

- Owner dashboard operational overview.
- Classes operational workspace.
- Attendance report.
- Results operational workspace separated from assessment setup.
- Finance operational overview with restored authoritative finance/platform schema.
- Communication in-app notice sending.
- School Settings/Setup as the configuration control plane.

The remaining Owner queue includes dedicated Staff & Teachers, Parents, Applications, Users & Roles and Audit History surfaces, plus any stale navigation destinations.

### Verification

Current local verification: 11 test files passed, 25 tests passed, typecheck passed, and 32 Prisma migrations are applied with the database schema up to date.

### Queue rule

The Owner phase is completed before the project returns to end-to-end user journeys.

After Owner completion:

    Personal sign-in
       ↓
    Teacher/Staff application → approval → workspace → daily work
    Student admission → approval → Student + Enrollment → workspace
    Parent/Guardian verification → parent workspace → authorized child visibility
    Cashier/Accountant → existing relationship/capabilities → finance workspace
       ↓
    Owner observes resulting authoritative records

This is a product execution decision, not a claim that all downstream workflows are already complete.
