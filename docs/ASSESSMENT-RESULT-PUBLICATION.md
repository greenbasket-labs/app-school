# Assessment Result Publication

## Problem

Approval confirms that a submitted result has been reviewed. Publication is a separate state boundary: only an approved result should become published.

## Slice delivered

- Publication requires an existing approved result.
- Publication is school-scoped and requires the existing `RESULT.APPROVE` capability plus the Assessments module.
- A second publication attempt is rejected.
- Publication creates an audit event recording the actor and transition from `APPROVED` to `PUBLISHED`.
- Publication does not imply report-card generation, parent notification, grading, ranking, or academic-history creation.

## State boundary

The academic workflow now distinguishes:

`DRAFT → SUBMITTED → APPROVED → PUBLISHED`

Each boundary is recorded independently so later workflows can depend on trusted state rather than a UI flag.

## Intentionally deferred

This slice does not implement report cards, academic history, grading rules, ranking, notifications, reopening/correction after publication, or a separate public/parent-facing publication channel. Those require explicit product decisions.
