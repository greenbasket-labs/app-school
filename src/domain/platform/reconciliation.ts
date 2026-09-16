import type { LocalRecord } from "./local-store";

export type ReconciliationCursor = {
  schoolId: string;
  cursor: string | null;
};

export type AuthoritativeRecord<T = unknown> = {
  schoolId: string;
  entityType: string;
  entityId: string;
  data: T;
  serverVersion: string;
  updatedAt: string;
};

export type ReconciliationResult<T = unknown> = {
  cursor: string | null;
  records: Array<AuthoritativeRecord<T>>;
};

export type ReconciliationConflict<T = unknown> = {
  local: LocalRecord<T>;
  server: AuthoritativeRecord<T>;
};

export type ReconciliationPolicy<T = unknown> = {
  canApplyServerRecord: (local: LocalRecord<T> | null, server: AuthoritativeRecord<T>) => boolean;
};

export function shouldPullRecord<T>(local: LocalRecord<T> | null, server: AuthoritativeRecord<T>) {
  if (!local) return true;
  if (local.schoolId !== server.schoolId) return false;
  if (local.entityType !== server.entityType || local.entityId !== server.entityId) return false;
  if (!local.serverVersion) return true;
  return local.serverVersion !== server.serverVersion;
}

export function classifyReconciliation<T>(
  local: LocalRecord<T> | null,
  server: AuthoritativeRecord<T>,
  policy: ReconciliationPolicy<T>,
): "APPLY" | "CONFLICT" | "IGNORE" {
  if (!shouldPullRecord(local, server)) return "IGNORE";
  if (!local) return "APPLY";
  return policy.canApplyServerRecord(local, server) ? "APPLY" : "CONFLICT";
}

export function assertReconciliationCursor(cursor: ReconciliationCursor) {
  if (!cursor.schoolId) throw new Error("Reconciliation school identity is required.");
  if (cursor.cursor !== null && cursor.cursor.length > 500) {
    throw new Error("Reconciliation cursor is too long.");
  }
  return cursor;
}

export type AssessmentScoreAuthoritativeRecord = AuthoritativeRecord<{
  assessmentId: string;
  studentId: string;
  score: number;
  updatedAt: string;
}>;

export type AssessmentScorePull = {
  schoolId: string;
  assessmentId: string;
  cursor: string | null;
  records: AssessmentScoreAuthoritativeRecord[];
  nextCursor: string | null;
};

export function assessmentScoreServerVersion(updatedAt: Date | string, entityId = "") {
  const value = updatedAt instanceof Date ? updatedAt.toISOString() : new Date(updatedAt).toISOString();
  return entityId ? `${value}:${entityId}` : value;
}
