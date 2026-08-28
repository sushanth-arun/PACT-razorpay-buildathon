"use client";

import React, { useEffect, useState } from "react";
import { Store, ShieldCheck, Database } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { isFirebaseConfigured } from "@/lib/firebase/client";

export const TopHeader: React.FC = () => {
  const [firebaseConfigured, setFirebaseConfigured] = useState<boolean>(false);

  useEffect(() => {
    setFirebaseConfigured(isFirebaseConfigured());
  }, []);

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-950/80 backdrop-blur px-6 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
          <Store className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-400 font-mono">MERCHANT:</span>
          <span className="font-semibold text-slate-200">ErgoSpace (Demo)</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-xs font-mono bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800">
          <Database className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-slate-400">FIRESTORE:</span>
          <StatusBadge
            status={firebaseConfigured ? "active" : "neutral"}
            label={firebaseConfigured ? "CONNECTED" : "NOT CONFIGURED"}
          />
        </div>

        <div className="flex items-center gap-2 text-xs font-mono bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-slate-400">PACT FIREWALL:</span>
          <StatusBadge status="active" label="ENFORCING" />
        </div>

        <div className="flex items-center gap-2 text-xs font-mono bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800">
          <span className="text-slate-400">RAZORPAY:</span>
          <StatusBadge status="neutral" label="TEST MODE" />
        </div>
      </div>
    </header>
  );
};



