export function createClientOperationId(prefix = "op") {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}:${crypto.randomUUID()}`;
  }
  return `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}

export function localRecordId(schoolId: string, entityType: string, entityId: string) {
  return `${schoolId}:${entityType}:${entityId}`;
}
