# Payment Provider Integration

## Problem

Manual payment recording proves that money was received, but it still requires a school staff member to receive the money and enter it. The next useful mechanism is to let an existing student invoice produce a trusted online checkout.

## Current slice

App-School now has a small Paystack boundary for Nigerian NGN payments:

1. An authenticated finance user selects an existing open invoice.
2. The server calculates the invoice's current outstanding balance.
3. The server initializes a Paystack transaction using that exact outstanding amount.
4. A `PaymentIntent` stores the school, invoice, provider, reference, amount and checkout URL.
5. Paystack redirects through the callback endpoint, but the callback is not treated as proof of payment.
6. Paystack's `charge.success` webhook is accepted only after `x-paystack-signature` validation.
7. The global webhook matches the provider reference to the stored payment intent; the reference itself carries the school context through the stored intent.
8. Amount/currency and invoice ownership/state are checked again.
9. A successful provider payment creates the existing `PaymentRecord` and marks the payment intent successful in one database transaction.
10. Repeated successful webhooks are idempotent because a successful intent is not fulfilled again.

Paystack recommends webhooks for final payment confirmation, and its webhook signature is an HMAC SHA512 of the raw event payload. The integration follows that model. urlPaystack webhook documentationhttps://paystack.com/docs/payments/webhooks/

Paystack transaction initialization uses the server-side secret key and accepts the amount in the currency subunit. App-School therefore converts NGN naira to kobo only at the provider boundary. urlPaystack transaction API documentationhttps://paystack.com/docs/api/transaction/

## Endpoints

- `POST /api/schools/[schoolId]/finance/payments/paystack/initialize`
  - Requires authenticated membership, `FINANCE.MANAGE`, and the Finance module.
  - Body: `{ invoiceId, payerEmail }`.
  - Returns a Paystack checkout URL and provider reference.

- `GET /api/schools/[schoolId]/finance/payments/paystack/callback`
  - Handles the browser return from Paystack and redirects back to the finance payment page.
  - The redirect itself does **not** create a payment record.

- `POST /api/payments/paystack/webhook`
  - One global webhook URL is used for the Green Basket Paystack integration.
  - Validates the Paystack signature.
  - Processes `charge.success` only.
  - Rejects unknown references, mismatched amounts/currency and non-payable invoices.

## Configuration

The server requires:

```text
PAYSTACK_SECRET_KEY=...
APP_BASE_URL=https://your-app-domain.example
```

Never expose `PAYSTACK_SECRET_KEY` to browser code or commit it to Git. Paystack's API authentication documentation explicitly requires secret keys to remain server-side. urlPaystack authentication documentationhttps://paystack.com/docs/api/authentication/

Configure this single webhook URL in Paystack after deployment:

```text
https://your-app-domain.example/api/payments/paystack/webhook
```

The webhook URL must be publicly reachable in the deployed environment.

## Deliberately deferred

- Parent-facing authentication/portal for starting the payment.
- Paystack customer records.
- School-specific Paystack subaccounts or split settlement.
- Payment receipts.
- Refunds and reversals.
- Reconciliation reports.
- Multiple payment providers.
- Automated retries/background jobs.

The current integration uses the Green Basket Paystack account boundary. Before live school collections, the settlement model must be decided: Green Basket account collection versus school-specific settlement/subaccounts. That is a business/financial decision, not something to silently assume in the code.
