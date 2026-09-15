# App-School — Product Roadmap

**Company:** GREEN BASKET GLOBAL LIMITED  
**Product:** App-School

This roadmap is the execution guide for future human developers and AI coding agents. It must be read together with `README.md`, `docs/PRODUCT-DECISION-HISTORY.md`, and `ARCHITECTURE.md` before implementation work begins.

## Product rule behind the roadmap

App-School is **problem-first, not feature-first**.

The benchmark is not how many modules we can list. The benchmark is how much real pain we remove from Nigerian schools, while keeping the platform affordable and simple.

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

- [x] Assessment definitions
- [x] Score capture
- [x] Score validation
- [x] Result submission
- [x] Result approval
- [x] Result publication
- [x] Report cards
- [x] Academic history

### Phase 4 — Finance
- [x] **Fee structures**
  - School-scoped fee definitions bound to an academic session and term
  - Name, amount, optional description and optional due date
  - Duplicate fee names prevented within a school and term
  - Session/term ownership and relationship validated
  - Creation audited with actor and resulting fee definition
  - Finance module and existing `FINANCE.MANAGE` capability enforced
  - Student obligations and payments intentionally deferred
- [x] **Student fee assignments**
  - Existing school fee definitions can be assigned to specific active students
  - Student must belong to the school and have active enrollment in the fee's academic session
  - Assignment amount is snapshotted so later fee-definition changes do not silently rewrite an existing assignment
  - Duplicate student/fee assignments are rejected
  - Assignment is audited with actor, student, fee, amount and academic context
  - Finance module and existing `FINANCE.MANAGE` capability enforced
  - Invoices, payments, receipts and balances intentionally deferred
- [x] **Invoices / obligations**
  - An assignment can produce one student-specific invoice/obligation
  - Invoice snapshots the assigned amount and fee name
  - Fee due date is carried into the obligation when present
  - New obligations start in `OPEN` state
  - Duplicate invoices for the same assignment are rejected
  - Invoice creation is audited
  - Finance module and existing `FINANCE.MANAGE` capability enforced
  - Payment, receipts and reconciliation remain separate slices
- [x] **Payment recording**
  - Payment must target an existing invoice in the same school
  - Amount must be greater than zero and cannot exceed the current outstanding amount
  - Outstanding balance is derived from invoice amount minus trusted payment records
  - Optional payment reference and note are preserved
  - Payment record and audit event are written atomically
  - Finance module and existing `FINANCE.MANAGE` capability enforced
  - Provider integration, receipts, refunds and reconciliation remain separate slices
- [x] **Payment provider integration — Paystack foundation**
  - Existing open invoices can initialize an NGN Paystack checkout for the current outstanding balance
  - Provider reference is stored in a school-scoped `PaymentIntent`
  - Paystack webhook signature is verified before processing
  - Successful provider events are matched to the stored intent and invoice
  - Provider amount/currency are revalidated before creating `PaymentRecord`
  - Repeated successful webhooks are idempotent
  - Browser callback is treated as navigation only, not payment proof
  - Secret key remains server-side
  - Settlement model, receipts, refunds and reconciliation intentionally deferred
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

A new human developer or AI coding agent should be able to enter the repository, read the documentation, inspect the current code, identify the next unchecked slice, understand why it exists, and continue development without needing the original conversation.

The roadmap is therefore part of the product's continuity mechanism, not merely a task list.
