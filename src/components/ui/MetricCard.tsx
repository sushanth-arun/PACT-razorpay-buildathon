"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  hoverDetail?: string;
  icon?: React.ComponentType<{ className?: string }>;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  hoverDetail,
  icon: Icon,
  trend,
  className,
}) => {
  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -4 }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        "group relative p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2.5 transition-colors hover:border-blue-500/50 hover:bg-slate-900/80 hover:shadow-xl hover:shadow-blue-950/20 focus-within:ring-2 focus-within:ring-blue-500/50 outline-none cursor-default",
        className
      )}
      tabIndex={0}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono font-medium text-slate-400 group-hover:text-slate-200 transition-colors uppercase tracking-wider">
          {title}
        </span>
        {Icon && (
          <div className="p-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-slate-400 group-hover:text-blue-400 group-hover:border-blue-800/50 transition-colors">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="flex items-baseline justify-between">
        <div className="text-2xl font-bold font-mono text-slate-100 tracking-tight">{value}</div>
        {trend && (
          <span
            className={cn(
              "text-xs font-mono px-1.5 py-0.5 rounded",
              trend.isPositive
                ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/40"
                : "bg-rose-950/60 text-rose-400 border border-rose-800/40"
            )}
          >
            {trend.isPositive ? "+" : ""}
            {trend.value}
          </span>
        )}
      </div>

      {/* Subtitle & Contextual Hover Detail */}
      <div className="space-y-0.5">
        {subtitle && <p className="text-[11px] text-slate-500 font-normal transition-colors group-hover:text-slate-400">{subtitle}</p>}
        {hoverDetail && (
          <p className="text-[10px] font-mono text-blue-400 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity duration-200">
            {hoverDetail}
          </p>
        )}
      </div>
    </motion.div>
  );
};



