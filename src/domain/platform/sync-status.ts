export type SyncStatus = "OFFLINE" | "IDLE" | "SYNCING" | "FAILED" | "CONFLICT";

export type SyncStatusSnapshot = {
  connectivity: "ONLINE" | "OFFLINE";
  status: SyncStatus;
  pending: number;
  failed: number;
  conflicts: number;
  lastSyncAt: string | null;
  lastError: string | null;
};

export function deriveSyncStatus(input: {
  connectivity: "ONLINE" | "OFFLINE";
  pending: number;
  failed: number;
  conflicts: number;
  syncing: boolean;
}): SyncStatus {
  if (input.connectivity === "OFFLINE") return "OFFLINE";
  if (input.conflicts > 0) return "CONFLICT";
  if (input.failed > 0) return "FAILED";
  if (input.syncing || input.pending > 0) return "SYNCING";
  return "IDLE";
}

export const syncStatusLabel: Record<SyncStatus, string> = {
  OFFLINE: "Offline",
  IDLE: "Synced",
  SYNCING: "Syncing",
  FAILED: "Sync issues",
  CONFLICT: "Needs review",
};
