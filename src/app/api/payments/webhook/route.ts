import { NextRequest, NextResponse } from "next/server";
import { processRazorpayWebhook } from "@/lib/payments/payment-service";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signatureHeader = req.headers.get("x-razorpay-signature") || "";

    if (!signatureHeader) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing 'x-razorpay-signature' header.",
        },
        { status: 400 }
      );
    }

    const result = await processRazorpayWebhook(rawBody, signatureHeader);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: result.message,
        event: result.event,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Webhook processing failure.";
    return NextResponse.json(
      {
        success: false,
        error: "Internal webhook processing error.",
        details: msg,
      },
      { status: 500 }
    );
  }
}
