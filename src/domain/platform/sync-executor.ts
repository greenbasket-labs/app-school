export type SyncExecutorResult = {
  status: "ACKNOWLEDGED" | "FAILED" | "CONFLICT";
  serverVersion?: string | null;
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
