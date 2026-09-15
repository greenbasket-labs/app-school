# App-School — Monnify Payment Adapter

## Purpose

App-School supports Monnify as a school-configured online payment provider for existing student fee invoices.

The adapter keeps the same trusted lifecycle used by the other providers:

```text
StudentFeeInvoice
      ↓
Monnify PaymentIntent
      ↓
Monnify hosted checkout
      ↓
Monnify webhook
      ↓
Server-side transaction verification
      ↓
PaymentRecord
      ↓
Invoice outstanding balance
```

## Current implementation

- Provider: `MONNIFY`
- Currency: `NGN`
- Hosted checkout initialization
- School-specific settlement/subaccount reference
- PaymentIntent settlement reference snapshot
- Global webhook endpoint
- HMAC-SHA512 webhook verification
- Server-side transaction status verification
- Exact amount/currency/reference checks
- Duplicate-success protection
- Provider-confirmed PaymentRecord with no human actor ID
- Finance module and `FINANCE.MANAGE` authorization

## Environment

```text
MONNIFY_API_KEY=
MONNIFY_SECRET_KEY=
MONNIFY_CONTRACT_CODE=
MONNIFY_BASE_URL=https://api.monnify.com
APP_BASE_URL=
```

Use `https://sandbox.monnify.com` for sandbox work. Monnify's API-first checkout flow authenticates with the API key + secret key, initializes a transaction, returns a checkout URL, and requires server-side verification before treating payment as successful.

## School settlement

The school owner configures a Monnify settlement/subaccount reference under Settings → Payment Providers.

The checkout request sends the school's reference through Monnify's `incomeSplitConfig`. The PaymentIntent also snapshots the configured reference so the historical transaction retains the settlement context used at initialization.

Monnify transaction splitting/subaccounts must be enabled for the merchant account before this part of the integration can be used in live operation.

## Webhook

Endpoint:

```text
POST /api/payments/monnify/webhook
```

The handler accepts `SUCCESSFUL_TRANSACTION`, validates the `monnify-signature` HMAC-SHA512 signature, then re-queries the transaction using its payment reference. The webhook payload or browser callback alone is never trusted as proof of payment.

Monnify documents the production signature header and recommends duplicate protection and server-side verification.

## Callback

The browser callback only redirects the user back to the school's finance page. It does not create a payment record.

## Deferred

- Monnify merchant/subaccount creation inside App-School
- School-specific Monnify credentials/OAuth
- Refunds
- Automated reconciliation/settlement reports
- Reserved-account/invoice collection flows
- POS integrations

Those remain separate slices so the payment core stays small and auditable.
