import { NextRequest, NextResponse } from "next/server";
import { CreateOrderRequestSchema } from "@/lib/payments/schema";
import { createPaymentOrder } from "@/lib/payments/payment-service";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const parseResult = CreateOrderRequestSchema.safeParse(rawBody);

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
    const result = await createPaymentOrder(dealId);

    if (!result.success) {
      const statusMap: Record<string, number> = {
        DEAL_NOT_FOUND: 404,
        DEAL_NOT_ELIGIBLE: 403,
        ALREADY_PAID: 400,
        RAZORPAY_CONFIG_MISSING: 500,
        RAZORPAY_API_ERROR: 502,
      };

      const statusCode = statusMap[result.code || ""] || 400;
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          code: result.code,
        },
        { status: statusCode }
      );
    }

    return NextResponse.json(result.data, { status: 200 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create payment order.",
        details: msg,
      },
      { status: 500 }
    );
  }
}
