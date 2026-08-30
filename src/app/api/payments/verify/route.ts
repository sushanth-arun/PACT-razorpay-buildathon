import { NextRequest, NextResponse } from "next/server";
import { VerifyPaymentRequestSchema } from "@/lib/payments/schema";
import { verifyPaymentSignature } from "@/lib/payments/payment-service";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const parseResult = VerifyPaymentRequestSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid payment verification payload.",
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const verificationResult = await verifyPaymentSignature(parseResult.data);

    if (!verificationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: verificationResult.message,
          status: verificationResult.status,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(verificationResult, { status: 200 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Payment verification failed.";
    return NextResponse.json(
      {
        success: false,
        error: "Internal verification error.",
        details: msg,
      },
      { status: 500 }
    );
  }
}
