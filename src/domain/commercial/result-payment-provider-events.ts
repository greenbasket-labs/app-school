import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { ResultPaymentProvider } from "./result-access-policy";

export type ResultPaymentProviderEventStatus = "RECEIVED" | "PROCESSED" | "FAILED";

export type ResultPaymentProviderEvent = {
  id: string;
  provider: ResultPaymentProvider;
  eventKey: string;
  paymentAttemptId: string | null;
  providerReference: string | null;
  status: ResultPaymentProviderEventStatus;
};

export class ResultPaymentProviderEventConflictError extends Error {}

function requireText(value: string, name: string) {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${name} is required.`);
  return normalized;
}

/**
 * Reserves one provider event before its verified payment is applied.
 *
 * The provider + eventKey uniqueness constraint is the durable replay boundary.
 * A repeated delivery returns the existing event and never creates another
 * processing record.
 */
export async function recordResultPaymentProviderEvent(input: {
  provider: ResultPaymentProvider;
  eventKey: string;
  paymentAttemptId?: string | null;
  providerReference?: string | null;
}) {
  const eventKey = requireText(input.eventKey, "eventKey");
  const providerReference = input.providerReference?.trim() || null;
  const id = crypto.randomUUID();

  await db.$executeRaw(Prisma.sql`
    INSERT INTO "ResultPaymentProviderEvent"
      ("id", "provider", "eventKey", "paymentAttemptId", "providerReference", "status", "receivedAt")
    VALUES
      (${id}::uuid, ${input.provider}, ${eventKey},
       ${input.paymentAttemptId ? Prisma.raw(`'${input.paymentAttemptId}'::uuid`) : Prisma.sql`NULL`},
       ${providerReference}, 'RECEIVED', CURRENT_TIMESTAMP)
    ON CONFLICT ("provider", "eventKey") DO NOTHING
  `);

  const rows = await db.$queryRaw<Array<ResultPaymentProviderEvent>>`
    SELECT "id", "provider", "eventKey", "paymentAttemptId", "providerReference", "status"
    FROM "ResultPaymentProviderEvent"
    WHERE "provider" = ${input.provider}
      AND "eventKey" = ${eventKey}
    LIMIT 1
  `;

  const event = rows[0];
  if (!event) throw new Error("Result payment provider event could not be persisted.");

  if (
    input.paymentAttemptId &&
    event.paymentAttemptId &&
    event.paymentAttemptId !== input.paymentAttemptId
  ) {
    throw new ResultPaymentProviderEventConflictError(
      "The provider event key is already bound to a different payment attempt.",
    );
  }

  if (
    providerReference &&
    event.providerReference &&
    event.providerReference !== providerReference
  ) {
    throw new ResultPaymentProviderEventConflictError(
      "The provider event key is already bound to a different provider reference.",
    );
  }

  return event;
}

export async function transitionResultPaymentProviderEvent(
  eventId: string,
  status: Exclude<ResultPaymentProviderEventStatus, "RECEIVED">,
  error?: string | null,
) {
  await db.$executeRaw(Prisma.sql`
    UPDATE "ResultPaymentProviderEvent"
    SET "status" = ${status},
        "processedAt" = CASE WHEN ${status} = 'PROCESSED' THEN CURRENT_TIMESTAMP ELSE "processedAt" END,
        "error" = ${error ?? null}
    WHERE "id" = ${eventId}::uuid
  `);
}
