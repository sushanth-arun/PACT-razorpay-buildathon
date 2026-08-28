import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
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

    const snap = await adminDb
      .collection("products")
      .where("merchantId", "==", merchantId)
      .get();

    const products: Product[] = snap.docs.map((doc) => doc.data() as Product);

    return NextResponse.json({
      success: true,
      products,
    });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Unknown error reading products";
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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const product = body.product as Product;

    if (!product || !product.id) {
      return NextResponse.json({ errorType: "VALIDATION_ERROR", error: "Product payload missing or invalid ID." }, { status: 400 });
    }

    if (!adminDb) {
      return NextResponse.json({ errorType: "CONFIGURATION_ERROR", error: "Firebase Admin SDK not initialized." }, { status: 500 });
    }

    const docRef = adminDb.collection("products").doc(product.id);
    await docRef.set(
      {
        ...product,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    return NextResponse.json({ success: true, message: "Product saved cleanly via Admin API." });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Failed to save product";
    return NextResponse.json({ errorType: "SERVER_ERROR", error: errMessage }, { status: 500 });
  }
}


