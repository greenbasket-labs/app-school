# SkulGo Lean MVP

SkulGo is the lean PWA surface for the existing App-School platform.

## Five MVP surfaces

1. Account + school onboarding
2. Owner Backend module toggles
3. Classes, arms and subjects
4. Fees / bursary / receipts
5. Student + parent portal connection

## Offline-first rule

The browser writes supported operational changes to durable IndexedDB first. Pending mutations are kept in an outbox and can be synchronized after connectivity returns. A local save is never treated as server confirmation.

The repository already contains a broader shared offline/sync foundation under `src/domain/platform`. The new `src/lib/skulgo-offline.ts` is a small MVP-facing adapter and does not replace that foundation.

## Routes

- `/skulgo` — lean MVP launcher
- `/login` — account access
- `/register` — school onboarding
- `/app` — existing authenticated workspace
- `/app/parent` — existing parent workspace

## PWA

- `public/manifest.webmanifest`
- `public/sw.js`
- `src/components/pwa-register.tsx`

The service worker is intentionally small: it caches the MVP shell and uses a network-first behavior with a cached fallback.

## Scope rule

Do not add attendance, CBT, messaging, payroll, HR, transport or other modules to this MVP surface. They can plug into the shared module architecture later.
