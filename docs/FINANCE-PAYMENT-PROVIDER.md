# Payment Provider Integration

## Problem

Manual payment recording proves that money was received, but it still requires a school staff member to receive the money and enter it. Online collection should remove that manual step without turning Green Basket into the silent owner of school funds.

## Settlement principle

**Each school has its own provider settlement configuration.**

App-School is the shared technology platform. The school's payment provider account/subaccount is the settlement destination for that school's collections.

The payment record remains school-scoped inside App-School, while the provider handles the external money movement.

This is intentionally different from using one Green Basket settlement account for every school.

## Provider architecture

The application has a provider catalog rather than making Paystack the finance model:

- `PAYSTACK`
- `FLUTTERWAVE`
- `MONNIFY`

Each school can configure the provider settlement/subaccount reference it owns or has been assigned.

Paystack supports subaccounts and transaction splitting. urlPaystack split payments documentationhttps://paystack.com/docs/payments/split-payments/

Flutterwave supports subaccounts and split payments, including a subaccount ID in Standard checkout. urlFlutterwave Standard checkout documentationhttps://developer.flutterwave.com/v3.0/docs/flutterwave-standard-1

Monnify remains catalogued for a later adapter.

## Current implementation

The current slices establish the school-settlement boundary and implement Paystack plus Flutterwave:

1. The school owner opens Settings → Payment providers.
2. The owner configures a provider and its settlement/subaccount reference.
3. The provider reference is stored against that school, not globally.
4. An online payment for an invoice resolves the configured provider account for that school.
5. A `PaymentIntent` records the provider and transaction reference for that payment.
6. Paystack initialization passes the school's configured subaccount.
7. Flutterwave initialization passes the school's configured subaccount ID.
8. Provider webhooks are verified before successful payments are accepted.
9. Provider transaction data is checked against the stored intent and invoice before creating `PaymentRecord`.
10. A verified successful provider event creates the existing school-scoped `PaymentRecord`.
11. Repeated successful provider events are idempotent.

Provider credentials remain server-side. The school setting stores the provider's settlement reference, not a browser-accessible secret key.

## Flutterwave-specific boundary

Flutterwave uses Standard checkout:

```text
POST /v3/payments
currency = NGN
subaccounts = [{ id: school's configured Flutterwave subaccount }]
```

Flutterwave sends `charge.completed` webhook events. The webhook checks the configured `verif-hash` secret, then App-School re-verifies the transaction through Flutterwave's transaction verification endpoint before recording the payment. This follows Flutterwave's recommendation to verify critical transaction data rather than trusting the webhook payload alone. citeturn0search0turn1search1

Required server configuration:

```text
FLW_SECRET_KEY=...
FLW_SECRET_HASH=...
APP_BASE_URL=https://your-app-domain.example
```

The webhook URL is:

```text
https://your-app-domain.example/api/payments/flutterwave/webhook
```

## School settings

Payment provider configuration is part of the school's Settings control surface.

Only the active school owner can configure or update it. Configuration changes are audited.

A provider may be enabled or disabled without deleting its configuration or payment records.

## Payment lifecycle

```text
School invoice
      ↓
PaymentIntent
      ↓
Provider adapter
      ↓
Provider checkout
      ↓
Provider webhook
      ↓
Signature + provider verification
      ↓
Invoice + amount + school validation
      ↓
PaymentRecord
```

The browser return/callback is navigation only. It is not proof that money was received.

## Automated provider payments

Manual payments have a human `recordedByUserId`. Provider-confirmed payments are system-recorded, so `PaymentRecord.recordedByUserId` may be null for those records. The provider reference and payment intent preserve the external payment evidence.

## Deliberately deferred

- Monnify adapter
- Provider account/subaccount creation automation
- Provider OAuth/merchant credential management
- Parent-facing authentication/portal for starting payments
- Receipts
- Refunds and reversals
- Reconciliation reports
- Provider settlement reconciliation
- Green Basket platform commission rules
- Background retry processing

The settlement architecture is now school-specific. The commercial settlement model still needs to be decided before live collections: whether Green Basket charges a platform/service fee, whether that fee is split by the provider, and who bears provider transaction fees. Those are financial/business decisions, not assumptions to hide in the code.
