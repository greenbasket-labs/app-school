import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentSession } from "@/domain/auth/session-cookie";
import { getAcademicHistory } from "@/domain/assessments/academic-history";
import { GuardianAccountAuthorizationError, requireVerifiedGuardianChildAccess } from "@/domain/guardians/account-access";

export default async function ParentChildHistoryPage({ params, searchParams }: { params: Promise<{ studentId: string }>; searchParams: Promise<{ schoolId?: string }> }) {
  const session = await currentSession();
  if (!session) redirect("/login");
  const { studentId } = await params;
  const { schoolId } = await searchParams;
  if (!schoolId) return notFound();

  try {
    await requireVerifiedGuardianChildAccess({ schoolId, userId: session.user.id, studentId });
  } catch (error) {
    if (error instanceof GuardianAccountAuthorizationError) {
      return <main style={{ minHeight: "100vh", padding: 32 }}><div style={{ maxWidth: 700, margin: "80px auto" }}><h1>Access not available</h1><p style={{ color: "#53615a" }}>This child is not connected to your verified guardian relationship in this school.</p><Link href="/parent">Back to parent workspace</Link></div></main>;
    }
    throw error;
  }

  const result = await getAcademicHistory(schoolId, studentId);

  return <main style={{ minHeight: "100vh", padding: 24 }}><div style={{ maxWidth: 950, margin: "0 auto" }}><Link href="/parent" style={{ color: "#53615a" }}>← My children</Link><h1 style={{ marginBottom: 4 }}>{result.student.firstName} {result.student.middleName ? `${result.student.middleName} ` : ""}{result.student.lastName}</h1><p style={{ color: "#53615a" }}>Published academic history</p>{result.history.length === 0 ? <p>No published academic history is available.</p> : <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr><th style={{ textAlign: "left", padding: 10 }}>Session</th><th style={{ textAlign: "left", padding: 10 }}>Term</th><th style={{ textAlign: "left", padding: 10 }}>Subject</th><th style={{ textAlign: "left", padding: 10 }}>Assessment</th><th style={{ textAlign: "right", padding: 10 }}>Score</th><th style={{ textAlign: "right", padding: 10 }}>%</th></tr></thead><tbody>{result.history.map((row) => <tr key={row.assessmentId}><td style={{ padding: 10, borderTop: "1px solid #edf1ee" }}>{row.session.name}</td><td style={{ padding: 10, borderTop: "1px solid #edf1ee" }}>{row.term.name}</td><td style={{ padding: 10, borderTop: "1px solid #edf1ee" }}>{row.subject.name}</td><td style={{ padding: 10, borderTop: "1px solid #edf1ee" }}>{row.assessmentName}</td><td style={{ padding: 10, borderTop: "1px solid #edf1ee", textAlign: "right" }}>{row.score ?? "—"} / {row.maxScore}</td><td style={{ padding: 10, borderTop: "1px solid #edf1ee", textAlign: "right" }}>{row.percentage ?? "—"}</td></tr>)}</tbody></table></div>}</div></main>;
}
