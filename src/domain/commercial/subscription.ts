import { db } from "@/lib/db";
import type { CommercialPlanCode } from "./plans";

export async function ensureSchoolSubscription(schoolId: string) {
  return db.schoolSubscription.upsert({
    where: { schoolId },
    update: {},
    create: { schoolId, planCode: "FREE", billingPeriod: "MONTHLY", status: "ACTIVE" },
    select: {
      id: true,
      schoolId: true,
      planCode: true,
      billingPeriod: true,
      status: true,
      currentPeriodStart: true,
      currentPeriodEnd: true,
      cancelAtPeriodEnd: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function getSchoolSubscription(schoolId: string) {
  const subscription = await db.schoolSubscription.findUnique({
    where: { schoolId },
    select: {
      id: true,
      schoolId: true,
      planCode: true,
      billingPeriod: true,
      status: true,
      currentPeriodStart: true,
      currentPeriodEnd: true,
      cancelAtPeriodEnd: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return subscription ?? ensureSchoolSubscription(schoolId);
}

export async function assertActiveSubscriptionPlan(schoolId: string): Promise<CommercialPlanCode> {
  const subscription = await getSchoolSubscription(schoolId);
  if (subscription.status === "CANCELED" || subscription.status === "PAUSED") {
    throw new Error("SUBSCRIPTION_INACTIVE");
  }
  return subscription.planCode as CommercialPlanCode;
}
