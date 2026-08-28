"use client";

import React from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge, StatusType } from "@/components/ui/StatusBadge";
import { SectionCard } from "@/components/ui/SectionCard";
import { MetricCard } from "@/components/ui/MetricCard";
import { ShieldCheck } from "lucide-react";

interface Scenario {
  title: string;
  category: string;
  description: string;
  status: StatusType;
  statusLabel: string;
  severity: string;
  severityStyle: string;
}

const evaluationScenarios: Scenario[] = [
  {
    title: "Successful Deal Execution",
    category: "STANDARD FLOW",
    description: "Buyer intent within budget, merchant offer has stock and valid discount. PACT Firewall passes all 9 rules.",
    status: "validated",
    statusLabel: "VALIDATED",
    severity: "LOW",
    severityStyle: "text-emerald-400 bg-emerald-950/40 border-emerald-800/40",
  },
  {
    title: "Invalid Discount Violation",
    category: "POLICY ENGINE",
    description: "Merchant agent proposes 25% discount, but merchant max discount policy is capped at 15%. Firewall auto-rejects.",
    status: "rejected",
    statusLabel: "REJECTED",
    severity: "HIGH",
    severityStyle: "text-rose-400 bg-rose-950/40 border-rose-800/40",
  },
  {
    title: "Out of Stock Rejection",
    category: "INVENTORY ENGINE",
    description: "Buyer requests 10 units, but catalog stock only has 3 units available. Firewall prevents overselling.",
    status: "rejected",
    statusLabel: "REJECTED",
    severity: "HIGH",
    severityStyle: "text-rose-400 bg-rose-950/40 border-rose-800/40",
  },
  {
    title: "Budget Exceeded Cap",
    category: "BUYER CONSTRAINT",
    description: "Calculated deal total exceeds buyer's explicit maximum budget limit.",
    status: "rejected",
    statusLabel: "REJECTED",
    severity: "MEDIUM",
    severityStyle: "text-amber-400 bg-amber-950/40 border-amber-800/40",
  },
  {
    title: "Delivery Constraint Failure",
    category: "LOGISTICS ENGINE",
    description: "Merchant delivery estimate (10 days) exceeds buyer maximum requested delivery SLA (5 days).",
    status: "rejected",
    statusLabel: "REJECTED",
    severity: "MEDIUM",
    severityStyle: "text-amber-400 bg-amber-950/40 border-amber-800/40",
  },
  {
    title: "Duplicate Payment Protection",
    category: "IDEMPOTENCY",
    description: "Repeated payment attempt or duplicate webhook for an already processed order is safely blocked.",
    status: "failed",
    statusLabel: "BLOCKED",
    severity: "CRITICAL",
    severityStyle: "text-purple-400 bg-purple-950/40 border-purple-800/40",
  },
];

export default function EvaluationPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Evaluation"
        description="PACT Firewall policy verification matrix and safety metric analytics."
        badge={<StatusBadge status="active" label="FIREWALL ENGAGED" />}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard title="Test Scenarios" value="6" subtitle="Pre-configured policy vectors" icon={ShieldCheck} />
        <MetricCard title="Deterministic Rules" value="9" subtitle="Server-side Firewall gates" icon={ShieldCheck} />
        <MetricCard title="Safety Pass Rate" value="100%" subtitle="Zero hallucinated execution leakage" icon={ShieldCheck} trend={{ value: "PASS", isPositive: true }} />
      </div>

      <SectionCard
        title="FIREWALL TEST SCENARIO MATRIX"
        subtitle="Visual test harness demonstrating PACT policy engine deterministic decisions"
        badge={<StatusBadge status="neutral" label="PHASE 6 PREVIEW" />}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {evaluationScenarios.map((sc, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">{sc.category}</span>
                  <h3 className="text-sm font-bold text-slate-200 font-mono">{sc.title}</h3>
                </div>
                <StatusBadge status={sc.status} label={sc.statusLabel} />
              </div>
              <p className="text-xs text-slate-400">{sc.description}</p>
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-[11px] font-mono">
                <span className="text-slate-500">RISK SEVERITY</span>
                <span className={`px-2 py-0.5 rounded text-[10px] border ${sc.severityStyle}`}>
                  {sc.severity}
                </span>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </PageContainer>
  );
}


