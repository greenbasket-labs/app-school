export type OfflineMutation = {
  id: string;
  schoolId: string;
  entity: string;
  entityId: string;
  operation: "CREATE" | "UPDATE" | "DELETE";
  payload: unknown;
  createdAt: string;
  status: "PENDING" | "SYNCING" | "FAILED" | "CONFLICT";
};

const DB_NAME = "skulgo-mvp";
const DB_VERSION = 1;
const OUTBOX = "outbox";

function browserOnly() {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    throw new Error("SkulGo offline storage is only available in a browser.");
  }
}

export async function openSkulgoDb(): Promise<IDBDatabase> {
  browserOnly();
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(OUTBOX)) {
        const store = db.createObjectStore(OUTBOX, { keyPath: "id" });
        store.createIndex("schoolStatus", ["schoolId", "status"], { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Unable to open offline database."));
  });
}

export async function queueOfflineMutation(
  mutation: Omit<OfflineMutation, "createdAt" | "status">,
) {
  const db = await openSkulgoDb();
  try {
    const tx = db.transaction(OUTBOX, "readwrite");
    tx.objectStore(OUTBOX).put({
      ...mutation,
      createdAt: new Date().toISOString(),
      status: "PENDING",
    } satisfies OfflineMutation);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Unable to queue offline change."));
      tx.onabort = () => reject(tx.error ?? new Error("Offline queue transaction aborted."));
    });
  } finally {
    db.close();
  }
}

export async function pendingOfflineMutations(schoolId: string) {
  const db = await openSkulgoDb();
  try {
    const tx = db.transaction(OUTBOX, "readonly");
    const request = tx.objectStore(OUTBOX).index("schoolStatus")
      .getAll(IDBKeyRange.bound([schoolId, "PENDING"], [schoolId, "PENDING"]));
    return await new Promise<OfflineMutation[]>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result as OfflineMutation[]);
      request.onerror = () => reject(request.error ?? new Error("Unable to read offline queue."));
    });
  } finally {
    db.close();
  }
}
