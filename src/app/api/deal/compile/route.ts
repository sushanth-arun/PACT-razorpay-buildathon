import { NextRequest, NextResponse } from "next/server";
import { compileDeal } from "@/lib/deal-compiler";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { buyerIntentId, merchantOfferId } = body;

    if (!buyerIntentId || typeof buyerIntentId !== "string") {
      return NextResponse.json(
        { success: false, error: "buyerIntentId is required and must be a string." },
        { status: 400 }
      );
    }

    if (!merchantOfferId || typeof merchantOfferId !== "string") {
      return NextResponse.json(
        { success: false, error: "merchantOfferId is required and must be a string." },
        { status: 400 }
      );
    }

    // Call deterministic deal compiler engine (NO GEMINI, NO RAZORPAY)
    const result = await compileDeal({
      buyerIntentId,
      merchantOfferId,
    });

    return NextResponse.json({
      success: result.success,
      contract: result.contract,
      error: result.error,
    });
  } catch (error: unknown) {
    console.error("Error in /api/deal/compile POST endpoint:", error);
    const message = error instanceof Error ? error.message : "Internal server error during deal compilation.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
