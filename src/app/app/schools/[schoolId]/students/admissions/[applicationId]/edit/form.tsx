"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Initial = {
  firstName: string;
  middleName: string | null;
  lastName: string;
  dateOfBirth: Date | null;
  academicSessionId: string;
  classLevelId: string;
  classArmId: string | null;
};

type Session = { id: string; name: string };
type ClassLevel = { id: string; name: string; order: number };
type ClassArm = { id: string; name: string; classLevelId: string };

export default function EditAdmissionForm({
  schoolId,
  applicationId,
  initial,
  sessions,
  classLevels,
  classArms,
}: {
  schoolId: string;
  applicationId: string;
  initial: Initial;
  sessions: Session[];
  classLevels: ClassLevel[];
  classArms: ClassArm[];
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: initial.firstName,
    middleName: initial.middleName ?? "",
    lastName: initial.lastName,
    dateOfBirth: initial.dateOfBirth
      ? new Date(initial.dateOfBirth).toISOString().slice(0, 10)
      : "",
    academicSessionId: initial.academicSessionId,
    classLevelId: initial.classLevelId,
    classArmId: initial.classArmId ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const selectedArms = useMemo(
    () => classArms.filter((arm) => arm.classLevelId === form.classLevelId),
    [classArms, form.classLevelId],
  );

  function updateLevel(classLevelId: string) {
    setForm((current) => ({
      ...current,
      classLevelId,
      classArmId:
        classArms.find((arm) => arm.classLevelId === classLevelId)?.id ?? "",
    }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/schools/${schoolId}/admissions/${applicationId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            dateOfBirth: form.dateOfBirth || undefined,
            classArmId: form.classArmId || undefined,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || data.error || "Could not update application.",
        );
      }

      router.push(
        `/app/schools/${schoolId}/students/admissions/${applicationId}`,
      );
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not update application.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      style={{
        marginTop: 24,
        background: "white",
        border: "1px solid #e0e6e2",
        borderRadius: 16,
        padding: 24,
      }}
    >
      <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
            gap: 12,
          }}
        >
          <label style={labelStyle}>
            Academic session
            <select
              required
              value={form.academicSessionId}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  academicSessionId: event.target.value,
                }))
              }
              style={inputStyle}
            >
              {sessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.name}
                </option>
              ))}
            </select>
          </label>

          <label style={labelStyle}>
            Class
            <select
              required
              value={form.classLevelId}
              onChange={(event) => updateLevel(event.target.value)}
              style={inputStyle}
            >
              {classLevels.map((level) => (
                <option key={level.id} value={level.id}>
                  {level.name}
                </option>
              ))}
            </select>
          </label>

          <label style={labelStyle}>
            Class arm
            <select
              value={form.classArmId}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  classArmId: event.target.value,
                }))
              }
              style={inputStyle}
              disabled={selectedArms.length === 0}
            >
              <option value="">
                {selectedArms.length === 0 ? "No class arms" : "Select arm"}
              </option>
              {selectedArms.map((arm) => (
                <option key={arm.id} value={arm.id}>
                  {arm.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
            gap: 12,
          }}
        >
          <label style={labelStyle}>
            First name
            <input
              required
              value={form.firstName}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  firstName: event.target.value,
                }))
              }
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            Middle name
            <input
              value={form.middleName}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  middleName: event.target.value,
                }))
              }
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            Last name
            <input
              required
              value={form.lastName}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  lastName: event.target.value,
                }))
              }
              style={inputStyle}
            />
          </label>
        </div>

        <label style={labelStyle}>
          Date of birth
          <input
            type="date"
            value={form.dateOfBirth}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                dateOfBirth: event.target.value,
              }))
            }
            style={inputStyle}
          />
        </label>

        {message && (
          <div
            role="alert"
            style={{
              padding: 12,
              borderRadius: 10,
              background: "#fff4f2",
              color: "#8a3b2f",
              fontSize: 13,
            }}
          >
            {message}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            disabled={saving}
            onClick={() =>
              router.push(
                `/app/schools/${schoolId}/students/admissions/${applicationId}`,
              )
            }
            style={secondaryButton}
          >
            Cancel
          </button>

          <button type="submit" disabled={saving} style={primaryButton}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </section>
  );
}

const labelStyle = {
  display: "grid",
  gap: 6,
  fontSize: 13,
  fontWeight: 700,
  color: "#53615a",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "11px 12px",
  border: "1px solid #ccd6d0",
  borderRadius: 9,
  background: "white",
  font: "inherit",
};

const primaryButton = {
  border: 0,
  borderRadius: 9,
  background: "#173d2a",
  color: "white",
  padding: "11px 15px",
  fontWeight: 800,
  cursor: "pointer",
};

const secondaryButton = {
  border: "1px solid #ccd6d0",
  borderRadius: 9,
  background: "white",
  color: "#173d2a",
  padding: "11px 15px",
  fontWeight: 700,
  cursor: "pointer",
};
