"use client";

import { useState } from "react";

type Notice = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  senderEmail: string;
};

export function ParentNotificationInbox({
  schoolId,
  initialNotifications,
}: {
  schoolId: string;
  initialNotifications: Notice[];
}) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [message, setMessage] = useState("");

  async function markRead(notificationId: string) {
    setMessage("");
    const response = await fetch("/api/parent/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schoolId, notificationId }),
    });
    const data = await response.json();
    if (!response.ok) return setMessage(data.error ?? "Could not mark notification as read.");
    setNotifications((current) =>
      current.map((notice) =>
        notice.id === notificationId ? { ...notice, readAt: new Date().toISOString() } : notice,
      ),
    );
  }

  return (
    <section style={{ marginTop: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <h3 style={{ marginBottom: 8 }}>School notifications</h3>
        <a href={`/parent/settings/notification-preferences?schoolId=${schoolId}`}>Notification settings</a>
      </div>
      {message && <p role="status">{message}</p>}
      {notifications.length === 0 ? (
        <p style={{ color: "#53615a" }}>No parent notifications yet.</p>
      ) : (
        notifications.map((notice) => (
          <article key={notice.id} style={{ borderTop: "1px solid #edf1ee", padding: "12px 0", background: notice.readAt ? "transparent" : "#f7faf8" }}>
            <strong>{notice.title}</strong>
            <p style={{ whiteSpace: "pre-wrap" }}>{notice.body}</p>
            <small>From {notice.senderEmail} · {new Date(notice.createdAt).toLocaleString()}</small>
            {!notice.readAt && (
              <div>
                <button onClick={() => void markRead(notice.id)} style={{ marginTop: 8 }}>
                  Mark as read
                </button>
              </div>
            )}
          </article>
        ))
      )}
    </section>
  );
}
