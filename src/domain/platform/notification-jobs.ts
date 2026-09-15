import { enqueueJob } from "@/domain/platform/jobs";

export async function enqueueNotificationProcessing(schoolId: string, notificationId: string) {
  return enqueueJob({
    schoolId,
    type: "notification.process",
    payload: { notificationId },
    idempotencyKey: notificationId,
  });
}
