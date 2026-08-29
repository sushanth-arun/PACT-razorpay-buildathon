import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { Merchant } from "@/types";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id") || "ergospace";

    if (!adminDb) {
      return NextResponse.json(
        {
          errorType: "CONFIGURATION_ERROR",
          error: "Firebase Admin is not configured on the server.",
        },
        { status: 500 }
      );
    }

    const docSnap = await adminDb.collection("merchants").doc(id).get();
    if (!docSnap.exists) {
      return NextResponse.json(
        {
          errorType: "NOT_FOUND",
          error: `Merchant with ID '${id}' not found in Firestore.`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      merchant: docSnap.data() as Merchant,
    });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Unknown error reading merchant";
    const isPermission = errMessage.toLowerCase().includes("permission") || errMessage.toLowerCase().includes("unauthenticated");
    return NextResponse.json(
      {
        errorType: isPermission ? "PERMISSION_DENIED" : "SERVER_ERROR",
        error: errMessage,
      },
      { status: isPermission ? 403 : 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { merchantId = "ergospace", policies } = body;

    if (!adminDb) {
      return NextResponse.json(
        { errorType: "CONFIGURATION_ERROR", error: "Firebase Admin SDK not initialized." },
        { status: 500 }
      );
    }

    const docRef = adminDb.collection("merchants").doc(merchantId);
    await docRef.set(
      {
        ...policies,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    return NextResponse.json({ success: true, message: "Policies updated cleanly via Admin API." });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Failed to update merchant policies";
    return NextResponse.json({ errorType: "SERVER_ERROR", error: errMessage }, { status: 500 });
  }
}


