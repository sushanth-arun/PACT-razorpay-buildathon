import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { Merchant } from "@/types";

export async function GET(req: NextRequest) {
  try {
    if (!adminDb) {
      return NextResponse.json({ success: false, error: "Firebase Admin not configured" }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");

    const query: FirebaseFirestore.Query = adminDb.collection("merchants").where("active", "==", true);

    const snap = await query.get();
    let merchants = snap.docs.map((d) => d.data() as Merchant);

    // Filter by category if requested
    if (category) {
      const catLower = category.toLowerCase();
      merchants = merchants.filter((m) =>
        m.categories?.some((c) => c.toLowerCase() === catLower)
      );
    }

    // Compute active product counts for each merchant (checking both root and subcollections)
    const productCounts: Record<string, number> = {};
    for (const m of merchants) {
      try {
        const subSnap = await adminDb.collection("merchants").doc(m.id).collection("products").get();
        if (!subSnap.empty) {
          productCounts[m.id] = subSnap.size;
        } else {
          const rootSnap = await adminDb.collection("products").where("merchantId", "==", m.id).get();
          productCounts[m.id] = rootSnap.size;
        }
      } catch {
        productCounts[m.id] = 0;
      }
    }

    const enrichedMerchants = merchants.map((m) => ({
      id: m.id,
      name: m.name,
      description: m.description,
      categories: m.categories || ["General"],
      activeProductCount: productCounts[m.id] || 0,
      maxDiscountPercent: m.maxDiscountPercent,
      active: m.active ?? true,
    }));

    return NextResponse.json({
      success: true,
      count: enrichedMerchants.length,
      merchants: enrichedMerchants,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to list merchants";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
