import Link from "next/link";
import { redirect } from "next/navigation";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { currentSession } from "@/domain/auth/session-cookie";
import { requireSchoolModule } from "@/domain/modules/guard";
import { db } from "@/lib/db";
import { getPaymentReceipt, ReceiptNotFoundError } from "@/domain/finance/receipts";

export default async function ReceiptPage({ params, searchParams }: { params: Promise<{ schoolId: string }>; searchParams: Promise<{ paymentId?: string }> }) {
  const session = await currentSession();
  if (!session) redirect("/login");
  const { schoolId } = await params;
  const { paymentId } = await searchParams;
  if (!paymentId) redirect(`/app/schools/${schoolId}/finance/payments`);

  const membership = await db.membership.findFirst({
    where: { userId: session.user.id, schoolId, status: "ACTIVE" },
    select: { capabilities: { select: { capability: { select: { code: true } } } } },
  });
  if (!membership || !new Set(membership.capabilities.map(({ capability }) => capability.code)).has(CAPABILITIES.VIEW_FINANCE)) redirect(`/app/schools/${schoolId}`);
  try { await requireSchoolModule(schoolId, "FINANCE"); } catch { redirect(`/app/schools/${schoolId}/settings/modules`); }

  let receipt;
  try { receipt = await getPaymentReceipt(schoolId, paymentId); } catch (error) {
    if (error instanceof ReceiptNotFoundError) redirect(`/app/schools/${schoolId}/finance/payments`);
    throw error;
  }

  return (
    <main style={{ minHeight: "100vh", padding: 24, background: "#f7f9f8" }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <div className="receipt-actions" style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <Link href={`/app/schools/${schoolId}/finance/payments`}>← Payments</Link>
          <button type="button" onClick={() => window.print()} style={{ padding: "9px 14px", borderRadius: 8, border: "1px solid #cfd8d2", background: "white", cursor: "pointer" }}>Print receipt</button>
        </div>
        <article style={{ background: "white", padding: 32, border: "1px solid #dfe6e1", borderRadius: 14 }}>
          <header style={{ borderBottom: "1px solid #e1e6e3", paddingBottom: 18, marginBottom: 22 }}>
            <h1 style={{ margin: 0 }}>{receipt.school.name}</h1>
            {receipt.school.address && <p style={{ margin: "6px 0 0" }}>{receipt.school.address}</p>}
            {(receipt.school.phone || receipt.school.email) && <p style={{ margin: "4px 0 0", color: "#53615a" }}>{[receipt.school.phone, receipt.school.email].filter(Boolean).join(" · ")}</p>}
            <p style={{ margin: "16px 0 0", fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase" }}>Payment Receipt</p>
          </header>
          <div style={{ display: "grid", gap: 10 }}>
            <p style={{ margin: 0 }}><strong>Receipt:</strong> {receipt.receiptNumber}</p>
            <p style={{ margin: 0 }}><strong>Student:</strong> {receipt.student.name}</p>
            <p style={{ margin: 0 }}><strong>Admission No.:</strong> {receipt.student.admissionNumber}</p>
            <p style={{ margin: 0 }}><strong>Fee:</strong> {receipt.feeName}</p>
            <p style={{ margin: 0 }}><strong>Amount received:</strong> ₦{Number(receipt.amount).toLocaleString("en-NG", { minimumFractionDigits: 2 })}</p>
            <p style={{ margin: 0 }}><strong>Payment date:</strong> {new Date(receipt.paidAt).toLocaleString("en-NG")}</p>
            {receipt.reference && <p style={{ margin: 0 }}><strong>Reference:</strong> {receipt.reference}</p>}
            {receipt.note && <p style={{ margin: 0 }}><strong>Note:</strong> {receipt.note}</p>}
            <p style={{ margin: "12px 0 0", paddingTop: 12, borderTop: "1px solid #e1e6e3" }}><strong>Balance after payment:</strong> ₦{Number(receipt.balanceAfter).toLocaleString("en-NG", { minimumFractionDigits: 2 })}</p>
          </div>
          <p style={{ margin: "28px 0 0", color: "#53615a", fontSize: 13 }}>This receipt is generated from the school&apos;s recorded payment transaction.</p>
        </article>
      </div>
      <style>{`@media print { body { background: white !important; } .receipt-actions { display: none !important; } article { border: 0 !important; box-shadow: none !important; } }`}</style>
    </main>
  );
}
