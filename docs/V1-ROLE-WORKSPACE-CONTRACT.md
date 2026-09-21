# V1 Role & Workspace Contract

## Purpose

This document records the product decisions that must survive a developer or AI handover.

SkulGo is not built as a collection of separate role-specific applications. One person has one personal SkulGo account and may have legitimate relationships with one or more schools.

```
PERSON
  ↓
SkulGo personal account
  ↓
School relationship / membership
  ↓
Capabilities + workspace
```

The school relationship determines the kind of workspace the person enters. Capabilities determine what the person is allowed to do. Where teaching is concerned, teacher assignments determine the class/subject scope.

## Product reason

App-School exists to make useful school technology economically accessible through shared software and infrastructure rather than requiring each school to independently assemble developers, hosting, databases, backups, security, updates and support.

The product is problem-first: understand the real school workflow, define ownership and rules, build the smallest reliable slice, then verify security, tenancy, audit, offline behavior and recovery.

The core V1 groups are:

- Owner / principal: visibility, control, configuration, finance, trusted results and management information.
- Teacher: teaching, subject/class academic work, attendance where responsible, scores and poor-connectivity continuity.
- Student: school identity, enrollment, attendance and academic history.
- Parent / guardian: authorized child information, notifications and published results.
- Cashier / finance staff: finance work limited by explicit school access.
  
These are different experiences over the same school-scoped data model.

## Personal account and school selection

A person has one SkulGo personal account even when connected to multiple schools.

After an application is approved:

1. The existing personal account remains the same.
2. An active school membership/relationship is created or activated.
3. The person first sees the SkulGo account/school relationship view.
4. The person selects the school to enter.
5. The school workspace is derived from the approved relationship and access state.

Do not create separate role accounts and do not use URL query parameters such as `?role=teacher` to simulate identity.

## Capabilities

Capabilities are the authorization boundary for school actions.

Owner-controlled access rules:

- The owner controls staff capabilities.
- A teacher does not request or add capabilities for themselves.
- The owner approves the school relationship and selected initial capabilities together.
- Changing capabilities later is an owner-controlled action.
- Enabling a school module does not automatically grant every staff member access.
- Backend authorization must enforce school tenancy, active membership, capability and relevant resource scope.

Capabilities answer:

> What can this person do?

## Teacher workspace

Teachers have a genuinely separate Teacher workspace, not an owner workspace with owner controls hidden.

The Teacher workspace navigation is dynamically derived from the teacher's capabilities. If a teacher lacks attendance access, attendance should not appear in the navigation.

The dashboard may use a consistent structure across teachers, but dashboard sections/actions must respect current access.

The GB School demo previously reviewed is only a UX reference for structure and clarity. It is not an authorization model and its `?role=teacher` URLs must not be copied.

## Teacher assignments

Capabilities alone are not sufficient for subject teaching scope.

A teacher assignment defines:

```
Teacher → Class → Subject → Academic session / term
```

A teacher can have multiple simultaneous assignments and may:

- teach the same subject in different classes;
- teach different subjects in different classes;
- teach multiple subjects in the same class.

Assignment scope answers:

> Where and which subject does this teacher teach?

Standard academic teaching actions automatically follow a valid subject-teaching assignment. These include the normal subject workflow such as creating assignments/CA, marking/recording work and entering academic scores.

Teacher assignments are managed by the school owner/admin or authorized staff with the relevant academic-management capability.

Assignments can carry forward into a new term/session, and authorized staff can modify the current assignment. Previous assignment versions remain historical records.

## Class-teacher responsibility

Class teacher/class master is a separate class-level responsibility:

```
Teacher → Class → Class-teacher responsibility → Academic session / term
```

It is not a subject.

A teacher can be both:

- class teacher for a class; and
- subject teacher for one or more subjects/classes.

A class teacher can record attendance for the entire assigned class. Ordinary subject teachers who are not class teachers do not automatically receive attendance responsibility.

