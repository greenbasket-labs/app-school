# App-School — Developer / AI Takeover Prompt

> **Purpose:** Save this prompt in the repository so any future developer, coding agent, or AI can understand App-School and continue development without needing the original conversation.
>
> **Important:** This is a reusable handoff document. It does not mean the current developer or AI is being replaced.

---

## MASTER PROMPT

You are joining the development of **App-School**, the school application built by **GREEN BASKET GLOBAL LIMITED**.

Your job is to understand the existing product, architecture, decisions, and current implementation before changing anything. Continue the product from its actual repository state. Do not assume that a feature exists because it is mentioned in a plan; inspect the code first.

## 1. Understand why App-School exists

Do not begin with the assumption that this is simply another school-management system.

The founding problem is technology access.

Many private schools in Nigeria need software, hosting, databases, backups, security, updates, support, records, attendance, academics, communication and reports, but may not be able to afford to assemble and maintain all of that independently.

The fundamental question is:

> **If the technology already exists, why should every individual school have to pay separately to build and maintain its own technology?**

App-School is the answer to that problem.

GREEN BASKET GLOBAL LIMITED builds and maintains a shared platform once, then makes the technology accessible to many schools through one service.

The intended model is:

```text
Many schools
     ↓
One App-School application
     ↓
Shared platform / infrastructure
     ↓
Each school configures and operates its own isolated environment
```

The goal is not to make schools buy more technology. The goal is to make existing technology economically accessible through shared infrastructure and reusable software.

## 2. Product vision

App-School is:

- one universal school application
- multi-tenant
- one codebase
- many schools
- isolated school data
- school-specific configuration
- configurable modules
- capability-based access
- owner-controlled module enablement
- auditable operations
- database-backed source of truth
- offline-first where it is justified
- designed to grow through small, coherent vertical slices

Do not create separate application forks for individual schools unless an explicit platform decision says otherwise.

A school should configure itself inside App-School rather than receiving a custom copy of the application.

## 3. School as a connected system

The product should connect the school as a whole:

```text
Owner        → visibility, control, configuration
Teachers     → daily teaching, attendance, academic records
Students     → identity, enrollment, academic and school records
Parents      → information, communication and school visibility
School data  → organized, persistent and auditable
```

The objective is not simply to create screens. The objective is to make the school's real workflows more reliable.

Ask what software should automatically:

- prevent
- detect
- remember
- calculate
- connect
- communicate
- preserve
- make visible

## 4. Problem-first, not feature-first

**Do not copy another school application and rename its features.**

Start from the real school problem.

For every new capability, understand:

1. What real problem exists?
2. Who experiences it?
3. What is the current workflow?
4. Who owns the data?
5. What can go wrong?
6. What should the software prevent or detect?
7. What information must be remembered?
8. What rules must be validated?
9. What state changes occur over time?
10. Who can view it?
11. Who can change it?
12. Who can approve it, if approval is actually necessary?
13. Does it belong under an existing module?
14. Does it require a new module?
15. What is the smallest useful vertical slice?
16. What should intentionally wait for a later slice?

The development loop is:

```text
Real problem
   ↓
Understand workflow
   ↓
Identify actors, ownership, rules and states
   ↓
Design smallest useful mechanism
   ↓
Implement
   ↓
Validate tenant + authorization boundaries
   ↓
Test
   ↓
Document the decision
   ↓
Next slice
```

The goal is not the largest feature list. The goal is the strongest platform for removing real pain from schools.

## 5. Read the repository before coding

Before changing code, read:

1. `README.md` completely.
2. `docs/PRODUCT-DECISION-HISTORY.md` completely.
3. `docs/PRODUCT-ROADMAP.md` completely.
4. `ARCHITECTURE.md` completely before changing shared architecture, identity, authorization, tenancy, persistence or module boundaries.
5. The current Prisma schema.
6. The relevant existing service, API route, UI and authorization patterns for the feature you are touching.

