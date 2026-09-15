# Assessment Result Approval

## Problem

Submission establishes that a complete result set is ready for review. Approval is a separate trust boundary: another authorized person must explicitly accept the submitted result before it can move toward publication.

## Slice delivered

- Approval is school-scoped.
- The Assessments module is required.
- The existing `RESULT.APPROVE` capability is required.
- A result must already have a recorded `assessment.result_submitted` event.
- The person who submitted the result cannot approve the same result.
- A result can only be approved once.
- Approval creates an audit event containing the actor, assessment context and previous/current state.
- Publication remains a separate workflow.

## State boundary

The authoritative workflow is represented by audit state transitions:

`DRAFT → SUBMITTED → APPROVED`

The slice does not silently imply publication, grading, ranking or report-card generation.

## Intentionally deferred

- Result publication
- Reopening or correction after approval
- Grading and ranking rules
- Report cards
- Parent-facing results
