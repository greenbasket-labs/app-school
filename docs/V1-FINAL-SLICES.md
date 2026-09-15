# V1 final small slices

This change finishes one deliberately small slice from each remaining V1 platform area without reopening completed workflows.

1. **Operational dashboard** — current active students, staff, attendance records today, open invoices and outstanding amount.
2. **Management summary** — compact derived management view of current school state.
3. **Export workflow** — authenticated school-scoped CSV export of the management summary.
4. **Rules/configuration foundation** — owner-only school-scoped rule definitions with enabled state, version and JSON configuration.
5. **Background jobs foundation** — durable `PlatformJob` queue records and a `SKIP LOCKED` claim primitive.
6. **Reliable notification foundation** — notification processing can be queued idempotently by notification ID; external channel delivery remains intentionally unimplemented.
7. **Offline-first foundation** — stable school/operation/action identity contract for future offline writes.
8. **Idempotent sync foundation** — school-scoped idempotency records prevent the same logical operation from being applied twice by retrying clients.
9. **Anomaly detection** — small deterministic checks for missing or unexpectedly high attendance records.
10. **AI-ready assistance boundary** — deterministic management context that explicitly treats school records as the source of truth and does not invent or mutate data.

## Production smoke check

`GET /api/health` performs a real database `SELECT 1` and returns HTTP 200 when the application can reach PostgreSQL, or HTTP 503 when it cannot.

## Intentionally not expanded here

- SMS, email and WhatsApp providers
- full background-worker infrastructure
- browser/local database implementation for offline mode
- automated AI model calls
- complex accounting reconciliation
- bulk campaign messaging

These remain separate future slices so V1 stays understandable and testable.
