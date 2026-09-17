# SkulGo V1 — Identity & School Joining TODO

This is the implementation handoff for the remaining identity blocker in V1. It does not introduce CV/profile features or other post-V1 scope.

## Current state

- Every school membership is attached to a `User`.
- School access is already filtered through active membership.
- Owner-controlled membership disablement is implemented and audited using the repository's existing `MembershipStatus.ENDED` state.
- The current staff creation path still creates a new `User` instead of connecting an existing SkulGo account.
- `Membership` currently carries `isOwner`, `status`, and capabilities, but no explicit school relationship field.

## Required V1 slice

Build the smallest end-to-end joining flow:

```text
Existing SkulGo account
        ↓
Find school
        ↓
Request to join + requested relationship
        ↓
Owner reviews pending request
        ↓
Owner approves and chooses authoritative relationship/capabilities
        ↓
Existing User gets/activates school membership
        ↓
Correct school workspace opens
```

## Join-request data contract

The first implementation should add a `SchoolJoinRequest` record with:

- `schoolId`
- `userId`
- `requestedRelationship`
- optional `requestedCapabilities`
- optional `message`
- `status`
- optional reviewer user id
- optional review timestamp
- created/updated timestamps

The request is pending state only. The requested relationship and capabilities must never become authoritative simply because the requester supplied them.

The school relationship should be stored on the approved `Membership`, so the membership represents the owner's authoritative decision. The relationship must remain separate from capability authorization: relationship describes the person's school position, while capabilities determine what the person is allowed to do.

## Guardrails

- Never create a second personal `User` for a teacher, cashier, staff member, or student relationship.
- A requested relationship is only a request. It is not authoritative until the school owner approves it.
- Capabilities are assigned by the school owner.
- A person can have memberships in multiple schools.
- The unique `(userId, schoolId)` membership constraint must remain enforced.
- Disabling a membership must not delete or disable the personal `User`.
- `MembershipStatus.ENDED` is the current persisted state used when owner disablement ends school access; do not invent a new enum value without a deliberate schema migration.
- All school reads/writes remain school-scoped and audited where meaningful.
- Do not use `?role=` or similar URL parameters to grant authority.
- Do not build a public CV/profile, ratings, endorsements, recommendations, or experience scoring in V1.

## Implementation order

1. Add a Prisma `SchoolJoinRequest` model and the authoritative school-relationship field on `Membership`, then generate the migration through the repository's normal Prisma workflow.
2. Add a user-authenticated school discovery/read path.
3. Add a user-authenticated join-request create/list/cancel path.
4. Add an owner-only pending-request list path.
5. Add an owner-only approve/reject path.
6. On approval, create or reactivate the membership for the existing `User` and assign owner-selected capabilities in one transaction.
7. Make duplicate active membership/request attempts deterministic and safe.
8. Replace or retire the current school-only staff account creation path so it cannot violate the personal-account-first rule.
9. Add focused tests for request, approval, duplicate membership, rejection/cancellation, disablement, and retained personal identity.
10. Add the browser/runtime scenario to `docs/V1-FINISH.md` evidence.

## Do not mark complete until

A real test demonstrates:

- a pre-existing SkulGo account requests to join;
- the owner sees the request;
- the owner decides the relationship/capabilities;
- approval creates or reactivates the school membership for the same `User` id;
- login reaches the correct school workspace;
- disabling the membership removes school access;
- the same personal account still authenticates and can join another school.
