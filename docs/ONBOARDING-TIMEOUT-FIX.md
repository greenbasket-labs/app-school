# Onboarding transaction fix

School registration keeps school identity, owner membership, capability assignment, module assignment, and the audit event in one transaction.

The global capability and module catalogs are initialized before that transaction because they are shared catalog data. This prevents repeated catalog upserts from consuming the registration transaction timeout on slower local or fresh databases.
