"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import SpotlightCard from "@/components/SpotlightCard";
import { 
  ShieldCheck, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Lock, 
  Flame, 
  ArrowRight,
  Receipt,
  Store,
  ExternalLink
} from "lucide-react";
import { motion } from "framer-motion";
import { CountUp } from "@/components/CountUp";

interface RuleEvaluation {
  ruleId: string;
  ruleName: string;
  category: string;
  status: "PASSED" | "FAILED" | "WARNING";
  reason: string;
}

interface RealTimeEvaluation {
  id: string;
  dealId: string;
  evaluatedAt: string;
  overallStatus: "VALIDATED" | "REJECTED" | "PENDING_APPROVAL";
  rulesCheckedCount: number;
  passedCount: number;
  failedCount: number;
  warningCount: number;
  summary: string;
  evaluations: RuleEvaluation[];
  deal: {
    id: string;
    merchantId: string;
    merchantName: string;
    status: string;
    finalAmount: number;
    subtotal: number;
    items: Array<{ productName: string; quantity: number; unitPrice: number; lineTotal: number }>;
    discount?: { amount: number; percentage: number };
    deliveryDays: number;
    slaCommitment?: string;
  };
}

interface EvaluationMetrics {
  total: number;
  validated: number;
  blocked: number;
  pendingApproval: number;
  complianceRate: number;
  totalValueEvaluated: number;
}

