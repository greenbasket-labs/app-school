import type { SyncExecutor } from "@/domain/platform/sync-executor";

type CommunicationSyncResponse = {
  ok?: boolean;
  error?: string;
  message?: string;
  replayed?: boolean;
  notification?: {
    id?: string;
    title?: string;
    body?: string;
    membershipIds?: string[];
    channel?: "IN_APP";
    createdAt?: string;
    serverVersion?: string | null;
  };
};

function isRetryableStatus(status: number) {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

export const communicationNotificationSyncExecutor: SyncExecutor = async (item) => {
  if (item.entityType !== "CommunicationDraft" || item.operationType !== "UPSERT") {
    return { status: "FAILED", error: "Unsupported synchronization operation." };
  }

  const payload = item.payload as {
    title?: string;
    body?: string;
    membershipIds?: string[];
    channel?: string;
    draftId?: string;
  };

  if (
    !payload.title?.trim() ||
    !payload.body?.trim() ||
    !Array.isArray(payload.membershipIds) ||
    payload.membershipIds.length === 0 ||
    payload.channel !== "IN_APP"
  ) {
    return { status: "FAILED", error: "Invalid communication draft payload.", retryable: false };
  }

  try {
    const response = await fetch(`/api/schools/${item.schoolId}/communication/notifications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": item.operationId,
      },
      body: JSON.stringify({
        title: payload.title,
        body: payload.body,
        membershipIds: payload.membershipIds,
      }),
    });

    const data = (await response.json().catch(() => null)) as CommunicationSyncResponse | null;

    if (response.ok) {
      const notification = data?.notification;
      const serverVersion =
        notification?.serverVersion ??
        notification?.id ??
        response.headers.get("ETag")?.replace(/^"|"$/g, "") ??
        response.headers.get("X-Server-Version");

      if (!notification?.id || !notification.createdAt || !serverVersion) {
        return {
          status: "FAILED",
          error: "Server acknowledgement did not include complete authoritative notification data and version.",
          retryable: false,
        };
      }

      return {
        status: "ACKNOWLEDGED",
        serverVersion,
        authoritative: {
          data: {
            notificationId: notification.id,
            title: notification.title ?? payload.title.trim(),
            body: notification.body ?? payload.body.trim(),
            membershipIds: notification.membershipIds ?? payload.membershipIds,
            channel: "IN_APP",
            draftId: payload.draftId ?? item.entityId,
          },
          serverVersion,
          updatedAt: notification.createdAt,
        },
      };
    }

    if (response.status === 409) {
      return {
        status: "CONFLICT",
        error: data?.message ?? data?.error ?? "Server reported a synchronization conflict.",
      };
    }

    return {
      status: "FAILED",
      error: data?.message ?? data?.error ?? `Server rejected synchronization (${response.status}).`,
      retryable: isRetryableStatus(response.status),
    };
  } catch (error) {
    return {
      status: "FAILED",
      error: error instanceof Error ? error.message : "Network synchronization failed.",
      retryable: true,
    };
  }
};
