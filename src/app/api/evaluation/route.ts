import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { getAuthenticatedUserFromRequest } from "@/lib/auth/auth-service";
import { formatMerchantName } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    if (!adminDb) {
      return NextResponse.json({
        success: false,
        error: "Firestore database not configured",
      }, { status: 500 });
    }

    const authUser = await getAuthenticatedUserFromRequest(req);
    const { searchParams } = new URL(req.url);
    const merchantId = searchParams.get("merchantId");

    let evalQuery: FirebaseFirestore.Query = adminDb.collection("policy_evaluations");

    if (authUser?.role === "MERCHANT_ADMIN" && authUser.merchantId) {
      evalQuery = evalQuery.where("metadata.merchantId", "==", authUser.merchantId);
    } else if (merchantId) {
      evalQuery = evalQuery.where("metadata.merchantId", "==", merchantId);
    }

    const evalSnap = await evalQuery.limit(50).get();
    const rawEvals = evalSnap.docs.map((d) => d.data());

    // Fetch linked deals
    const dealIds = Array.from(new Set(rawEvals.map((e) => e.dealId).filter(Boolean)));
    const dealsMap: Record<string, FirebaseFirestore.DocumentData> = {};

    if (dealIds.length > 0) {
      const dealSnaps = await Promise.all(
        dealIds.map((id) => adminDb!.collection("deals").doc(id).get())
      );
      for (const snap of dealSnaps) {
        const data = snap.data();
        if (snap.exists && data) {
          dealsMap[snap.id] = data;
        }
      }
    }

    // Transform into enriched real-time evaluated deals (Deduplicate by dealId to ensure 1 evaluation per deal)
    const seenDealIds = new Set<string>();
    const evaluations = [];

    for (const e of rawEvals) {
      if (!e.dealId || seenDealIds.has(e.dealId)) continue;
      const deal = dealsMap[e.dealId];
      if (!deal) continue;

      seenDealIds.add(e.dealId);
      evaluations.push({
        id: e.id,
        dealId: e.dealId,
        evaluatedAt: e.evaluatedAt,
        overallStatus: e.overallStatus,
        rulesCheckedCount: e.rulesCheckedCount || 9,
        passedCount: e.passedCount || 0,
        failedCount: e.failedCount || 0,
        warningCount: e.warningCount || 0,
        summary: e.summary,
        evaluations: e.evaluations || [],
        deal: {
          id: deal.dealId || e.dealId,
          merchantId: deal.merchantId,
          merchantName: formatMerchantName(deal.merchantName || e.metadata?.merchantId || deal.merchantId),
          status: deal.status,
          finalAmount: deal.finalAmount || 0,
          items: deal.items || [],
          discount: deal.discount || { amount: 0, percentage: 0 },
          subtotal: deal.subtotal || 0,
          deliveryDays: deal.deliveryDays || 7,
          slaCommitment: deal.slaCommitment,
        },
      });
    }

    evaluations.sort((a, b) => new Date(b.evaluatedAt).getTime() - new Date(a.evaluatedAt).getTime());

    // Compute live metrics from real deals
    const total = evaluations.length;
    const validated = evaluations.filter((e) => e.overallStatus === "VALIDATED").length;
    const blocked = evaluations.filter((e) => e.overallStatus === "REJECTED").length;
    const pendingApproval = evaluations.filter((e) => e.overallStatus === "PENDING_APPROVAL").length;
    const totalValueEvaluated = evaluations.reduce((sum, e) => sum + (e.deal.finalAmount || 0), 0);

    return NextResponse.json({
      success: true,
      evaluations,
      metrics: {
        total,
        validated,
        blocked,
        pendingApproval,
        complianceRate: total > 0 ? Math.round((validated / total) * 100) : 100,
        totalValueEvaluated,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load live evaluations";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
