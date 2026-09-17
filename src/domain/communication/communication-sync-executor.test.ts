import { afterEach, describe, expect, it, vi } from "vitest";
import { communicationNotificationSyncExecutor } from "./communication-sync-executor";

const item = {
  operationId: "communication-op-1",
  schoolId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  actorUserId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
  entityType: "CommunicationDraft",
  entityId: "draft-1",
  operationType: "UPSERT",
  payload: {
    draftId: "draft-1",
    title: "School notice",
    body: "School closes early today.",
    membershipIds: ["cccccccc-cccc-cccc-cccc-cccccccccccc"],
    channel: "IN_APP",
  },
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("communication notification sync executor", () => {
  it("rejects unsupported local operations without a network call", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);

    const result = await communicationNotificationSyncExecutor({ ...item, entityType: "OtherEntity" });

    expect(result).toEqual({ status: "FAILED", error: "Unsupported synchronization operation." });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("acknowledges a successful server save with authoritative notification data", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            ok: true,
            notification: {
              id: "dddddddd-dddd-dddd-dddd-dddddddddddd",
              title: "School notice",
              body: "School closes early today.",
              membershipIds: item.payload.membershipIds,
              channel: "IN_APP",
              createdAt: "2026-09-17T10:00:00.000Z",
              serverVersion: "dddddddd-dddd-dddd-dddd-dddddddddddd",
            },
          }),
          { status: 201, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    const result = await communicationNotificationSyncExecutor(item);

    expect(result).toEqual({
      status: "ACKNOWLEDGED",
      serverVersion: "dddddddd-dddd-dddd-dddd-dddddddddddd",
      authoritative: {
        data: {
          notificationId: "dddddddd-dddd-dddd-dddd-dddddddddddd",
          title: "School notice",
          body: "School closes early today.",
          membershipIds: item.payload.membershipIds,
          channel: "IN_APP",
          draftId: "draft-1",
        },
        serverVersion: "dddddddd-dddd-dddd-dddd-dddddddddddd",
        updatedAt: "2026-09-17T10:00:00.000Z",
      },
    });

    expect(fetch).toHaveBeenCalledWith(
      `/api/schools/${item.schoolId}/communication/notifications`,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "Idempotency-Key": item.operationId }),
      }),
    );
  });

  it("maps a recipient conflict to a non-retryable conflict", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ error: "One or more recipients are not active members of this school." }), {
          status: 409,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    const result = await communicationNotificationSyncExecutor(item);

    expect(result).toEqual({
      status: "CONFLICT",
      error: "One or more recipients are not active members of this school.",
    });
  });

  it("marks server and network failures as retryable when appropriate", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ error: "Service unavailable" }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    const serverFailure = await communicationNotificationSyncExecutor(item);
    expect(serverFailure).toEqual({
      status: "FAILED",
      error: "Service unavailable",
      retryable: true,
    });

    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    const networkFailure = await communicationNotificationSyncExecutor(item);
    expect(networkFailure).toEqual({ status: "FAILED", error: "offline", retryable: true });
  });
});
