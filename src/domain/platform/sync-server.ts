import { getIdempotentResult, rememberIdempotentResult } from "@/domain/platform/idempotency";

export async function replayOrRecordIdempotentResult<T>(input: {
  schoolId: string;
  operation: string;
  key: string;
  execute: () => Promise<T>;
}) {
  const existing = await getIdempotentResult<T>(input.schoolId, input.operation, input.key);
  if (existing !== null) return { replayed: true, result: existing };

  const result = await input.execute();
  await rememberIdempotentResult(input.schoolId, input.operation, input.key, result);
  return { replayed: false, result };
}
