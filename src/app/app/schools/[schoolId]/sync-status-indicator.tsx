"use client";

import { useEffect, useState } from "react";
import { getConnectivityState } from "@/domain/platform/connectivity";
import { listLocalRecords } from "@/domain/platform/local-repository";
import { getPendingOutbox } from "@/domain/platform/local-outbox";
import { syncStatusLabel, deriveSyncStatus, type SyncStatus } from "@/domain/platform/sync-status";

export default function SyncStatusIndicator({ schoolId }: { schoolId: string }) {
  const [connectivity, setConnectivity] = useState<"ONLINE" | "OFFLINE">("ONLINE");
  const [status, setStatus] = useState<SyncStatus>("IDLE");
  const [pending, setPending] = useState(0);
  const [failed, setFailed] = useState(0);
  const [conflicts, setConflicts] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const refresh = async () => {
      const state = getConnectivityState();
      setConnectivity(state);
      try {
        const [outbox, records] = await Promise.all([
          getPendingOutbox(schoolId),
          listLocalRecords(schoolId),
        ]);
        const failedCount = records.filter((record) => record.syncState === "FAILED").length;
        const conflictCount = records.filter((record) => record.syncState === "CONFLICT").length;
        const nextSyncing = outbox.length > 0 && state === "ONLINE";
        setPending(outbox.length);
        setFailed(failedCount);
        setConflicts(conflictCount);
        setSyncing(nextSyncing);
        setStatus(deriveSyncStatus({ connectivity: state, pending: outbox.length, failed: failedCount, conflicts: conflictCount, syncing: nextSyncing }));
      } catch {
        setPending(0);
        setFailed(0);
        setConflicts(0);
        setSyncing(false);
        setStatus(state === "OFFLINE" ? "OFFLINE" : "FAILED");
      }
    };

    const onOnline = () => void refresh();
    const onOffline = () => void refresh();
    const timer = window.setInterval(() => void refresh(), 10_000);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    void refresh();

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [schoolId]);

  return (
    <div
      aria-live="polite"
      title={`Sync status: ${syncStatusLabel[status]}`}
      style={{
        marginTop: 16,
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap",
        padding: "10px 12px",
        border: "1px solid #dce3df",
        borderRadius: 12,
        background: "#f8faf9",
        color: "#31443a",
        fontSize: 13,
      }}
    >
      <strong>{syncStatusLabel[status]}</strong>
      <span>{connectivity === "ONLINE" ? "Online" : "Offline"}</span>
      {pending > 0 ? <span>{pending} pending</span> : null}
      {failed > 0 ? <span>{failed} failed</span> : null}
      {conflicts > 0 ? <span>{conflicts} conflict{conflicts === 1 ? "" : "s"}</span> : null}
      {syncing ? <span>· background sync active</span> : null}
    </div>
  );
}
