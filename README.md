# GREEN BASKET GLOBAL LIMITED

## School Platform

Fresh production implementation. No inherited application code.

The current vertical slice establishes the tenant identity foundation: User -> Organization -> unique CAC identity -> School -> Membership -> capability primitives -> audit history.

## Local foundation test

Requirements: Node.js, npm, and a PostgreSQL database.

```powershell
npm install
Copy-Item .env.example .env
notepad .env
npm run db:generate
npm run db:migrate -- --name identity_foundation
npm run typecheck
npm run build
npm run dev
```

Set `DATABASE_URL` in `.env` to a real local/test PostgreSQL database before running the migration.

### Register the first school owner

With the development server running:

```powershell
$body = @{
  email = "owner@example.com"
  password = "ChangeMe-Strong-123"
  organizationName = "Example Education Limited"
  schoolName = "Example Academy"
  cacNumber = "RC1234567"
} | ConvertTo-Json

Invoke-RestMethod `
  -Method POST `
  -Uri http://localhost:3000/api/onboarding/register `
  -ContentType "application/json" `
  -Body $body
```

Expected first request: HTTP 201 with generated `userId`, `organizationId`, `schoolId`, and server/database-generated `schoolCreatedAt`.

Run the same request again with a different email but the same CAC. Expected result: HTTP 409. The database unique constraint prevents a second organization from claiming that CAC identity.

## Important current boundary

This is foundation code, not a completed school application. Authentication/session issuance, the organization/school setup UI, capability enforcement helpers, and operational school modules will be built as subsequent vertical slices after this foundation is tested.

See `ARCHITECTURE.md` for frozen architectural decisions.
