import { NextRequest, NextResponse } from "next/server";
import { getAuditTrail, getAuditDealIds } from "@/lib/audit/audit-service";
import { AuditQueryFilterSchema } from "@/lib/audit/schema";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // If query is for deal list
    if (searchParams.get("action") === "deals") {
      const deals = await getAuditDealIds();
      return NextResponse.json({
        success: true,
        deals,
      });
    }

    const rawParams = {
      dealId: searchParams.get("dealId") || undefined,
      merchantId: searchParams.get("merchantId") || undefined,
      actor: searchParams.get("actor") || undefined,
      eventType: searchParams.get("eventType") || undefined,
      search: searchParams.get("search") || undefined,
      limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : 100,
      order: searchParams.get("order") || "asc",
    };

    const parsed = AuditQueryFilterSchema.safeParse(rawParams);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid audit filter query parameters",
          details: parsed.error.format(),
        },
        { status: 400 }
      );
    }

    const events = await getAuditTrail(parsed.data);

    return NextResponse.json({
      success: true,
      count: events.length,
      filter: parsed.data,
      events,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to retrieve audit events.";
    console.error("[GET /api/audit] Error:", err);
    return NextResponse.json(
      {
        success: false,
        error: msg,
      },
      { status: 500 }
    );
  }
}
