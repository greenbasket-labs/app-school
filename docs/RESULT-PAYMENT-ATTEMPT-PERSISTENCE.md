# Result Payment Attempt Persistence

## Status

The result-access commercial flow now has a persisted, school-scoped payment-attempt boundary in addition to the pure provider-neutral attempt contract.

## Boundary

A paid result request is represented by `ResultPaymentAttempt` with:

- school;
- student;
- academic session;
- academic term;
- configured amount snapshot;
- NGN currency;
- selected provider;
- caller-supplied idempotency key;
- explicit lifecycle status;
- optional provider reference and checkout URL for later initialization.

The persistence boundary does **not** prove payment, create an entitlement, or create a commercial transaction.

## Idempotency

`schoolId + idempotencyKey` is unique.

Repeated requests with the same key return the existing logical attempt when the student/result context, amount and provider match. Reusing a key for a different payment context raises an explicit conflict instead of silently attaching to the wrong attempt.

## Security / ownership

The persistence table is school-scoped and references the existing school, student, academic session and academic term identities. The application authorization policy must run before an attempt is created; payment persistence does not grant result access.

## Deliberate separation

This is not the existing school `PaymentIntent` used for student fee invoices. School finance and App-School commercial result-access billing remain separate bounded contexts.

The table is currently introduced through an explicit SQL migration while the Prisma schema representation is reconciled in a later schema-maintenance slice. Do not add a second incompatible representation or manually edit production data to compensate.

## Next

The next slice is provider initialization through the existing payment-provider boundary, followed by server-side provider verification before any commercial transaction or result entitlement is created.
