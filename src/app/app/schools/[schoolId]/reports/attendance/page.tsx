"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function AttendanceReportPage({ params }: { params: Promise<{ schoolId: string }> }) {
  const [schoolId, setSchoolId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [report, setReport] = useState<any>(null);
  const [message, setMessage] = useState("");

  useEffect(() => { params.then(({ schoolId: id }) => { setSchoolId(id); const today = new Date().toISOString().slice(0, 10); setFrom(today); setTo(today); }); }, [params]);

  async function load() {
    setMessage("");
    const response = await fetch(`/api/schools/${schoolId}/reports/attendance?from=${from}&to=${to}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) { setMessage(data.message ?? "Could not load attendance report."); return; }
    setReport(data.report);
  }

  return (
    <main style={{ minHeight: "100vh", padding: 24 }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <Link href={`/app/schools/${schoolId}`} style={{ color: "#53615a" }}>← School workspace</Link>
        <h1 style={{ marginBottom: 6 }}>Attendance report</h1>
        <p style={{ color: "#53615a" }}>See recorded attendance totals and each student's attendance for a selected period.</p>
        <section style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end", padding: 16, border: "1px solid #dce3df", borderRadius: 14 }}>
          <label>From<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={inputStyle} /></label>
          <label>To<input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={inputStyle} /></label>
          <button type="button" onClick={load} disabled={!schoolId || !from || !to} style={buttonStyle}>Run report</button>
        </section>
        {message ? <p role="alert">{message}</p> : null}
        {report ? <>
          <section style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10 }}>
            {(["present", "absent", "late", "excused", "recorded"] as const).map((key) => <div key={key} style={cardStyle}><strong>{key[0].toUpperCase() + key.slice(1)}</strong><div style={{ fontSize: 26, fontWeight: 800, marginTop: 5 }}>{report.totals[key]}</div></div>)}
          </section>
          <section style={{ marginTop: 18, border: "1px solid #dce3df", borderRadius: 14, overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr>{["Student", "Admission No.", "Present", "Absent", "Late", "Excused", "Recorded"].map((heading) => <th key={heading} style={thStyle}>{heading}</th>)}</tr></thead><tbody>{report.students.map((student: any) => <tr key={student.studentId}>{[student.studentName, student.admissionNumber, student.present, student.absent, student.late, student.excused, student.recorded].map((value: any, index: number) => <td key={index} style={tdStyle}>{value}</td>)}</tr>)}</tbody></table>
            {report.students.length === 0 ? <p style={{ padding: 16, color: "#53615a" }}>No attendance records found for this period.</p> : null}
          </section>
        </> : null}
      </div>
    </main>
  );
}

const inputStyle: React.CSSProperties = { display: "block", marginTop: 5, padding: "9px 10px", border: "1px solid #ccd5d0", borderRadius: 8 };
const buttonStyle: React.CSSProperties = { padding: "10px 15px", border: 0, borderRadius: 9, background: "#183c2a", color: "white", fontWeight: 700 };
const cardStyle: React.CSSProperties = { padding: 15, border: "1px solid #dce3df", borderRadius: 12 };
const thStyle: React.CSSProperties = { textAlign: "left", padding: 12, borderBottom: "1px solid #dce3df", whiteSpace: "nowrap" };
const tdStyle: React.CSSProperties = { padding: 12, borderBottom: "1px solid #edf0ee" };
