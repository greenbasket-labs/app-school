# Assessment Score Validation

App-School validates an assessment before it can move toward result submission.

## What is validated

For a selected assessment, validation derives the authoritative roster from active enrollments in the assessment's academic session and class arm, then checks:

- every active enrolled student has a score;
- every stored score is finite and within `0..maxScore`;
- the assessment belongs to the current school.

The result reports roster count, scored count, missing count, invalid count, and the affected student IDs.

## Why this is separate from score capture

Score capture prevents an invalid value from being entered during normal operation. Validation is a second boundary over the complete assessment state. It answers the operational question: **is this assessment complete and internally valid enough to continue?**

Result submission and approval are intentionally deferred. This slice only establishes the validation mechanism they can rely on later.

## Security boundary

The validation endpoint requires:

- an authenticated session;
- membership capability `ASSESSMENT.CREATE`;
- the `ASSESSMENTS` school module to be enabled;
- the assessment to belong to the requested school.

No cross-school roster or score data is returned.
