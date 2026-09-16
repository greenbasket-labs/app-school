# App-School Commercial Billing & Result Access Handoff

## Status

The commercial implementation now has centralized plan rules, database-backed school subscription and Result Access configuration, a pure result-access authorization policy, a provider-neutral result payment-attempt boundary, persisted result payment attempts with school-scoped idempotency, and provider-specific checkout initialization for Paystack and Flutterwave using the existing school payment-provider configuration boundary. Payment verification, result entitlements and settlement remain separate follow-up slices. Monnify remains configured as an available provider but does not yet have a result-access initialization adapter.

## Product model

App-School separates product access, school configuration/authorization, and the future partner/referral layer.

```text
Product access → Free/paid plan + usage limits
School configuration → modules enabled by school → capabilities granted to users
Partner/referral → invitation identity → qualified referrals → partner benefits/rank/rewards
```

These concepts must not become one permission system.

## Initial plans

| Plan | Monthly price | Result-access school share |
|---|---:|---:|
| Free | ₦0 | 0% |
| Basic | ₦5,000 | 25% |
| Starter | ₦10,000 | 50% |
| Pro | ₦20,000 | 75% |
| Premium | ₦35,000 | 100% |
| Custom | Negotiated | 100% by default until negotiated terms are configured |

These are starting commercial values. They are centralized in `src/domain/commercial/plans.ts`; do not scatter prices or plan checks through UI/payment code.

## Result access

A school may configure result access as free or paid.

```text
Fee = ₦0 → no payment → authorized result is available
Fee > ₦0 → show configured fee → verified payment → entitlement → access
```

The result fee is never fixed at ₦200.

## Revenue allocation

When a result-access transaction becomes financially confirmed, calculate the split using the school's active plan and store the actual monetary amounts.

```text
Gross amount → plan/share snapshot → school share + App-School share
```

Historical transactions must never be recalculated after a plan change.

Example:

```text
Basic, ₦200 → School ₦50 / App-School ₦150
Later upgrade to Pro → old transaction remains ₦50 / ₦150
```

## Payment-provider fees

The eventual ledger must preserve gross amount, provider fee, net amount, school share and App-School share. The final rule for whether provider fees are absorbed before allocation or handled separately must be confirmed against the selected provider and commercial agreement before live settlement.

## Result entitlement and security

Payment does not authorize a user to access arbitrary results.

```text
Authenticated user
 → authorized school context
 → authorized student/guardian relationship
 → published result
 → access configuration
 → existing entitlement?
      yes → access
      no  → verified payment → entitlement → access
```

The current policy boundary is `src/domain/commercial/result-access-policy.ts`. It evaluates authorization and publication before payment state, and treats an entitlement only as the final access condition for a paid result.

## Result payment-attempt boundary

`createResultPaymentAttempt()` defines the provider-neutral input contract for a paid result request.

The persisted attempt carries:

- school identity;
- student identity;
- academic session and term context;
- configured monetary amount;
- selected provider (`PAYSTACK`, `FLUTTERWAVE`, or `MONNIFY`);
- a caller-supplied school-scoped idempotency key;
- NGN currency and explicit attempt state.

`ResultPaymentAttempt` is currently persisted through the migration `prisma/migrations/20260916170000_result_payment_attempts/migration.sql` and accessed through `src/domain/commercial/result-payment-attempts.ts`. The database unique constraint on `(schoolId, idempotencyKey)` is the retry boundary. A repeated key returns the existing logical attempt only when its immutable result/payment context matches.

## Provider initialization

`src/domain/commercial/result-payment-initialization.ts` establishes the sequence:

```text
result-access authorization
 → paid-result amount validation
 → persisted idempotent payment attempt
 → existing initialized attempt? return checkout
 → provider initialization
 → persist provider reference + checkout URL + INITIALIZED
```

Provider-specific checkout lives in `src/domain/commercial/result-payment-providers.ts` and reuses the existing `SchoolPaymentProvider` configuration boundary from `src/domain/finance/payment-providers.ts`.

Current adapters:

- Paystack result-access checkout initialization;
- Flutterwave result-access checkout initialization.

The adapters are deliberately separate from the school-finance `PaymentIntent`/invoice flow. They do not record school fee payments and do not treat checkout initialization as proof of payment.

Monnify remains part of the shared provider type/configuration boundary but needs its own result-access adapter before it can be selected for this flow.

A failed provider initialization transitions the persisted attempt to `FAILED`. A successfully initialized attempt becomes `INITIALIZED` and stores the provider reference and checkout URL. A previously initialized idempotent attempt can be returned without creating another provider checkout.

This boundary still does **not** verify payment, create a commercial transaction, allocate revenue, grant result access or perform settlement.

## Bounded contexts

Keep these separate:

