import { applyAuthoritativeLocalRecord, getLocalRecordByEntity, markLocalRecordState } from "./local-repository";
import { getPendingOutbox, updateOutboxStatus } from "./local-outbox";
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
      const message = error instanceof Error ? error.message : "Synchronization failed.";
      await applySyncResult(item, { status: "FAILED", error: message, retryable: true }, attemptCount, now);
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
  const local = await getLocalRecordByEntity(item.schoolId, item.entityType, item.entityId);

  if (response.status === "ACKNOWLEDGED") {
    if (!local) {
      await updateOutboxStatus(item.operationId, "FAILED", {
        lastError: "Local record is missing for acknowledged synchronization.",
        nextAttemptAt: null,
      });
      return;
    }

    const authoritative = response.authoritative;
    const serverVersion = authoritative?.serverVersion ?? response.serverVersion ?? null;
    if (!authoritative || !serverVersion) {
      await updateOutboxStatus(item.operationId, "FAILED", {
        lastError: "Server acknowledgement did not include authoritative data and version.",
        nextAttemptAt: null,
      });
      await markLocalRecordState(local.id, "FAILED");
      return;
    }

    await updateOutboxStatus(item.operationId, "ACKNOWLEDGED", {
      lastError: null,
      nextAttemptAt: null,
    });
    await applyAuthoritativeLocalRecord({
      id: local.id,
      data: authoritative.data,
      serverVersion,
      updatedAt: authoritative.updatedAt,
    });
    return;
  }

  if (response.status === "CONFLICT") {
    await updateOutboxStatus(item.operationId, "CONFLICT", {
      lastError: response.error ?? "Server reported a synchronization conflict.",
      nextAttemptAt: null,
    });
    if (local) await markLocalRecordState(local.id, "CONFLICT");
    return;
  }

  if (response.retryable) {
    await updateOutboxStatus(item.operationId, "PENDING", {
      lastError: response.error ?? "Temporary synchronization failure.",
      nextAttemptAt: nextRetryAt(attemptCount, now),
    });
    if (local) await markLocalRecordState(local.id, "PENDING_SYNC");
    return;
  }

  await updateOutboxStatus(item.operationId, "FAILED", {
    lastError: response.error ?? "Server rejected synchronization.",
    nextAttemptAt: null,
  });
  if (local) await markLocalRecordState(local.id, "FAILED");
}
