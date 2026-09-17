import type { SyncRunResult } from "./sync-engine";

export const SYNC_STARTED_EVENT = "app-school:sync-started";
export const SYNC_FINISHED_EVENT = "app-school:sync-finished";

export type SyncStartedDetail = {
  schoolId: string;
};

export type SyncFinishedDetail = {
  schoolId: string;
  result: SyncRunResult;
  error?: string;
};

export function emitSyncStarted(schoolId: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<SyncStartedDetail>(SYNC_STARTED_EVENT, {
      detail: { schoolId },
    }),
  );
}

export function emitSyncFinished(input: SyncFinishedDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<SyncFinishedDetail>(SYNC_FINISHED_EVENT, {
      detail: input,
    }),
  );
}
