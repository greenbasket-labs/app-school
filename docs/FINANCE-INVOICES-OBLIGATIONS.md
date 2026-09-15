# Finance — Student Invoices / Obligations

## Problem

A school fee definition says what the school charges. A student fee assignment says that a particular student has been assigned that charge. Neither alone should be treated as the student's current debt record.

This slice creates the next durable financial fact: a specific student obligation.

## Flow

```text
Fee structure
    ↓
Student fee assignment
    ↓
Student invoice / obligation
    ↓
Payment (later)
```

## Rules

- Invoice creation is school-scoped.
- The source assignment must belong to the same school.
- One fee assignment can produce at most one invoice.
- The invoice snapshots the fee name and assigned amount.
- The fee due date is copied to the invoice when present.
- New invoices start in `OPEN` state.
- `CANCELLED` exists as a reserved terminal state for a later correction workflow; cancellation is not exposed yet.
- Creating an invoice does not record money received.
- Payment recording, provider integration, receipts and reconciliation remain separate slices.
- Creation is audited.
- Finance module and `FINANCE.MANAGE` capability are required.

## Intentionally deferred

- Payment recording
- Payment-provider integration
- Receipts
- Partial payments
- Refunds
- Discounts/waivers
- Cancellation/reopening UI
- Balance/reconciliation logic
- Parent notifications
