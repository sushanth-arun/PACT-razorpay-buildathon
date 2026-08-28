"use client";

import React from "react";
import { cn } from "@/lib/utils";

export type StatusType =
  | "draft"
  | "negotiating"
  | "compiled"
  | "validating"
  | "validated"
  | "rejected"
  | "pending_approval"
  | "payment_pending"
  | "paid"
  | "failed"
  | "active"
  | "neutral";

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  className?: string;
}

const statusStyles: Record<StatusType, { bg: string; text: string; dot: string }> = {
  draft: { bg: "bg-slate-900/80 border-slate-800", text: "text-slate-400", dot: "bg-slate-400" },
  negotiating: { bg: "bg-blue-950/40 border-blue-800/50", text: "text-blue-400", dot: "bg-blue-400 animate-pulse" },
  compiled: { bg: "bg-purple-950/40 border-purple-800/50", text: "text-purple-400", dot: "bg-purple-400" },
  validating: { bg: "bg-amber-950/40 border-amber-800/50", text: "text-amber-400", dot: "bg-amber-400 animate-pulse" },
  validated: { bg: "bg-emerald-950/40 border-emerald-800/50", text: "text-emerald-400", dot: "bg-emerald-400" },
  rejected: { bg: "bg-rose-950/40 border-rose-800/50", text: "text-rose-400", dot: "bg-rose-400" },
  pending_approval: { bg: "bg-orange-950/40 border-orange-800/50", text: "text-orange-400", dot: "bg-orange-400 animate-pulse" },
  payment_pending: { bg: "bg-sky-950/40 border-sky-800/50", text: "text-sky-400", dot: "bg-sky-400 animate-pulse" },
  paid: { bg: "bg-emerald-950/40 border-emerald-800/50", text: "text-emerald-400", dot: "bg-emerald-400" },
  failed: { bg: "bg-rose-950/40 border-rose-800/50", text: "text-rose-400", dot: "bg-rose-400" },
  active: { bg: "bg-emerald-950/40 border-emerald-800/50", text: "text-emerald-400", dot: "bg-emerald-400" },
  neutral: { bg: "bg-slate-900 border-slate-700", text: "text-slate-400", dot: "bg-slate-400" },
};


export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, className }) => {
  const style = statusStyles[status] || statusStyles.neutral;
  const displayText = label || status.toUpperCase();

  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border font-mono tracking-wide", style.bg, style.text, className)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", style.dot)} />
      {displayText}
    </span>
  );
};

