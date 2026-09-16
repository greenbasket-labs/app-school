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

The persistence boundary does **not** prove payment, create access by itself, or replace server authorization.

## Idempotency

`schoolId + idempotencyKey` is unique.

Repeated requests with the same key return the existing logical attempt when the student/result context, amount and provider match. Reusing a key for a different payment context raises an explicit conflict instead of silently attaching to the wrong attempt.

## Security / ownership

The persistence table is school-scoped and references the existing school, student, academic session and academic term identities. The application authorization policy must run before an attempt is created; payment persistence does not grant result access.

## Verified-payment boundary

Provider callbacks/events must be verified server-side before a `ResultAccessTransaction` is recorded. Provider-event idempotency prevents replay from creating another processing record.

After the verified commercial transaction is persisted, a durable `ResultAccessEntitlement` is created atomically with that transaction. The entitlement is scoped to the same school, student, academic session and academic term and is unique for that access scope. This makes the transaction the economic proof and the entitlement the durable access proof.

## Deliberate separation

This is not the existing school `PaymentIntent` used for student fee invoices. School finance and App-School commercial result-access billing remain separate bounded contexts.

The result-payment tables are currently introduced through explicit SQL migrations while the Prisma schema representation is reconciled in a later schema-maintenance slice. Do not add a second incompatible representation or manually edit production data to compensate.

## Remaining access boundary

The entitlement can now be queried for a student/session/term, but the parent-facing identity boundary is still separate. The existing guardian model establishes a school-scoped `StudentGuardian` relationship, while the current schema does not yet attach a guardian to a login identity. A future access route must therefore establish authenticated identity, school membership, and the authorized student/guardian relationship before using the entitlement to allow a published result.

The published-result boundary remains assessment-level: publication requires approval and records `assessment.result_published`. Payment must never substitute for that publication state.
