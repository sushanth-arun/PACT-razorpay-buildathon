"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Handshake, 
  Store, 
  History, 
  Receipt, 
  ShieldCheck, 
  Cpu
} from "lucide-react";
import { cn } from "@/lib/utils";

import { Magnet } from "@/components/Magnet";

const navigationItems = [
  {
    name: "Deal Room",
    href: "/deal-room",
    icon: Handshake,
  },
  {
    name: "Merchant Dashboard",
    href: "/merchant",
    icon: Store,
  },
  {
    name: "Audit Trail",
    href: "/audit",
    icon: History,
  },
  {
    name: "Transactions",
    href: "/transactions",
    icon: Receipt,
  },
  {
    name: "Evaluation",
    href: "/evaluation",
    icon: ShieldCheck,
  },
];

export const AppSidebar: React.FC = () => {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col h-screen fixed top-0 left-0 bottom-0 z-30 shrink-0">

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

      <nav className="flex-1 px-3 py-4 space-y-1.5">
        <div className="px-3 pb-2 text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
          Core Platform
        </div>
        {navigationItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Magnet key={item.href} strength={6} className="w-full">
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



      <div className="p-4 border-t border-slate-800 bg-slate-950/50">
        <div className="rounded-lg bg-slate-900/80 border border-slate-800 p-3 space-y-1.5 text-[11px]">
          <div className="flex items-center justify-between text-slate-400 font-mono">
            <span>NETWORK</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              ONLINE
            </span>
          </div>
          <div className="text-slate-500 font-mono text-[10px]">
            BUILDATHON TEST MODE
          </div>
        </div>
      </div>
    </aside>
  );
};


