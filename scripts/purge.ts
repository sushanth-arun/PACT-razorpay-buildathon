import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const app = !getApps().length
  ? initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: (process.env.FIREBASE_ADMIN_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
      }),
    })
  : getApps()[0];

const db = getFirestore(app);

const COLLECTIONS = [
  "orders",
  "payments",
  "deals",
  "policy_evaluations",
  "audit_events",
  "buyer_intents",
  "merchant_offers",
  "evaluation_runs",
];

async function purge() {
  console.log("Starting database purge...");
  for (const col of COLLECTIONS) {
    const snap = await db.collection(col).get();
    console.log(`Deleting ${snap.size} documents from ${col}...`);
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    if (snap.size > 0) {
      await batch.commit();
    }
  }
  console.log("Successfully purged all temporary deal, transaction, audit, and evaluation records!");
  process.exit(0);
}

purge().catch((err) => {
  console.error(err);
  process.exit(1);
});
