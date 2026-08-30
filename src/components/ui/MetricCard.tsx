"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import SpotlightCard from "@/components/SpotlightCard";

import { CountUp } from "@/components/CountUp";

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
    <SpotlightCard
      spotlightColor="rgba(56, 189, 248, 0.2)"
      className={cn("bg-slate-950/80 border border-slate-800 p-0 rounded-2xl transition-all duration-200 hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-950/30", className)}
    >
      <motion.div
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="group p-5 space-y-2.5 outline-none cursor-default"
      >

        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold text-slate-300 group-hover:text-slate-100 transition-colors uppercase tracking-wider">
            {title}
          </span>
          {Icon && (
            <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/60 text-slate-300 group-hover:text-blue-400 group-hover:border-blue-700/60 transition-colors">
              <Icon className="w-4.5 h-4.5" />
            </div>
          )}
        </div>

        <div className="flex items-baseline justify-between">
          <div className="text-3xl font-extrabold font-mono text-slate-100 tracking-tight">
            <CountUp to={value} />
          </div>

          {trend && (
            <span
              className={cn(
                "text-xs font-mono px-2 py-0.5 rounded font-bold",
                trend.isPositive
                  ? "bg-emerald-950/70 text-emerald-400 border border-emerald-800/50"
                  : "bg-rose-950/70 text-rose-400 border border-rose-800/50"
              )}
            >
              {trend.isPositive ? "+" : ""}
              {trend.value}
            </span>
          )}
        </div>

        {/* Subtitle & Contextual Hover Detail */}
        <div className="space-y-1">
          {subtitle && <p className="text-xs text-slate-400 font-medium transition-colors group-hover:text-slate-300">{subtitle}</p>}
          {hoverDetail && (
            <p className="text-[11px] font-mono text-blue-400 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity duration-200">
              {hoverDetail}
            </p>
          )}
        </div>
      </motion.div>
    </SpotlightCard>
  );
};





