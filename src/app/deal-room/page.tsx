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
import { MerchantOffer } from "@/lib/ai/merchant-offer-schema";
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

const MERCHANT_PROCESSING_STEPS = [
  "ANALYZING BUYER INTENT",
  "SEARCHING FIRESTORE CATALOG",
  "CHECKING AUTHORITATIVE INVENTORY",
  "EVALUATING COMMERCIAL OPTIONS",
  "CONSTRUCTING OFFER",
  "OFFER READY",
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

  // Merchant Offer state
  const [offerLoading, setOfferLoading] = useState(false);
  const [offerProcessingStep, setOfferProcessingStep] = useState(0);
  const [offerResult, setOfferResult] = useState<MerchantOffer | null>(null);
  const [offerError, setOfferError] = useState<string | null>(null);

  // Check Gemini server-side health and restore session state on mount
  React.useEffect(() => {
    fetch("/api/buyer-intent")
      .then((res) => res.json())
      .then((data) => {
        setIsGeminiConnected(Boolean(data.configured));
      })
      .catch(() => setIsGeminiConnected(false));

    try {
      const savedIntent = sessionStorage.getItem("pact_intent_result");
      const savedOffer = sessionStorage.getItem("pact_offer_result");
      const savedText = sessionStorage.getItem("pact_request_text");

      if (savedText) setRequestText(savedText);
      if (savedIntent) setIntentResult(JSON.parse(savedIntent));
      if (savedOffer) setOfferResult(JSON.parse(savedOffer));
    } catch {
      // ignore storage errors
    }
  }, []);


  const handleSubmitRequest = async (e: React.FormEvent, forceFallback = false) => {
    e.preventDefault();
    if (!requestText.trim() || loading) return;

    setLoading(true);
    setError(null);
    setIntentResult(null);
    setOfferResult(null);
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
        const errObj = data.error;
        let errMsg = "Failed to process buyer intent.";
        if (typeof errObj === "string") {
          errMsg = errObj;
        } else if (errObj && typeof errObj === "object") {
          errMsg = errObj.message || errObj.code || JSON.stringify(errObj);
        }
        throw new Error(errMsg);
      }


      setProcessingStep(4);
      setIntentResult(data.intent);
      setIsFallbackMode(Boolean(data.isFallback));
      try {
        sessionStorage.setItem("pact_request_text", requestText.trim());
        sessionStorage.setItem("pact_intent_result", JSON.stringify(data.intent));
        sessionStorage.removeItem("pact_offer_result");
      } catch {
        // ignore
      }
    } catch (err: unknown) {
      clearInterval(stepInterval);
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateOffer = async () => {
    if (!intentResult?.id || offerLoading) return;

    setOfferLoading(true);
    setOfferError(null);
    setOfferProcessingStep(0);

    const stepInterval = setInterval(() => {
      setOfferProcessingStep((prev) => (prev < 4 ? prev + 1 : prev));
    }, 450);

    try {
      const res = await fetch("/api/merchant-offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyerIntentId: intentResult.id,
        }),
      });

      const data = await res.json();
      clearInterval(stepInterval);

      if (!res.ok || !data.success) {
        const errObj = data.error;
        let errMsg = "Failed to generate merchant offer.";
        if (typeof errObj === "string") {
          errMsg = errObj;
        } else if (errObj && typeof errObj === "object") {
          errMsg = errObj.message || errObj.code || JSON.stringify(errObj);
        }
        throw new Error(errMsg);
      }

      setOfferProcessingStep(5);
      setOfferResult(data.offer);
      try {
        sessionStorage.setItem("pact_offer_result", JSON.stringify(data.offer));
      } catch {
        // ignore
      }

    } catch (err: unknown) {
      clearInterval(stepInterval);
      const msg = err instanceof Error ? err.message : "Failed to generate merchant offer.";
      setOfferError(msg);
    } finally {
      setOfferLoading(false);
    }
  };

  // Status Badge Logic
  const getHeaderStatusBadge = () => {
    if (loading || offerLoading) {
      return <StatusBadge status="validating" label="PROCESSING" />;
    }
    if (offerResult) {
      return <StatusBadge status="validated" label="OFFER GENERATED" />;
    }
    if (intentResult) {
      return <StatusBadge status="validated" label="AI PARSED" />;
    }
    if (error || offerError) {
      return <StatusBadge status="rejected" label="REQUEST FAILED" />;
    }
    if (isGeminiConnected) {
      return <StatusBadge status="active" label="GEMINI 3.1 FLASH-LITE ONLINE" />;
    }
    return <StatusBadge status="neutral" label="CONFIGURATION REQUIRED" />;
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
                DEV FALLBACK
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
              <span className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isGeminiConnected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
                Google Gemini 3.1 Flash-Lite Server-Side Intent Parser
              </span>
              <button
                type="submit"
                disabled={loading || !requestText.trim()}
                className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-mono text-xs font-bold hover:bg-blue-500 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-blue-950/40 cursor-pointer"
              >

                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>{PROCESSING_STEPS[processingStep]}...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-blue-200" />
                    <span>PARSE BUYER INTENT</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Error Message Alert */}
          {error && (
            <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs font-mono flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => handleSubmitRequest(e, false)}
                  className="px-3 py-1 rounded bg-rose-900/80 border border-rose-700 hover:bg-rose-800 transition-colors text-white font-mono text-[11px] flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Retry Gemini
                </button>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="text-slate-400 hover:text-slate-200 text-xs"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>
      </SpotlightCard>

      {/* 3-Column Lifecycle Pipeline View */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
        {/* Column 1: BUYER INTENT */}
        <div className="space-y-4">
          {intentResult ? (
            <SpotlightCard
              spotlightColor="rgba(56, 189, 248, 0.15)"
              className="bg-slate-950/80 border border-slate-800 p-0 rounded-2xl"
            >
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 space-y-4 font-mono"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <h2 className="text-sm font-bold text-slate-100 uppercase">1. BUYER INTENT</h2>
                  </div>
                  <StatusBadge status="validated" label="PARSED & SAVED" />
                </div>

                <div className="space-y-3">
                  {/* Product Need */}
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase">PRODUCT NEED</span>
                    <p className="text-sm font-bold text-slate-100">{intentResult.productIntent}</p>
                  </div>

                  {/* Quantity & Budget */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                      <span className="text-[10px] text-slate-400 uppercase">QUANTITY</span>
                      <p className="text-sm font-bold text-slate-100">
                        {intentResult.quantity !== null ? `${intentResult.quantity} units` : <span className="text-slate-500 italic font-normal">Not specified</span>}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                      <span className="text-[10px] text-slate-400 uppercase">BUDGET</span>
                      <p className="text-sm font-bold text-slate-100">
                        {intentResult.budget !== null ? `₹${intentResult.budget.toLocaleString("en-IN")}` : <span className="text-slate-500 italic font-normal">Not specified</span>}
                      </p>
                    </div>
                  </div>

                  {/* Discount Request & Delivery SLA */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                      <span className="text-[10px] text-slate-400 uppercase">DISCOUNT REQUEST</span>
                      <p className="text-xs font-bold text-slate-100">
                        {intentResult.requestedDiscount !== null ? (
                          typeof intentResult.requestedDiscount === "number" ? `${intentResult.requestedDiscount}%` : intentResult.requestedDiscount
                        ) : (
                          <span className="text-slate-500 italic font-normal">Not specified</span>
                        )}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                      <span className="text-[10px] text-slate-400 uppercase">DELIVERY SLA</span>
                      <p className="text-xs font-bold text-slate-100">
                        {intentResult.deliveryMaxDays !== null ? `${intentResult.deliveryMaxDays} days max` : <span className="text-slate-500 italic font-normal">Not specified</span>}
                      </p>
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

                  {/* Generate Merchant Offer Action Button */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleGenerateOffer}
                      disabled={offerLoading}
                      className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-mono text-xs font-bold hover:bg-emerald-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 cursor-pointer"
                    >
                      {offerLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>{MERCHANT_PROCESSING_STEPS[offerProcessingStep]}...</span>
                        </>
                      ) : (
                        <>
                          <Bot className="w-4 h-4" />
                          <span>GENERATE MERCHANT OFFER</span>
                        </>
                      )}
                    </button>
                  </div>

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

        {/* Column 2: MERCHANT OFFER */}
        <div className="space-y-4">
          {offerResult ? (
            <SpotlightCard
              spotlightColor="rgba(34, 197, 94, 0.15)"
              className="bg-slate-950/80 border border-slate-800 p-0 rounded-2xl"
            >
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 space-y-4 font-mono"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <h2 className="text-sm font-bold text-slate-100 uppercase">2. MERCHANT OFFER</h2>
                  </div>
                  <StatusBadge status="validated" label={offerResult.status} />
                </div>

                {/* Selected Products Table */}
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">SELECTED PRODUCTS</span>
                  <div className="divide-y divide-slate-800/80 rounded-lg bg-slate-950 border border-slate-800 overflow-hidden">
                    {offerResult.selectedItems.map((item, idx) => (
                      <div key={idx} className="p-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-100">{item.productName}</span>
                          <span className="text-xs font-bold text-emerald-400">₹{item.lineTotal.toLocaleString("en-IN")}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>{item.quantity} units @ ₹{item.unitPrice.toLocaleString("en-IN")}</span>
                          <span className="text-[10px] text-emerald-500 font-bold font-mono">IN STOCK</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals Breakdown */}
                {offerResult.selectedItems.length > 0 ? (
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Subtotal</span>
                      <span className="font-bold text-slate-200">₹{offerResult.subtotal.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex items-center justify-between text-amber-400">
                      <span>Proposed Discount ({offerResult.proposedDiscount.percentage}%)</span>
                      <span className="font-bold">-₹{offerResult.proposedDiscount.amount.toLocaleString("en-IN")}</span>
                    </div>
                    {offerResult.status !== "NO_VALID_OFFER" && (
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Delivery SLA</span>
                        <span className="font-bold text-slate-200">{offerResult.deliveryDays} days</span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-sm font-bold text-slate-100">
                      <span>Estimated Total</span>
                      <span className="text-emerald-400">₹{offerResult.estimatedFinalAmount.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-center text-slate-400">
                    No items available to total
                  </div>
                )}



                {/* Commercial Reasoning */}
                <div className="space-y-2">
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                    <span className="text-[10px] text-blue-400 uppercase font-bold">BUYER FIT</span>
                    <p className="text-[11px] text-slate-300 font-sans leading-snug">{offerResult.buyerFitExplanation}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                    <span className="text-[10px] text-purple-400 uppercase font-bold">MERCHANT OPPORTUNITY</span>
                    <p className="text-[11px] text-slate-300 font-sans leading-snug">{offerResult.merchantOpportunityExplanation}</p>
                  </div>
                </div>

                {/* Bundle Opportunities */}
                {offerResult.bundleItems.length > 0 && (
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
                    <span className="text-[10px] text-amber-400 uppercase font-bold">BUNDLE RECOMMENDATION</span>
                    {offerResult.bundleItems.map((b, i) => (
                      <div key={i} className="flex items-center justify-between text-[11px] text-slate-300">
                        <span>+ {b.productName}</span>
                        <span className="font-bold text-slate-200">₹{b.unitPrice.toLocaleString("en-IN")}</span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </SpotlightCard>
          ) : (
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
                  description={intentResult ? "Click 'GENERATE MERCHANT OFFER' under Buyer Intent to construct a valid offer." : "The Merchant Agent will construct valid commercial offers using real catalog data."}
                />
              </div>
            </SpotlightCard>
          )}

          {offerError && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs font-mono flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{offerError}</span>
            </div>
          )}
        </div>

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
