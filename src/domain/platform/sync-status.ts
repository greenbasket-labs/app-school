export type SyncStatus =
  | "OFFLINE"
  | "IDLE"
  | "PENDING"
  | "SYNCING"
  | "FAILED"
  | "CONFLICT";

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
  if (input.syncing) return "SYNCING";
  if (input.pending > 0) return "PENDING";
  return "IDLE";
}

export const syncStatusLabel: Record<SyncStatus, string> = {
  OFFLINE: "Offline",
  IDLE: "Synced",
  PENDING: "Pending sync",
  SYNCING: "Syncing",
  FAILED: "Sync issues",
  CONFLICT: "Needs review",
};
