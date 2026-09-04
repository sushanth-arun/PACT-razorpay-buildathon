import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { getAuthenticatedUserFromRequest } from "@/lib/auth/auth-service";
import { recordAuditEvent } from "@/lib/audit/audit-service";
import { DEALS_COLLECTION } from "@/lib/deal-compiler";

export async function POST(req: NextRequest) {
  try {
    if (!adminDb) {
      return NextResponse.json({ success: false, error: "Database unavailable" }, { status: 500 });
    }

    const authUser = await getAuthenticatedUserFromRequest(req);
    const body = await req.json();
    const { dealId, action, notes } = body;

    if (!dealId || typeof dealId !== "string") {
      return NextResponse.json({ success: false, error: "dealId is required" }, { status: 400 });
    }

    if (action !== "APPROVE" && action !== "REJECT") {
      return NextResponse.json(
        { success: false, error: "action must be either 'APPROVE' or 'REJECT'" },
        { status: 400 }
      );
    }

    const dealRef = adminDb.collection(DEALS_COLLECTION).doc(dealId);
    const dealSnap = await dealRef.get();

    if (!dealSnap.exists) {
      return NextResponse.json({ success: false, error: `Deal '${dealId}' not found` }, { status: 404 });
    }

    const deal = dealSnap.data();
    if (!deal) {
      return NextResponse.json({ success: false, error: "Invalid deal data" }, { status: 500 });
    }

    const merchantId = deal.merchantId || "ergospace";

    // Tenant Isolation Check: Merchants cannot approve/reject deals from other merchants
    if (authUser && authUser.role === "MERCHANT_ADMIN" && authUser.merchantId) {
      if (merchantId.toLowerCase() !== authUser.merchantId.toLowerCase()) {
        return NextResponse.json({ success: false, error: "Forbidden: You cannot approve or reject deals belonging to other merchants" }, { status: 403 });
      }
    }

    const nowStr = new Date().toISOString();
    const actorName = authUser?.email || "Merchant Admin";

    if (action === "APPROVE") {
      // Transition Deal to VALIDATED so buyer can immediately proceed to payment
      await dealRef.update({
        status: "VALIDATED",
        firewallStatus: "VALIDATED",
        approvedBy: actorName,
        approvedAt: nowStr,
        approvalNotes: notes || "Approved manually by merchant manager",
        updatedAt: nowStr,
      });

      // Update deals subcollections
      await dealRef
        .collection("policy_evaluations")
        .doc(deal.lastFirewallEvaluationId || "manual_approval")
        .set(
          {
            overallStatus: "VALIDATED",
            manualApproval: {
              approvedBy: actorName,
              approvedAt: nowStr,
              notes: notes || "Approved by merchant manager",
            },
          },
          { merge: true }
        );

      await recordAuditEvent(
        "DEAL_APPROVED",
        "MERCHANT_AGENT",
        `Deal ${dealId} (₹${deal.finalAmount.toLocaleString("en-IN")}) APPROVED by Merchant Admin (${actorName}). Deal status updated to VALIDATED.`,
        {
          dealId,
          merchantId,
          approvedBy: actorName,
          finalAmount: deal.finalAmount,
          notes: notes || undefined,
        }
      );

      return NextResponse.json({
        success: true,
        message: `Deal ${dealId} successfully approved and set to VALIDATED. Buyer can now settle payment.`,
        status: "VALIDATED",
      });
    } else {
      // Transition Deal to REJECTED
      await dealRef.update({
        status: "REJECTED",
        firewallStatus: "REJECTED",
        rejectedBy: actorName,
        rejectedAt: nowStr,
        rejectionNotes: notes || "Rejected by merchant manager",
        updatedAt: nowStr,
      });

      await recordAuditEvent(
        "DEAL_REJECTED",
        "MERCHANT_AGENT",
        `Deal ${dealId} (₹${deal.finalAmount.toLocaleString("en-IN")}) REJECTED by Merchant Admin (${actorName}).`,
        {
          dealId,
          merchantId,
          rejectedBy: actorName,
          finalAmount: deal.finalAmount,
          notes: notes || undefined,
        }
      );

      return NextResponse.json({
        success: true,
        message: `Deal ${dealId} has been rejected.`,
        status: "REJECTED",
      });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to process merchant approval decision";
    console.error("[POST /api/merchant/approval] Error:", err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
