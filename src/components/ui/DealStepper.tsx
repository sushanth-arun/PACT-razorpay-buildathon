"use client";

import React from "react";
import { 
  Check, 
  X, 
  Lock, 
  AlertTriangle, 
  Loader2, 
  Sparkles, 
  Bot, 
  Search, 
  Handshake, 
  Cpu, 
  Flame, 
  CreditCard 
} from "lucide-react";
import { LifecycleStepInfo } from "@/hooks/useDealLifecycle";
import { Magnet } from "@/components/Magnet";

interface DealStepperProps {
  steps: LifecycleStepInfo[];
  selectedStep: number | "ALL";
  onSelectStep: (stepNumber: number | "ALL") => void;
  overallStatus: string;
  dealId?: string;
}

const STEP_ICONS = {
  INTENT: Bot,
  DISCOVER: Search,
  OFFER: Handshake,
  COMPILE: Cpu,
  FIREWALL: Flame,
  PAYMENT: CreditCard,
};

export function DealStepper({
  steps,
  selectedStep,
  onSelectStep,
  overallStatus,
  dealId,
}: DealStepperProps) {
  return (
    <div className="w-full rounded-2xl bg-slate-950/95 border border-slate-800 shadow-2xl p-3 sm:p-4 space-y-3 font-mono">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5 px-1">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-blue-950 text-blue-400 border border-blue-800/60">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            PACT COMMERCE LIFECYCLE RAIL
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400 font-mono">
            STATUS: {overallStatus}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {dealId && (
            <a
              href={`/audit?dealId=${encodeURIComponent(dealId)}`}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-[11px] font-mono text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1"
              title="Inspect complete audit trail for this deal"
            >
              <span>AUDIT TRAIL</span>
              <span className="text-[10px] opacity-70">↗</span>
            </a>
          )}
        </div>
      </div>

      {/* Stepper Grid (5 Lifecycle Gates) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-2.5">
        {steps.map((step) => {
          const Icon = STEP_ICONS[step.id] || Sparkles;
          const isSelected = selectedStep === step.stepNumber;
          const isClickable = step.isAccessible;

          // Compute styles based on StepState
          let badgeBg = "bg-slate-900/80 border-slate-800 text-slate-400";
          let circleBg = "bg-slate-800 text-slate-400 border-slate-700";
          let statusColor = "text-slate-500";
          let iconElement = <span>{step.stepNumber}</span>;

          if (step.state === "COMPLETE") {
            badgeBg = isSelected
              ? "bg-emerald-950/90 border-emerald-500 ring-1 ring-emerald-400/50 text-emerald-300"
              : "bg-slate-900/90 border-slate-700/80 hover:border-emerald-800 text-slate-200";
            circleBg = "bg-emerald-600 text-white border-emerald-400";
            statusColor = "text-emerald-400";
            iconElement = <Check className="w-3.5 h-3.5 stroke-[3]" />;
          } else if (step.state === "ACTIVE") {
            badgeBg = isSelected
              ? "bg-blue-950/90 border-blue-500 ring-1 ring-blue-400/50 text-blue-200"
              : "bg-blue-950/50 border-blue-800/80 hover:border-blue-600 text-blue-300";
            circleBg = "bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-500/50";
            statusColor = "text-blue-400";
            iconElement = <Loader2 className="w-3.5 h-3.5 animate-spin" />;
          } else if (step.state === "ERROR") {
            badgeBg = isSelected
              ? "bg-rose-950/90 border-rose-500 ring-1 ring-rose-400/50 text-rose-200"
              : "bg-rose-950/60 border-rose-800 hover:border-rose-600 text-rose-300";
            circleBg = "bg-rose-600 text-white border-rose-400";
            statusColor = "text-rose-400";
            iconElement = <X className="w-3.5 h-3.5 stroke-[3]" />;
          } else if (step.state === "WARNING") {
            badgeBg = isSelected
              ? "bg-amber-950/90 border-amber-500 ring-1 ring-amber-400/50 text-amber-200"
              : "bg-amber-950/60 border-amber-800 hover:border-amber-600 text-amber-300";
            circleBg = "bg-amber-600 text-white border-amber-400";
            statusColor = "text-amber-400";
            iconElement = <AlertTriangle className="w-3.5 h-3.5" />;
          } else if (step.state === "BLOCKED") {
            badgeBg = "bg-slate-950/60 border-slate-900 text-slate-600 opacity-60";
            circleBg = "bg-slate-900 text-slate-600 border-slate-800";
            statusColor = "text-slate-600";
            iconElement = <Lock className="w-3.5 h-3.5" />;
          }

          return (
            <Magnet key={step.id} strength={5} className="w-full">
              <button
                type="button"
                disabled={!isClickable}
                onClick={() => isClickable && onSelectStep(isSelected ? "ALL" : step.stepNumber)}
                aria-label={`Step ${step.stepNumber}: ${step.label} (${step.state})`}
                className={`w-full p-2.5 sm:p-3 rounded-xl border text-left transition-all relative overflow-hidden group ${badgeBg} ${
                  isClickable ? "cursor-pointer" : "cursor-not-allowed"
                }`}
              >
                {/* Top Row: Circle icon + Step Name */}
                <div className="flex items-center justify-between gap-1.5 mb-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 border ${circleBg}`}
                    >
                      {iconElement}
                    </div>
                    <span 
                      title={step.label}
                      className="text-[11px] font-extrabold uppercase tracking-wider truncate text-slate-100"
                    >
                      {step.label}
                    </span>
                  </div>
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${statusColor}`} />
                </div>

                {/* Subtitle */}
                <p 
                  title={step.sublabel}
                  className="text-[10px] text-slate-400 font-sans truncate mb-1"
                >
                  {step.sublabel}
                </p>

                {/* State Tag */}
                <div className="flex items-center justify-between text-[9px] font-mono pt-1 border-t border-slate-800/80">
                  <span className={`font-bold truncate max-w-[85px] ${statusColor}`}>
                    {step.state}
                  </span>
                  <span className="text-slate-500 font-sans">
                    {isSelected ? "FOCUSED" : isClickable ? "INSPECT" : "LOCKED"}
                  </span>
                </div>
              </button>
            </Magnet>
          );
        })}
      </div>
    </div>
  );
}
