# Student Fee Assignments

## Problem

A school can define a fee, but that does not yet answer the operational question: **which student is expected to pay it?**

This slice connects an existing school fee definition to one specific student without creating a payment record or prematurely building the invoice/accounting system.

## What this slice does

- Keeps the assignment school-scoped.
- Requires the fee to belong to the school and be active.
- Requires the student to belong to the school and be active.
- Requires an active student enrollment in the fee's academic session.
- Stores the fee amount as an assignment snapshot.
- Prevents assigning the same fee to the same student twice.
- Records the assignment in audit history.

## What it intentionally does not do

- No invoice generation.
- No payment recording.
- No payment provider integration.
- No receipt generation.
- No balance calculation.
- No discounts, scholarships or installment rules yet.
- No bulk assignment workflow yet.

## Security boundary

The Finance module must be enabled for the school and the acting membership must have `FINANCE.MANAGE`. All student and fee lookups are constrained by `schoolId`.

## Data decision

The assignment stores the amount separately from the fee definition. This preserves the amount that was actually assigned if the school's fee definition is changed later.

## Next dependency

The next finance slice is **Invoices / obligations**. It should build on the assigned expected amount rather than treating the fee definition itself as a student's debt.
