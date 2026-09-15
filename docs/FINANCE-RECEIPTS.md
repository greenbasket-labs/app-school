# Finance — Payment Receipts

## Purpose

A trusted `PaymentRecord` can be presented as a school-scoped receipt without introducing a second mutable financial ledger.

## Receipt flow

```text
PaymentRecord
     ↓
School-scoped receipt query
     ↓
Receipt view
     ↓
Print
```

The payment record remains the financial source of truth.

## Receipt contents

A receipt includes:

- school name and available contact details
- stable receipt number derived from the payment identity
- student name and admission number
- fee name
- amount received
- payment date/time
- payment reference when available
- note when available
- balance after the payment

## Security

The receipt endpoint requires:

- authenticated session
- active school membership with `FINANCE.VIEW`
- Finance module enabled
- payment belonging to the requested school

A payment from another school cannot be retrieved by changing the URL school ID.

## Deliberately deferred

This slice does not create a separate receipt ledger, PDF generation service, receipt numbering sequence, refunds, or reconciliation. Those can be added only when the real workflow requires them.
