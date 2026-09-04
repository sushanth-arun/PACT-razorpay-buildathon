import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const DEMO_ACCOUNTS = [
  { email: "buyer@pact.ai", role: "BUYER", name: "AI Buyer" },
  { email: "merchant@ergospace.com", merchantId: "ergospace", name: "ErgoSpace Admin", role: "MERCHANT_ADMIN" },
  { email: "merchant@deskforge.com", merchantId: "deskforge", name: "DeskForge Admin", role: "MERCHANT_ADMIN" },
  { email: "merchant@cybertech.com", merchantId: "cybertech", name: "CyberTech Admin", role: "MERCHANT_ADMIN" },
  { email: "merchant@officepro.com", merchantId: "officepro", name: "OfficePro Admin", role: "MERCHANT_ADMIN" },
  { email: "merchant@nordicliving.com", merchantId: "nordicliving", name: "NordicLiving Admin", role: "MERCHANT_ADMIN" },
];

async function main() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKeyRaw = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKeyRaw) {
    console.error("Missing Firebase Admin credentials in .env.local");
    process.exit(1);
  }

  const privateKey = privateKeyRaw.replace(/\\n/g, "\n");
  const app = !getApps().length
    ? initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
      })
    : getApps()[0];

  const auth = getAuth(app);
  const db = getFirestore(app);

  const PASSWORD = "PACT123456";

  console.log(`Setting password to [ ${PASSWORD} ] for all demo accounts in project [ ${projectId} ]...`);

  for (const acc of DEMO_ACCOUNTS) {
    try {
      let uid: string;
      try {
        const existing = await auth.getUserByEmail(acc.email);
        uid = existing.uid;
        await auth.updateUser(uid, {
          password: PASSWORD,
          displayName: acc.name,
        });
        console.log(`✔ UPDATED Auth user: ${acc.email} (UID: ${uid}) with password '${PASSWORD}'`);
      } catch (err: any) {
        if (err.code === "auth/user-not-found") {
          const created = await auth.createUser({
            email: acc.email,
            password: PASSWORD,
            displayName: acc.name,
          });
          uid = created.uid;
          console.log(`✔ CREATED Auth user: ${acc.email} (UID: ${uid}) with password '${PASSWORD}'`);
        } else {
          throw err;
        }
      }

      // Upsert Firestore user doc
      const nowStr = new Date().toISOString();
      await db.collection("users").doc(uid).set(
        {
          uid,
          email: acc.email,
          displayName: acc.name,
          role: acc.role,
          merchantId: acc.merchantId || null,
          updatedAt: nowStr,
        },
        { merge: true }
      );
      console.log(`  └ Upserted Firestore profile for ${acc.email}`);
    } catch (err: any) {
      console.error(`❌ FAILED for ${acc.email}:`, err.message || err);
    }
  }

  console.log("\nAll demo accounts synced successfully!");
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
