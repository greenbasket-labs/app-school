"use client";

import { useEffect } from "react";
import { listLocalRecords } from "@/domain/platform/local-repository";
import { reconcileAttendanceRoster } from "@/domain/attendance/reconciliation-client";
import { getConnectivityState } from "@/domain/platform/connectivity";
import { startSyncScheduler } from "@/domain/platform/sync-scheduler";
import { schoolSyncExecutor } from "@/domain/platform/sync-registry";
import type { AttendanceRosterSnapshot } from "@/domain/attendance/offline-sync";

export default function SyncRunner({ schoolId }: { schoolId: string }) {
  useEffect(() => {
    let cancelled = false;

    const reconcileAttendance = async () => {
      if (cancelled || getConnectivityState() === "OFFLINE") return;

      try {
        const records = await listLocalRecords<AttendanceRosterSnapshot>(schoolId, "AttendanceRoster");

        for (const record of records) {
          if (cancelled) return;
          const snapshot = record.data;
          await reconcileAttendanceRoster({
            schoolId,
            academicSessionId: snapshot.academicSessionId,
            classArmId: snapshot.classArmId,
            attendanceDate: snapshot.attendanceDate,
          });
        }
      } catch {
        // Pull reconciliation is best-effort; queued mutations continue through the sync engine.
      }
    };

    const stop = startSyncScheduler({
      schoolId,
      executor: schoolSyncExecutor,
      intervalMs: 30_000,
    });

    const onOnline = () => void reconcileAttendance();
    window.addEventListener("online", onOnline);
    void reconcileAttendance();

    return () => {
      cancelled = true;
      window.removeEventListener("online", onOnline);
      stop();
    };
  }, [schoolId]);

  return null;
}