## Student subject enrollment

For a teacher working on:

```
Class → Subject
```

the operational student roster is the students currently enrolled in that subject.

- Subject enrollment is managed by school admin/authorized staff.
- A teacher does not individually add or remove students from their subject roster.
- A teacher should not see unrelated students in the subject work area.
- Academic actions are hard-scoped to the enrolled student set.

If a teacher has two subjects in one class, the UI supports both:

- class-first navigation, then subject selection; and
- direct subject access from the teacher dashboard.

## Academic assessment configuration

Assessment types are school-specific.

SkulGo should provide sensible defaults, while each school can customize its assessment types.

Authorized owner/admin or staff can configure the types.

An assessment type has a school-wide maximum/weight rule. Example:

```
CA1 → 10
CA2 → 10
Exam → 70
```

Scores above the configured maximum are rejected by hard validation.

## Score submission and locking

A teacher enters scores for the students in the subject scope.

When the teacher submits a complete score set, the system asks for explicit confirmation:

> Are you sure you want to submit these scores? After submission, you will not be able to edit them.

After confirmation, the teacher cannot edit the submitted scores.

The submitted result keeps:

- original submitting teacher;
- exact submission time.

The UI can simply present the result as **Submitted**.

## Locked-score correction

Locked scores are not silently edited.

An authorized correction must use a controlled correction process with a reason and an audit trail.

The school keeps the original academic record. A correction does not erase the original history.

Correction history must include:

- original submitting teacher;
- original submission time;
- correcting user;
- correction time;
- old score;
- new score;
- reason.

The teacher and administrators can see the correction history, including corrections made by other authorized users.

When a correction happens:

```
Original submitted by → Teacher
Corrected by → Authorized admin/staff
```

Both identities remain preserved.

## Historical access rule

If a teacher is removed from a class/subject assignment, that teacher does not retain access to the previous class/subject records through that old assignment.

The historical academic records remain with the school and remain available to authorized school users.

Removing a teacher from an assignment must never delete or alter the academic records already entered.

## Owner / principal workspace

The owner/principal is responsible for school-level visibility and control, including:

- staff access administration;
- capabilities;
- school configuration;
- module settings;
- application review;
- finance and management visibility;
- trusted result workflow.

Owner controls must not leak into teacher, student or parent workspaces.

## Student workspace

The student experience is based on the person's personal account and active school relationship/enrollment.

The student should only see school data legitimately associated with the student's enrollment and publication state.

## Parent / guardian workspace

Parent/guardian access is based on a verified guardian relationship and active child enrollment.

The parent should only access children for whom the school has established the authorized relationship.

Published results and important notifications remain school-authoritative.

## Cashier / finance workspace

Finance access is capability-controlled and school-scoped.

A cashier should not inherit owner controls merely because they work with money.

Finance writes must preserve honest state, especially when offline: locally queued activity must never be represented as confirmed payment until server/provider confirmation exists.

## Shared engineering rules

Across all workspaces:

- PostgreSQL remains the server source of truth.
- Tenant boundaries are enforced from authenticated user → active membership → school context → capability/resource scope.
- Audit history is used for important changes.
- Offline-first uses the shared durable local data + outbox + sync infrastructure.
- Local pending state must never be presented as server confirmation.
- Important conflicts must be detected rather than silently overwritten.
- Server-authoritative publication/approval actions remain authoritative on the server.
- New role-specific UI must not introduce a second identity system.
- Do not add broad features unless they solve a real V1 problem.

## Handover rule

A new developer or AI agent should read this document together with:

- `README.md`
- `docs/ROADMAP.md`
- `docs/V1-IDENTITY-JOINING-HANDOFF.md`
- `docs/V1-FINAL-SLICES.md`
- `docs/ARCHITECTURE.md`

Before changing authorization or workspace behavior, verify the implementation against this contract and the actual database/domain model.

