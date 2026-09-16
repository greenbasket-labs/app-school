export type SyncStatus =
  | "IDLE"
  | "OFFLINE"
  | "SYNCING"
  | "FAILED"
  | "CONFLICT";

export type SyncStatusSnapshot = {
  status: SyncStatus;
  pending: number;
  failed: number;
  conflicts: number;
  lastSyncedAt: string | null;
  message: string | null;
};

export const defaultSyncStatus: SyncStatusSnapshot = {
  status: "IDLE",
  pending: 0,
  failed: 0,
  conflicts: 0,
  lastSyncedAt: null,
  message: null,
};

export function deriveSyncStatus(input: {
  online: boolean;
  syncing: boolean;
  pending: number;
  failed: number;
  conflicts: number;
}): SyncStatus {
  if (!input.online) return "OFFLINE";
  if (input.conflicts > 0) return "CONFLICT";
  if (input.syncing) return "SYNCING";
  if (input.failed > 0) return "FAILED";
  return "IDLE";
}
