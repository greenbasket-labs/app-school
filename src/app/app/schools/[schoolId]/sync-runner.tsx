"use client";

import { useEffect } from "react";
import { schoolSyncExecutor } from "@/domain/platform/school-sync-executors";
import { startSyncScheduler } from "@/domain/platform/sync-scheduler";

export default function SyncRunner({ schoolId }: { schoolId: string }) {
  useEffect(() => startSyncScheduler({ schoolId, executor: schoolSyncExecutor, intervalMs: 30_000 }), [schoolId]);

  return null;
}
