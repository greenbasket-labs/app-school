# App-School — Product Decision & History

**Product:** App-School  
**Company:** GREEN BASKET GLOBAL LIMITED  
**Purpose:** Preserve the product questions, decisions and reasoning established before and during the first implementation so future developers, technical collaborators and investors understand what App-School is meant to become.

> This document is a reconstructed decision record from the product direction established for App-School. It is intentionally focused on durable decisions, not a transcript of every earlier conversation.

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
When GREEN BASKET GLOBAL LIMITED approaches a private school, do we build a new system for that school?

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
Should we build a private feature only for that customer?

### Decision
**Do not create one-off private application forks by default.**

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

## 9. Who owns the school's data?

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

Examples already established:

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

The next academic slice is **Assessment Definitions**, followed later by score capture, validation, submission, approval, publication and report cards.

---

## 14. Why not build every requested feature immediately?

### Decision
**No over-building.**

Future capabilities should be implemented when their configuration boundary and operational need are sufficiently understood.

The product should remain lean while its core architecture becomes strong.

The goal is not to produce the largest feature list quickly. The goal is to produce a platform that can safely absorb new modules later.

---

## 15. What is the source of truth?

### Decision
The database is the source of truth for school records.

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

---

## 17. What is the long-term product philosophy?

App-School should become the **operating layer for private schools**, rather than merely a collection of CRUD screens.

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
12. **Read this document and `README.md` before making architectural changes.**

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

A future tiered subscription model can package modules and advanced capabilities without changing the fundamental product architecture.

The strategic asset is therefore **the App-School platform and its reusable module ecosystem**, not a collection of custom school projects.

---

# Current Product Boundary

This history document records product direction and durable decisions. It does not replace the implementation documentation.

For current implementation status and roadmap, see `README.md`.

For frozen technical architecture, see `ARCHITECTURE.md`.

When these documents appear to conflict, the implementation should be reviewed deliberately rather than silently changing a foundational rule.
