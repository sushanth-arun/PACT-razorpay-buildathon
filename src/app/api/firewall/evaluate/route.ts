import { NextRequest, NextResponse } from "next/server";
import { evaluateDealWithFirewall } from "@/lib/firewall";
import { EvaluateFirewallRequestSchema } from "@/lib/firewall/schema";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const parseResult = EvaluateFirewallRequestSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request payload. 'dealId' string is required.",
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { dealId } = parseResult.data;

    // Call deterministic PACT Firewall Engine (ZERO GEMINI, ZERO RAZORPAY)
    const result = await evaluateDealWithFirewall({ dealId });

    if (!result.success && !result.evaluation) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Firewall evaluation failed to execute.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      evaluation: result.evaluation,
    });
  } catch (error: unknown) {
    console.error("Error in /api/firewall/evaluate POST endpoint:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error during firewall policy evaluation.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
