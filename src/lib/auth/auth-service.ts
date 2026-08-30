import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { UserProfile, UserRole } from "@/types";

export const USERS_COLLECTION = "users";

/**
 * Server-side helper to verify a Firebase Auth ID token.
 * Returns the verified token decoded payload.
 */
export async function verifyAuthToken(idToken: string) {
  if (!adminAuth) {
    throw new Error("Firebase Admin Auth is not configured.");
  }
  return await adminAuth.verifyIdToken(idToken, true);
}

/**
 * Retrieves the user profile from Firestore by UID.
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  if (!adminDb) return null;
  try {
    const snap = await adminDb.collection(USERS_COLLECTION).doc(uid).get();
    if (snap.exists) {
      return snap.data() as UserProfile;
    }
  } catch (err) {
    console.error("[Auth Service] Failed to get user profile:", err);
  }
  return null;
}

/**
 * Creates or updates a user profile with strict role assignment.
 */
export async function upsertUserProfile(profile: UserProfile): Promise<void> {
  if (!adminDb) {
    throw new Error("Firebase Admin DB not initialized.");
  }
  // Sanitize to prevent Firestore "Cannot use undefined as a Firestore value" error
  const cleanProfile = JSON.parse(JSON.stringify(profile));
  await adminDb.collection(USERS_COLLECTION).doc(profile.uid).set(cleanProfile, { merge: true });
}

/**
 * Extracts and verifies the user profile from the Authorization header (Bearer <token>).
 */
export async function getAuthenticatedUserFromRequest(request: Request): Promise<{
  uid: string;
  email: string;
  role: UserRole;
  merchantId?: string;
} | null> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.split("Bearer ")[1]?.trim();
  if (!token) return null;

  try {
    const decoded = await verifyAuthToken(token);
    const profile = await getUserProfile(decoded.uid);

    if (profile) {
      return {
        uid: profile.uid,
        email: profile.email,
        role: profile.role,
        merchantId: profile.merchantId,
      };
    }

    // Default to BUYER if profile document not yet created
    return {
      uid: decoded.uid,
      email: decoded.email || "",
      role: "BUYER",
    };
  } catch (err) {
    console.warn("[Auth Service] Token verification failed:", err);
    return null;
  }
}
