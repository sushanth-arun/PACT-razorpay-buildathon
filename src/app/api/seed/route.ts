import { NextResponse } from "next/server";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { seedDemoData } from "@/services/seed";

export async function POST() {
  try {
    if (!isFirebaseConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: "Firebase environment variables are not configured.",
          manualSteps: "Add NEXT_PUBLIC_FIREBASE_* variables to .env.local",
        },
        { status: 400 }
      );
    }

    const result = await seedDemoData();

    return NextResponse.json({
      success: true,
      message: "Successfully seeded ErgoSpace demo merchant and products.",
      merchant: result.merchant.name,
      productsSeededCount: result.productsCount,
    });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Unknown error during seeding";
    return NextResponse.json(
      {
        success: false,
        error: errMessage,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Send a POST request to /api/seed to trigger demo merchant seeding.",
    firebaseConfigured: isFirebaseConfigured(),
  });
}


