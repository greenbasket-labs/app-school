# Report Cards

## Problem

Once academic results are published, the school needs a trustworthy student-facing record of what was actually published. The first slice should expose that record without inventing grading or ranking rules that the platform has not configured.

## Slice delivered

- A report card is school-scoped and student-scoped.
- It is available only from published assessment results.
- The selected student must belong to the school and have an enrollment in the selected academic session.
- The selected term must belong to the selected session and school.
- Each published assessment is returned with subject, assessment name, score, maximum score and percentage.
- Earned and possible totals plus an overall percentage are returned for the published assessment set.
- Access requires `STUDENTS.VIEW` and the Assessments module.

## Trust boundary

The report card does not treat a draft, submitted, or merely approved assessment as published. Publication remains the prerequisite state.

Workflow:

`DRAFT → SUBMITTED → APPROVED → PUBLISHED → REPORT CARD VIEW`

## Intentionally deferred

This slice does not define grading bands, letter grades, class ranking, positions, teacher comments, attendance summaries, behavior records, report-card PDF generation, parent delivery, or academic-history storage. Those need explicit product decisions and trusted underlying rules first.
