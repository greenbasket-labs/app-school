# Communication — in-app notifications

## Problem

A school can have important information but the right person may not see it. The first communication slice creates a durable in-app notice that can be sent to selected active school members and read from their own inbox.

## Smallest mechanism

- `Notification` stores the school-owned notice.
- `NotificationRecipient` stores exactly which school memberships should receive it and whether it was read.
- `NotificationPreference` stores a person's channel choices.
- In-app is enabled by default.
- SMS, email and WhatsApp are stored as future channel choices but are not sent yet.

## Authorization

- The Communication module must be enabled by the school owner.
- Sending requires `COMMUNICATION.SEND`.
- A recipient only sees notifications addressed to their own active school membership.
- Reading and preference changes do not require a special communication permission; they belong to the authenticated member.

## Important boundary

Current guardian records do not have authenticated parent memberships, so this slice does not pretend that parents already have an in-app inbox. The existing guardian/student relationship remains the foundation for a later parent account/portal flow. SMS/email/WhatsApp delivery is also intentionally deferred until the channel integrations are justified.

## Future path

```text
Notification
    ↓
recipient + channel preference
    ↓
IN_APP now
SMS / EMAIL / WHATSAPP later
```

External delivery should reuse the same notification record rather than create separate communication ledgers.
