# App-School Result Workflow Handoff

## Current contract

The academic result lifecycle is intentionally ordered:

```text
DRAFT → SUBMITTED → APPROVED → PUBLISHED
```

Each transition is server-authorized and leaves audit evidence.

## Authorization rules

- Result submission requires `RESULT.SUBMIT`.
- Result approval requires `RESULT.APPROVE`.
- Result publication requires `RESULT.PUBLISH`.
- The school owner is allowed to publish as an ownership authority.
- A non-owner may publish only when the owner has explicitly assigned `RESULT.PUBLISH` to that active school membership.
- `RESULT.APPROVE` does not automatically grant publication authority.
- Publication is an online/server-authoritative action because publication changes the externally visible meaning of a result.

## Important invariants

- A result cannot be submitted while score validation reports missing or invalid scores.
- A result cannot be approved before submission.
- A result cannot be published before approval.
- Duplicate transitions are rejected.
- Assessment ownership is checked against the school context.
- Parent/guardian result access is separately governed by authenticated guardian identity, student relationship, publication state and the commercial result-access entitlement boundary. Payment does not bypass authorization.

## Implementation boundary

The result lifecycle currently uses assessment audit events as the durable transition evidence. This preserves historical state without introducing a second result-status database prematurely.

Publication also triggers the existing parent result-publication notification path.

## Next work

1. Verify the complete submit → approve → publish route chain with integration/browser coverage.
2. Verify `RESULT.PUBLISH` owner/delegation behavior through the real capability-assignment workflow.
3. Verify published-report-card semantics: publication must reflect an explicit published state, not merely the presence of assessment data.
4. Build the report-card/read model above trusted published records.
5. Add offline result preparation/capture reconciliation while keeping final publication online-only.

## Do not change casually

Do not merge approval and publication into one permission. Do not make payment an authorization substitute. Do not make local/offline state appear server-confirmed before synchronization acknowledgement.
