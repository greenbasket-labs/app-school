-- A SkulGo personal account may be a guardian at more than one school.
-- Remove the legacy global uniqueness on Guardian.userId while retaining
-- tenant-scoped lookup through the schema index.
DROP INDEX IF EXISTS "Guardian_userId_key";
