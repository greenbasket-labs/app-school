import { LocalOutboxItem, LocalRecord, LocalSyncState, openAppSchoolLocalDb, LOCAL_STORES } from "./local-store";

type LocalRecordInput<T> = Omit<LocalRecord<T>, "updatedAt"> & { updatedAt?: string };

type LocalMutation<T> = {
  schoolId: string;
  actorUserId?: string | null;
  entityType: string;
  entityId: string;
  operationType: string;
  payload: T;
  record: LocalRecordInput<T>;
  operationId: string;
};

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed."));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed."));
    transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction was aborted."));
  });
}

export async function listLocalRecords<T>(schoolId: string, entityType?: string): Promise<Array<LocalRecord<T>>> {
  const db = await openAppSchoolLocalDb();
  try {
    const transaction = db.transaction(LOCAL_STORES.records, "readonly");
    const store = transaction.objectStore(LOCAL_STORES.records);
    if (!entityType) {
      return (await requestResult(store.index("schoolId").getAll(schoolId))) as LocalRecord<T>[];
    }
    const rows = await requestResult(store.index("schoolEntity").getAll(IDBKeyRange.bound([schoolId, entityType, ""], [schoolId, entityType, "\uffff"]))) as LocalRecord<T>[];
    return rows;
  } finally {
    db.close();
  }
}

export async function getLocalRecordByEntity<T>(schoolId: string, entityType: string, entityId: string) {
  const rows = await listLocalRecords<T>(schoolId, entityType);
  return rows.find((row) => row.entityId === entityId) ?? null;
}

export async function saveLocalMutation<T>(mutation: LocalMutation<T>): Promise<LocalRecord<T>> {
  const now = new Date().toISOString();
  const db = await openAppSchoolLocalDb();
  try {
    const transaction = db.transaction([LOCAL_STORES.records, LOCAL_STORES.outbox], "readwrite");
    const recordStore = transaction.objectStore(LOCAL_STORES.records);
    const existing = (await requestResult(recordStore.get(mutation.record.id))) as LocalRecord<T> | undefined;
    const record: LocalRecord<T> = {
      ...mutation.record,
      serverVersion: mutation.record.serverVersion ?? existing?.serverVersion ?? null,
      updatedAt: mutation.record.updatedAt ?? now,
    };
    const outbox: LocalOutboxItem = {
      operationId: mutation.operationId,
      schoolId: mutation.schoolId,
      actorUserId: mutation.actorUserId ?? null,
      entityType: mutation.entityType,
      entityId: mutation.entityId,
      operationType: mutation.operationType,
      payload: mutation.payload,
      createdAt: now,
      attemptCount: 0,
      status: "PENDING",
      lastError: null,
    };

    recordStore.put(record);

    const outboxStore = transaction.objectStore(LOCAL_STORES.outbox);
    const existingOutbox = await requestResult(outboxStore.get(mutation.operationId));
    if (!existingOutbox) outboxStore.put(outbox);

    await transactionDone(transaction);
    return record;
  } finally {
    db.close();
  }
}

export async function markLocalRecordState(id: string, syncState: LocalSyncState, serverVersion?: string | null) {
  const db = await openAppSchoolLocalDb();
  try {
    const transaction = db.transaction(LOCAL_STORES.records, "readwrite");
    const store = transaction.objectStore(LOCAL_STORES.records);
    const existing = (await requestResult(store.get(id))) as LocalRecord | undefined;
    if (!existing) return null;
    const next = { ...existing, syncState, serverVersion: serverVersion ?? existing.serverVersion ?? null, updatedAt: new Date().toISOString() };
    store.put(next);
    await transactionDone(transaction);
    return next;
  } finally {
    db.close();
  }
}

export async function applyAuthoritativeLocalRecord<T>(input: {
  id: string;
  data: T;
  serverVersion: string;
  updatedAt?: string;
}) {
  const db = await openAppSchoolLocalDb();
  try {
    const transaction = db.transaction(LOCAL_STORES.records, "readwrite");
    const store = transaction.objectStore(LOCAL_STORES.records);
    const existing = (await requestResult(store.get(input.id))) as LocalRecord<T> | undefined;
    if (!existing) return null;
    const next: LocalRecord<T> = {
      ...existing,
      data: input.data,
      serverVersion: input.serverVersion,
      syncState: "SYNCED",
      updatedAt: input.updatedAt ?? new Date().toISOString(),
    };
    store.put(next);
    await transactionDone(transaction);
    return next;
  } finally {
    db.close();
  }
}
