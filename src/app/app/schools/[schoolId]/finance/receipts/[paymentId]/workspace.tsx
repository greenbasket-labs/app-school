"use client";

import { useEffect, useState } from "react";

export default function ReceiptWorkspace({ schoolId, paymentId }: { schoolId: string; paymentId: string }) {
  const [receipt, setReceipt] = useState<any>(null);
  const [message, setMessage] = useState("Loading receipt…");

  useEffect(() => {
    fetch(`/api/schools/${schoolId}/finance/receipts/${paymentId}`, { cache: "no-store" })
      .then(async (response) => {
        const json = await response.json();
        if (!response.ok) throw new Error(json.message ?? "Unable to load receipt.");
        setReceipt(json.receipt);
        setMessage("");
      })
      .catch((error) => setMessage(error.message));
  }, [schoolId, paymentId]);

  if (!receipt) return <main style={{ padding: 24 }}><p>{message}</p></main>;

  return (
    <main style={{ padding: 24, maxWidth: 720 }}>
      <div id="receipt" style={{ padding: 28, border: "1px solid #d9e0db", borderRadius: 14, background: "white" }}>
        <header style={{ borderBottom: "1px solid #e1e6e3", paddingBottom: 18, marginBottom: 18 }}>
          <h1 style={{ margin: 0 }}>{receipt.school.name}</h1>
          {receipt.school.address && <p style={{ margin: "6px 0 0" }}>{receipt.school.address}</p>}
          {(receipt.school.phone || receipt.school.email) && <p style={{ margin: "6px 0 0" }}>{[receipt.school.phone, receipt.school.email].filter(Boolean).join(" · ")}</p>}
          <h2 style={{ margin: "20px 0 0" }}>Payment Receipt</h2>
          <p style={{ margin: "6px 0 0" }}>Receipt No: <strong>{receipt.receiptNumber}</strong></p>
        </header>

        <div style={{ display: "grid", gap: 8 }}>
          <p style={{ margin: 0 }}><strong>Student:</strong> {receipt.student.name}</p>
          <p style={{ margin: 0 }}><strong>Admission No:</strong> {receipt.student.admissionNumber}</p>
          <p style={{ margin: 0 }}><strong>Fee:</strong> {receipt.feeName}</p>
          <p style={{ margin: 0 }}><strong>Amount received:</strong> NGN {Number(receipt.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          <p style={{ margin: 0 }}><strong>Date:</strong> {new Date(receipt.paidAt).toLocaleString()}</p>
          {receipt.reference && <p style={{ margin: 0 }}><strong>Reference:</strong> {receipt.reference}</p>}
          <p style={{ margin: 0 }}><strong>Balance after payment:</strong> NGN {Number(receipt.balanceAfter).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          {receipt.note && <p style={{ margin: 0 }}><strong>Note:</strong> {receipt.note}</p>}
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button type="button" onClick={() => window.print()} style={{ padding: 11, borderRadius: 9, border: 0, background: "#183c2a", color: "white", fontWeight: 700 }}>Print receipt</button>
        <button type="button" onClick={() => window.history.back()} style={{ padding: 11, borderRadius: 9 }}>Back</button>
      </div>
    </main>
  );
}