Then inspect the actual repository state.

Never assume that a model, route, capability, service, page or module exists because a document says it should exist.

## 6. Current identity foundation

The four internal identity boundaries are non-negotiable:

1. `userId` — human account
2. `organizationId` — Green Basket customer organization
3. `schoolId` — school / tenant
4. `membershipId` — relationship to school / organization

Do not collapse these identities.

CAC is an identity attribute, not an additional internal identity ID.

`createdAt` is evidence/security metadata, not another identity boundary.

## 7. Multi-tenancy is non-negotiable

Every school-owned resource must be provably connected to the correct `schoolId` before it can be read or changed.

The security chain should remain conceptually:

```text
Authenticated session
      ↓
Active membership
      ↓
School context
      ↓
Required capability
      ↓
Resource belongs to school
      ↓
Operation
      ↓
Audit / history where meaningful
```

Never trust a client-provided school ID by itself.

Never allow a user from one school to read or modify another school's records.

Do not create shortcuts that weaken tenant isolation for convenience.

## 8. Settings is the control plane

Each school configures itself inside the application.

Settings is the control surface for school configuration, access and module state.

Future capabilities should be delivered as modules where appropriate.

### Critical rule

**Only the school owner can enable or disable modules.**

Module enablement is separate from staff capability authorization.

A module being enabled does **not** automatically give every staff member access to its operations.

A module being disabled must not delete historical records.

Disabling is reversible unless an explicit product decision says otherwise.

## 9. Module ≠ permission

Always keep these concepts separate:

```text
Module enabled?
        ↓
Is this capability allowed for this user?
        ↓
Does the resource belong to this school?
        ↓
Perform operation
```

Operational APIs must enforce the appropriate module state and capability separately.

Do not authorize access merely because a user is called `admin`, `teacher`, `manager`, `bursar`, or another role name.

Use explicit capabilities.

## 10. Preserve historical truth

School records are historical evidence.

Do not delete historical records merely because:

- a module is disabled
- a student changes status
- a setting changes
- a workflow moves to another state
- a staff member loses access

When correcting important operational data, prefer preserving the authoritative record plus meaningful audit evidence rather than silently deleting history.

## 11. Capture → validate → automate

Use this principle throughout the product:

```text
Capture trusted information
        ↓
Validate rules
        ↓
Store authoritative state
        ↓
Derive useful information
        ↓
Automate only when the underlying data is trustworthy
```

Do not build sophisticated automation on top of unvalidated or ambiguous records.

## 12. Data + time + rules + context

A useful school record is not only a value.

Think in terms of:

```text
Data
+ Time
+ Rules
+ Context
```

For every important record, understand:

- what happened
- when it happened
- which school it belongs to
- who performed it
- previous state
- current state
- applicable rule
- who can see it
- who can change it
- what happens next

This is especially important for attendance, assessments, results, fees, approvals and communication.

## 13. Authorization and audit

Use capability-based authorization.

Existing capability patterns should be reused instead of inventing parallel permission systems.

Meaningful state changes should create audit evidence containing the relevant actor, school, action and previous/current state where appropriate.

Do not add audit events for meaningless UI actions just to create noise.

## 14. Build small vertical slices

Do not build an entire module at once unless the repository and product decision explicitly require it.

Prefer:

```text
Schema / model
   ↓
Domain service
   ↓
School-scoped API
   ↓
Small useful UI
   ↓
Authorization
   ↓
Audit where needed
   ↓
Tests / validation
   ↓
Documentation
```

A complete small slice is better than ten unfinished screens.

## 15. New-module gate

Before adding a new module, answer these questions in the implementation/decision documentation:

- What school pain requires this module?
- Why can the problem not be solved cleanly inside an existing module?
- Who are the actors?
- Which school owns the records?
- What are the important entities?
- What are the lifecycle states?
- What transitions are valid?
- What must be validated?
- Which capabilities are required?
- Which operations require owner control?
- What belongs in Settings?
- What must be audited?
- What historical records must survive configuration changes?
- What is intentionally not being built yet?

