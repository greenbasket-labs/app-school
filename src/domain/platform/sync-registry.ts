import type { SyncExecutor } from "./sync-executor";
import { attendanceBulkSyncExecutor } from "@/domain/attendance/attendance-sync-executor";
import { communicationNotificationSyncExecutor } from "@/domain/communication/communication-sync-executor";

const executors: SyncExecutor[] = [
  attendanceBulkSyncExecutor,
  communicationNotificationSyncExecutor,
];

export const schoolSyncExecutor: SyncExecutor = async (item) => {
  for (const executor of executors) {
    const result = await executor(item);
    if (result.status !== "FAILED" || result.error !== "Unsupported synchronization operation.") {
      return result;
    }
  }

  return {
    status: "FAILED",
    error: `No synchronization executor registered for ${item.entityType}/${item.operationType}.`,
    retryable: false,
  };
};
