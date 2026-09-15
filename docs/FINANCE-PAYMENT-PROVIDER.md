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

Paystack supports subaccounts and transaction splitting, including passing a school subaccount code during transaction initialization. urlPaystack split payments documentationhttps://paystack.com/docs/payments/split-payments/

Flutterwave supports subaccounts and split payments, where a subaccount identifier is used to route settlement to the configured account. urlFlutterwave split payments documentationhttps://developer.flutterwave.com/docs/split-payments

Monnify supports transaction splitting through subaccounts and an `incomeSplitConfig` on payment requests. urlMonnify transaction splitting documentationhttps://developers.monnify.com/docs/collections/manage-payments/transaction-splitting

## Current implementation

The current slice establishes the school-settlement boundary and uses it for Paystack:

1. The school owner opens Settings → Payment providers.
2. The owner configures a provider and its settlement/subaccount reference.
3. The provider reference is stored against that school, not globally.
4. An online payment for an invoice resolves the configured provider account for that school.
5. A `PaymentIntent` snapshots the settlement reference used for that transaction so later configuration changes do not rewrite the transaction's historical context.
6. Paystack initialization passes the school's configured subaccount.
7. Paystack's webhook remains the proof of successful payment.
8. A verified successful provider event creates the existing school-scoped `PaymentRecord`.

Provider credentials remain server-side. The school setting stores the provider's settlement reference, not a browser-accessible secret key.

## School settings

Payment provider configuration is part of the school's Settings control surface.

Only the active school owner can configure or update it. Configuration changes are audited.

A provider may be enabled or disabled without deleting its configuration history or payment records.

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
Signature / event verification
      ↓
Invoice + amount + school validation
      ↓
PaymentRecord
```

The browser return/callback is navigation only. It is not proof that money was received.

## Paystack-specific boundary

Paystack currently uses:

```text
POST /transaction/initialize
subaccount = school's configured Paystack subaccount code
```

The App-School server keeps the Paystack secret key private. Paystack's API authentication documentation requires secret keys to remain server-side. urlPaystack authentication documentationhttps://paystack.com/docs/api/authentication/

The webhook validates Paystack's `x-paystack-signature` HMAC SHA512 signature before processing `charge.success`.

## Deliberately deferred

- Flutterwave adapter
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

The settlement architecture is now school-specific, but the commercial settlement model still needs to be decided before live collections: whether Green Basket charges a platform/service fee, whether that fee is split by the provider, and who bears provider transaction fees. Those are financial/business decisions, not assumptions to hide in the code.
