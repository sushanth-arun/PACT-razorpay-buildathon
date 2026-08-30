import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { getAuthenticatedUserFromRequest } from "@/lib/auth/auth-service";

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUserFromRequest(req);
    const { searchParams } = new URL(req.url);
    const scope = searchParams.get("scope"); // "buyer" | "merchant"
    const merchantIdParam = searchParams.get("merchantId");
    const dealIdParam = searchParams.get("dealId");

    if (!adminDb) {
      return NextResponse.json({ success: false, error: "Database not configured" }, { status: 500 });
    }

    let query: FirebaseFirestore.Query = adminDb.collection("orders");

    // Enforce Tenant Isolation / Identity Filtering
    if (authUser) {
      if (authUser.role === "MERCHANT_ADMIN" && authUser.merchantId) {
        // Merchant can ONLY read their own merchant transactions
        query = query.where("merchantId", "==", authUser.merchantId);
      } else if (scope === "merchant" && merchantIdParam) {
        query = query.where("merchantId", "==", merchantIdParam);
      }
    } else if (merchantIdParam) {
      query = query.where("merchantId", "==", merchantIdParam);
    }

    if (dealIdParam) {
      query = query.where("dealId", "==", dealIdParam);
    }

    const ordersSnap = await query.limit(50).get();
    
    // Fetch associated deal and payment details for rich UI cards
    const orders = ordersSnap.docs.map((d) => d.data());
    const dealIds = Array.from(new Set(orders.map((o) => o.dealId).filter(Boolean)));
    const dealsMap: Record<string, FirebaseFirestore.DocumentData> = {};

    if (dealIds.length > 0) {
      const dealSnaps = await Promise.all(
        dealIds.map((id) => adminDb!.collection("deals").doc(id).get())
      );
      for (const snap of dealSnaps) {
        const data = snap.data();
        if (snap.exists && data) dealsMap[snap.id] = data;
      }
    }

    // Combine into rich transaction records
    const transactions = orders
      .filter((order) => {
        // If deals collection was wiped or deal was deleted, omit orphaned records
        if (!order.dealId) return false;
        const deal = dealsMap[order.dealId];
        return Boolean(deal);
      })
      .map((order) => {
        const deal = dealsMap[order.dealId] || null;
        return {
          id: order.id,
          orderId: order.id,
          dealId: order.dealId,
          merchantId: order.merchantId,
          merchantName: deal?.merchantName || order.merchantId || "ErgoSpace",
          amount: order.amount / 100, // paise to INR
        status: order.status === "PAID" ? "PAID" : order.status === "CREATED" ? "PENDING" : order.status,
        razorpayOrderId: order.razorpayOrderId,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        itemsCount: deal?.items?.length || 1,
        items: deal?.items || [],
        discount: deal?.discount || { amount: 0, percentage: 0 },
        finalAmount: deal?.finalAmount || (order.amount / 100),
        subtotal: deal?.subtotal || (order.amount / 100),
      };
    });

    // Sort newest first
    transactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      success: true,
      transactions,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load transactions";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
