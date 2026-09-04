import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { getAuthenticatedUserFromRequest } from "@/lib/auth/auth-service";
import { formatMerchantName } from "@/lib/utils";

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

    // 1. Fetch Order Document or direct Deal Contract
    let orderSnap = await adminDb.collection("orders").doc(id).get();
    if (!orderSnap.exists) {
      // Try searching by dealId or razorpayOrderId
      const querySnap = await adminDb.collection("orders").where("dealId", "==", id).limit(1).get();
      if (!querySnap.empty) {
        orderSnap = querySnap.docs[0];
      }
    }

    // If no order exists yet (e.g. Deal is in DRAFT / OFFER_GENERATED / COMPILED / PENDING_APPROVAL / REJECTED / VALIDATED)
    if (!orderSnap.exists) {
      const directDealSnap = await adminDb.collection("deals").doc(id).get();
      if (directDealSnap.exists) {
        const directDeal = directDealSnap.data()!;

        // Tenant Isolation Check for direct deals
        if (authUser && authUser.role === "MERCHANT_ADMIN" && authUser.merchantId) {
          if (directDeal.merchantId && directDeal.merchantId.toLowerCase() !== authUser.merchantId.toLowerCase()) {
            return NextResponse.json({ success: false, error: "Forbidden: Access denied to other merchant deal details" }, { status: 403 });
          }
        }
        
        // Fetch policy evaluation if exists
        let directEval = null;
        const evalSnap = await adminDb
          .collection("policy_evaluations")
          .doc(`peval_${directDeal.dealId}`)
          .get();
        if (evalSnap.exists) {
          directEval = evalSnap.data();
        }

        // Fetch latest merchant offer if not embedded
        let merchantOffer = directDeal.merchantOffer || null;
        if (!merchantOffer && directDeal.merchantOfferId) {
          const offerSnap = await adminDb.collection("merchant_offers").doc(directDeal.merchantOfferId).get();
          if (offerSnap.exists) {
            merchantOffer = offerSnap.data();
          }
        }
        if (!merchantOffer) {
          const subOffers = await adminDb.collection("deals").doc(directDeal.dealId).collection("merchant_offers").limit(1).get();
          if (!subOffers.empty) {
            merchantOffer = subOffers.docs[0].data();
          }
        }

        // Fetch Buyer Intent if exists
        let buyerIntent = null;
        if (directDeal.buyerIntentId) {
          const intentSnap = await adminDb.collection("buyer_intents").doc(directDeal.buyerIntentId).get();
          if (intentSnap.exists) {
            buyerIntent = intentSnap.data();
          }
        }

        // Fetch audit events count
        let auditEventsCount = 0;
        try {
          const auditSnap = await adminDb.collection("audit_events").where("dealId", "==", directDeal.dealId).get();
          auditEventsCount = auditSnap.size;
        } catch {
          // ignore
        }

        const enrichedDeal = {
          ...directDeal,
          merchantOffer,
          buyerIntent,
          items: directDeal.items && directDeal.items.length > 0
            ? directDeal.items
            : merchantOffer?.selectedItems && merchantOffer.selectedItems.length > 0
            ? merchantOffer.selectedItems
            : merchantOffer?.alternativeItems && merchantOffer.alternativeItems.length > 0
            ? merchantOffer.alternativeItems
            : [],
          subtotal: directDeal.subtotal || merchantOffer?.subtotal || 0,
          discount: directDeal.discount || merchantOffer?.proposedDiscount || { amount: 0, percentage: 0 },
          finalAmount: directDeal.finalAmount || merchantOffer?.estimatedFinalAmount || 0,
          deliveryDays: directDeal.deliveryDays || merchantOffer?.deliveryDays || 5,
        };

        return NextResponse.json({
          success: true,
          deal: enrichedDeal,
          evaluation: directEval,
          transaction: {
            id: directDeal.dealId,
            orderId: directDeal.dealId,
            dealId: directDeal.dealId,
            merchantId: directDeal.merchantId,
            merchantName: formatMerchantName(directDeal.merchantName || directDeal.merchantId),
            status: directDeal.status || (merchantOffer ? merchantOffer.status : "DRAFT"),
            amount: enrichedDeal.finalAmount || 0,
            currency: "INR",
            deal: enrichedDeal,
            evaluation: directEval,
            payments: [],
            auditEventsCount,
          },
        });
      }
      return NextResponse.json({ success: false, error: "Transaction or Deal not found" }, { status: 404 });
    }

    const orderData = orderSnap.data()!;

    // 2. Tenant Isolation Check
    if (authUser && authUser.role === "MERCHANT_ADMIN" && authUser.merchantId) {
      if ((orderData.merchantId || "").toLowerCase() !== authUser.merchantId.toLowerCase()) {
        return NextResponse.json({ success: false, error: "Forbidden: Access denied to other merchant transactions" }, { status: 403 });
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

    // 5. Fetch Audit Trail Summary & Policy Evaluation
    let auditEventsCount = 0;
    let evaluationData = null;
    if (orderData.dealId) {
      const auditSnap = await adminDb
        .collection("audit_events")
        .where("dealId", "==", orderData.dealId)
        .get();
      auditEventsCount = auditSnap.size;

      const evalSnap = await adminDb
        .collection("policy_evaluations")
        .doc(`peval_${orderData.dealId}`)
        .get();
      if (evalSnap.exists) {
        evaluationData = evalSnap.data();
      }
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
      evaluation: evaluationData,
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
      deal: dealData,
      evaluation: evaluationData,
      transaction,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load transaction details";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