```text
School Finance
  → school fees, invoices, payments and receipts

App-School Commercial Billing
  → plans, subscriptions, result-access transactions and platform revenue

Payment Provider Integration
  → initialization, callbacks/webhooks and verification

Settlement
  → money payable/transferred to schools
```

Reuse existing provider primitives where appropriate, but do not turn school-fee records into the App-School revenue ledger.

## Planned database boundary

Incremental migrations are expected to introduce:

```text
Plan
PlanVersion / feature configuration where justified
SchoolSubscription
SubscriptionEvent
ResultAccessSetting
PaymentAttempt
ResultAccessTransaction
ResultAccessGrant
RevenueAllocation
Refund
SchoolSettlement
ProviderEvent / provider reference
```

Current commercial persistence includes `SchoolSubscription`, `ResultAccessSetting`, and `ResultPaymentAttempt`. Immutable commercial transaction, revenue allocation and entitlement models remain intentionally deferred until the provider verification boundary is ready.

These must reuse existing User, School, Student, Guardian, Session, Term and capability identities.

## Idempotency

Protect against double-clicks, refresh/retry, callback retry, webhook retry and duplicate provider events. The current persisted-attempt boundary protects the initialization retry/double-click case. The verified transaction path must add its own idempotent provider-event/transaction boundary before granting access.

## Refunds

Never erase or rewrite the original financial event. Record a refund/reversal linked to the original transaction and reverse the relevant school/App-School allocations.

## Current implementation checkpoint

Implemented:

- centralized Free/Basic/Starter/Pro/Premium/Custom plan configuration;
- centralized starting subscription prices;
- centralized result revenue-share percentages;
- deterministic result-revenue allocation from any configured amount;
- validation of non-negative result-access amounts;
- zero-price normalization to no payment required;
- database-backed `SchoolSubscription` with Free/Monthly/Active defaults;
- database-backed `ResultAccessSetting` with disabled/₦0 defaults;
- new schools initialize both commercial records during onboarding;
- existing schools are lazily materialized with safe Free/disabled defaults when first accessed;
- owner-only Result Access updates with audit evidence;
- school-scoped subscription and Result Access read APIs;
- Prisma migration for the new commercial persistence boundary;
- pure result-access authorization policy with explicit unauthorized, unpublished, payment-required, free and entitled decisions;
- policy tests covering authorization ordering, free access, paid access and entitlement reuse;
- provider-neutral positive-value result payment-attempt contract with provider selection and idempotency key;
- payment-attempt validation tests;
- persisted `ResultPaymentAttempt` with school-scoped idempotency and immutable context checks;
- provider-specific Paystack and Flutterwave result checkout initialization using the existing school provider configuration;
- initialized/failed attempt state transitions with provider reference and checkout URL persistence.

Not yet implemented:

- provider-specific Monnify result payment initialization;
- server-side provider verification for result-access payments;
- immutable result-access transaction ledger;
- immutable revenue allocation snapshot;
- provider webhook/callback event idempotency boundary for commercial transactions;
- result-access entitlement persistence/verification;
- school/App-School settlement ledger;
- refunds/chargebacks;
- subscription lifecycle;
- school commercial dashboard;
- App-School commercial administration dashboard.

## Implementation sequence

1. ~~Centralized commercial plan configuration~~ — implemented and unit-tested.
2. ~~Persist school subscription + plan state~~ — implemented with Free default and onboarding/lazy materialization.
3. ~~Persist school result-access configuration~~ — implemented with owner-only mutation and audit evidence.
4. ~~Establish result authorization boundary~~ — implemented as a pure, tested policy; entitlement storage/verification remains separate.
5. ~~Define result payment-attempt boundary~~ — implemented as a provider-neutral, idempotency-aware pure contract.
6. ~~Persist result payment attempt~~ — implemented with school-scoped idempotency and immutable context validation.
7. ~~Provider-specific checkout initialization~~ — Paystack and Flutterwave implemented using the existing provider configuration boundary; Monnify adapter remains deferred.
8. Verified payment → commercial transaction + immutable revenue allocation.
9. Payment idempotency/webhook replay protection.
10. Result entitlement/unlock.
11. School transaction/revenue view.
12. Subscription lifecycle: renewal, failure, grace, upgrade, downgrade and cancellation.
13. Settlement/refund operations.
14. Commercial analytics/admin surfaces.

Every slice must pass typecheck, tests and production build before the next slice.

## Do not do

- Do not hard-code ₦200.
- Do not scatter plan-specific checks throughout the application.
- Do not recalculate historical transaction splits from the current plan.
- Do not trust frontend payment-success state as payment proof.
- Do not let payment bypass result authorization.
- Do not mix App-School subscription revenue with school fee revenue.
- Do not create a second payment-provider integration when the existing boundary can be reused.
- Do not let commercial plan state override school module enablement or user capabilities.
- Do not build complex settlement/refund/accounting before the MVP transaction path is verified.
