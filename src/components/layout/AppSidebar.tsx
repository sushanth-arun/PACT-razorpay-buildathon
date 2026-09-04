"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  Handshake, 
  Store, 
  History, 
  Receipt, 
  ShieldCheck, 
  Cpu,
  Boxes,
  Package,
  Sliders,
  LogOut,
  User,
  Building2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Magnet } from "@/components/Magnet";
import { useAuth } from "@/context/AuthContext";
import { getMerchant } from "@/services/firestore";
import { Merchant } from "@/types";

export const AppSidebar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, role, merchantId, logout } = useAuth();
  const [merchantData, setMerchantData] = useState<Merchant | null>(null);

  useEffect(() => {
    if (merchantId) {
      getMerchant(merchantId).then((m) => {
        if (m) setMerchantData(m);
      });
    } else {
      setMerchantData(null);
    }
  }, [merchantId]);

  // Buyer Navigation Items (Command Center)
  const buyerNavItems = [
    { name: "Deal Room", href: "/deal-room", icon: Handshake },
    { name: "Merchants", href: "/merchants", icon: Building2 },
    { name: "Transactions", href: "/transactions", icon: Receipt },
    { name: "Audit Trail", href: "/audit", icon: History },
    { name: "Evaluation", href: "/evaluation", icon: ShieldCheck },
  ];

  // Merchant Operations Navigation Items (Business Console - NO DEAL ROOM)
  const merchantNavItems = [
    { name: "Dashboard", href: "/merchant/dashboard", icon: Store },
    { name: "Products", href: "/merchant/products", icon: Boxes },
    { name: "Policies", href: "/merchant/policies", icon: Sliders },
    { name: "Transactions", href: "/merchant/transactions", icon: Receipt },
    { name: "Audit Trail", href: "/merchant/audit", icon: History },
  ];

  const currentNav = role === "MERCHANT_ADMIN" ? merchantNavItems : buyerNavItems;

  const handleLogout = async () => {
    try {
      if (typeof window !== "undefined") {
        sessionStorage.clear();
      }
    } catch {
      // ignore
    }
    await logout();
    router.push("/auth");
  };

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col h-screen fixed top-0 left-0 bottom-0 z-30 shrink-0 font-sans">
      {/* Brand Header */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-slate-800">
        <div className="h-8 w-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold">
          <Cpu className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-sm tracking-wider text-slate-100">PACT</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800/50">
              v0.1
            </span>
          </div>
          <p className="text-[11px] text-slate-500 tracking-tight font-medium">AI-to-AI Commerce Engine</p>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
          <span>{role === "MERCHANT_ADMIN" ? "MERCHANT CONSOLE" : "BUYER CONSOLE"}</span>
          <span className={`text-[9px] px-1.5 py-0.2 rounded border font-mono ${
            role === "MERCHANT_ADMIN" ? "bg-emerald-950/80 border-emerald-800 text-emerald-400" : "bg-cyan-950/80 border-cyan-800 text-cyan-400"
          }`}>
            {role || "BUYER"}
          </span>
        </div>

        {currentNav.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/merchant" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Magnet key={item.name} strength={6} className="w-full">
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors group relative w-full",
                  isActive
                    ? "bg-slate-800/90 text-slate-100 font-bold shadow-sm"
                    : "text-slate-300 hover:text-slate-100 hover:bg-slate-900/80 font-medium"
                )}
              >
                <Icon
                  className={cn(
                    "w-4.5 h-4.5 shrink-0 transition-colors",
                    isActive ? "text-blue-400" : "text-slate-400 group-hover:text-slate-200"
                  )}
                />
                <div className="flex flex-col">
                  <span>{item.name}</span>
                </div>
                {isActive && (
                  <div className="absolute right-0 top-2 bottom-2 w-1 bg-blue-500 rounded-l" />
                )}
              </Link>
            </Magnet>
          );
        })}
      </nav>

      {/* User Account / Merchant Footer Card */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/80 space-y-2">
        {user ? (
          <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3 space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 truncate">
                <div className="w-6 h-6 rounded-full bg-blue-950 border border-blue-800 flex items-center justify-center text-blue-300 text-[10px] font-bold">
                  {role === "MERCHANT_ADMIN" ? <Store className="w-3 h-3" /> : <User className="w-3 h-3" />}
                </div>
                <div className="truncate">
                  <p 
                    title={role === "MERCHANT_ADMIN" ? (merchantData?.name || "Merchant Admin") : (profile?.displayName || user.email?.split("@")[0] || "AI Buyer")}
                    className="font-bold text-slate-100 truncate text-[11px] hover:whitespace-normal cursor-help"
                  >
                    {role === "MERCHANT_ADMIN" ? (merchantData?.name || "Merchant Admin") : (profile?.displayName || user.email?.split("@")[0] || "AI Buyer")}
                  </p>
                  <p 
                    title={user.email || ""} 
                    className="text-[10px] text-slate-400 truncate hover:whitespace-normal cursor-help"
                  >
                    {user.email}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[10px]">
              <span className="text-emerald-400 flex items-center gap-1 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                ONLINE
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="text-rose-400 hover:text-rose-300 flex items-center gap-1 font-bold transition-colors cursor-pointer"
                title="Sign out of PACT"
              >
                <LogOut className="w-3 h-3" />
                <span>LOGOUT</span>
              </button>
            </div>
          </div>
        ) : (
          <Link
            href="/auth"
            className="w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold text-center block transition-all shadow-md"
          >
            SIGN IN / REGISTER
          </Link>
        )}
      </div>
    </aside>
  );
};


