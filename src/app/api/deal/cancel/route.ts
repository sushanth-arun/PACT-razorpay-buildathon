import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { BUYER_INTENTS_COLLECTION } from "@/services/buyer-intent-service";
import { MERCHANT_OFFERS_COLLECTION } from "@/lib/ai/merchant-tools";
import { DEALS_COLLECTION } from "@/lib/deal-compiler";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const dealId = body?.dealId;
    const buyerIntentId = body?.buyerIntentId;
    const offerId = body?.offerId;

    if (!dealId && !buyerIntentId && !offerId) {
      return NextResponse.json(
        { success: false, error: "At least one of dealId, buyerIntentId, or offerId is required." },
        { status: 400 }
      );
    }

    if (!adminDb) {
      return NextResponse.json(
        { success: false, error: "Database not configured." },
        { status: 500 }
      );
    }

    // 1. Safety Check: Verify Deal is not settled/paid
    if (dealId) {
      const dealDoc = await adminDb.collection(DEALS_COLLECTION).doc(dealId).get();
      if (dealDoc.exists) {
        const dealData = dealDoc.data();
        if (dealData?.status === "PAID") {
          return NextResponse.json(
            { success: false, error: "Cannot delete a settled/paid deal transaction." },
            { status: 400 }
          );
        }

        // Delete subcollections under deals/{dealId}
        try {
          const subIntents = await adminDb.collection(DEALS_COLLECTION).doc(dealId).collection(BUYER_INTENTS_COLLECTION).get();
          for (const d of subIntents.docs) {
            await d.ref.delete();
          }
          const subOffers = await adminDb.collection(DEALS_COLLECTION).doc(dealId).collection(MERCHANT_OFFERS_COLLECTION).get();
          for (const d of subOffers.docs) {
            await d.ref.delete();
          }
        } catch {
          // ignore subcollection listing errors
        }

        // Delete root deal document
        await adminDb.collection(DEALS_COLLECTION).doc(dealId).delete();

        // Delete policy evaluation
        await adminDb.collection("policy_evaluations").doc(`peval_${dealId}`).delete();

        // Delete unpaid orders linked to this deal
        const orderSnap = await adminDb.collection("orders").where("dealId", "==", dealId).get();
        for (const o of orderSnap.docs) {
          if (o.data()?.status !== "PAID") {
            await o.ref.delete();
          }
        }

        // Delete audit events linked to this deal
        const auditSnap = await adminDb.collection("audit_events").where("dealId", "==", dealId).get();
        for (const a of auditSnap.docs) {
          await a.ref.delete();
        }
      }
    }

    // 2. Delete root Buyer Intent
    if (buyerIntentId) {
      await adminDb.collection(BUYER_INTENTS_COLLECTION).doc(buyerIntentId).delete();
    }

    // 3. Delete root Merchant Offer
    if (offerId) {
      await adminDb.collection(MERCHANT_OFFERS_COLLECTION).doc(offerId).delete();
    }

    return NextResponse.json({
      success: true,
      message: `Successfully deleted draft/in-progress deal [${dealId || buyerIntentId}].`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to cancel deal";
    console.error("Error in /api/deal/cancel:", err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
