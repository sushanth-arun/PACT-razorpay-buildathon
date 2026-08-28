"use client";

import React, { useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import SpotlightCard from "@/components/SpotlightCard";

import { 
  Bot, 
  Send, 
  Sparkles, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Handshake, 
  RefreshCw, 
  Cpu,
  Info,
  SlidersHorizontal,
  HelpCircle
} from "lucide-react";
import { SavedBuyerIntent } from "@/services/buyer-intent-service";
import { motion, AnimatePresence } from "framer-motion";

const SAMPLE_PROMPT_CHIPS = [
  "5 developer setups under ₹60,000",
  "10 standing desks under ₹1,50,000 with 15% discount",
  "Ergonomic chair for a startup team",
  "I need some chairs.",
];

const PROCESSING_STEPS = [
  "UNDERSTANDING REQUEST",
  "EXTRACTING CONSTRAINTS",
  "NORMALIZING COMMERCIAL INTENT",
  "VALIDATING STRUCTURE",
  "BUYER INTENT READY",
];

export default function DealRoomPage() {
  const [requestText, setRequestText] = useState("");
  const [loading, setLoading] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [intentResult, setIntentResult] = useState<SavedBuyerIntent | null>(null);
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const [isGeminiConnected, setIsGeminiConnected] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRawJson, setShowRawJson] = useState(false);

  // Check Gemini server-side health on mount
  React.useEffect(() => {
    fetch("/api/buyer-intent")
      .then((res) => res.json())
      .then((data) => {
        setIsGeminiConnected(Boolean(data.configured));
      })
      .catch(() => setIsGeminiConnected(false));
  }, []);

  const handleSubmitRequest = async (e: React.FormEvent, forceFallback = false) => {
    e.preventDefault();
    if (!requestText.trim() || loading) return;

    setLoading(true);
    setError(null);
    setIntentResult(null);
    setProcessingStep(0);

    const stepInterval = setInterval(() => {
      setProcessingStep((prev) => (prev < 3 ? prev + 1 : prev));
    }, 400);

    try {
      const res = await fetch("/api/buyer-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request: requestText.trim(),
          useDevFallback: forceFallback,
        }),
      });

      const data = await res.json();
      clearInterval(stepInterval);

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to process buyer intent.");
      }

      setProcessingStep(4);
      setIntentResult(data.intent);
      setIsFallbackMode(Boolean(data.isFallback));
    } catch (err: unknown) {
      clearInterval(stepInterval);
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Status Badge Logic
  const getHeaderStatusBadge = () => {
    if (loading) {
      return <StatusBadge status="validating" label="PROCESSING" />;
    }
    if (intentResult) {
      return <StatusBadge status="validated" label="AI PARSED" />;
    }
    if (error) {
      return <StatusBadge status="rejected" label="ERROR" />;
    }
    if (isGeminiConnected) {
      return <StatusBadge status="active" label="CONNECTED" />;
    }
    return <StatusBadge status="neutral" label="STANDBY" />;
  };

  // Helper for confidence badge colors
  const getConfidenceBadge = (confidence: number = 0) => {
    const percent = Math.round(confidence * 100);
    if (percent >= 80) {
      return {
        label: `${percent}% HIGH`,
        style: "bg-emerald-950/70 text-emerald-400 border-emerald-800/60",
      };
    }
    if (percent >= 50) {
      return {
        label: `${percent}% MEDIUM`,
        style: "bg-amber-950/70 text-amber-400 border-amber-800/60",
      };
    }
    return {
      label: `${percent}% LOW`,
      style: "bg-rose-950/70 text-rose-400 border-rose-800/60",
    };
  };

  return (
    <PageContainer>
      <PageHeader
        title="PACT DEAL ROOM"
        description="Turn natural language commercial requirements into validated structured purchase intent."
        badge={getHeaderStatusBadge()}
      />


      {/* Top Main Section: Stage 1 Natural Language Input & Sample Chips */}
      <SpotlightCard
        spotlightColor="rgba(56, 189, 248, 0.15)"
        className="bg-slate-950/80 border border-slate-800 p-0 rounded-2xl"
      >
        <div className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-blue-400" />
              <h2 className="text-base font-bold text-slate-100 font-mono">STAGE 1: BUYER AI NATURAL LANGUAGE INPUT</h2>
            </div>
            {isFallbackMode && (
              <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-amber-950/70 text-amber-400 border border-amber-800/60 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />
                DEV FALLBACK PARSER (API KEY MISSING / OFFLINE)
              </span>
            )}
          </div>

          <form onSubmit={handleSubmitRequest} className="space-y-4">
            <div className="relative">
              <textarea
                value={requestText}
                onChange={(e) => setRequestText(e.target.value)}
                maxLength={1000}
                rows={3}
                placeholder="I need ergonomic setups for 5 developers under ₹60,000. Delivery within 7 days and negotiate the best possible price."
                className="w-full p-4 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors resize-none"
              />
              <div className="absolute right-3 bottom-3 text-[11px] font-mono text-slate-500">
                {requestText.length} / 1000
              </div>
            </div>

            {/* Prompt Chips */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono text-slate-400 font-semibold mr-1">EXAMPLE PROMPTS:</span>
              {SAMPLE_PROMPT_CHIPS.map((chip, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setRequestText(chip)}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 hover:text-slate-100 hover:border-slate-700 transition-colors"
                >
                  &quot;{chip}&quot;
                </button>
              ))}
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-400 font-mono">
                Google Gemini 2.5 Flash Server-Side Intent Parser
              </span>
              <button
                type="submit"
                disabled={loading || !requestText.trim()}
                className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-mono text-xs font-bold hover:bg-blue-500 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-blue-950/40"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    PARSING INTENT...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-blue-200" />
                    PARSE BUYER INTENT
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Error Alert */}
          {error && (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={(e) => handleSubmitRequest(e, false)}
                  className="px-3 py-1 bg-blue-900/60 border border-blue-700/50 rounded font-mono text-[11px] text-blue-200 hover:bg-blue-800 transition-colors flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  Retry Gemini
                </button>
                <button
                  onClick={() => setError(null)}
                  className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded font-mono text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Visual Processing Sequence */}
          {loading && (
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono text-slate-300">
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                  {PROCESSING_STEPS[processingStep]}
                </span>
                <span>STEP {processingStep + 1} / 5</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                <motion.div
                  className="bg-blue-500 h-1.5 rounded-full"
                  initial={{ width: "0%" }}
                  animate={{ width: `${((processingStep + 1) / 5) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          )}
        </div>
      </SpotlightCard>

      {/* Deal Pipeline 3 Columns Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">

        {/* Column 1: BUYER INTENT DISPLAY */}
        <div className="space-y-4">
          {intentResult ? (
            <SpotlightCard
              spotlightColor="rgba(56, 189, 248, 0.15)"
              className="bg-slate-950/80 border border-slate-800 p-0 rounded-2xl"
            >
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 space-y-4"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400" />
                    <h3 className="text-base font-bold text-slate-100 font-mono">1. BUYER INTENT</h3>
                  </div>
                  <StatusBadge status="validated" label="PARSED & SAVED" />
                </div>

                <div className="space-y-3 font-mono text-xs">
                  {/* Product Need */}
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                    <span className="text-[11px] text-slate-400 font-medium uppercase">PRODUCT NEED</span>
                    <div className="font-bold text-slate-100 text-sm">{intentResult.productIntent}</div>
                  </div>

                  {/* Key Metrics Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                      <span className="text-[10px] text-slate-400 uppercase">QUANTITY</span>
                      <div className="font-bold text-slate-100 text-sm">
                        {intentResult.quantity !== null ? `${intentResult.quantity} units` : <span className="text-slate-500 font-normal italic">Not specified</span>}
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                      <span className="text-[10px] text-slate-400 uppercase">BUDGET</span>
                      <div className="font-bold text-slate-100 text-sm">
                        {intentResult.budget !== null ? `₹${intentResult.budget.toLocaleString("en-IN")}` : <span className="text-slate-500 font-normal italic">Not specified</span>}
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                      <span className="text-[10px] text-slate-400 uppercase">DISCOUNT REQUEST</span>
                      <div className="font-bold text-slate-100 text-xs">
                        {intentResult.requestedDiscount !== null ? (
                          typeof intentResult.requestedDiscount === "number" ? `${intentResult.requestedDiscount}%` : intentResult.requestedDiscount
                        ) : (
                          <span className="text-slate-500 font-normal italic">Not specified</span>
                        )}
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                      <span className="text-[10px] text-slate-400 uppercase">DELIVERY SLA</span>
                      <div className="font-bold text-slate-100 text-xs">
                        {intentResult.deliveryMaxDays !== null ? `Within ${intentResult.deliveryMaxDays} days` : <span className="text-slate-500 font-normal italic">Not specified</span>}
                      </div>
                    </div>
                  </div>

                  {/* Preferences */}
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
                    <span className="text-[10px] text-slate-400 uppercase">PREFERENCES</span>
                    <div className="flex flex-wrap gap-1.5">
                      {intentResult.preferences && intentResult.preferences.length > 0 ? (
                        intentResult.preferences.map((p, i) => (
                          <span key={i} className="px-2 py-0.5 rounded bg-blue-950/60 border border-blue-800/50 text-blue-300 text-[11px]">
                            [{p}]
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-500 italic text-[11px]">None specified</span>
                      )}
                    </div>
                  </div>

                  {/* Negotiable Constraints */}
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
                    <span className="text-[10px] text-slate-400 uppercase">NEGOTIABLE TERMS</span>
                    <div className="flex flex-wrap gap-1.5">
                      {intentResult.negotiableConstraints && intentResult.negotiableConstraints.length > 0 ? (
                        intentResult.negotiableConstraints.map((n, i) => (
                          <span key={i} className="px-2 py-0.5 rounded bg-purple-950/60 border border-purple-800/50 text-purple-300 text-[11px]">
                            [{n}]
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-500 italic text-[11px]">None specified</span>
                      )}
                    </div>
                  </div>

                  {/* Confidence Indicator */}
                  {(() => {
                    const badge = getConfidenceBadge(intentResult.confidence);
                    return (
                      <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 uppercase">PARSER CONFIDENCE</span>
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${badge.style}`}>
                            {badge.label}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-sans leading-tight">
                          Confidence reflects how clearly the AI could extract the requested constraints from your prompt.
                        </p>
                      </div>
                    );
                  })()}

                  {/* View Raw JSON Accordion */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setShowRawJson(!showRawJson)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 hover:text-slate-100 transition-colors"
                    >
                      <span>{showRawJson ? "Hide Raw Structure" : "View Raw Structure"}</span>
                      {showRawJson ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    <AnimatePresence>
                      {showRawJson && (
                        <motion.pre
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-2 p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-emerald-400 overflow-x-auto"
                        >
                          {JSON.stringify(intentResult, null, 2)}
                        </motion.pre>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            </SpotlightCard>
          ) : (
            <SpotlightCard
              spotlightColor="rgba(56, 189, 248, 0.15)"
              className="bg-slate-950/80 border border-slate-800 p-0 rounded-2xl"
            >
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h2 className="text-base font-bold text-slate-100 font-mono">1. BUYER INTENT</h2>
                  <StatusBadge status="neutral" label="STANDBY" />
                </div>
                <EmptyState
                  icon={Handshake}
                  title="No Buyer Intent Parsed"
                  description="Submit a purchase prompt above to extract structured commercial intent."
                />
              </div>
            </SpotlightCard>
          )}
        </div>

        {/* Column 2: MERCHANT OFFER (Standby for Phase 4) */}
        <SpotlightCard
          spotlightColor="rgba(34, 197, 94, 0.15)"
          className="bg-slate-950/80 border border-slate-800 p-0 rounded-2xl"
        >
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-slate-100 font-mono">2. MERCHANT OFFER</h2>
              <StatusBadge status="neutral" label="STANDBY" />
            </div>
            <EmptyState
              icon={Handshake}
              title="No Offer Generated"
              description="The Merchant Agent will construct valid commercial offers using real catalog data in Phase 4."
            />
          </div>
        </SpotlightCard>

        {/* Column 3: PACT DEAL CONTRACT (Standby for Phase 5) */}
        <SpotlightCard
          spotlightColor="rgba(168, 85, 247, 0.15)"
          className="bg-slate-950/80 border border-slate-800 p-0 rounded-2xl"
        >
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-slate-100 font-mono">3. PACT DEAL CONTRACT</h2>
              <StatusBadge status="neutral" label="UNCOMPILED" />
            </div>
            <EmptyState
              icon={Handshake}
              title="Uncompiled Deal"
              description="The Deal Compiler will create deterministic commercial contracts in Phase 5."
            />
          </div>
        </SpotlightCard>

      </div>

    </PageContainer>
  );
}
