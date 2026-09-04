"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { StatusBadge } from "@/components/ui/StatusBadge";
import SpotlightCard from "@/components/SpotlightCard";
import { 
  History, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Info,
  ChevronDown,
  ChevronUp,
  User,
  Bot,
  Store,
  Cpu,
  Flame,
  CreditCard,
  Server,
  ShieldCheck,
  ShieldAlert,
  Search,
  Check,
  X,
  Loader2
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { DEMO_MERCHANT_ID } from "@/services/seed";
import { AuditEvent, AuditActor, AuditEventType } from "@/lib/audit/schema";
import { CountUp } from "@/components/CountUp";

const ACTOR_CONFIG: Record<
  AuditActor,
  { label: string; icon: React.ElementType; color: string; badgeClass: string }
> = {
  USER: {
    label: "BUYER",
    icon: User,
    color: "text-blue-400",
    badgeClass: "bg-blue-950/70 border-blue-800/80 text-blue-300",
  },
  BUYER_AGENT: {
    label: "BUYER AGENT",
    icon: Bot,
    color: "text-cyan-400",
    badgeClass: "bg-cyan-950/70 border-cyan-800/80 text-cyan-300",
  },
  MERCHANT_AGENT: {
    label: "MERCHANT AGENT",
    icon: Store,
    color: "text-emerald-400",
    badgeClass: "bg-emerald-950/70 border-emerald-800/80 text-emerald-300",
  },
  DEAL_COMPILER: {
    label: "DEAL COMPILER",
    icon: Cpu,
    color: "text-purple-400",
    badgeClass: "bg-purple-950/70 border-purple-800/80 text-purple-300",
  },
  PACT_FIREWALL: {
    label: "PACT FIREWALL",
    icon: Flame,
    color: "text-orange-400",
    badgeClass: "bg-orange-950/70 border-orange-800/80 text-orange-300",
  },
  RAZORPAY: {
    label: "RAZORPAY",
    icon: CreditCard,
    color: "text-indigo-400",
    badgeClass: "bg-indigo-950/70 border-indigo-800/80 text-indigo-300",
  },
  SYSTEM: {
    label: "SYSTEM",
    icon: Server,
    color: "text-slate-400",
    badgeClass: "bg-slate-900 border-slate-700 text-slate-300",
  },
};

function getEventStatus(eventType: AuditEventType): {
  type: "SUCCESS" | "FAILURE" | "WARNING" | "INFO";
  icon: React.ElementType;
  color: string;
} {
  if (
    eventType === "DEAL_VALIDATED" ||
    eventType === "PAYMENT_SUCCESSFUL" ||
    eventType === "DEAL_APPROVED" ||
    eventType === "POLICY_CHECK_PASSED" ||
    eventType === "DEAL_COMPILED" ||
    eventType === "MERCHANT_OFFER_GENERATED" ||
    eventType === "BUYER_INTENT_PARSED" ||
    eventType === "WEBHOOK_VERIFIED"
  ) {
    return { type: "SUCCESS", icon: CheckCircle2, color: "text-emerald-400" };
  }

  if (
    eventType === "DEAL_REJECTED" ||
    eventType === "PAYMENT_FAILED" ||
    eventType === "POLICY_CHECK_FAILED" ||
    eventType === "DEAL_COMPILATION_FAILED" ||
    eventType === "MERCHANT_OFFER_FAILED"
  ) {
    return { type: "FAILURE", icon: XCircle, color: "text-rose-400" };
  }

  if (
    eventType === "HUMAN_APPROVAL_REQUIRED" ||
    eventType === "DUPLICATE_PAYMENT_PREVENTED"
  ) {
    return { type: "WARNING", icon: AlertTriangle, color: "text-amber-400" };
  }

  return { type: "INFO", icon: Info, color: "text-blue-400" };
}

interface DealWithAudit {
  dealId: string;
  merchantId: string;
  merchantName: string;
  status: string;
  finalAmount: number;
  subtotal: number;
  items: Array<{ productName: string; quantity: number; unitPrice: number; lineTotal: number }>;
  createdAt: string;
  updatedAt: string;
  eventsCount: number;
  events: AuditEvent[];
}

function MerchantAuditContent() {
  const searchParams = useSearchParams();
  const queryDealId = searchParams.get("dealId") || "";

  const { merchantId: authMerchantId } = useAuth();
  const merchantId = authMerchantId || DEMO_MERCHANT_ID;

  const [deals, setDeals] = useState<DealWithAudit[]>([]);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(queryDealId || null);
  const [loading, setLoading] = useState<boolean>(true);
  const [expandedEventIds, setExpandedEventIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [approvalFeedback, setApprovalFeedback] = useState<{ dealId: string; msg: string; type: "success" | "error" } | null>(null);

  const loadMerchantDealsAudit = async () => {
    try {
      setLoading(true);
      const url = merchantId ? `/api/audit/deals?merchantId=${encodeURIComponent(merchantId)}` : `/api/audit/deals`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && Array.isArray(data.dealsWithAudit)) {
        const loadedDeals = data.dealsWithAudit;
        setDeals(loadedDeals);
        if (loadedDeals.length > 0) {
          if (!selectedDealId || !loadedDeals.some((d: DealWithAudit) => d.dealId === selectedDealId)) {
            setSelectedDealId(loadedDeals[0].dealId);
          }
        } else {
          setSelectedDealId(null);
        }
      }
    } catch (err) {
      console.error("Failed to load merchant audit trail:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMerchantDealsAudit();
  }, [merchantId]);

  const activeDeal = deals.find((d) => d.dealId === selectedDealId) || deals[0];

  const filteredEvents = useMemo(() => {
    if (!activeDeal) return [];
    if (!searchQuery.trim()) return activeDeal.events;
    const q = searchQuery.toLowerCase().trim();
    return activeDeal.events.filter(
      (e) =>
        e.humanReadableMessage.toLowerCase().includes(q) ||
        e.eventType.toLowerCase().includes(q) ||
        e.actor.toLowerCase().includes(q)
    );
  }, [activeDeal, searchQuery]);

  const metrics = useMemo(() => {
    const totalDeals = deals.length;
    let pendingApprovalCount = 0;
    let validatedCount = 0;
    let paidCount = 0;

    for (const d of deals) {
      if (d.status === "PENDING_APPROVAL") pendingApprovalCount++;
      if (d.status === "VALIDATED") validatedCount++;
      if (d.status === "PAID") paidCount++;
    }

    return { totalDeals, pendingApprovalCount, validatedCount, paidCount };
  }, [deals]);

  const toggleEventMetadata = (id: string) => {
    setExpandedEventIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Handle Human Merchant Approval / Rejection Decision
  const handleApprovalDecision = async (dealId: string, action: "APPROVE" | "REJECT") => {
    try {
      setActionLoading(true);
      setApprovalFeedback(null);
      const res = await fetch("/api/merchant/approval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealId, action, notes: `Decision executed by merchant operator for deal ${dealId}` }),
      });
      const data = await res.json();
      if (data.success) {
        setApprovalFeedback({
          dealId,
          msg: action === "APPROVE" ? "✓ Deal approved and marked VALIDATED! The AI Buyer can now proceed with Razorpay settlement." : "✕ Deal marked as REJECTED.",
          type: "success",
        });
        await loadMerchantDealsAudit();
      } else {
        setApprovalFeedback({
          dealId,
          msg: data.error || "Failed to submit approval decision.",
          type: "error",
        });
      }
    } catch {
      setApprovalFeedback({
        dealId,
        msg: "Failed to submit decision due to network or server error.",
        type: "error",
      });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <PageContainer>
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-950/80 border border-emerald-800/60 text-emerald-400">
              <Store className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-100 font-mono tracking-wide">
              MERCHANT AUDIT TRAIL & APPROVALS
            </h1>
          </div>
          <p className="text-xs text-slate-400 font-sans mt-1">
            Review deals, trace autonomous merchant agent decisions, and grant human approval for deals exceeding threshold caps.
          </p>
        </div>

        <button
          type="button"
          onClick={loadMerchantDealsAudit}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>REFRESH LEDGER</span>
        </button>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
        <SpotlightCard spotlightColor="rgba(16, 185, 129, 0.15)" className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">STORE DEALS</span>
            <p className="text-2xl font-black text-slate-100">{metrics.totalDeals}</p>
          </div>
        </SpotlightCard>

        <SpotlightCard spotlightColor="rgba(245, 158, 11, 0.15)" className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-amber-400 uppercase">PENDING APPROVAL</span>
            <p className="text-2xl font-black text-amber-400">{metrics.pendingApprovalCount}</p>
          </div>
        </SpotlightCard>

        <SpotlightCard spotlightColor="rgba(59, 130, 246, 0.15)" className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-blue-400 uppercase">VALIDATED DEALS</span>
            <p className="text-2xl font-black text-blue-400">{metrics.validatedCount}</p>
          </div>
        </SpotlightCard>

        <SpotlightCard spotlightColor="rgba(16, 185, 129, 0.15)" className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-emerald-400 uppercase">SETTLED (PAID)</span>
            <p className="text-2xl font-black text-emerald-400">{metrics.paidCount}</p>
          </div>
        </SpotlightCard>
      </div>

      {/* Main Two-Column Structure (Deal -> Audit Events) */}
      {loading ? (
        <div className="p-16 rounded-3xl bg-slate-950/80 border border-slate-800 text-center font-mono text-xs text-slate-400">
          Loading merchant deals and cryptographic audit trail from Firestore...
        </div>
      ) : deals.length === 0 ? (
        <div className="p-16 rounded-3xl bg-slate-950/80 border border-dashed border-slate-800 text-center space-y-3 font-mono">
          <Store className="w-10 h-10 text-slate-500 mx-auto" />
          <h3 className="text-base font-bold text-slate-200">No Store Deals Logged Yet</h3>
          <p className="text-xs text-slate-400 font-sans max-w-md mx-auto">
            Audit trails and deals will populate automatically once an AI Buyer begins negotiating with your store in the Deal Room.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Store Deals List */}
          <div className="lg:col-span-5 space-y-3 font-mono">
            <div className="flex items-center justify-between px-1 text-xs font-bold text-slate-300 uppercase">
              <span>STORE DEALS ({deals.length})</span>
              <span className="text-[11px] text-slate-500">SELECT DEAL</span>
            </div>

            <div className="space-y-2.5">
              {deals.map((d, idx) => {
                const isSelected = d.dealId === activeDeal?.dealId;
                const isPending = d.status === "PENDING_APPROVAL";
                const isPaid = d.status === "PAID";
                const isValidated = d.status === "VALIDATED";
                const isRejected = d.status === "REJECTED" || d.status === "COMPILATION_FAILED";

                return (
                  <div
                    key={d.dealId}
                    onClick={() => setSelectedDealId(d.dealId)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer text-xs ${
                      isSelected
                        ? "bg-slate-900/95 border-emerald-500/80 shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-500/30"
                        : "bg-slate-950/80 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 font-bold">{idx + 1}.</span>
                          <span className="font-bold text-slate-100 truncate">#{d.dealId.substring(0, 18)}</span>
                        </div>
                        <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-400">
                          <span>{new Date(d.createdAt).toLocaleTimeString()}</span>
                          <span className="text-slate-200 font-bold"><CountUp to={d.finalAmount} prefix="₹" /></span>
                          <span className="text-emerald-400 font-bold flex items-center gap-1">(<CountUp to={d.eventsCount} /> Events)</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span
                          className={`px-2.5 py-0.5 rounded-md border text-[10px] font-bold ${
                            isPending
                              ? "bg-amber-950/90 border-amber-600 text-amber-300 animate-pulse"
                              : isPaid
                              ? "bg-emerald-950/80 border-emerald-800 text-emerald-300"
                              : isValidated
                              ? "bg-blue-950/80 border-blue-800 text-blue-300"
                              : isRejected
                              ? "bg-rose-950/80 border-rose-800 text-rose-300"
                              : "bg-slate-900 border-slate-800 text-slate-400"
                          }`}
                        >
                          {d.status}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Active Deal Details, Approval Action Gate & Audit Events */}
          {activeDeal && (
            <div className="lg:col-span-7 space-y-4 font-mono">
              <SpotlightCard
                spotlightColor="rgba(16, 185, 129, 0.15)"
                className="bg-slate-950/90 border border-slate-800 p-6 rounded-2xl space-y-5"
              >
                {/* Header for Active Deal */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <h2 className="text-sm font-bold text-slate-100">
                        AUDIT TRAIL & DECISION GATE
                      </h2>
                    </div>
                    <p className="text-xs text-slate-400 font-mono">
                      Deal ID: <code className="text-emerald-300">{activeDeal.dealId}</code>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-emerald-400 font-bold">
                      <CountUp to={activeDeal.finalAmount} prefix="₹" />
                    </span>
                    <span className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                      Status: {activeDeal.status}
                    </span>
                  </div>
                </div>

                {/* 🛡️ HUMAN APPROVAL / REJECTION ACTION BAR FOR PENDING DEALS */}
                {activeDeal.status === "PENDING_APPROVAL" && (
                  <div className="p-4 rounded-xl bg-amber-950/40 border-2 border-amber-700/80 space-y-3">
                    <div className="flex items-center gap-2 text-amber-300 text-xs font-bold">
                      <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>HUMAN MERCHANT APPROVAL REQUIRED</span>
                    </div>
                    <p className="text-xs text-slate-300 font-sans leading-relaxed">
                      This transaction of <strong><CountUp to={activeDeal.finalAmount} prefix="₹" /></strong> exceeds your store automated approval threshold (₹50,000). Review the audit history below and execute your decision:
                    </p>
                    <div className="flex items-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => handleApprovalDecision(activeDeal.dealId, "APPROVE")}
                        disabled={actionLoading}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors shadow-lg shadow-emerald-950/50"
                      >
                        {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        <span>APPROVE DEAL</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleApprovalDecision(activeDeal.dealId, "REJECT")}
                        disabled={actionLoading}
                        className="px-4 py-2 rounded-xl bg-rose-950 hover:bg-rose-900 border border-rose-700 text-rose-200 font-mono text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>REJECT DEAL</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Feedback Banner */}
                {approvalFeedback && approvalFeedback.dealId === activeDeal.dealId && (
                  <div
                    className={`p-3.5 rounded-xl border text-xs font-mono flex items-center gap-2 ${
                      approvalFeedback.type === "success"
                        ? "bg-emerald-950/80 border-emerald-700 text-emerald-300"
                        : "bg-rose-950/80 border-rose-700 text-rose-300"
                    }`}
                  >
                    {approvalFeedback.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                    <span>{approvalFeedback.msg}</span>
                  </div>
                )}

                {/* Search Filter */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search events in this deal..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                </div>

                {/* Event Stream */}
                <div className="space-y-2.5">
                  {filteredEvents.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                      No matching audit events for this deal.
                    </div>
                  ) : (
                    filteredEvents.map((evt, index) => {
                      const actorInfo = ACTOR_CONFIG[evt.actor] || ACTOR_CONFIG.SYSTEM;
                      const ActorIcon = actorInfo.icon;
                      const isExpanded = expandedEventIds.has(evt.id);
                      const hasMeta = evt.metadata && Object.keys(evt.metadata).length > 0;

                      return (
                        <div
                          key={evt.id}
                          className="p-4 rounded-xl border border-slate-800/90 bg-slate-900/60 hover:bg-slate-900/90 transition-all space-y-2 text-xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] text-slate-500 font-bold">{index + 1}.</span>
                              <div className={`px-2 py-0.5 rounded border text-[10px] font-bold flex items-center gap-1 ${actorInfo.badgeClass}`}>
                                <ActorIcon className="w-3 h-3" />
                                <span>{actorInfo.label}</span>
                              </div>
                              <span className="font-bold text-slate-200 text-[11px]">{evt.eventType}</span>
                            </div>

                            <span className="text-[10px] text-slate-500 shrink-0">
                              {new Date(evt.timestamp).toLocaleTimeString()}
                            </span>
                          </div>

                          <p className="text-slate-300 font-sans text-xs leading-relaxed pl-5">
                            {evt.humanReadableMessage}
                          </p>

                          {hasMeta && (
                            <div className="pt-1 pl-5">
                              <button
                                type="button"
                                onClick={() => toggleEventMetadata(evt.id)}
                                className="text-[11px] font-mono text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                              >
                                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                <span>{isExpanded ? "Hide Metadata" : `Inspect Metadata (${Object.keys(evt.metadata).length} fields)`}</span>
                              </button>

                              {isExpanded && (
                                <pre className="mt-2 p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-emerald-400/90 overflow-x-auto">
                                  {JSON.stringify(evt.metadata, null, 2)}
                                </pre>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </SpotlightCard>
            </div>
          )}
        </div>
      )}
    </PageContainer>
  );
}

export default function MerchantAuditPage() {
  return (
    <React.Suspense
      fallback={
        <PageContainer>
          <div className="p-12 text-center text-slate-400 font-mono text-xs">
            Loading Merchant Audit Timeline...
          </div>
        </PageContainer>
      }
    >
      <MerchantAuditContent />
    </React.Suspense>
  );
}
