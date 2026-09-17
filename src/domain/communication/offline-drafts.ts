import { createClientOperationId, localRecordId } from "@/domain/platform/client-operation";
import { saveLocalMutation } from "@/domain/platform/local-repository";
import type { LocalRecord } from "@/domain/platform/local-store";

export const COMMUNICATION_DRAFT_ENTITY = "CommunicationDraft";
export const COMMUNICATION_DRAFT_OPERATION = "communication.notification.create";

export type CommunicationDraft = {
  title: string;
  body: string;
  membershipIds: string[];
  channel: "IN_APP";
};

export type CommunicationDraftRecord = LocalRecord<CommunicationDraft>;

export function normalizeCommunicationDraft(input: CommunicationDraft): CommunicationDraft {
  const title = input.title.trim();
  const body = input.body.trim();
  const membershipIds = [...new Set(input.membershipIds.filter(Boolean))];

  if (!title) throw new Error("Title and message are required.");
  if (!body) throw new Error("Title and message are required.");
  if (membershipIds.length === 0) throw new Error("Select at least one recipient.");

  return {
    title,
    body,
    membershipIds,
    channel: "IN_APP",
  };
}

export async function saveCommunicationDraft(input: {
  schoolId: string;
  actorUserId?: string | null;
  draft: CommunicationDraft;
  draftId?: string;
  operationId?: string;
}) {
  const draft = normalizeCommunicationDraft(input.draft);
  const draftId = input.draftId ?? createClientOperationId("communication-draft");
  const operationId = input.operationId ?? createClientOperationId("communication-send");
  const recordId = localRecordId(input.schoolId, COMMUNICATION_DRAFT_ENTITY, draftId);

  const record = await saveLocalMutation({
    schoolId: input.schoolId,
    actorUserId: input.actorUserId,
    entityType: COMMUNICATION_DRAFT_ENTITY,
    entityId: draftId,
    operationType: "UPSERT",
    operationId,
    payload: draft,
    record: {
      id: recordId,
      schoolId: input.schoolId,
      entityType: COMMUNICATION_DRAFT_ENTITY,
      entityId: draftId,
      data: draft,
      syncState: "PENDING_SYNC",
    },
  });

  return {
    record: record as CommunicationDraftRecord,
    operationId,
  };
}
