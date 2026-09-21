"use client";

import { useState } from "react";

const modules = [
  ["classes", "Classes & Subjects"],
  ["fees", "Fees & Bursary"],
  ["portals", "Student & Parent Portals"],
] as const;

export default function BackendMenu() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>({
    classes: true,
    fees: true,
    portals: true,
  });

  return (
    <section aria-label="Backend module controls" style={{ borderTop: "1px solid #dfe7e2", paddingTop: 16, marginTop: 24 }}>
      <strong style={{ fontSize: 13 }}>Backend</strong>
      <p style={{ color: "#66736c", fontSize: 13, margin: "6px 0 12px" }}>
        Owner-only module switches. Disabling a module hides its workspace; records are preserved.
      </p>
      <div style={{ display: "grid", gap: 8 }}>
        {modules.map(([key, label]) => (
          <label key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, fontSize: 14 }}>
            <span>{label}</span>
            <input
              type="checkbox"
              checked={enabled[key]}
              onChange={(event) => setEnabled((current) => ({ ...current, [key]: event.target.checked }))}
              aria-label={"Enable " + label}
            />
          </label>
        ))}
      </div>
    </section>
  );
}
