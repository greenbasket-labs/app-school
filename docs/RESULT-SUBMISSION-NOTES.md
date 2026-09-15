# Result Submission Decision

Result submission is a workflow boundary, not approval.

A complete assessment can be submitted only after score validation succeeds. Submission is audited with the acting user and assessment context. After submission, ordinary score editing is blocked. A submitted result still requires a separate approval step before publication.

The current implementation uses the existing audit history as the submitted-state marker. A dedicated persisted workflow state may be introduced later if the approval/reopen workflow demonstrates that it is necessary.
