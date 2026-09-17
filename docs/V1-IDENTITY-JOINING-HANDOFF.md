# V1 Identity & School Joining Handoff

This document defines the implementation boundary for the personal-account-first school joining flow.

## Core identity rule

```text
One person
  ↓
One SkulGo personal User account
  ↓
One or more legitimate school relationships
  ↓
Correct school workspace
```

A school relationship is not a separate login identity.

## Required flow

1. A person creates or already has a SkulGo personal account.
2. The person discovers a school.
3. The person submits a school join/application request.
4. The school owner reviews the pending request.
5. The owner decides the person's school relationship and grants the appropriate capabilities.
6. Approval creates or activates the school membership for the existing `User`.
7. The person can then enter the school workspace using the same SkulGo account.
8. When the person leaves, the school disables/ends that membership; the personal account remains available.

## Relationship principle

The person may request a relationship, but the request is not authoritative.

Examples of requested relationships include:

- Student
- Teacher
- Staff
- Cashier
- Other school-defined relationship required by V1

The school owner remains authoritative for approval and access capabilities.

## Safety invariants

- Never create a second school-only `User` for an existing SkulGo person.
- Enforce one membership per `(userId, schoolId)`.
- Keep every school-owned operation school-scoped.
- Owner approval must be authorized by the target school.
- A disabled/ended membership must not grant school workspace access.
- Disabling school access must not delete the personal `User`.
- Role or relationship selection must never be accepted from a URL query parameter as an authorization mechanism.
- Every meaningful approval/rejection/disablement state change should be auditable.

## V1 implementation shape

Use a school join-request record as the pending state between a personal account and a school membership.

The request must retain at least:

- `schoolId`
- `userId`
- requested relationship
- optional requested capabilities/message
- status
- reviewer
- review timestamp
- created/updated timestamps

The approval transaction should validate the request, verify the approving owner belongs to the same school, create/activate the existing user's membership, apply owner-selected capabilities, record review state, and write an audit event.

## Explicit non-goals

Do not build a public SkulGo CV/profile, experience scoring, ratings, endorsements, recommendations, social networking, or generalized role simulation as part of this slice.

Those are outside V1.
