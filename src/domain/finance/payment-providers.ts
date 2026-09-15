import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export const PAYMENT_PROVIDERS = ["PAYSTACK", "FLUTTERWAVE", "MONNIFY"] as const;
export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];

export class PaymentProviderValidationError extends Error {}
export class PaymentProviderConflictError extends Error {}

function assertProvider(value: string): asserts value is PaymentProvider {
  if (!PAYMENT_PROVIDERS.includes(value as PaymentProvider)) {
    throw new PaymentProviderValidationError("Unsupported payment provider.");
  }
}

export async function listSchoolPaymentProviders(schoolId: string) {
  return db.$queryRaw<Array<{
    id: string;
    provider: PaymentProvider;
    settlementAccountReference: string;
    enabled: boolean;
  }>>(Prisma.sql`
    SELECT "id", "provider", "settlementAccountReference", "enabled"
    FROM "SchoolPaymentProvider"
    WHERE "schoolId" = ${schoolId}::uuid
    ORDER BY "provider"
  `);
}

export async function upsertSchoolPaymentProvider(
  schoolId: string,
  provider: string,
  settlementAccountReference: string,
  actorUserId: string,
  enabled = true,
) {
  assertProvider(provider);
  const reference = settlementAccountReference.trim();
  if (!reference) throw new PaymentProviderValidationError("Settlement account reference is required.");
  if (reference.length > 160) throw new PaymentProviderValidationError("Settlement account reference is too long.");

  const id = crypto.randomUUID();
  return db.$transaction(async (tx) => {
    const existing = await tx.$queryRaw<Array<{ id: string; settlementAccountReference: string; enabled: boolean }>>(Prisma.sql`
      SELECT "id", "settlementAccountReference", "enabled"
      FROM "SchoolPaymentProvider"
      WHERE "schoolId" = ${schoolId}::uuid AND "provider" = ${provider}
      FOR UPDATE
    `);

    if (existing[0]) {
      await tx.$executeRaw(Prisma.sql`
        UPDATE "SchoolPaymentProvider"
        SET "settlementAccountReference" = ${reference}, "enabled" = ${enabled}, "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${existing[0].id}::uuid
      `);
      await tx.auditEvent.create({
        data: {
          schoolId,
          actorUserId,
          action: "finance.payment_provider_updated",
          entityType: "SchoolPaymentProvider",
          entityId: existing[0].id,
          previousState: { provider, settlementAccountReference: existing[0].settlementAccountReference, enabled: existing[0].enabled },
          currentState: { provider, settlementAccountReference: reference, enabled },
        },
      });
      return { id: existing[0].id, provider, settlementAccountReference: reference, enabled };
    }

    await tx.$executeRaw(Prisma.sql`
      INSERT INTO "SchoolPaymentProvider"
        ("id", "schoolId", "provider", "settlementAccountReference", "enabled", "createdAt", "updatedAt")
      VALUES
        (${id}::uuid, ${schoolId}::uuid, ${provider}, ${reference}, ${enabled}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);
    await tx.auditEvent.create({
      data: {
        schoolId,
        actorUserId,
        action: "finance.payment_provider_configured",
        entityType: "SchoolPaymentProvider",
        entityId: id,
        currentState: { provider, settlementAccountReference: reference, enabled },
      },
    });
    return { id, provider, settlementAccountReference: reference, enabled };
  });
}

export async function getEnabledSchoolPaymentProvider(schoolId: string, provider: PaymentProvider) {
  return db.$queryRaw<Array<{ id: string; settlementAccountReference: string }>>(Prisma.sql`
    SELECT "id", "settlementAccountReference"
    FROM "SchoolPaymentProvider"
    WHERE "schoolId" = ${schoolId}::uuid AND "provider" = ${provider} AND "enabled" = true
    LIMIT 1
  `);
}
