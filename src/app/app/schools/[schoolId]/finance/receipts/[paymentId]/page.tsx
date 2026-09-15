import ReceiptWorkspace from "./workspace";

export default async function ReceiptPage({ params }: { params: Promise<{ schoolId: string; paymentId: string }> }) {
  const { schoolId, paymentId } = await params;
  return <ReceiptWorkspace schoolId={schoolId} paymentId={paymentId} />;
}
