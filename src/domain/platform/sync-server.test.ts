import { beforeEach, describe, expect, it, vi } from "vitest";

const idempotencyStore = new Map<string, unknown>();

vi.mock("./idempotency", () => ({
  getIdempotentResult: vi.fn(
    async <T>(schoolId: string, operation: string, key: string) => {
      return (
        (idempotencyStore.get(
          `${schoolId}:${operation}:${key}`,
        ) as T | undefined) ?? null
      );
    },
  ),

  rememberIdempotentResult: vi.fn(
    async (
      schoolId: string,
      operation: string,
      key: string,
      result: unknown,
    ) => {
      idempotencyStore.set(
        `${schoolId}:${operation}:${key}`,
        result,
      );
    },
  ),
}));

import { replayOrRecordIdempotentResult } from "./sync-server";

describe("idempotent sync server", () => {
  beforeEach(() => {
    idempotencyStore.clear();
  });

  it("executes once and replays the stored result on a sequential retry", async () => {
    const execute = vi.fn(async () => ({
      ok: true,
      score: {
        assessmentId: "assessment-1",
        studentId: "student-1",
        score: 8,
      },
    }));

    const first = await replayOrRecordIdempotentResult({
      schoolId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      operation: "assessment.score",
      key: "operation-1",
      execute,
    });

    const second = await replayOrRecordIdempotentResult({
      schoolId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      operation: "assessment.score",
      key: "operation-1",
      execute,
    });

    expect(first.replayed).toBe(false);
    expect(second.replayed).toBe(true);
    expect(second.result).toEqual(first.result);
    expect(execute).toHaveBeenCalledTimes(1);
  });
});