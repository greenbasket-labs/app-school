# Finance — Balances & Reconciliation

## Purpose

Give the school one reliable answer to the basic finance question: **what was charged, what was paid, and what remains?**

## Source of truth

Balances are derived from `StudentFeeInvoice` and trusted `PaymentRecord` rows. No second balance ledger is introduced.

For each invoice:

`outstanding = invoice amount - sum of payments`

Outstanding is never allowed to become negative in the reported balance.

## Reconciliation summary

The finance summary reports:

- invoice count
- payment count
- total invoiced amount
- total paid amount
- total outstanding amount

All queries are school-scoped.

## Deliberately deferred

This slice does not add bank reconciliation, provider settlement matching, refunds, write-offs, discounts, arrears aging, or a separate ledger. Those require a real workflow and should be added only when the pain is demonstrated.