Do not create a new module merely because a feature sounds useful.

## 16. Current product direction

The existing product has established foundations for:

- identity
- authentication
- capability authorization
- school structure
- student records
- enrollment
- attendance
- school setup
- module configuration
- module enforcement
- academic session lifecycle
- staff/access foundation
- setup readiness
- school profile
- attendance history and correction
- parent/guardian records
- student status lifecycle

The roadmap is the authoritative guide to what comes next. Inspect the actual repository before deciding what is already complete.

At the current roadmap boundary, the active implementation slice is:

**Student Admissions**

The repository now contains the admission application persistence model, lifecycle service, school-scoped list/detail/update/approval APIs, Students-page admission request surface, Owner/Admin review page and approval form. Approval is transactional: it creates the official Student and Enrollment and marks the application approved.

The slice is not end-to-end complete yet. Applicant/parent submission, edit UI, rejection/withdrawal UI and real-browser acceptance remain. Do not mark admissions complete until those remaining behaviors are implemented and verified.

After the admission slice, continue with the smallest dependent core-operations slice.

## 17. Assessment Definitions boundary

When implementing Assessment Definitions, first inspect the current schema and existing assessment-related code.

The intended first slice is approximately:

- assessment belongs to a school
- assessment belongs to an academic session
- assessment belongs to an academic term
- assessment belongs to a class/arm
- assessment belongs to a subject
- assessment has a name/title
- assessment has a maximum score

Validate that linked records belong to the same school and that the academic term belongs to the academic session.

Use the existing assessment capability boundary where appropriate, especially `ASSESSMENT.CREATE` for creation.

The Assessments module is currently disabled by default for a new school, so assessment operations must respect the `ASSESSMENTS` module boundary.

Do **not** add score capture, result approval, publication or a large report-card system in the definition slice unless the repository's current product decision explicitly expands the scope.

## 17A. Student admission workflow boundary

Admissions belongs to the Students domain for the current V1 product boundary.

### Authoritative records

- AdmissionApplication is the pending/request record.
- Student is created only when an application is approved.
- Enrollment records the student's placement into the academic session/class.
- AuditEvent records meaningful admission state changes.

### State model

Supported application states are PENDING, UNDER_REVIEW, APPROVED, REJECTED, and WITHDRAWN.

### Authorization

Admission APIs remain school-scoped and require the Students module plus the appropriate STUDENTS.VIEW or STUDENTS.MANAGE capability. Client-side visibility is not the authorization boundary.

### Approval rule

Approval must use the existing admission domain service. It must not duplicate Student/Enrollment creation in the UI. The current approval flow requires a school-supplied admission number and creates Student + Enrollment in one transaction.

### Current incomplete work

- applicant/parent admission submission UI;
- edit application UI;
- reject/withdraw UI;
- real-browser submit → review → approve verification;
- safe removal/demotion of the legacy manual student-creation path after admissions is proven.

Do not introduce a second student-creation workflow while this slice is being completed.

## 18. Configuration is data

A school should control configuration that belongs to the supported product model, such as:

- school details
- academic sessions
- terms
- class levels
- class arms
- subjects
- supported workflow settings
- enabled modules

Configuration does not mean allowing a school to redefine core platform security or tenant boundaries.

The platform guarantees:

- identity
- security
- tenant isolation
- audit/history
- synchronization
- supported academic structures
- supported permissions

The school configures its own environment within those boundaries.

## 19. Offline-first where justified

Nigeria's connectivity conditions matter.

Use offline-first where it genuinely improves school operations, especially for workflows such as:

- attendance
- class lists
- student records
- daily activities
- selected reports

Use care with operations where financial consistency or external delivery is critical.

Offline-first should use local persistence and synchronization mechanisms where justified. It is not an excuse to create a second source of truth.

The central database remains authoritative.

Do not implement offline architecture everywhere before the actual workflow requires it.

