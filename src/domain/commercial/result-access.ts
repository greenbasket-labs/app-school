import { z } from "zod";
import { db } from "@/lib/db";
import { normalizeResultAccessSettings } from "./plans";

const resultAccessSchema = z.object({
  enabled: z.boolean(),
  amountNaira: z.number().finite().nonnegative(),
});

export type ResultAccessInput = z.infer<typeof resultAccessSchema>;

export async function ensureResultAccessSetting(schoolId: string) {
  return db.resultAccessSetting.upsert({
    where: { schoolId },
    update: {},
    create: { schoolId, enabled: false, amountNaira: 0 },
    select: { id: true, schoolId: true, enabled: true, amountNaira: true, createdAt: true, updatedAt: true },
  });
}

export async function getResultAccessSetting(schoolId: string) {
  const setting = await db.resultAccessSetting.findUnique({
    where: { schoolId },
    select: { id: true, schoolId: true, enabled: true, amountNaira: true, createdAt: true, updatedAt: true },
  });
  return setting ?? ensureResultAccessSetting(schoolId);
}

export async function updateResultAccessSetting(schoolId: string, userId: string, raw: ResultAccessInput) {
  const input = resultAccessSchema.parse(raw);
  const normalized = normalizeResultAccessSettings(input);

  const membership = await db.membership.findFirst({
    where: { schoolId, userId, status: "ACTIVE", isOwner: true },
    select: { id: true },
  });
  if (!membership) throw new Error("OWNER_REQUIRED");

  const current = await getResultAccessSetting(schoolId);
  const updated = await db.$transaction(async (tx) => {
    const setting = await tx.resultAccessSetting.update({
      where: { schoolId },
      data: { enabled: normalized.enabled, amountNaira: normalized.amountNaira },
      select: { id: true, schoolId: true, enabled: true, amountNaira: true, createdAt: true, updatedAt: true },
    });

    await tx.auditEvent.create({
      data: {
        schoolId,
        actorUserId: userId,
        action: "commercial.result_access.updated",
        entityType: "ResultAccessSetting",
        entityId: setting.id,
        previousState: {
          id: current.id,
          schoolId: current.schoolId,
          enabled: current.enabled,
          amountNaira: current.amountNaira.toString(),
        },
        currentState: {
          id: setting.id,
          schoolId: setting.schoolId,
          enabled: setting.enabled,
          amountNaira: setting.amountNaira.toString(),
        },
      },
    });
    return setting;
  });

  return updated;
}

export async function getResultAccessPolicy(schoolId: string) {
  const setting = await getResultAccessSetting(schoolId);
  const amountNaira = Number(setting.amountNaira);
  return normalizeResultAccessSettings({ enabled: setting.enabled, amountNaira });
}
