export type SyncAction = {
  schoolId: string;
  operation: string;
  key: string;
  payload: unknown;
  createdAt: string;
};

export function validateSyncAction(action: SyncAction) {
  if (!action.schoolId || !action.operation || !action.key) throw new Error("Sync action identity is required.");
  if (action.key.length > 200) throw new Error("Sync action key is too long.");
  if (action.operation.length > 120) throw new Error("Sync operation is too long.");
  return action;
}

export function syncIdentity(action: Pick<SyncAction, "schoolId" | "operation" | "key">) {
  return `${action.schoolId}:${action.operation}:${action.key}`;
}
