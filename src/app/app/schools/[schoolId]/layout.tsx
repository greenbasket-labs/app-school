import type { ReactNode } from "react";
import SyncRunner from "./sync-runner";
import SyncStatusIndicator from "./sync-status-indicator";

export default async function SchoolWorkspaceLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ schoolId: string }>;
}) {
  const { schoolId } = await params;

  return (
    <>
      <SyncRunner schoolId={schoolId} />
      <SyncStatusIndicator schoolId={schoolId} />
      {children}
    </>
  );
}
