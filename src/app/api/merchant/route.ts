import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { getAuthenticatedUserFromRequest } from "@/lib/auth/auth-service";
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
    return NextResponse.json(
      {
        errorType: "SERVER_ERROR",
        error: errMessage,
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    // 1. Authoritative Server-Side User Verification
    const authUser = await getAuthenticatedUserFromRequest(request);
    const body = await request.json();
    const { policies } = body;
    let merchantId = body.merchantId || "ergospace";

    // 2. Multi-tenant isolation check: A logged-in MERCHANT_ADMIN can ONLY modify their own merchant policies
    if (authUser && authUser.role === "MERCHANT_ADMIN" && authUser.merchantId) {
      if (merchantId !== authUser.merchantId) {
        return NextResponse.json(
          {
            errorType: "FORBIDDEN",
            error: `Access Denied: You cannot modify policies for merchant '${merchantId}'.`,
          },
          { status: 403 }
        );
      }
      merchantId = authUser.merchantId;
    }

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


