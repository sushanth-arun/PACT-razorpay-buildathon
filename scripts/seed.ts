import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { DEMO_MERCHANT_ID, DEMO_MERCHANT, DEMO_PRODUCTS } from "../src/services/seed";



async function main() {
  console.log("=========================================");
  console.log("PACT FIREBASE SEED MECHANISM (DEV ONLY)");
  console.log("=========================================");

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKeyRaw = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (!projectId) {
    console.error("❌ ERROR: Firebase Project ID is missing in .env.local");
    console.error("Please ensure NEXT_PUBLIC_FIREBASE_PROJECT_ID or FIREBASE_ADMIN_PROJECT_ID is set.");
    process.exit(1);
  }

  console.log(`📌 Configured Firebase Project ID: [ ${projectId} ]`);

  let db;

  if (clientEmail && privateKeyRaw) {
    console.log("🔑 Authenticating via Firebase Admin Service Account...");
    const privateKey = privateKeyRaw.replace(/\\n/g, "\n");
    const app = !getApps().length
      ? initializeApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        })
      : getApps()[0];
    db = getFirestore(app);
  } else {
    console.log("⚡ Firebase Admin credentials not found. Initializing Admin in default application credential mode...");
    const app = !getApps().length
      ? initializeApp({ projectId })
      : getApps()[0];
    db = getFirestore(app);
  }

  try {
    console.log("\n1. Processing Demo Merchant: ErgoSpace...");
    const merchantRef = db.collection("merchants").doc(DEMO_MERCHANT.id);
    const merchantSnap = await merchantRef.get();

    let merchantStatus = "CREATED";
    if (merchantSnap.exists) {
      merchantStatus = "UPDATED (EXISTED)";
    }
    await merchantRef.set(DEMO_MERCHANT, { merge: true });
    console.log(`   └ Merchant [ ${DEMO_MERCHANT.name} ] (${DEMO_MERCHANT.id}): ${merchantStatus}`);

    console.log("\n2. Processing 10 Demo Products...");
    let createdCount = 0;
    let updatedCount = 0;

    for (const prod of DEMO_PRODUCTS) {
      const prodRef = db.collection("products").doc(prod.id);
      const prodSnap = await prodRef.get();
      if (prodSnap.exists) {
        updatedCount++;
      } else {
        createdCount++;
      }
      await prodRef.set(prod, { merge: true });
      console.log(`   ├ [${prod.id}] ${prod.name} (₹${prod.price}, Stock: ${prod.stock}) -> Saved`);
    }

    console.log("\n=========================================");
    console.log("SEED SUMMARY RESULT");
    console.log("=========================================");
    console.log(`✔ Project ID:               ${projectId}`);
    console.log(`✔ Merchant Status:          ${merchantStatus}`);
    console.log(`✔ Products Created (New):   ${createdCount}`);
    console.log(`✔ Products Updated (Exist): ${updatedCount}`);
    console.log(`✔ Total Products in Seed:   ${DEMO_PRODUCTS.length}`);
    console.log("STATUS: SUCCESS (Idempotent seed completed cleanly)");
    console.log("=========================================\n");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("\n❌ SEED FAILED WITH ERROR:", msg);
    console.error("Please verify Firestore database is created in your Firebase console and service account has permissions.\n");
    process.exit(1);
  }
}

main();


