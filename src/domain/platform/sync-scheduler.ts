import { getConnectivityState } from "./connectivity";
import type { SyncExecutor, SyncRunResult } from "./sync-engine";
import { runPendingSync } from "./sync-engine";

export type SyncSchedulerOptions = {
  schoolId: string;
  executor: SyncExecutor;
  intervalMs?: number;
  onRun?: (result: SyncRunResult) => void;
  onError?: (error: Error) => void;
};

export function startSyncScheduler(options: SyncSchedulerOptions) {
  const intervalMs = Math.max(options.intervalMs ?? 30_000, 5_000);
  let running = false;

  const run = async () => {
    if (running || getConnectivityState() === "OFFLINE") return;
    running = true;
    try {
      const result = await runPendingSync(options.schoolId, options.executor);
      options.onRun?.(result);
    } catch (error) {
      options.onError?.(error instanceof Error ? error : new Error("Synchronization run failed."));
    } finally {
      running = false;
    }
  };

  const onOnline = () => void run();
  window.addEventListener("online", onOnline);
  const timer = window.setInterval(() => void run(), intervalMs);
  void run();

  return () => {
    window.removeEventListener("online", onOnline);
    window.clearInterval(timer);
  };
}
