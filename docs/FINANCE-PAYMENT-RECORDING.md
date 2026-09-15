# Finance — Payment Recording

## Problem

An invoice says what a student owes. The school then needs a durable record of money actually received, without confusing a payment with an invoice or silently allowing overpayment.

## Flow

```text
Fee structure
    ↓
Student fee assignment
    ↓
Student invoice / obligation
    ↓
Payment record
```

## Rules

- Payments are school-scoped.
- The invoice must belong to the same school.
- Payment amount must be greater than zero.
- A payment cannot exceed the current outstanding amount.
- Invoice balance is derived from invoice amount minus recorded payments.
- Payment recording and its audit event occur in one database transaction.
- Payment reference and note are optional.
- The invoice remains `OPEN`; paid/remaining balance is derived from trusted payment records for now.
- Provider integration, receipts, refunds, discounts and reconciliation remain separate slices.
- Finance module and `FINANCE.MANAGE` capability are required.

## Intentionally deferred

- Payment gateway/provider integration
- Automated online payment confirmation
- Receipts
- Refunds/reversals
- Discounts/waivers
- Installments
- Bank reconciliation
- Parent payment notifications
