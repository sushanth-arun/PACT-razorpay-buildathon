import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

export function isFirebaseAdminConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_ADMIN_PROJECT_ID &&
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL &&
    process.env.FIREBASE_ADMIN_PRIVATE_KEY
  );
}

const adminApp = !getApps().length && isFirebaseAdminConfigured()
  ? initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: (process.env.FIREBASE_ADMIN_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
      }),
    })
  : (getApps().length ? getApps()[0] : null);

export const adminDb = adminApp ? getFirestore(adminApp) : null;
if (adminDb) {
  try {
    adminDb.settings({ ignoreUndefinedProperties: true });
  } catch {
    // ignore if already configured
  }
}
export const adminAuth = adminApp ? getAuth(adminApp) : null;



