# Assessment Score Capture

## Problem

Once a school defines an assessment, the next real academic workflow is recording each enrolled student's score without rebuilding the class roster manually or allowing scores to escape their school/class/session context.

## Slice delivered

- Scores are school-scoped records linked to an `AssessmentDefinition`.
- A student may have one score per assessment.
- Score capture uses the assessment's academic session and class arm to determine the eligible active enrollment roster.
- A score must be at least `0` and cannot exceed the assessment's configured `maxScore`.
- Existing scores are updated in place when corrected.
- Score creation and score updates create audit events with the acting user, previous score (when applicable), and current score.
- The Assessments module and existing `ASSESSMENT.CREATE` capability are enforced for both roster reads and score writes.

## Tenant/security boundary

The server never trusts a browser-provided student/class relationship. It first loads the assessment for the supplied `schoolId`, then requires an active enrollment for that same student, academic session and class arm, with the student itself belonging to the school.

## Intentionally deferred

This slice does not implement score validation policies beyond the assessment maximum, result submission, approval, publication, grading, ranking, report cards, bulk import, or parent-facing results.
