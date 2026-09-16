export type SyncAuthoritativePayload<T = unknown> = {
  data: T;
  serverVersion: string;
  updatedAt?: string;
};

export type SyncExecutorResult<T = unknown> = {
  status: "ACKNOWLEDGED" | "FAILED" | "CONFLICT";
  serverVersion?: string | null;
  authoritative?: SyncAuthoritativePayload<T> | null;
  error?: string | null;
  retryable?: boolean;
};

export type SyncExecutor = (item: {
  operationId: string;
  schoolId: string;
  actorUserId?: string | null;
  entityType: string;
  entityId: string;
  operationType: string;
  payload: unknown;
}) => Promise<SyncExecutorResult>;
