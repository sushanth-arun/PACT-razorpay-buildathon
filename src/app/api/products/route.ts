import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { getAuthenticatedUserFromRequest } from "@/lib/auth/auth-service";
import { Product } from "@/types";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const merchantId = searchParams.get("merchantId") || "ergospace";

    if (!adminDb) {
      return NextResponse.json(
        {
          errorType: "CONFIGURATION_ERROR",
          error: "Firebase Admin is not configured on the server.",
        },
        { status: 500 }
      );
    }

    // Try subcollection first: merchants/{merchantId}/products
    let products: Product[] = [];
    const subSnap = await adminDb
      .collection("merchants")
      .doc(merchantId)
      .collection("products")
      .get();

    if (!subSnap.empty) {
      products = subSnap.docs.map((doc) => doc.data() as Product);
    } else {
      // Fallback to root products collection
      const rootSnap = await adminDb
        .collection("products")
        .where("merchantId", "==", merchantId)
        .get();
      products = rootSnap.docs.map((doc) => doc.data() as Product);
    }

    return NextResponse.json({
      success: true,
      products,
    });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Unknown error reading products";
    return NextResponse.json(
      {
        errorType: "SERVER_ERROR",
        error: errMessage,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // 1. Authoritative Server-Side User Verification
    const authUser = await getAuthenticatedUserFromRequest(request);
    const body = await request.json();
    const product = body.product as Product;

    if (!product || !product.id) {
      return NextResponse.json({ errorType: "VALIDATION_ERROR", error: "Product payload missing or invalid ID." }, { status: 400 });
    }

    // 2. Multi-tenant isolation check: If caller is authenticated as MERCHANT_ADMIN, they can ONLY edit products of their own merchantId
    if (authUser && authUser.role === "MERCHANT_ADMIN" && authUser.merchantId) {
      if (product.merchantId && product.merchantId !== authUser.merchantId) {
        return NextResponse.json(
          {
            errorType: "FORBIDDEN",
            error: `Access Denied: You cannot modify products belonging to merchant '${product.merchantId}'.`,
          },
          { status: 403 }
        );
      }
      product.merchantId = authUser.merchantId;
    }

    if (!adminDb) {
      return NextResponse.json({ errorType: "CONFIGURATION_ERROR", error: "Firebase Admin SDK not initialized." }, { status: 500 });
    }

    const payload = {
      ...product,
      updatedAt: new Date().toISOString(),
    };

    // Save to merchants/{merchantId}/products/{productId} subcollection
    if (product.merchantId) {
      await adminDb
        .collection("merchants")
        .doc(product.merchantId)
        .collection("products")
        .doc(product.id)
        .set(payload, { merge: true });
    }

    // Also sync to root products collection
    const docRef = adminDb.collection("products").doc(product.id);
    await docRef.set(payload, { merge: true });

    return NextResponse.json({ success: true, message: "Product saved cleanly via Admin API." });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Failed to save product";
    return NextResponse.json({ errorType: "SERVER_ERROR", error: errMessage }, { status: 500 });
  }
}


