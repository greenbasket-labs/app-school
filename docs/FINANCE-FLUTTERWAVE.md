# Flutterwave Payment Adapter

App-School now supports Flutterwave as a second concrete online-payment provider.

## Flow

```text
School invoice
   ↓
Flutterwave PaymentIntent
   ↓
Flutterwave Standard checkout
   ↓
School-configured Flutterwave subaccount
   ↓
charge.completed webhook
   ↓
verif-hash validation
   ↓
Flutterwave transaction verification
   ↓
Invoice/reference/amount/currency validation
   ↓
PaymentRecord
```

Flutterwave's current Standard API accepts `subaccounts` for split settlement and its webhook documentation recommends signature validation plus server-side transaction verification before giving value. citeturn0search2turn0search0turn1search1

## Server configuration

```text
FLW_SECRET_KEY=...
FLW_SECRET_HASH=...
APP_BASE_URL=https://your-app-domain.example
```

The webhook endpoint is:

```text
POST /api/payments/flutterwave/webhook
```

The browser callback is navigation only:

```text
GET /api/schools/[schoolId]/finance/payments/flutterwave/callback
```

## Important rules

- The school owner configures the Flutterwave settlement/subaccount reference in Settings.
- Provider secrets stay server-side.
- The invoice's current outstanding amount is used to initialize checkout.
- The webhook is not trusted by itself; App-School verifies the transaction with Flutterwave.
- The transaction reference must match the stored `PaymentIntent`.
- Amount and currency must match the stored intent.
- Duplicate successful webhook processing is idempotent.
- Provider-confirmed payments may have no human `recordedByUserId` because the provider event is the actor.

## Deferred

Monnify, receipts, refunds, reconciliation, provider account creation, automated retries and Green Basket commission rules remain separate slices.
