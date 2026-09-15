# Academic History

## Problem

A student's academic record should not disappear when a term or academic session changes. The platform needs a durable read path across published results while keeping school boundaries intact.

## Slice delivered

- Academic history is school-scoped and student-scoped.
- Only published assessment results are included.
- Results are returned across academic sessions and terms, ordered chronologically.
- Each entry retains session, term, subject, assessment name, score, maximum score and percentage.
- The student must belong to the requesting school.
- Access requires `STUDENTS.VIEW` and the Assessments module.

## Trust boundary

Academic history reads the published state boundary rather than treating draft, submitted or merely approved assessments as final history.

Workflow:

`DRAFT → SUBMITTED → APPROVED → PUBLISHED → REPORT CARD VIEW → ACADEMIC HISTORY`

## Intentionally deferred

This slice does not add a separate history table, grading bands, cumulative GPA/CGPA, ranking, positions, teacher comments, attendance history, behavior history, transcript generation, exports or parent delivery. Those should be introduced only when their rules and source records are defined.
