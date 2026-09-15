# Assessment Definitions

Assessment Definitions are the first slice of the Phase 3 academic engine.

## Purpose

The system must define **what assessment exists before it records student scores**. This slice creates that trusted structure without implementing score capture or result processing.

## Definition boundary

Each assessment definition belongs to exactly one:

- school
- academic session
- academic term
- class arm
- subject

It also has:

- assessment name
- maximum score
- created/updated timestamps

## Validation

Creation requires:

1. The academic session belongs to the active school context.
2. The academic term belongs to the selected academic session.
3. The class arm belongs to the school.
4. The subject belongs to the school.
5. The subject is assigned to the selected class arm for the selected academic session.
6. Maximum score is greater than zero and no more than 10,000.
7. Assessment names are unique within the same school, term, class arm and subject.

## Security

Assessment operations require:

- authenticated session
- active school membership
- `ASSESSMENTS` module enabled
- `ASSESSMENT.CREATE` capability

The assessment record is always scoped by `schoolId`.

## Audit

Successful creation creates an `AuditEvent` with the school, acting user, assessment entity and current definition state.

## Intentionally deferred

This slice does **not** implement:

- student scores
- score editing
- score validation rules
- result submission
- result approval
- result publication
- report cards
- academic ranking

Those remain separate roadmap slices so each mechanism can be understood and validated before the next dependency is added.
