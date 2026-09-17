import type { SyncExecutor } from "./sync-executor";
import { attendanceBulkSyncExecutor } from "@/domain/attendance/attendance-sync-executor";
import { communicationDraftSyncExecutor } from "@/domain/communication/communication-sync-executor";

const executors: Record<string, SyncExecutor> = {
  AttendanceBulk: attendanceBulkSyncExecutor,
  CommunicationDraft: communicationDraftSyncExecutor,
};

export const schoolSyncExecutor: SyncExecutor = async (item) => {
  const executor = executors[item.entityType];
  if (!executor) {
    return {
      status: "FAILED",
      error: `No synchronization executor is registered for ${item.entityType}.`,
      retryable: false,
    };
  }

  return executor(item);
};
