import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { saveCommunicationDraft } from "./offline-drafts";
import { getLocalRecord, getPendingOutbox } from "@/domain/platform/local-outbox";
import { APP_SCHOOL_LOCAL_DB, openAppSchoolLocalDb } from "@/domain/platform/local-store";

describe("offline communication drafts", () => {
  beforeEach(async () => {
    const db = await openAppSchoolLocalDb();
    db.close();
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(APP_SCHOOL_LOCAL_DB);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error("Could not reset IndexedDB."));
    });
  });

  it("saves a normalized draft locally and queues one durable send action", async () => {
    const saved = await saveCommunicationDraft({
      schoolId: "school-communication",
      actorUserId: "user-1",
      draft: {
        title: "  Staff meeting  ",
        body: "  Meeting starts at 8am.  ",
        membershipIds: ["member-1", "member-1", "member-2"],
        channel: "IN_APP",
      },
      draftId: "draft-1",
      operationId: "op-communication-1",
    });

    expect(saved.record.data).toEqual({
      title: "Staff meeting",
      body: "Meeting starts at 8am.",
      membershipIds: ["member-1", "member-2"],
      channel: "IN_APP",
    });
    expect(saved.record.syncState).toBe("PENDING_SYNC");

    const local = await getLocalRecord(
      "school-communication:CommunicationDraft:draft-1",
    );
    const pending = await getPendingOutbox("school-communication", new Date());

    expect(local?.data).toEqual(saved.record.data);
    expect(pending).toHaveLength(1);
    expect(pending[0]?.operationId).toBe("op-communication-1");
    expect(pending[0]?.entityType).toBe("CommunicationDraft");
    expect(pending[0]?.operationType).toBe("UPSERT");
  });

  it("does not create a second outbox item when the same operation is saved again", async () => {
    const input = {
      schoolId: "school-communication",
      actorUserId: "user-1",
      draft: {
        title: "Staff meeting",
        body: "Meeting starts at 8am.",
        membershipIds: ["member-1"],
        channel: "IN_APP" as const,
      },
      draftId: "draft-1",
      operationId: "op-communication-1",
    };

    await saveCommunicationDraft(input);
    await saveCommunicationDraft(input);

    const pending = await getPendingOutbox("school-communication", new Date());
    expect(pending).toHaveLength(1);
    expect(pending[0]?.operationId).toBe("op-communication-1");
  });

  it("rejects an empty title, body, or recipient set before writing locally", async () => {
    await expect(
      saveCommunicationDraft({
        schoolId: "school-communication",
        draft: { title: " ", body: "message", membershipIds: ["member-1"], channel: "IN_APP" },
      }),
    ).rejects.toThrow("Title and message are required.");

    await expect(
      saveCommunicationDraft({
        schoolId: "school-communication",
        draft: { title: "title", body: " ", membershipIds: ["member-1"], channel: "IN_APP" },
      }),
    ).rejects.toThrow("Title and message are required.");

    await expect(
      saveCommunicationDraft({
        schoolId: "school-communication",
        draft: { title: "title", body: "message", membershipIds: [], channel: "IN_APP" },
      }),
    ).rejects.toThrow("Select at least one recipient.");
  });
});
