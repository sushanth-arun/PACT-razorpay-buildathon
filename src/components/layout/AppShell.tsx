"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { useAuth } from "@/context/AuthContext";

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, role, loading } = useAuth();
  const isAuthPage = pathname === "/auth";

  useEffect(() => {
    // 1. Unauthenticated check
    if (!loading && !user && !isAuthPage) {
      router.replace("/auth");
      return;
    }

    // 2. Strict Role-based access control (Part 22)
    if (!loading && user && role) {
      // Buyer attempting to access Merchant-only routes (/merchant, /merchant/dashboard, etc. but NOT /merchants)
      const isMerchantAdminRoute = pathname === "/merchant" || pathname.startsWith("/merchant/");
      if (role === "BUYER" && isMerchantAdminRoute) {
        router.replace("/deal-room");
      }
      // Merchant attempting to access Buyer-only routes -> Redirect to Merchant Dashboard
      if (role === "MERCHANT_ADMIN" && (pathname === "/deal-room" || pathname.startsWith("/merchants") || pathname === "/evaluation")) {
        router.replace("/merchant/dashboard");
      }
    }
  }, [user, role, loading, isAuthPage, pathname, router]);

  if (isAuthPage) {
    return (
      <main className="min-h-screen w-full bg-slate-950 flex flex-col justify-center items-center relative">
        <ThemeToggle />
        {children}
      </main>
    );
  }

  // If user is not authenticated and still loading on protected routes, show subtle loading barrier
  if (loading) {
    return (
      <div className="min-h-screen w-full bg-slate-950 flex items-center justify-center font-mono text-xs text-slate-400">
        Verifying security session with Firebase...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full pl-64">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 bg-slate-950/50">{children}</main>
      </div>
      <ThemeToggle />
    </div>
  );
};
