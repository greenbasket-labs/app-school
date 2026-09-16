export const APP_SCHOOL_LOCAL_DB = "app-school-local";
export const APP_SCHOOL_LOCAL_DB_VERSION = 1;

export const LOCAL_STORES = {
  records: "records",
  outbox: "outbox",
} as const;

export type LocalSyncState = "DRAFT" | "PENDING_SYNC" | "SYNCING" | "SYNCED" | "FAILED" | "CONFLICT";

export type LocalRecord<T = unknown> = {
  id: string;
  schoolId: string;
  entityType: string;
  entityId: string;
  data: T;
  syncState: LocalSyncState;
  serverVersion?: string | null;
  updatedAt: string;
};

export type LocalOutboxItem = {
  operationId: string;
  schoolId: string;
  actorUserId?: string | null;
  entityType: string;
  entityId: string;
  operationType: string;
  payload: unknown;
  createdAt: string;
  attemptCount: number;
  status: "PENDING" | "SYNCING" | "FAILED" | "CONFLICT" | "ACKNOWLEDGED";
  lastError?: string | null;
  nextAttemptAt?: string | null;
};

export function requireBrowser() {
  if (typeof window === "undefined" || typeof indexedDB === "undefined") {
    throw new Error("The App-School local store is only available in a browser.");
  }
}

export function openAppSchoolLocalDb(): Promise<IDBDatabase> {
  requireBrowser();

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(APP_SCHOOL_LOCAL_DB, APP_SCHOOL_LOCAL_DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(LOCAL_STORES.records)) {
        const store = db.createObjectStore(LOCAL_STORES.records, { keyPath: "id" });
        store.createIndex("schoolId", "schoolId", { unique: false });
        store.createIndex("schoolEntity", ["schoolId", "entityType", "entityId"], { unique: false });
        store.createIndex("syncState", "syncState", { unique: false });
      }
      if (!db.objectStoreNames.contains(LOCAL_STORES.outbox)) {
        const store = db.createObjectStore(LOCAL_STORES.outbox, { keyPath: "operationId" });
        store.createIndex("schoolId", "schoolId", { unique: false });
        store.createIndex("status", "status", { unique: false });
        store.createIndex("schoolStatus", ["schoolId", "status"], { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open the App-School local store."));
  });
}

export async function closeAppSchoolLocalDb() {
  const db = await openAppSchoolLocalDb();
  db.close();
}
