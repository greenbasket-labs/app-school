import { getConnectivityState } from "./connectivity";
import { runPendingSync } from "./sync-engine";
import { emitSyncFinished, emitSyncStarted } from "./sync-events";
import type { SyncExecutor } from "./sync-executor";
import type { SyncRunResult } from "./sync-engine";

export type SyncSchedulerOptions = {
  schoolId: string;
  executor: SyncExecutor;
  intervalMs?: number;
  onRun?: (result: SyncRunResult) => void;
  onError?: (error: Error) => void;
};

export function startSyncScheduler(options: SyncSchedulerOptions) {
  if (typeof window === "undefined") {
    throw new Error("Sync scheduler is only available in a browser.");
  }

  const intervalMs = Math.max(options.intervalMs ?? 30_000, 5_000);
  let running = false;

  const run = async () => {
    if (running || getConnectivityState() === "OFFLINE") {
      return;
    }

    running = true;
    emitSyncStarted(options.schoolId);

    try {
      const result = await runPendingSync(
        options.schoolId,
        options.executor,
      );

      options.onRun?.(result);
      emitSyncFinished({ schoolId: options.schoolId, result });
    } catch (error) {
      const normalizedError =
        error instanceof Error
          ? error
          : new Error("Synchronization run failed.");

      options.onError?.(normalizedError);
      emitSyncFinished({
        schoolId: options.schoolId,
        result: {
          attempted: 0,
          acknowledged: 0,
          failed: 0,
          conflicts: 0,
          retrying: 0,
          deferred: 0,
        },
        error: normalizedError.message,
      });
    } finally {
      running = false;
    }
  };

  const onOnline = () => void run();

  window.addEventListener("online", onOnline);

  const timer = window.setInterval(() => {
    void run();
  }, intervalMs);

  void run();

  return () => {
    window.removeEventListener("online", onOnline);
    window.clearInterval(timer);
  };
}
