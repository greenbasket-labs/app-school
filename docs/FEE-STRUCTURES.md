# Fee Structures — V1 Slice

## Problem

A school needs a simple, trustworthy place to define what it charges for an academic term before the platform can assign obligations or record payments.

This slice intentionally separates the **fee definition** from a student's financial obligation and from an actual payment.

## What this slice does

A school with the Fees & Finance module enabled can create and view fee structures scoped to:

- the school
- an academic session
- an academic term

Each fee contains:

- name
- amount
- optional description
- optional due date
- active state

Creation is audited with the school, actor and fee definition.

## Rules

- Every fee structure belongs to exactly one school.
- The selected academic session must belong to that school.
- The selected term must belong to the selected session.
- Fee names are unique within a school and term.
- Amount must be greater than zero and no more than 100,000,000.
- The Finance module must be enabled.
- `FINANCE.MANAGE` is required for this first slice.
- Historical fee definitions are not silently deleted by later module changes.

## Intentionally deferred

This slice does **not** create:

- student fee assignments
- invoices or obligations
- payments
- payment gateways
- receipts
- balances
- reconciliation
- parent payment flows
- finance reports

Those are separate roadmap slices so each financial state transition can be designed and validated before the next one depends on it.
