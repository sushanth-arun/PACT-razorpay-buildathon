import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

const COLLECTIONS_TO_PURGE = [
  "orders",
  "payments",
  "deals",
  "policy_evaluations",
  "audit_events",
  "buyer_intents",
  "merchant_offers",
  "evaluation_runs",
];

export async function POST() {
  try {
    if (!adminDb) {
      return NextResponse.json({ success: false, error: "Database not configured" }, { status: 500 });
    }

    const purgedCounts: Record<string, number> = {};

    for (const colName of COLLECTIONS_TO_PURGE) {
      const snap = await adminDb.collection(colName).get();
      const batch = adminDb.batch();
      let count = 0;

      snap.docs.forEach((doc) => {
        batch.delete(doc.ref);
        count++;
      });

      if (count > 0) {
        await batch.commit();
      }
      purgedCounts[colName] = count;
    }

    return NextResponse.json({
      success: true,
      message: "Successfully purged all transactions, orders, deals, policy evaluations, audit logs, and evaluation records.",
      purgedCounts,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to purge database records";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
