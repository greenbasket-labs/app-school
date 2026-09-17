import Link from "next/link";

export default function WorkspaceNav({ schoolId }: { schoolId: string }) {
  const items = [
    ["Dashboard", `/app/schools/${schoolId}/dashboard`],
    ["Students", `/app/schools/${schoolId}/students`],
    ["Attendance", `/app/schools/${schoolId}/attendance`],
    ["Assessments & Results", `/app/schools/${schoolId}/assessments`],
    ["Fees & Finance", `/app/schools/${schoolId}/finance`],
    ["Reports", `/app/schools/${schoolId}/reports`],
  ] as const;

  return (
    <nav aria-label="School navigation" style={{ marginTop: 18, display: "flex", gap: 8, flexWrap: "wrap" }}>
      {items.map(([label, href]) => (
        <Link
          key={href}
          href={href}
          style={{
            padding: "8px 12px",
            borderRadius: 999,
            border: "1px solid #dce3df",
            background: "white",
            color: "#31443a",
            textDecoration: "none",
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
