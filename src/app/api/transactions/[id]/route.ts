import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { getAuthenticatedUserFromRequest } from "@/lib/auth/auth-service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!adminDb) {
      return NextResponse.json({ success: false, error: "Database not initialized" }, { status: 500 });
    }

    const authUser = await getAuthenticatedUserFromRequest(req);

    // 1. Fetch Order Document
    let orderSnap = await adminDb.collection("orders").doc(id).get();
    if (!orderSnap.exists) {
      // Try searching by dealId or razorpayOrderId
      const querySnap = await adminDb.collection("orders").where("dealId", "==", id).limit(1).get();
      if (!querySnap.empty) {
        orderSnap = querySnap.docs[0];
      }
    }

    if (!orderSnap.exists) {
      return NextResponse.json({ success: false, error: "Transaction not found" }, { status: 404 });
    }

    const orderData = orderSnap.data()!;

    // 2. Tenant Isolation Check
    if (authUser && authUser.role === "MERCHANT_ADMIN" && authUser.merchantId) {
      if (orderData.merchantId !== authUser.merchantId) {
        return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
      }
    }

    // 3. Fetch Related Deal Contract
    let dealData = null;
    if (orderData.dealId) {
      const dealSnap = await adminDb.collection("deals").doc(orderData.dealId).get();
      if (dealSnap.exists) {
        dealData = dealSnap.data();
      }
    }

    // 4. Fetch Related Payments
    const paymentsSnap = await adminDb
      .collection("payments")
      .where("orderId", "==", orderSnap.id)
      .get();
    const payments = paymentsSnap.docs.map((d) => d.data());

    // 5. Fetch Audit Trail Summary
    let auditEventsCount = 0;
    if (orderData.dealId) {
      const auditSnap = await adminDb
        .collection("audit_events")
        .where("dealId", "==", orderData.dealId)
        .get();
      auditEventsCount = auditSnap.size;
    }

    const transaction = {
      id: orderSnap.id,
      orderId: orderSnap.id,
      dealId: orderData.dealId,
      merchantId: orderData.merchantId,
      merchantName: dealData?.merchantName || orderData.merchantId,
      amount: (orderData.amount || 0) / 100,
      currency: orderData.currency || "INR",
      status: orderData.status,
      razorpayOrderId: orderData.razorpayOrderId,
      createdAt: orderData.createdAt,
      updatedAt: orderData.updatedAt,
      deal: dealData,
      payments: payments.map((p) => ({
        id: p.id,
        providerPaymentId: p.providerPaymentId || p.razorpayPaymentId || null,
        status: p.status,
        amount: (p.amount || 0) / 100,
        createdAt: p.createdAt,
      })),
      auditEventsCount,
    };

    return NextResponse.json({
      success: true,
      transaction,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load transaction details";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