## 20. AI boundaries

AI can assist above trusted school records.

AI may eventually:

- explain
- summarize
- detect anomalies
- help users navigate information
- assist with communication

AI must not become the source of truth for authoritative school records.

The underlying database, validation rules and explicit workflows remain authoritative.

## 21. Nigerian context

Do not design the product as if every school has unlimited connectivity, technical staff or money.

The platform exists partly because a school should not have to separately assemble:

- developer resources
- domain
- hosting
- database
- backups
- security
- updates
- support

The broader Green Basket direction is shared digital infrastructure for organizations that cannot efficiently build and maintain every piece of technology themselves.

Use this context when evaluating product decisions, but do not invent features merely because they sound marketable.

## 22. Do not overbuild

The following are anti-patterns:

- copying competitor feature lists
- building every module before validating the workflow
- creating speculative tables
- creating speculative APIs
- adding role systems when capabilities already solve the problem
- adding duplicate audit systems
- creating separate tenant architectures
- building a second source of truth
- implementing future phases inside the current slice without a reason
- adding complexity simply because a larger architecture looks impressive

When uncertain, choose the smallest coherent mechanism that preserves future flexibility.

## 23. Documentation is part of the product

When a meaningful product or architectural decision is made, update the relevant documentation.

At minimum, keep the following aligned:

- `README.md`
- `docs/PRODUCT-DECISION-HISTORY.md`
- `docs/PRODUCT-ROADMAP.md`
- `ARCHITECTURE.md` when architecture changes

A completed development slice should explain not only what was built, but also why, what is not built, and what should come next.

## 24. Required workflow before every implementation

Follow this sequence:

```text
1. Read the relevant documentation.
2. Inspect the current implementation.
3. Identify the existing architectural pattern to reuse.
4. Identify the exact problem being solved.
5. Define the smallest coherent slice.
6. Define ownership and school boundary.
7. Define states and validation.
8. Define capabilities.
9. Define module dependency.
10. Implement the domain/service layer.
11. Implement the school-scoped API.
12. Implement the smallest useful UI.
13. Add meaningful audit evidence.
14. Validate tenant isolation and authorization.
15. Test what can actually be tested.
16. Update documentation and roadmap.
17. Report exactly what changed and what remains unverified.
```

## 25. Never claim tests you did not run

If the environment does not allow a test, build, migration, typecheck or deployment to be executed, say so.

Do not say:

- "build passes"
- "typecheck passes"
- "migration works"
- "deployment is successful"
- "tests pass"

unless the relevant operation was actually executed and verified.

## 26. Handoff standard

Every completed slice should leave the repository in a state where another developer or AI can answer:

- What problem was solved?
- Which school owns the data?
- Which records were added or changed?
- What are the valid states and transitions?
- Which capability controls each operation?
- Which module controls availability?
- Who can configure it?
- What is audited?
- What historical data must remain preserved?
- What is intentionally **not** implemented yet?
- What is the next smallest logical slice?

If those answers cannot be found from the code and repository documentation, the work is not fully handed off.

## 27. First action when joining this project

Do **not** immediately start coding.

First:

1. Read the repository documentation.
2. Inspect the current tree and important domain modules.
3. Inspect the current Prisma schema.
4. Inspect the latest implementation relevant to the roadmap.
5. Identify completed vs incomplete work.
6. Identify the next smallest logical slice.
7. Identify any risks or unverified assumptions.
8. Report your understanding briefly.
9. Only then begin implementation.

## 28. Final principle

Do not optimize App-School for having the most features.

Optimize it for:

> **Removing the most real pain for schools that cannot afford to build and maintain modern technology themselves.**

Build one strong platform.

Let many schools benefit from it.

Keep their data isolated.

Let each school configure its own environment.

Keep Settings as the control surface.

Keep owner-only module control.

Keep permissions explicit.

Keep history trustworthy.

Build small.

Validate.

Document.

Then move to the next real problem.
