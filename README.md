# App-School

App-School is a multi-tenant school operating platform built by **GREEN BASKET GLOBAL LIMITED**.

Its purpose is to help schools capture important operational events once, preserve trusted history, validate and calculate from that history, connect related information, and deliver the right information to the right people.

## Product principles

- One App-School core can serve many schools.
- School data is strictly tenant-scoped.
- Capabilities are the authorization source of truth; roles/workspaces are presentation and workflow groupings.
- School modules can be enabled or disabled independently, but a disabled module is unavailable regardless of user capability.
- Important changes are validated and audited.
- Historical truth is preserved; derived views should come from authoritative records.
- Offline-first is a platform requirement, not a cosmetic feature.
- App-School commercial billing is separate from school finance.
- Payment never replaces identity, school authorization, student relationship or result-publication checks.

## Offline-first architecture

The target architecture is:

```text
Online:  UI → local durable store → sync → server → PostgreSQL
Offline: UI → local durable store → durable outbox
```

Local save is not server confirmation. Server authorization, validation and audit remain authoritative when changes synchronize.

## Offline implementation checkpoint

The shared offline platform foundation is being built incrementally. The repository currently contains:

- versioned IndexedDB local persistence;
- shared school-scoped local repository primitives;
- durable outbox persistence;
- shared synchronization lifecycle states;
- executor-based pending-operation sync engine;
- connectivity/reconnect scheduling primitives;
- an initial authoritative pull/reconciliation contract using server versions and explicit `APPLY`, `CONFLICT` and `IGNORE` classification;
- a common sync-status model for application-wide UI semantics;
- assessment score local-first mutation and an idempotent server-save boundary as the first reference-workflow foundation.

These pieces are **platform foundations, not a claim that App-School is already fully offline-ready**. The remaining work includes live pull/reconciliation, browser persistence/reconnect tests, visible sync telemetry, offline authentication/session handling, and complete end-to-end adoption by each operational module.

The canonical offline implementation contract is `docs/OFFLINE-FIRST-HANDOFF.md`.

## Product development philosophy

App-School is **problem-first, not feature-first**.

Do not copy another school application and rename its features. Start from the real school problem, understand the people and workflow involved, identify what the software should prevent/detect/remember/calculate/connect/communicate, then design the smallest reliable mechanism that solves it.

The development loop is:

```text
Real problem
   ↓
Understand the workflow
   ↓
Identify rules, states and ownership
   ↓
Design the smallest useful slice
   ↓
Implement
   ↓
Validate security + data boundaries
   ↓
Test online + offline + reconnect behavior
   ↓
Record the decision
   ↓
Next slice
```

The goal is not the largest feature list. The goal is a strong platform that can safely absorb new modules over time.

## Current vertical slices

1. **Identity foundation** — User → Organization → unique CAC identity → School → Membership → audit history.
2. **Authentication** — password authentication, database-backed sessions and secure session cookie.
3. **Capability authorization** — school-scoped capability checks rather than hardcoded role behavior.
4. **School structure** — academic sessions, terms, class levels, class arms, subjects and subject-to-class assignments.
5. **Student operations** — student records and session/class enrollment.
6. **Attendance** — school-scoped daily attendance roster, quick marking, bulk save and audited correction.
7. **School setup** — owner/manager workflow for configuring the academic foundation.
8. **Module configuration foundation** — school module catalog plus owner-only enable/disable settings with audit history.
9. **Module enforcement** — enabled module state is checked by the backend before student, enrollment and attendance operations are allowed; capabilities still apply separately.
10. **Academic session lifecycle** — sessions move forward from draft → active → closed with validation and audit history.
11. **Staff & access foundation** — owner-managed staff accounts, school memberships and explicit capability assignment with audit history.
12. **Setup readiness** — live checklist verifies the minimum academic foundation required before a school is considered ready.
13. **School profile configuration** — owner-managed school name and basic contact details with audited changes.
14. **Attendance history & correction** — historical attendance search plus capability-controlled corrections with previous/current state audit evidence.
15. **Parent/guardian records** — school-scoped guardian records plus many-to-many student relationships, with relationship metadata and audited link/unlink actions.
16. **Student status lifecycle** — controlled active/inactive/withdrawn transitions with terminal withdrawal and audit history.
17. **Assessment definitions and initial score capture** — assessment roster, per-student score validation and audited score persistence.
18. **Offline platform foundation** — shared local persistence, outbox, sync lifecycle, scheduler, reconciliation contract, status model and assessment-score idempotency boundary.
19. **Commercial plan foundation** — centralized Free/Basic/Starter/Pro/Premium/Custom pricing and deterministic result-access revenue allocation.
20. **Commercial persistence foundation** — database-backed school subscription and Result Access configuration; new schools initialize to Free/disabled defaults, existing schools are safely materialized on first access, and owner changes are audited.
21. **Result access authorization boundary** — a tested policy evaluates school authorization, student authorization, publication state, free/paid configuration and existing entitlement in a fixed order; payment state does not bypass authorization.

## Commercial billing & result access

App-School commercial billing is separate from school finance.

Initial commercial configuration:

| Plan | Monthly price | School share of paid result access |
|---|---:|---:|
| Free | ₦0 | 0% |
| Basic | ₦5,000 | 25% |
| Starter | ₦10,000 | 50% |
| Pro | ₦20,000 | 75% |
| Premium | ₦35,000 | 100% |
| Custom | Negotiated | 100% by default until negotiated terms are configured |

A school can configure Result Access as free or paid. A paid result uses the configured fee; there is no hard-coded ₦200 rule.

The commercial flow is intended to become:

```text
Authenticated user
 → authorized school context
 → authorized student/guardian relationship
 → published result
 → access configuration
 → existing entitlement?
      yes → access
      no  → verified payment → entitlement → access
```

The current policy implementation is pure and testable. Payment attempts, provider verification, immutable transactions, entitlements, webhooks, refunds and settlement remain separate implementation slices.

The canonical commercial handoff is `docs/COMMERCIAL-BILLING-HANDOFF.md`.

## Module model

The application has a central module catalog and a school-specific configuration layer.

Current module catalog:

- School setup
- Students
- Attendance
- Assessments
- Finance
- Communication
- Reports

A school controls which modules are enabled. User capabilities independently control what an authorized user can do within an enabled module.

## Documentation

- `ARCHITECTURE.md` — system boundaries and technical architecture.
- `docs/ROADMAP.md` — implementation roadmap and completion state.
- `docs/OFFLINE-FIRST-HANDOFF.md` — offline architecture and developer takeover contract.
- `docs/COMMERCIAL-BILLING-HANDOFF.md` — commercial billing/result-access contract and implementation sequence.
- `docs/PRODUCT-DECISION-HISTORY.md` — durable product decisions.
- `docs/DEVELOPER-AI-TAKEOVER-PROMPT.md` — prompt for a new developer or coding agent to continue the project safely.

## Development rule

Every completed slice must preserve school-scoped ownership, capability authorization, module enforcement, important validation, audit evidence, historical truth and offline continuity where the workflow is expected to operate offline.

Every commercial slice must keep platform billing separate from school finance and must pass typecheck, tests and production build before the next slice.
