# App-School Roadmap

## Phase 5 — Communication

- [x] In-app notifications — school-scoped notices, selected active-member recipients, read state and inbox.
- [x] Notification channel preferences — each authenticated school member can tick in-app, SMS, email and WhatsApp preferences. In-app is live; external channels are prepared but not delivered yet.
- [x] Parent/guardian authenticated recipients — owner can create a one-time parent access link for an existing guardian with an email; the guardian creates a password, becomes a school member and can use the same in-app inbox.
- [x] Attendance absence alert — when a student is marked absent, the same notification mechanism can alert linked parent accounts in-app when Communication is enabled.
- [ ] Staff communication expansion — broaden beyond the first selected-member notice flow only when a real workflow requires it.
- [ ] Delivery/status history for external channels.
- [ ] WhatsApp/SMS/email integrations where justified.

## Next smallest slice

Keep solving communication through real school events and recipient rules. Add the next event only when it represents a clear information gap; do not create a separate messaging system.

## Rule

Do not build SMS, WhatsApp, email providers, bulk campaigns or a chat system yet. The platform first establishes one durable notification record, recipient boundary and per-person channel preference. External delivery will plug into that same record later.
