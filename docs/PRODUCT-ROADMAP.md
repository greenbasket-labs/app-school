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
- [x] Fee structures
- [x] Student fee assignments
- [x] Invoices / obligations
- [x] Payment recording
- [x] Payment provider integration — school settlement foundation
- [x] Receipts
- [x] Balances and reconciliation
- [x] **Finance audit trail**
  - School-scoped view of meaningful `finance.*` audit events
  - Actor is shown when a human performed the action; provider/system actions remain identifiable as system actions
  - Access requires `FINANCE.VIEW` and an enabled Finance module
  - Existing audit events remain the source of history; no duplicate finance ledger is created
  - Latest finance history is available from the Finance workspace
  - Detailed accounting reconciliation, refunds, write-offs and settlement matching remain deferred

### Commercial billing & result access — cross-cutting
This is App-School commercial infrastructure, not school-fee finance. It must not reorder the core academic V1 sequence.

- [x] Centralized Free/Basic/Starter/Pro/Premium/Custom plan rules
- [x] Persist school subscription + plan state
- [x] Persist school Result Access configuration
- [x] Result authorization boundary
- [x] Provider-neutral result payment-attempt contract
- [x] Persisted result payment attempt with school-scoped idempotency
- [x] Paystack and Flutterwave result checkout initialization
- [x] Server-side Paystack and Flutterwave payment verification
- [x] Immutable Result Access transaction + revenue allocation boundary
- [x] Provider event replay/idempotency boundary
- [x] Callback/webhook adapters for Paystack and Flutterwave
- [ ] Result entitlement persistence/verification
- [ ] School transaction/revenue view
- [ ] Subscription lifecycle: renewal, failure, grace, upgrade, downgrade and cancellation
- [ ] Settlement/refund operations
- [ ] Commercial analytics/admin surfaces
- [ ] Monnify result-access adapter

Commercial rules are defined in `docs/COMMERCIAL-BILLING-HANDOFF.md`. Payment does not bypass result authorization. Historical revenue splits are immutable snapshots. Do not hard-code a result fee such as ₦200.

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
