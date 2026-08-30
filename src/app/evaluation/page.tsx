"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge, StatusType } from "@/components/ui/StatusBadge";
import SpotlightCard from "@/components/SpotlightCard";
import BorderGlow from "@/components/BorderGlow";
import { Ripple } from "@/components/Ripple";
import { 
  ShieldCheck, 
  Play, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Lock, 
  Flame,
  Layers,
  Clock,
  ArrowRight
} from "lucide-react";
import { EvaluationRun, EvaluationScenario, ScenarioId } from "@/lib/evaluation/schema";
import { INITIAL_EVALUATION_SCENARIOS } from "@/lib/evaluation/scenarios-definition";

export default function EvaluationDashboard() {
  const [runs, setRuns] = useState<EvaluationRun[]>([]);
  const [scenarios, setScenarios] = useState<EvaluationScenario[]>(INITIAL_EVALUATION_SCENARIOS);
  const [selectedScenarioId, setSelectedScenarioId] = useState<ScenarioId>("SUCCESSFUL_DEAL");
  const [runningScenarioId, setRunningScenarioId] = useState<ScenarioId | "ALL" | null>(null);
  const [activeRun, setActiveRun] = useState<EvaluationRun | null>(null);

  // Load historical runs from backend
  const loadEvaluationHistory = async () => {
    try {
      const res = await fetch("/api/evaluation/run");
      const data = await res.json();
      if (data.success) {
        setRuns(data.runs || []);
        if (data.latestRun) {
          setActiveRun(data.latestRun);
          setScenarios(data.latestRun.scenarios);
        }
      }
    } catch (err) {
      console.error("Failed to load evaluation history:", err);
    }
  };

  useEffect(() => {
    loadEvaluationHistory();
  }, []);

  // Execute scenario(s)
  const handleRun = async (scenarioId: ScenarioId | "ALL") => {
    setRunningScenarioId(scenarioId);

    // Optimistically update scenario status in UI to RUNNING
    setScenarios((prev) =>
      prev.map((s) => (scenarioId === "ALL" || s.id === scenarioId ? { ...s, status: "RUNNING" } : s))
    );

    try {
      const res = await fetch("/api/evaluation/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId }),
      });
      const data = await res.json();
      if (data.success && data.run) {
        setActiveRun(data.run);
        setRuns((prev) => [data.run, ...prev.filter((r) => r.runId !== data.run.runId)]);
        
        if (scenarioId === "ALL") {
          setScenarios(data.run.scenarios);
        } else {
          setScenarios((prev) =>
            prev.map((s) => {
              const updated = data.run.scenarios.find((u: EvaluationScenario) => u.id === s.id);
              return updated || s;
            })
          );
        }
      }
    } catch (err) {
      console.error("Evaluation run failed:", err);
    } finally {
      setRunningScenarioId(null);
    }
  };

  const selectedScenario = useMemo(() => {
    return scenarios.find((s) => s.id === selectedScenarioId) || scenarios[0];
  }, [scenarios, selectedScenarioId]);

  // Aggregate Metrics from real runs
  const metrics = useMemo(() => {
    const totalRuns = runs.length;
    const passedCount = scenarios.filter((s) => s.status === "PASSED").length;
    const failedCount = scenarios.filter((s) => s.status === "FAILED").length;
    const errorsCount = scenarios.filter((s) => s.status === "ERROR").length;
    const firewallBlocks = scenarios.filter(
      (s) => s.actualOutcome?.pactFirewall?.includes("BLOCKED") || s.actualOutcome?.pactFirewall?.includes("REJECTED")
    ).length;
    const duplicatePrevented = scenarios.filter((s) => s.actualOutcome?.payment?.includes("DEDUPLICATED")).length;
    const paymentFailures = scenarios.filter((s) => s.actualOutcome?.payment?.includes("PAYMENT_FAILED")).length;

    return {
      total: scenarios.length,
      passed: passedCount,
      failed: failedCount,
      errors: errorsCount,
      firewallBlocks,
      duplicatePrevented,
      paymentFailures,
      totalRuns,
      lastDurationMs: activeRun?.durationMs || 0,
    };
  }, [scenarios, runs, activeRun]);

  return (
    <PageContainer>
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-950/80 border border-purple-800/60 text-purple-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-100 font-mono tracking-wide">
              PACT EVALUATION & RELIABILITY SYSTEM
            </h1>
          </div>
          <p className="text-xs text-slate-400 font-sans mt-1">
            Deterministic failure testing executing real application code: AI Proposes. PACT Validates. Razorpay Executes.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Ripple className="rounded-xl">
            <button
              type="button"
              onClick={() => handleRun("ALL")}
              disabled={runningScenarioId !== null}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-mono text-xs font-bold transition-all shadow-lg shadow-purple-950/50 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${runningScenarioId === "ALL" ? "animate-spin" : ""}`} />
              <span>{runningScenarioId === "ALL" ? "RUNNING 7 SCENARIOS..." : "RUN ALL SCENARIOS"}</span>
            </button>
          </Ripple>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono">
        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1 text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">SCENARIOS</span>
          <p className="text-xl font-black text-slate-100">{metrics.total}</p>
        </div>
        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1 text-center">
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">PASSED</span>
          <p className="text-xl font-black text-emerald-400">{metrics.passed}</p>
        </div>
        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1 text-center">
          <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">FAILED</span>
          <p className="text-xl font-black text-rose-400">{metrics.failed}</p>
        </div>
        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1 text-center">
          <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">BLOCKED BY PACT</span>
          <p className="text-xl font-black text-orange-400">{metrics.firewallBlocks}</p>
        </div>
        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1 text-center">
          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">DUPLICATES HALTED</span>
          <p className="text-xl font-black text-indigo-400">{metrics.duplicatePrevented}</p>
        </div>
        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1 text-center">
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">FAILED SETTLEMENTS</span>
          <p className="text-xl font-black text-amber-400">{metrics.paymentFailures}</p>
        </div>
      </div>

      {/* Main Two-Column Layout: Scenario Matrix on Left, Live Run Trace on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: 7 Scenarios Matrix */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold font-mono text-slate-300 uppercase tracking-wider">
              SCENARIO TEST MATRIX
            </span>
            <span className="text-[11px] font-mono text-slate-500">
              {metrics.passed} / {metrics.total} PASSED
            </span>
          </div>

          <div className="space-y-2.5">
            {scenarios.map((s, idx) => {
              const isSelected = s.id === selectedScenarioId;

              let statusBadgeBg = "bg-slate-900 border-slate-800 text-slate-400";
              if (s.status === "PASSED") statusBadgeBg = "bg-emerald-950/80 border-emerald-800 text-emerald-300";
              if (s.status === "FAILED") statusBadgeBg = "bg-rose-950/80 border-rose-800 text-rose-300";
              if (s.status === "ERROR") statusBadgeBg = "bg-amber-950/80 border-amber-800 text-amber-300";
              if (s.status === "RUNNING") statusBadgeBg = "bg-blue-950/80 border-blue-800 text-blue-300";

              return (
                <div
                  key={s.id}
                  onClick={() => setSelectedScenarioId(s.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer font-mono text-xs ${
                    isSelected
                      ? "bg-slate-900/90 border-blue-500/80 shadow-lg shadow-blue-950/40 ring-1 ring-blue-500/30"
                      : "bg-slate-950/80 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 font-bold">{idx + 1}.</span>
                        <h3 className="text-xs font-extrabold text-slate-100 truncate">{s.name}</h3>
                      </div>
                      <p className="text-[11px] text-slate-400 font-sans line-clamp-2">{s.description}</p>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase ${statusBadgeBg}`}>
                        {s.status}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRun(s.id);
                        }}
                        disabled={runningScenarioId !== null}
                        className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-blue-600 text-slate-300 hover:text-white border border-slate-700 text-[10px] font-bold transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <Play className="w-2.5 h-2.5 fill-current" />
                        <span>RUN</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Scenario Detail & Real Lifecycle Trace */}
        <div className="lg:col-span-7 space-y-4">
          <SpotlightCard
            spotlightColor="rgba(147, 51, 234, 0.15)"
            className="bg-slate-950/90 border border-slate-800 p-6 rounded-3xl shadow-2xl font-mono space-y-6"
          >
            {/* Scenario Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 font-bold">
                    {selectedScenario.category}
                  </span>
                  <h2 className="text-base font-black text-slate-100">{selectedScenario.name}</h2>
                </div>
                <p className="text-xs text-slate-400 font-sans">{selectedScenario.description}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleRun(selectedScenario.id)}
                  disabled={runningScenarioId !== null}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>RUN SCENARIO</span>
                </button>
              </div>
            </div>

            {/* Expected vs Actual Boundary Box */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  EXPECTED OUTCOME
                </span>
                <p className="text-xs text-slate-300 font-sans leading-relaxed">
                  {selectedScenario.expectedOutcome.summary}
                </p>
                <div className="pt-2 text-[11px] space-y-1 text-slate-400 border-t border-slate-800/60 font-mono">
                  <div>Firewall: <span className="text-slate-200">{selectedScenario.expectedOutcome.pactFirewall}</span></div>
                  <div>Payment: <span className="text-slate-200">{selectedScenario.expectedOutcome.payment}</span></div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block">
                  ACTUAL OUTCOME ({selectedScenario.status})
                </span>
                <p className="text-xs text-slate-300 font-sans leading-relaxed">
                  {selectedScenario.actualOutcome?.summary || "Scenario not executed yet. Click 'Run Scenario' to test."}
                </p>
                {selectedScenario.actualOutcome && (
                  <div className="pt-2 text-[11px] space-y-1 text-slate-400 border-t border-slate-800/60 font-mono">
                    <div>Firewall: <span className="text-emerald-400">{selectedScenario.actualOutcome.pactFirewall || "N/A"}</span></div>
                    <div>Payment: <span className="text-purple-400">{selectedScenario.actualOutcome.payment || "N/A"}</span></div>
                  </div>
                )}
              </div>
            </div>

            {/* Real Agent Execution Trace */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    REAL AGENT & GOVERNANCE EXECUTION TRACE
                  </span>
                </div>
                {selectedScenario.durationMs && (
                  <span className="text-[11px] text-slate-500">Duration: {selectedScenario.durationMs}ms</span>
                )}
              </div>

              <div className="space-y-2">
                {selectedScenario.trace.map((t, idx) => {
                  let statusBg = "bg-slate-900/60 border-slate-800 text-slate-400";
                  let Icon = CheckCircle2;
                  if (t.status === "COMPLETE") {
                    statusBg = "bg-emerald-950/40 border-emerald-800/70 text-emerald-300";
                    Icon = CheckCircle2;
                  } else if (t.status === "BLOCKED") {
                    statusBg = "bg-orange-950/40 border-orange-800/70 text-orange-300";
                    Icon = Flame;
                  } else if (t.status === "FAILED") {
                    statusBg = "bg-rose-950/40 border-rose-800/70 text-rose-300";
                    Icon = XCircle;
                  } else if (t.status === "SKIPPED") {
                    statusBg = "bg-slate-900/40 border-slate-800/40 text-slate-500";
                    Icon = Lock;
                  }

                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-2xl border flex items-start justify-between gap-3 text-xs ${statusBg}`}
                    >
                      <div className="flex items-start gap-2.5">
                        <Icon className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{t.label}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-900/80 border border-slate-800 uppercase font-bold">
                              {t.status}
                            </span>
                          </div>
                          <p className="text-[11px] font-sans text-slate-300 mt-0.5">{t.summary}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Failure / Diagnostic Explanation if Failed */}
            {selectedScenario.failureReasoning && (
              <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800/80 text-rose-200 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm text-rose-300">
                  <AlertTriangle className="w-4 h-4" />
                  <span>DIAGNOSTIC REASONING: {selectedScenario.failureReasoning.failedComponent}</span>
                </div>
                <p><strong className="text-slate-300">What Happened:</strong> {selectedScenario.failureReasoning.whatHappened}</p>
                <p><strong className="text-slate-300">Expected:</strong> {selectedScenario.failureReasoning.whatWasExpected}</p>
                <p><strong className="text-slate-300">Actual:</strong> {selectedScenario.failureReasoning.whatActuallyHappened}</p>
              </div>
            )}

            {/* Related Deal & Audit Link */}
            {selectedScenario.relatedDealId && (
              <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs">
                <span className="text-slate-400">Deal: #{selectedScenario.relatedDealId}</span>
                <Link
                  href={`/audit?dealId=${encodeURIComponent(selectedScenario.relatedDealId)}`}
                  className="text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 transition-colors"
                >
                  <span>VIEW AUDIT DECISION TRAIL</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </SpotlightCard>
        </div>
      </div>

      {/* Historical Evaluation Runs */}
      <div className="pt-6 space-y-3 font-mono">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              EVALUATION RUN HISTORY ({runs.length} RUNS RECORDED)
            </span>
          </div>
          <span className="text-[11px] text-slate-500">Persisted in Firestore</span>
        </div>

        {runs.length === 0 ? (
          <div className="p-10 rounded-2xl bg-slate-950/80 border border-dashed border-slate-800 text-center text-xs text-slate-500">
            No evaluation runs recorded yet. Click &quot;RUN ALL SCENARIOS&quot; to begin.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {runs.map((r) => (
              <div
                key={r.runId}
                onClick={() => {
                  setActiveRun(r);
                  setScenarios(r.scenarios);
                }}
                className={`p-4 rounded-2xl border cursor-pointer transition-all text-xs ${
                  activeRun?.runId === r.runId
                    ? "bg-purple-950/30 border-purple-700/80 shadow-md"
                    : "bg-slate-950/80 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200">Run #{r.runId.substring(4, 12)}</span>
                  <span className="text-[10px] text-slate-500">{new Date(r.startedAt).toLocaleTimeString()}</span>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-emerald-400 font-bold">{r.passed} / {r.totalScenarios} PASSED</span>
                  <span className="text-slate-400 text-[11px]">{r.durationMs}ms</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
