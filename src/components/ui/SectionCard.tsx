"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface SectionCardProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  badge?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const SectionCard: React.FC<SectionCardProps> = ({
  title,
  subtitle,
  action,
  badge,
  children,
  className,
}) => {
  return (
    <div className={cn("border border-slate-800 rounded-xl bg-slate-900/40 p-5 space-y-4", className)}>
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-200 font-mono">{title}</h2>
            {badge}
          </div>
          {subtitle && <p className="text-xs text-slate-400 font-normal">{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
};


