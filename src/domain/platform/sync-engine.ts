import { getPendingOutbox, markLocalRecordState, updateOutboxStatus } from "./local-outbox";
import { nextRetryAt } from "./retry-policy";
import type { SyncExecutor, SyncExecutorResult } from "./sync-executor";

export type SyncRunResult = {
  attempted: number;
  acknowledged: number;
  failed: number;
  conflicts: number;
  retrying: number;
  deferred: number;
};

export async function runPendingSync(
  schoolId: string,
  executor: SyncExecutor,
  now = new Date(),
): Promise<SyncRunResult> {
  const pending = await getPendingOutbox(schoolId, now);
  const result: SyncRunResult = {
    attempted: 0,
    acknowledged: 0,
    failed: 0,
    conflicts: 0,
    retrying: 0,
    deferred: 0,
  };

  for (const item of pending) {
    result.attempted += 1;
    const attemptCount = item.attemptCount + 1;
    await updateOutboxStatus(item.operationId, "SYNCING", {
      attemptCount,
      nextAttemptAt: null,
    });

    try {
      const response = await executor(item);
      await applySyncResult(item, response, attemptCount, now);

      if (response.status === "ACKNOWLEDGED") result.acknowledged += 1;
      if (response.status === "FAILED") {
        if (response.retryable) result.retrying += 1;
        else result.failed += 1;
      }
      if (response.status === "CONFLICT") result.conflicts += 1;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Synchronization failed.";
      await applySyncResult(
        item,
        { status: "FAILED", error: message, retryable: true },
        attemptCount,
        now,
      );
      result.retrying += 1;
    }
  }

  return result;
}

async function applySyncResult(
  item: Awaited<ReturnType<typeof getPendingOutbox>>[number],
  response: SyncExecutorResult,
  attemptCount: number,
  now: Date,
) {
  if (response.status === "ACKNOWLEDGED") {
    await updateOutboxStatus(item.operationId, "ACKNOWLEDGED", {
      lastError: null,
      nextAttemptAt: null,
    });
    await markLocalRecordState(
      `${item.schoolId}:${item.entityType}:${item.entityId}`,
      "SYNCED",
      response.serverVersion ?? null,
    );
    return;
  }

  if (response.status === "CONFLICT") {
    await updateOutboxStatus(item.operationId, "CONFLICT", {
      lastError:
        response.error ?? "Server reported a synchronization conflict.",
      nextAttemptAt: null,
    });
    await markLocalRecordState(
      `${item.schoolId}:${item.entityType}:${item.entityId}`,
      "CONFLICT",
    );
    return;
  }

  if (response.retryable) {
    await updateOutboxStatus(item.operationId, "PENDING", {
      lastError: response.error ?? "Temporary synchronization failure.",
      nextAttemptAt: nextRetryAt(attemptCount, now),
    });
    await markLocalRecordState(
      `${item.schoolId}:${item.entityType}:${item.entityId}`,
      "PENDING_SYNC",
    );
    return;
  }

  await updateOutboxStatus(item.operationId, "FAILED", {
    lastError: response.error ?? "Server rejected synchronization.",
    nextAttemptAt: null,
  });
  await markLocalRecordState(
    `${item.schoolId}:${item.entityType}:${item.entityId}`,
    "FAILED",
  );
}
