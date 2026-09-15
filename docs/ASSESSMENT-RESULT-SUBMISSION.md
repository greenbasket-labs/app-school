# Assessment Result Submission

A result can move forward only after score validation succeeds.

## Delivered

- Validates the active enrollment roster before submission.
- Blocks missing or invalid scores.
- Requires the existing `SUBMIT_RESULTS` capability and the Assessments module.
- Records the submission in school audit history with the acting user and assessment context.
- Rejects a second submission.
- Locks ordinary score edits after submission.

## Boundary

Submission is not approval. A submitted result remains pending the separate approval workflow.

The current slice uses the existing audit history as the submitted-state marker. A dedicated workflow-state field can be introduced later if approval/reopen requirements justify it.

## Deferred

Approval, publication, grading, ranking, report cards and reopening/correction after submission are intentionally separate slices.
