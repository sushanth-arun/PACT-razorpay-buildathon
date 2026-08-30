"use client";

import React, { useEffect, useState } from "react";
import { Store, ShieldCheck, Building2 } from "lucide-react";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { useAuth } from "@/context/AuthContext";
import { getMerchant } from "@/services/firestore";
import { Merchant } from "@/types";

export const TopHeader: React.FC = () => {
  const { role, merchantId } = useAuth();
  const [merchant, setMerchant] = useState<Merchant | null>(null);

  useEffect(() => {
    const targetId = merchantId || "ergospace";
    getMerchant(targetId).then((m) => {
      if (m) setMerchant(m);
    });
  }, [merchantId]);

  return (
    <header className="h-14 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur px-6 flex items-center justify-between sticky top-0 z-20 font-sans">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs">
          {role === "MERCHANT_ADMIN" ? (
            <Store className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Building2 className="w-3.5 h-3.5 text-blue-400" />
          )}
          <span className="text-slate-400 font-mono text-[11px]">
            {role === "MERCHANT_ADMIN" ? "STORE:" : "ACTIVE MERCHANT:"}
          </span>
          <span className="font-bold text-slate-100">
            {merchant?.name || (role === "MERCHANT_ADMIN" ? "Merchant Store" : "ErgoSpace")}
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-950/40 border border-emerald-800/50 text-[11px] font-mono text-emerald-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>PACT FIREWALL ENFORCING</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle />

        <div className="flex items-center gap-1.5 text-xs font-mono bg-slate-900/60 px-2.5 py-1 rounded-lg border border-slate-800 text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>RAZORPAY TEST MODE</span>
        </div>
      </div>
    </header>
  );
};