export default function RealTimeEvaluationDashboard() {
  const [evaluations, setEvaluations] = useState<RealTimeEvaluation[]>([]);
  const [metrics, setMetrics] = useState<EvaluationMetrics>({
    total: 0,
    validated: 0,
    blocked: 0,
    pendingApproval: 0,
    complianceRate: 100,
    totalValueEvaluated: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedEvaluationId, setSelectedEvaluationId] = useState<string | null>(null);

  const loadRealTimeEvaluations = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/evaluation");
      const data = await res.json();
      if (data.success) {
        setEvaluations(data.evaluations || []);
        if (data.metrics) {
          setMetrics(data.metrics);
        }
        if (data.evaluations && data.evaluations.length > 0) {
          setSelectedEvaluationId(data.evaluations[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load real-time evaluations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRealTimeEvaluations();
  }, []);

  const activeEvaluation = evaluations.find((e) => e.id === selectedEvaluationId) || evaluations[0];

  return (
    <PageContainer>
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-950/80 border border-purple-800/60 text-purple-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-100 font-mono tracking-wide">
              REAL-TIME DEAL EVALUATION
            </h1>
          </div>
          <p className="text-xs text-slate-400 font-sans mt-1">
            Deterministic PACT Firewall audit verification computed in real-time from Firestore for all negotiated user deals.
          </p>
        </div>

        <button
          type="button"
          onClick={loadRealTimeEvaluations}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>REFRESH LEDGER</span>
        </button>
      </div>

      {/* KPI Metrics directly from Firestore Policy Evaluations */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
        <SpotlightCard spotlightColor="rgba(168, 85, 247, 0.15)" className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">EVALUATED DEALS</span>
            <p className="text-2xl font-black text-slate-100"><CountUp to={metrics.total} /></p>
          </div>
        </SpotlightCard>

        <SpotlightCard spotlightColor="rgba(16, 185, 129, 0.15)" className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-emerald-400 uppercase">FIREWALL PASSED</span>
            <p className="text-2xl font-black text-emerald-400"><CountUp to={metrics.validated} /></p>
          </div>
        </SpotlightCard>

        <SpotlightCard spotlightColor="rgba(244, 63, 94, 0.15)" className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-rose-400 uppercase">POLICY BLOCKED</span>
            <p className="text-2xl font-black text-rose-400"><CountUp to={metrics.blocked} /></p>
          </div>
        </SpotlightCard>

        <SpotlightCard spotlightColor="rgba(168, 85, 247, 0.15)" className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-purple-400 uppercase">VALUE EVALUATED</span>
            <p className="text-2xl font-black text-purple-300"><CountUp to={metrics.totalValueEvaluated} prefix="₹" /></p>
          </div>
        </SpotlightCard>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="p-16 rounded-3xl bg-slate-950/80 border border-slate-800 text-center font-mono text-xs text-slate-400">
          Loading live evaluation records from Firestore...
        </div>
      ) : evaluations.length === 0 ? (
        <div className="p-16 rounded-3xl bg-slate-950/80 border border-dashed border-slate-800 text-center space-y-4 font-mono">
          <ShieldCheck className="w-10 h-10 text-slate-500 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-200">No Evaluated Deals Yet</h3>
            <p className="text-xs text-slate-400 font-sans max-w-md mx-auto">
              Whenever you negotiate a purchase in the Deal Room, PACT Firewall automatically executes 9 deterministic security gates and records the evaluation here in real-time.
            </p>
          </div>
          <Link
            href="/deal-room"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-lg shadow-blue-950/50"
          >
            <span>Start Deal in Deal Room</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Live Deals Evaluated Stream */}
          <div className="lg:col-span-5 space-y-3 font-mono">
            <div className="flex items-center justify-between px-1 text-xs font-bold text-slate-300 uppercase">
              <span className="flex items-center gap-1">EVALUATED TRANSACTIONS (<CountUp to={evaluations.length} />)</span>
              <span className="text-[11px] text-slate-500">REAL-TIME FIRESTORE</span>
            </div>

            <div className="space-y-2.5">
              {evaluations.map((ev, idx) => {
                const isSelected = ev.id === activeEvaluation?.id;
                const isPassed = ev.overallStatus === "VALIDATED";
                const isRejected = ev.overallStatus === "REJECTED";

                return (
                  <div
                    key={ev.id}
                    onClick={() => setSelectedEvaluationId(ev.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer text-xs ${
                      isSelected
                        ? "bg-slate-900/95 border-purple-500/80 shadow-lg shadow-purple-950/40 ring-1 ring-purple-500/30"
                        : "bg-slate-950/80 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 font-bold">{idx + 1}.</span>
                          <span className="font-bold text-slate-100 truncate">{ev.deal.merchantName}</span>
                          <span className="text-[10px] text-slate-500 font-mono">#{ev.dealId.substring(0, 16)}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-sans line-clamp-1">{ev.summary}</p>
                        <div className="flex items-center gap-3 pt-1 text-[10px] text-slate-500">
                          <span>{new Date(ev.evaluatedAt).toLocaleTimeString()}</span>
                          <span className="text-slate-300 font-bold"><CountUp to={ev.deal.finalAmount} prefix="₹" /></span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span
                          className={`px-2.5 py-0.5 rounded-md border text-[10px] font-bold ${
                            isPassed
                              ? "bg-emerald-950/80 border-emerald-800 text-emerald-300"
                              : isRejected
                              ? "bg-rose-950/80 border-rose-800 text-rose-300"
                              : "bg-amber-950/80 border-amber-800 text-amber-300"
                          }`}
                        >
                          {ev.overallStatus}
                        </span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                          <CountUp to={ev.passedCount} />/<CountUp to={ev.rulesCheckedCount} /> Rules
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Deep-Dive Evaluation Detail for Selected Deal */}
          {activeEvaluation && (
            <div className="lg:col-span-7 space-y-4 font-mono">
              <SpotlightCard
                spotlightColor="rgba(168, 85, 247, 0.15)"
                className="bg-slate-950/90 border border-slate-800 p-6 rounded-2xl space-y-5"
              >
                {/* Header detail */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Flame className="w-4 h-4 text-purple-400" />
                      <h2 className="text-sm font-bold text-slate-100">
                        PACT FIREWALL EVALUATION REPORT
                      </h2>
                    </div>
                    <p className="text-xs text-slate-400 font-mono">
                      Deal: <code className="text-purple-300">{activeEvaluation.dealId}</code>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/audit?dealId=${encodeURIComponent(activeEvaluation.dealId)}`}
                      className="px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-purple-400 text-xs font-bold transition-colors flex items-center gap-1.5"
                    >
                      <span>AUDIT LOG</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>

                {/* Summary Banner */}
                <div
                  className={`p-4 rounded-xl border text-xs font-mono ${
                    activeEvaluation.overallStatus === "VALIDATED"
                      ? "bg-emerald-950/40 border-emerald-800/80 text-emerald-200"
                      : activeEvaluation.overallStatus === "REJECTED"
                      ? "bg-rose-950/40 border-rose-800/80 text-rose-200"
                      : "bg-amber-950/40 border-amber-800/80 text-amber-200"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {activeEvaluation.overallStatus === "VALIDATED" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1">
                      <p className="font-bold">{activeEvaluation.summary}</p>
                      <p className="text-[11px] opacity-80">
                        Timestamp: {new Date(activeEvaluation.evaluatedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Contract Items Breakdown */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-300 uppercase">CONTRACT ITEMS</span>
                  <div className="rounded-xl border border-slate-800 bg-slate-900/60 divide-y divide-slate-800/60 text-xs">
                    {activeEvaluation.deal.items.map((item, i) => (
                      <div key={i} className="p-3 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-slate-200">{item.productName}</span>
                          <span className="text-slate-500 text-[11px] ml-2">x<CountUp to={item.quantity} /></span>
                        </div>
                        <span className="text-slate-300"><CountUp to={item.lineTotal} prefix="₹" /></span>
                      </div>
                    ))}
                    <div className="p-3 flex items-center justify-between bg-slate-900/90 font-bold">
                      <span className="text-slate-400">Total Contract Value</span>
                      <span className="text-emerald-400"><CountUp to={activeEvaluation.deal.finalAmount} prefix="₹" /></span>
                    </div>
                  </div>
                </div>

                {/* Deterministic Rules Checked */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 uppercase flex items-center gap-1">
                      9 DETERMINISTIC SECURITY GATES (<CountUp to={activeEvaluation.passedCount} />/<CountUp to={activeEvaluation.rulesCheckedCount} /> Passed)
                    </span>
                  </div>

                  <div className="space-y-2">
                    {activeEvaluation.evaluations.map((rule, idx) => {
                      const isRulePassed = rule.status === "PASSED";
                      return (
                        <div
                          key={idx}
                          className={`p-3 rounded-xl border flex items-start justify-between gap-3 text-xs ${
                            isRulePassed
                              ? "bg-slate-900/60 border-slate-800/80 text-slate-300"
                              : "bg-rose-950/30 border-rose-900 text-rose-200"
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              {isRulePassed ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                              )}
                              <span className="font-bold text-slate-200">{rule.ruleName}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 uppercase">
                                {rule.category}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 font-sans pl-5.5">{rule.reason}</p>
                          </div>

                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                              isRulePassed
                                ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                                : "bg-rose-950 text-rose-400 border border-rose-800"
                            }`}
                          >
                            {rule.status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </SpotlightCard>
            </div>
          )}
        </div>
      )}
    </PageContainer>
  );
}
