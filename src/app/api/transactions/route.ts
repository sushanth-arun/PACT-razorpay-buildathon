import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { getAuthenticatedUserFromRequest } from "@/lib/auth/auth-service";
import { formatMerchantName } from "@/lib/utils";

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
    const orders = ordersSnap.docs.map((d) => d.data());

    // Fetch all deals so in-progress / draft deals appear immediately in History
    const allDealsSnap = await adminDb.collection("deals").orderBy("createdAt", "desc").limit(50).get();
    const allDeals = allDealsSnap.docs.map((d) => d.data());

    // Map deals into transactions list
    const transactions = allDeals.map((deal) => {
      const matchingOrder = orders.find((o) => o.dealId === deal.dealId);
      const isPaid = deal.status === "PAID" || matchingOrder?.status === "PAID";
      return {
        id: deal.dealId,
        orderId: matchingOrder?.id || deal.dealId,
        dealId: deal.dealId,
        buyerIntentId: deal.buyerIntentId,
        merchantOfferId: deal.merchantOfferId,
        merchantId: deal.merchantId,
        merchantName: formatMerchantName(deal.merchantName || deal.merchantId),
        amount: deal.finalAmount || (matchingOrder ? matchingOrder.amount / 100 : 0),
        status: isPaid ? "PAID" : deal.status,
        razorpayOrderId: matchingOrder?.razorpayOrderId || null,
        createdAt: deal.createdAt,
        updatedAt: deal.updatedAt,
        itemsCount: deal.items?.length || 0,
        items: deal.items || [],
        discount: deal.discount || { amount: 0, percentage: 0 },
        finalAmount: deal.finalAmount || 0,
        subtotal: deal.subtotal || 0,
      };
    });

    // Also include any orders whose deals might not be in deals collection
    for (const order of orders) {
      if (!transactions.some((t) => t.dealId === order.dealId || t.orderId === order.id)) {
        transactions.push({
          id: order.id,
          orderId: order.id,
          dealId: order.dealId || order.id,
          buyerIntentId: null,
          merchantOfferId: null,
          merchantId: order.merchantId,
          merchantName: formatMerchantName(order.merchantId),
          amount: order.amount / 100,
          status: order.status === "PAID" ? "PAID" : order.status === "CREATED" ? "PENDING" : order.status,
          razorpayOrderId: order.razorpayOrderId,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
          itemsCount: 1,
          items: [],
          discount: { amount: 0, percentage: 0 },
          finalAmount: order.amount / 100,
          subtotal: order.amount / 100,
        });
      }
    }

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
