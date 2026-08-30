"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { UserProfile, UserRole } from "@/types";

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  role: UserRole | null;
  merchantId: string | null;
  login: (email: string, pass: string) => Promise<UserProfile | null>;
  signup: (
    email: string,
    pass: string,
    role: UserRole,
    details?: { displayName?: string; merchantName?: string; merchantDescription?: string; merchantId?: string }
  ) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  role: null,
  merchantId: null,
  login: async () => null,
  signup: async () => {},
  logout: async () => {},
  resetPassword: async () => {},
  refreshProfile: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchProfile = async (firebaseUser: User) => {
    try {
      // Force token refresh with checkRevoked flag to verify user still exists in Firebase Auth
      const token = await firebaseUser.getIdToken(true);
      const res = await fetch("/api/auth/profile", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 401 || res.status === 403 || res.status === 404) {
        // User was deleted from Firebase Auth or Firestore
        console.warn("[Auth Provider] User revoked or deleted from Firebase. Logging out...");
        if (auth) await fbSignOut(auth);
        setUser(null);
        setProfile(null);
        return null;
      }

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          setProfile(data.user);
          return data.user;
        }
      }
    } catch (err: unknown) {
      console.warn("[Auth Provider] User session invalid or revoked:", err);
      // If token refresh fails because user was deleted from Firebase Auth, log out immediately
      const errMsg = err instanceof Error ? err.message : String(err);
      if (
        errMsg.includes("user-not-found") ||
        errMsg.includes("user-token-expired") ||
        errMsg.includes("user-disabled") ||
        errMsg.includes("auth/id-token-revoked")
      ) {
        if (auth) await fbSignOut(auth);
        setUser(null);
        setProfile(null);
      }
    }
    return null;
  };

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setUser(fbUser);
        const userProfile = await fetchProfile(fbUser);
        if (!userProfile && auth && !auth.currentUser) {
          setUser(null);
          setProfile(null);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string): Promise<UserProfile | null> => {
    if (!auth) throw new Error("Firebase Auth is not configured.");
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    return await fetchProfile(cred.user);
  };

  const signup = async (
    email: string,
    pass: string,
    role: UserRole,
    details?: { displayName?: string; merchantName?: string; merchantDescription?: string; merchantId?: string }
  ) => {
    if (!auth) throw new Error("Firebase Auth is not configured.");
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    const token = await cred.user.getIdToken();

    const res = await fetch("/api/auth/profile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        role,
        displayName: details?.displayName,
        merchantName: details?.merchantName,
        merchantDescription: details?.merchantDescription,
        merchantId: details?.merchantId,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to complete account profile.");
    }

    const data = await res.json();
    setProfile(data.user);
  };

  const logout = async () => {
    if (!auth) return;
    await fbSignOut(auth);
    setUser(null);
    setProfile(null);
  };

  const resetPassword = async (email: string) => {
    if (!auth) throw new Error("Firebase Auth is not configured.");
    await sendPasswordResetEmail(auth, email);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        role: profile?.role || null,
        merchantId: profile?.merchantId || null,
        login,
        signup,
        logout,
        resetPassword,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
