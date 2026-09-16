import type { LocalSyncState } from "./local-store";

export type SyncLifecycle =
  | "DRAFT"
  | "SAVED_LOCAL"
  | "PENDING_SYNC"
  | "SYNCING"
  | "SYNCED"
  | "FAILED"
  | "CONFLICT";

export function syncLifecycleFromLocalState(state: LocalSyncState): SyncLifecycle {
  switch (state) {
    case "DRAFT":
      return "DRAFT";
    case "PENDING_SYNC":
      return "PENDING_SYNC";
    case "SYNCING":
      return "SYNCING";
    case "SYNCED":
      return "SYNCED";
    case "FAILED":
      return "FAILED";
    case "CONFLICT":
      return "CONFLICT";
  }
}

export const syncLifecycleLabel: Record<SyncLifecycle, string> = {
  DRAFT: "Draft",
  SAVED_LOCAL: "Saved locally",
  PENDING_SYNC: "Pending sync",
  SYNCING: "Syncing",
  SYNCED: "Synced",
  FAILED: "Failed — retry available",
  CONFLICT: "Conflict — review required",
};

export function isServerConfirmed(state: LocalSyncState) {
  return state === "SYNCED";
}
