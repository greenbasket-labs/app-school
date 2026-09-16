import { getIdempotentResult } from "./idempotency";
import { getPendingOutbox, updateOutboxStatus } from "./local-outbox";

export type SyncExecutorResult = {
  status: "ACKNOWLEDGED" | "FAILED" | "CONFLICT";
  serverVersion?: string | null;
  result?: unknown;
  error?: string | null;
};

export type SyncExecutor = (item: {
  operationId: string;
  schoolId: string;
  actorUserId?: string | null;
  entityType: string;
  entityId: string;
  operationType: string;
  payload: unknown;
}) => Promise<SyncExecutorResult>;

export async function syncPendingOperations(schoolId: string, executor: SyncExecutor): Promise<{ processed: number; acknowledged: number; failed: number; conflicts: number }> {
  const pending = await getPendingOutbox(schoolId);
  let acknowledged = 0;
  let failed = 0;
  let conflicts = 0;

  for (const item of pending) {
    const nextAttempt = item.attemptCount + 1;
    await updateOutboxStatus(item.operationId, "SYNCING", { attemptCount: nextAttempt });

    try {
      const result = await executor(item);
      await updateOutboxStatus(item.operationId, result.status, { lastError: result.error ?? null });
      if (result.status === "ACKNOWLEDGED") acknowledged += 1;
      else if (result.status === "CONFLICT") conflicts += 1;
      else failed += 1;
    } catch (error) {
      await updateOutboxStatus(item.operationId, "FAILED", {
        lastError: error instanceof Error ? error.message : "Synchronization failed.",
      });
      failed += 1;
    }
  }

  return { processed: pending.length, acknowledged, failed, conflicts };
}

export async function serverResultAlreadyRecorded<T>(schoolId: string, operation: string, key: string) {
  return getIdempotentResult<T>(schoolId, operation, key);
}
