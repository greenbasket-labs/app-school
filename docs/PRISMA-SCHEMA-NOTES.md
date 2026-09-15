# Prisma Schema Notes

- Prisma enum values are written one-per-line for compatibility with the Prisma CLI used by this project.
- `FeeStructure` is a Prisma model and must remain available to the generated Prisma client.
- `ClassArm` is school/class-level scoped, not directly academic-session scoped. Session-specific class membership is represented through `ClassSubject` and `Enrollment`.
