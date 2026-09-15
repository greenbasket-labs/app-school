# Assessment Result Submission

## Problem

A result should not move forward merely because somebody clicked a button. The system must first establish that the assessment has a complete, valid score set, then record that the result was submitted.

## Slice delivered

- Submission validates the assessment's active enrollment roster before accepting the result.
- Missing scores block submission.
- Stored scores outside the assessment maximum block submission.
- Submission is school-scoped and requires the existing `SUBMIT_RESULTS` capability plus the Assessments module.
- Submission creates an audit event recording the actor, assessment and submitted state.
- Once submitted, score capture is locked so ordinary score edits cannot silently change the submitted result.
- A second submission attempt is rejected.

## State boundary

The current slice represents the submitted state through the authoritative audit event. Approval remains a separate workflow and is intentionally not implied by submission.

## Intentionally deferred

This slice does not implement result approval, publication, grading rules, ranking, report cards, or reopening/correction after submission. Those require explicit workflow decisions rather than accidental permissions.
