# App-School — Product Roadmap

**Company:** GREEN BASKET GLOBAL LIMITED  
**Product:** App-School

This roadmap is the execution guide for future human developers and AI coding agents. It must be read together with `README.md`, `docs/PRODUCT-DECISION-HISTORY.md`, and `ARCHITECTURE.md` before implementation work begins.

## Product rule behind the roadmap

App-School is **problem-first, not feature-first**.

The benchmark is not how many modules we can list. The benchmark is how much real pain we remove for Nigerian schools, while keeping the platform affordable and simple.

The economic insight behind the product is important: many schools cannot afford to independently assemble a developer, domain, hosting, database, backups, security, maintenance and software. Green Basket therefore provides shared technology through one reusable platform rather than rebuilding technology for every school.

A useful product question is:

> **What painful work, uncertainty, waste, error or dependency can App-School remove from the school?**

The OPay/Moniepoint lesson is a product principle, not a feature requirement: products can win by removing everyday friction better than the traditional alternative. App-School should apply the same thinking to school operations.

## Development loop

```text
Real school pain
      ↓
Understand the people + workflow
      ↓
Find the failure/friction
      ↓
Define the smallest reliable mechanism
      ↓
Build one vertical slice
      ↓
Validate security + tenant boundaries
      ↓
Test with real scenarios
      ↓
Observe what actually helps
      ↓
Document the decision
      ↓
Choose the next pain
```

## Current roadmap

### Phase 0 — Foundation & trust
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

### Phase 1 — School configuration
- [x] Academic session foundation
- [x] Academic terms configuration
- [x] Class levels
- [x] Class arms
- [x] Subjects
- [x] Subject-to-class assignment
- [x] School setup workspace
- [x] Owner-only module settings
- [x] Backend module enforcement
- [x] Academic session lifecycle
- [x] Setup readiness
- [x] School profile/configuration

### Phase 2 — Core daily operations
- [x] Student records
- [x] Student enrollment
- [x] Daily attendance
- [x] Attendance history and correction
- [x] Staff accounts and access foundation
- [x] Capability assignment
- [x] Parent/guardian records
- [x] Student status lifecycle

### Phase 3 — Academic engine
The academic engine is intentionally built as dependent slices, not one large feature.

- [x] **Assessment definitions**
  - School-scoped assessment definitions
  - Bound to academic session, term, class arm and subject
  - Maximum score stored as a decimal value
  - Subject/class assignment validated before creation
  - Duplicate assessment names prevented within the same term/class/subject
  - Assessment creation audited
  - Assessments module and capability boundaries enforced
- [x] **Score capture**
  - One school-scoped score per student per assessment
  - Active enrollment roster derived from the assessment's session/class context
  - Score constrained to `0 <= score <= maxScore`
  - Existing score corrections update the authoritative score record
  - Creation and correction audited with previous/current score state
  - Assessment module and existing `ASSESSMENT.CREATE` capability enforced
- [x] **Score validation**
  - Complete active enrollment roster checked
  - Missing scores identified
  - Stored scores defensively checked against `0..maxScore`
  - Assessment school ownership verified
  - Validation result exposes completion counts and affected student IDs
  - Assessment module and existing `ASSESSMENT.CREATE` capability enforced
- [x] **Result submission**
  - Submission requires a complete valid score set
  - Existing `SUBMIT_RESULTS` capability and Assessments module enforced
  - Submission is audited with the acting user and assessment context
  - Duplicate submission is rejected
  - Ordinary score edits are locked after submission
  - Approval remains a separate workflow
- [ ] Result approval
- [ ] Result publication
- [ ] Report cards
- [ ] Academic history

### Phase 4 — Finance
- [ ] Fee structures
- [ ] Student fee assignments
- [ ] Invoices / obligations
- [ ] Payment recording
- [ ] Payment provider integration
- [ ] Receipts
- [ ] Balances and reconciliation
- [ ] Finance audit trail

### Phase 5 — Communication
- [ ] Parent/guardian communication
- [ ] Staff communication
- [ ] Announcements
- [ ] Notifications
- [ ] Delivery/status history
- [ ] WhatsApp/SMS/email integrations where justified

### Phase 6 — Reports & management
- [ ] Operational dashboards
- [ ] Attendance reports
- [ ] Academic reports
- [ ] Finance reports
- [ ] Management summaries
- [ ] Export workflows

### Phase 7 — Platform intelligence
- [ ] Rules/configuration engine
- [ ] Background jobs
- [ ] Reliable notification processing
- [ ] Offline-first workflows where useful
- [ ] Idempotent sync actions
- [ ] Anomaly/delay detection
- [ ] AI assistance above trusted records, never the source of truth

### Phase 8 — Production platform
- [ ] PostgreSQL migration/deployment process
- [ ] Object/file storage
- [ ] Backups and recovery procedures
- [ ] Observability and operational alerts
- [ ] Security hardening
- [ ] Performance/load testing
- [ ] Render production deployment
- [ ] Tenant-safe onboarding and support operations

## New-module gate

Before adding a new module or feature, the developer/AI must be able to answer:

1. What real school pain are we solving?
2. Who experiences the pain?
3. How is the problem handled today?
4. What goes wrong or costs time/money/trust?
5. What should the software prevent, detect, remember, calculate, connect or communicate?
6. Which school owns the resulting records?
7. What are the valid states and transitions?
8. Who can view, create, change, submit or approve them?
9. Does the capability belong under an existing module or require a new module?
10. What is the smallest useful vertical slice?
11. What is intentionally deferred?
12. How will tenant isolation, authorization and meaningful changes be tested?

If these questions cannot be answered, do not start building a large feature set. Return to the problem.

## Roadmap discipline

- Do not copy feature lists from competing school applications as the specification.
- Do not create customer-specific forks when a reusable App-School module is appropriate.
- Do not build future modules prematurely just because they appear on the roadmap.
- Do not add speculative abstractions merely because they may be useful later.
- Preserve the existing four identity boundaries: `userId`, `organizationId`, `schoolId`, `membershipId`.
- Preserve school tenant isolation on every school-owned record and operation.
- Keep module enablement separate from staff capability authorization.
- Only the school owner can enable or disable modules.
- Disabling a module must not delete historical records.
- Audit meaningful state changes.
- Keep the database authoritative; AI and reports operate above trusted records.
- Update the roadmap and relevant documentation whenever a meaningful slice is completed.

## Handoff rule

A new human developer or AI agent should be able to enter the repository, read the documentation, inspect the current code, identify the next unchecked slice, understand why it exists, and continue development without needing the original conversation.

The roadmap is therefore part of the product's continuity mechanism, not merely a task list.
