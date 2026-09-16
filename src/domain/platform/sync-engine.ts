import { getPendingOutbox, markLocalRecordState, updateOutboxStatus } from "./local-outbox";
import type { SyncExecutor, SyncExecutorResult } from "./sync-executor";

export type SyncRunResult = {
  attempted: number;
  acknowledged: number;
  failed: number;
  conflicts: number;
};

export async function runPendingSync(schoolId: string, executor: SyncExecutor): Promise<SyncRunResult> {
  const pending = await getPendingOutbox(schoolId);
  const result: SyncRunResult = { attempted: 0, acknowledged: 0, failed: 0, conflicts: 0 };

  for (const item of pending) {
    result.attempted += 1;
    await updateOutboxStatus(item.operationId, "SYNCING", { attemptCount: item.attemptCount + 1 });

    try {
      const response = await executor(item);
      await applySyncResult(item, response);
      if (response.status === "ACKNOWLEDGED") result.acknowledged += 1;
      if (response.status === "FAILED") result.failed += 1;
      if (response.status === "CONFLICT") result.conflicts += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Synchronization failed.";
      await applySyncResult(item, { status: "FAILED", error: message });
      result.failed += 1;
    }
  }

  return result;
}

async function applySyncResult(
  item: Awaited<ReturnType<typeof getPendingOutbox>>[number],
  response: SyncExecutorResult,
) {
  if (response.status === "ACKNOWLEDGED") {
    await updateOutboxStatus(item.operationId, "ACKNOWLEDGED", { lastError: null });
    await markLocalRecordState(`${item.schoolId}:${item.entityType}:${item.entityId}`, "SYNCED", response.serverVersion ?? null);
    return;
  }

  if (response.status === "CONFLICT") {
    await updateOutboxStatus(item.operationId, "CONFLICT", { lastError: response.error ?? "Server reported a conflict." });
    await markLocalRecordState(`${item.schoolId}:${item.entityType}:${item.entityId}`, "CONFLICT");
    return;
  }

  await updateOutboxStatus(item.operationId, "FAILED", { lastError: response.error ?? "Server rejected synchronization." });
  await markLocalRecordState(`${item.schoolId}:${item.entityType}:${item.entityId}`, "FAILED");
}
