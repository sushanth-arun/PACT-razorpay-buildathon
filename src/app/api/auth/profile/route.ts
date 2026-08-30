import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserFromRequest, getUserProfile, upsertUserProfile } from "@/lib/auth/auth-service";
import { UserProfile, UserRole } from "@/types";
import { adminDb } from "@/lib/firebase/admin";

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUserFromRequest(req);
    if (!authUser) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getUserProfile(authUser.uid);
    return NextResponse.json({
      success: true,
      user: profile || {
        uid: authUser.uid,
        email: authUser.email,
        role: authUser.role,
        merchantId: authUser.merchantId,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch user session";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUserFromRequest(req);
    if (!authUser) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const role: UserRole = body.role === "MERCHANT_ADMIN" ? "MERCHANT_ADMIN" : "BUYER";
    const displayName = body.displayName || "";
    let merchantId = body.merchantId;

    // If Merchant signup, ensure a new merchant is provisioned or assigned
    if (role === "MERCHANT_ADMIN") {
      const merchantName = body.merchantName || "New Merchant Store";
      const merchantDescription = body.merchantDescription || "Merchant on PACT Commerce Engine";

      if (!merchantId) {
        // Generate unique merchant ID
        merchantId = `mch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      }

      if (adminDb) {
        // Create Merchant Document with ownerUid
        await adminDb.collection("merchants").doc(merchantId).set(
          {
            id: merchantId,
            name: merchantName,
            description: merchantDescription,
            ownerUid: authUser.uid,
            maxDiscountPercent: 15,
            minimumMarginPercent: 20,
            maxAutoTransactionAmount: 50000,
            approvalRequiredAbove: 50000,
            allowSlowMovingInventoryDiscount: true,
            active: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }
    }

    const nowStr = new Date().toISOString();
    const userProfile: UserProfile = {
      uid: authUser.uid,
      email: authUser.email,
      role,
      displayName,
      merchantId: role === "MERCHANT_ADMIN" ? merchantId : undefined,
      createdAt: nowStr,
      updatedAt: nowStr,
    };

    await upsertUserProfile(userProfile);

    return NextResponse.json({
      success: true,
      user: userProfile,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to provision user profile";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
