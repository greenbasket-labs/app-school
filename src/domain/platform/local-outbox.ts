import {
  LocalOutboxItem,
  LocalRecord,
  LocalSyncState,
  LOCAL_STORES,
  openAppSchoolLocalDb,
} from "./local-store";

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("IndexedDB request failed."));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("IndexedDB transaction failed."));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("IndexedDB transaction was aborted."));
  });
}

export async function putLocalRecord<T>(record: LocalRecord<T>) {
  const db = await openAppSchoolLocalDb();

  try {
    const transaction = db.transaction(LOCAL_STORES.records, "readwrite");
    transaction.objectStore(LOCAL_STORES.records).put(record);
    await transactionDone(transaction);
  } finally {
    db.close();
  }
}

export async function getLocalRecord<T>(id: string): Promise<LocalRecord<T> | null> {
  const db = await openAppSchoolLocalDb();

  try {
    const transaction = db.transaction(
      LOCAL_STORES.records,
      "readonly",
    );

    return (
      ((await requestResult(
        transaction.objectStore(LOCAL_STORES.records).get(id),
      )) as LocalRecord<T> | undefined) ?? null
    );
  } finally {
    db.close();
  }
}

export async function enqueueOutbox(item: LocalOutboxItem) {
  const db = await openAppSchoolLocalDb();

  try {
    const transaction = db.transaction(
      [LOCAL_STORES.records, LOCAL_STORES.outbox],
      "readwrite",
    );

    const outbox = transaction.objectStore(LOCAL_STORES.outbox);
    const existing = await requestResult(outbox.get(item.operationId));

    if (!existing) {
      outbox.put(item);
    }

    await transactionDone(transaction);
  } finally {
    db.close();
  }
}

export async function getPendingOutbox(
  schoolId: string,
  now = new Date(),
): Promise<LocalOutboxItem[]> {
  const db = await openAppSchoolLocalDb();

  try {
    const transaction = db.transaction(
      LOCAL_STORES.outbox,
      "readonly",
    );

    const index = transaction.objectStore(LOCAL_STORES.outbox).index(
      "schoolStatus",
    );

    const rows = (await requestResult(
      index.getAll(
        IDBKeyRange.bound(
          [schoolId, "PENDING"],
          [schoolId, "PENDING"],
        ),
      ),
    )) as LocalOutboxItem[];

    const nowMs = now.getTime();

    return rows
      .filter(
        (row) =>
          !("nextAttemptAt" in row) ||
          !row.nextAttemptAt ||
          new Date(row.nextAttemptAt).getTime() <= nowMs,
      )
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  } finally {
    db.close();
  }
}

export async function updateOutboxStatus(
  operationId: string,
  status: LocalOutboxItem["status"],
  details: {
    attemptCount?: number;
    lastError?: string | null;
    nextAttemptAt?: string | null;
  } = {},
) {
  const db = await openAppSchoolLocalDb();

  try {
    const transaction = db.transaction(
      LOCAL_STORES.outbox,
      "readwrite",
    );

    const store = transaction.objectStore(LOCAL_STORES.outbox);

    const existing = (await requestResult(
      store.get(operationId),
    )) as LocalOutboxItem | undefined;

    if (!existing) return;

    store.put({
      ...existing,
      status,
      attemptCount: details.attemptCount ?? existing.attemptCount,
      lastError: details.lastError ?? existing.lastError ?? null,
      ...(details.nextAttemptAt !== undefined
        ? { nextAttemptAt: details.nextAttemptAt }
        : {}),
    });

    await transactionDone(transaction);
  } finally {
    db.close();
  }
}

export function syncStateFromOutboxStatus(
  status: LocalOutboxItem["status"],
): LocalSyncState {
  switch (status) {
    case "PENDING":
      return "PENDING_SYNC";
    case "SYNCING":
      return "SYNCING";
    case "FAILED":
      return "FAILED";
    case "CONFLICT":
      return "CONFLICT";
    case "ACKNOWLEDGED":
      return "SYNCED";
  }
}
