import { NextResponse } from "next/server";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { adminDb, adminAuth } from "@/lib/firebase/admin";
import { DEMO_MERCHANTS } from "@/services/seed";
import { upsertUserProfile } from "@/lib/auth/auth-service";

const MERCHANT_ACCOUNTS = [
  { email: "merchant@ergospace.com", merchantId: "ergospace", name: "ErgoSpace Admin", storeName: "ErgoSpace" },
  { email: "merchant@deskforge.com", merchantId: "deskforge", name: "DeskForge Admin", storeName: "DeskForge" },
  { email: "merchant@cybertech.com", merchantId: "cybertech", name: "CyberTech Admin", storeName: "CyberTech Workspace" },
  { email: "merchant@officepro.com", merchantId: "officepro", name: "OfficePro Admin", storeName: "OfficePro" },
  { email: "merchant@nordicliving.com", merchantId: "nordicliving", name: "NordicLiving Admin", storeName: "NordicLiving Commercial" },
  { email: "buyer@pact.ai", role: "BUYER", name: "AI Buyer Demo" },
];

export async function POST() {
  try {
    if (!isFirebaseConfigured() || !adminDb) {
      return NextResponse.json(
        {
          success: false,
          error: "Firebase environment variables are not configured.",
          manualSteps: "Add NEXT_PUBLIC_FIREBASE_* and FIREBASE_ADMIN_* variables to .env.local",
        },
        { status: 400 }
      );
    }

    let totalProducts = 0;
    const merchantNames: string[] = [];

    // 1. Seed Merchants & Products
    for (const m of DEMO_MERCHANTS) {
      const { initialProducts, ...merchantRecord } = m;
      
      // Save Merchant document
      await adminDb.collection("merchants").doc(merchantRecord.id).set(merchantRecord);
      merchantNames.push(merchantRecord.name);

      // Save Products into merchants/{merchantId}/products sub-collection (and root collection)
      for (const prod of initialProducts) {
        await adminDb
          .collection("merchants")
          .doc(merchantRecord.id)
          .collection("products")
          .doc(prod.id)
          .set(prod);

        await adminDb.collection("products").doc(prod.id).set(prod);
        totalProducts++;
      }
    }

    // 2. Provision / Sync Firebase Auth User Accounts and Firestore Profiles
    if (adminAuth) {
      for (const acc of MERCHANT_ACCOUNTS) {
        try {
          let userRecord;
          try {
            userRecord = await adminAuth.getUserByEmail(acc.email);
            // Ensure existing user password is updated to PACT123456
            await adminAuth.updateUser(userRecord.uid, {
              password: "PACT123456",
              displayName: acc.name,
            });
          } catch {
            // Create user if not exists
            userRecord = await adminAuth.createUser({
              email: acc.email,
              password: "PACT123456",
              displayName: acc.name,
            });
          }

          const nowStr = new Date().toISOString();
          const role = acc.role === "BUYER" ? "BUYER" : "MERCHANT_ADMIN";
          const merchantId = acc.role === "BUYER" ? undefined : acc.merchantId;

          // Upsert User Profile into Firestore users collection
          await upsertUserProfile({
            uid: userRecord.uid,
            email: acc.email,
            role,
            displayName: acc.name,
            merchantId,
            createdAt: nowStr,
            updatedAt: nowStr,
          });

          // If merchant, link ownerUid in merchant document
          if (merchantId) {
            await adminDb.collection("merchants").doc(merchantId).update({
              ownerUid: userRecord.uid,
              updatedAt: nowStr,
            });
          }
        } catch (authErr) {
          console.warn(`[Seed] Could not auto-provision ${acc.email}:`, authErr);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully seeded ${DEMO_MERCHANTS.length} merchants, ${totalProducts} catalog products, and merchant user accounts into Firestore.`,
      merchants: merchantNames,
      merchantsCount: DEMO_MERCHANTS.length,
      productsSeededCount: totalProducts,
      accounts: MERCHANT_ACCOUNTS.map((a) => ({ email: a.email, role: a.role || "MERCHANT_ADMIN", merchantId: a.merchantId || null })),
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


