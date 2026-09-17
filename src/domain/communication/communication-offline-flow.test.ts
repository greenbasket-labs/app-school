import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { APP_SCHOOL_LOCAL_DB, openAppSchoolLocalDb } from "@/domain/platform/local-store";
import { getLocalRecord, getPendingOutbox } from "@/domain/platform/local-outbox";
import { runPendingSync } from "@/domain/platform/sync-engine";
import { saveCommunicationDraft } from "./offline-drafts";
import { communicationNotificationSyncExecutor } from "./communication-sync-executor";

describe("communication offline-first flow", () => {
  beforeEach(async () => {
    const db = await openAppSchoolLocalDb();
    db.close();
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(APP_SCHOOL_LOCAL_DB);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error("Could not reset IndexedDB."));
    });
  });

  it("queues locally, retries while offline, then acknowledges and marks the draft synced", async () => {
    const schoolId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    const actorUserId = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
    const membershipId = "cccccccc-cccc-cccc-cccc-cccccccccccc";
    const draftId = "draft-offline-1";
    const operationId = "communication-op-offline-1";

    const offlineFetch = vi.fn<typeof fetch>();
    offlineFetch.mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", offlineFetch);

    const { record } = await saveCommunicationDraft({
      schoolId,
      actorUserId,
      draftId,
      operationId,
      draft: {
        title: "School notice",
        body: "School closes early today.",
        membershipIds: [membershipId],
        channel: "IN_APP",
      },
    });

    expect(record.syncState).toBe("PENDING_SYNC");
    expect(await getPendingOutbox(schoolId)).toHaveLength(1);

    const failed = await runPendingSync(
      schoolId,
      communicationNotificationSyncExecutor,
      new Date("2026-09-17T10:00:00.000Z"),
    );

    expect(failed.failed).toBe(0);
    expect(failed.retrying).toBe(1);

    const queued = await getLocalRecord(record.id);
    expect(queued?.syncState).toBe("PENDING_SYNC");
    expect(await getPendingOutbox(schoolId, new Date("2026-09-17T10:00:00.000Z"))).toHaveLength(0);
    expect(await getPendingOutbox(schoolId, new Date("2026-09-17T10:01:00.001Z"))).toHaveLength(1);

    offlineFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ok: true,
          notification: {
            id: "dddddddd-dddd-dddd-dddd-dddddddddddd",
            title: "School notice",
            body: "School closes early today.",
            membershipIds: [membershipId],
            channel: "IN_APP",
            createdAt: "2026-09-17T10:02:00.000Z",
            serverVersion: "dddddddd-dddd-dddd-dddd-dddddddddddd",
          },
        }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      ),
    );

    const synced = await runPendingSync(
      schoolId,
      communicationNotificationSyncExecutor,
      new Date("2026-09-17T10:01:00.001Z"),
    );

    const finalRecord = await getLocalRecord(record.id);
    const pending = await getPendingOutbox(schoolId, new Date("2026-09-17T10:03:00.000Z"));

    expect(synced.acknowledged).toBe(1);
    expect(finalRecord?.syncState).toBe("SYNCED");
    expect(finalRecord?.serverVersion).toBe("dddddddd-dddd-dddd-dddd-dddddddddddd");
    expect(finalRecord?.data).toEqual({
      notificationId: "dddddddd-dddd-dddd-dddd-dddddddddddd",
      title: "School notice",
      body: "School closes early today.",
      membershipIds: [membershipId],
      channel: "IN_APP",
      draftId,
    });
    expect(pending).toHaveLength(0);

    expect(offlineFetch).toHaveBeenCalledTimes(2);
    expect(offlineFetch).toHaveBeenLastCalledWith(
      `/api/schools/${schoolId}/communication/notifications`,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "Idempotency-Key": operationId }),
      }),
    );
  });
});
