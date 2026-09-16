import type { ReactNode } from "react";
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
      <SyncStatusIndicator schoolId={schoolId} />
      {children}
    </>
  );
}
