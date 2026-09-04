import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { getAuthenticatedUserFromRequest } from "@/lib/auth/auth-service";
import { AuditEvent } from "@/lib/audit/schema";
import { formatMerchantName } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    if (!adminDb) {
      return NextResponse.json({ success: false, error: "Database unavailable" }, { status: 500 });
    }

    const authUser = await getAuthenticatedUserFromRequest(req);
    const { searchParams } = new URL(req.url);
    const merchantIdParam = searchParams.get("merchantId");

    // Fetch deals from Firestore
    let query: FirebaseFirestore.Query = adminDb.collection("deals").orderBy("createdAt", "desc");

    // Fetch all deals and filter in memory to handle case mismatch or aliases (e.g. ergospace vs DEMO_MERCHANT_ID)
    const dealsSnap = await query.limit(100).get();
    let deals = dealsSnap.docs.map((d) => d.data());

    const targetMerchantId = (authUser?.role === "MERCHANT_ADMIN" && authUser.merchantId)
      ? authUser.merchantId.toLowerCase()
      : (merchantIdParam && merchantIdParam !== "all")
      ? merchantIdParam.toLowerCase()
      : null;

    if (targetMerchantId) {
      deals = deals.filter((d) => {
        const dMerchant = (d.merchantId || "").toLowerCase();
        return dMerchant === targetMerchantId;
      });
    }

    if (deals.length === 0) {
      return NextResponse.json({
        success: true,
        dealsWithAudit: [],
        metrics: { totalDeals: 0, totalEvents: 0, passedEvents: 0, failedEvents: 0 },
      });
    }

    // Fetch audit events for all matching deals
    const auditSnap = await adminDb
      .collection("audit_events")
      .orderBy("timestamp", "asc")
      .limit(300)
      .get();
    const allAuditEvents = auditSnap.docs.map((d) => d.data() as AuditEvent);

    // Group audit events by dealId
    const eventsByDealId: Record<string, AuditEvent[]> = {};
    for (const evt of allAuditEvents) {
      const dId = evt.dealId;
      if (dId && dId !== "system") {
        if (!eventsByDealId[dId]) eventsByDealId[dId] = [];
        eventsByDealId[dId].push(evt);
      }
    }

    // Combine into rich Deals -> Audit Trail objects
    const dealsWithAudit = deals.map((deal) => {
      const events = eventsByDealId[deal.dealId] || [];
      return {
        dealId: deal.dealId,
        merchantId: deal.merchantId,
        merchantName: formatMerchantName(deal.merchantName || deal.merchantId),
        status: deal.status,
        finalAmount: deal.finalAmount || 0,
        subtotal: deal.subtotal || 0,
        items: deal.items || [],
        createdAt: deal.createdAt,
        updatedAt: deal.updatedAt,
        eventsCount: events.length,
        events,
      };
    });

    let totalEvents = 0;
    let passedEvents = 0;
    let failedEvents = 0;

    for (const d of dealsWithAudit) {
      totalEvents += d.events.length;
      for (const ev of d.events) {
        if (
          ev.eventType === "DEAL_VALIDATED" ||
          ev.eventType === "PAYMENT_SUCCESSFUL" ||
          ev.eventType === "POLICY_CHECK_PASSED" ||
          ev.eventType === "DEAL_COMPILED" ||
          ev.eventType === "MERCHANT_OFFER_GENERATED" ||
          ev.eventType === "BUYER_INTENT_PARSED"
        ) {
          passedEvents++;
        } else if (
          ev.eventType === "DEAL_REJECTED" ||
          ev.eventType === "PAYMENT_FAILED" ||
          ev.eventType === "POLICY_CHECK_FAILED" ||
          ev.eventType === "DEAL_COMPILATION_FAILED"
        ) {
          failedEvents++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      dealsWithAudit,
      metrics: {
        totalDeals: dealsWithAudit.length,
        totalEvents,
        passedEvents,
        failedEvents,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load deals audit trail";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
