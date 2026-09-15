# App-School Roadmap

## Phase 5 — Communication

- [x] In-app notifications — school-scoped notices, selected active-member recipients, read state and inbox.
- [x] Notification channel preferences — each authenticated school member can tick in-app, SMS, email and WhatsApp preferences. In-app is live; external channels are prepared but not delivered yet.
- [ ] Parent/guardian authenticated recipients — connect existing guardian/student relationships to parent accounts before promising parent in-app delivery.
- [ ] Staff communication expansion — broaden beyond the first selected-member notice flow only when a real workflow requires it.
- [ ] Delivery/status history for external channels.
- [ ] WhatsApp/SMS/email integrations where justified.

## Next smallest slice

Solve parent delivery correctly: establish the parent identity/account boundary using the existing Guardian + StudentGuardian records, then reuse the notification mechanism rather than creating a second messaging system.

## Rule

Do not build SMS, WhatsApp, email providers, bulk campaigns or a chat system yet. The platform first establishes one durable notification record, recipient boundary and per-person channel preference. External delivery will plug into that same record later.
