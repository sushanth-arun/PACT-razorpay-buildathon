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
  ArrowRight,
  ShieldCheck,
  Search
} from "lucide-react";
import { AuditEvent, AuditActor, AuditEventType } from "@/lib/audit/schema";

const ACTOR_CONFIG: Record<
  AuditActor,
  { label: string; icon: React.ElementType; color: string; badgeClass: string }
> = {
  USER: {
    label: "USER",
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

export default function AuditTrailDashboard() {
  const searchParams = useSearchParams();
  const queryDealId = searchParams.get("dealId") || "";

  const [deals, setDeals] = useState<DealWithAudit[]>([]);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(queryDealId || null);
  const [loading, setLoading] = useState<boolean>(true);
  const [expandedEventIds, setExpandedEventIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState<string>("");

  const loadDealsAudit = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/audit/deals");
      const data = await res.json();
      if (data.success && Array.isArray(data.dealsWithAudit)) {
        setDeals(data.dealsWithAudit);
        if (data.dealsWithAudit.length > 0) {
          if (!selectedDealId || !data.dealsWithAudit.some((d: DealWithAudit) => d.dealId === selectedDealId)) {
            setSelectedDealId(data.dealsWithAudit[0].dealId);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load deals audit trail:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDealsAudit();
  }, []);

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
    let totalEvents = 0;
    let successCount = 0;
    let failedCount = 0;

    for (const d of deals) {
      totalEvents += d.events.length;
      for (const ev of d.events) {
        const st = getEventStatus(ev.eventType).type;
        if (st === "SUCCESS") successCount++;
        if (st === "FAILURE") failedCount++;
      }
    }

    return { totalDeals, totalEvents, successCount, failedCount };
  }, [deals]);

  const toggleEventMetadata = (id: string) => {
    setExpandedEventIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <PageContainer>
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-950/80 border border-purple-800/60 text-purple-400">
              <History className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-100 font-mono tracking-wide">
              PACT AUDIT TRAIL
            </h1>
          </div>
          <p className="text-xs text-slate-400 font-sans mt-1">
            Immutable cryptographic audit events mapped directly to each negotiated deal contract in Firestore.
          </p>
        </div>

        <button
          type="button"
          onClick={loadDealsAudit}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>REFRESH AUDIT TRAIL</span>
        </button>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
        <SpotlightCard spotlightColor="rgba(168, 85, 247, 0.15)" className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">RECORDED DEALS</span>
            <p className="text-2xl font-black text-slate-100">{metrics.totalDeals}</p>
          </div>
        </SpotlightCard>

        <SpotlightCard spotlightColor="rgba(59, 130, 246, 0.15)" className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-blue-400 uppercase">AUDIT EVENTS</span>
            <p className="text-2xl font-black text-blue-400">{metrics.totalEvents}</p>
          </div>
        </SpotlightCard>

        <SpotlightCard spotlightColor="rgba(16, 185, 129, 0.15)" className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-emerald-400 uppercase">PASSED GATES</span>
            <p className="text-2xl font-black text-emerald-400">{metrics.successCount}</p>
          </div>
        </SpotlightCard>

        <SpotlightCard spotlightColor="rgba(244, 63, 94, 0.15)" className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-rose-400 uppercase">BLOCKED / FAILED</span>
            <p className="text-2xl font-black text-rose-400">{metrics.failedCount}</p>
          </div>
        </SpotlightCard>
      </div>

      {/* Main Two-Column Structure (Matching Evaluation View) */}
      {loading ? (
        <div className="p-16 rounded-3xl bg-slate-950/80 border border-slate-800 text-center font-mono text-xs text-slate-400">
          Loading cryptographic audit trails from Firestore...
        </div>
      ) : deals.length === 0 ? (
        <div className="p-16 rounded-3xl bg-slate-950/80 border border-dashed border-slate-800 text-center space-y-4 font-mono">
          <History className="w-10 h-10 text-slate-500 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-200">No Audit Trails Recorded Yet</h3>
            <p className="text-xs text-slate-400 font-sans max-w-md mx-auto">
              Every operation from Buyer Intent parsing to Merchant Agent proposal, Deal Compilation, and Razorpay Settlement writes immutable audit records mapped directly to its Deal Contract.
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
          {/* Left Column: Deal List */}
          <div className="lg:col-span-5 space-y-3 font-mono">
            <div className="flex items-center justify-between px-1 text-xs font-bold text-slate-300 uppercase">
              <span>DEALS WITH AUDIT TRAIL ({deals.length})</span>
              <span className="text-[11px] text-slate-500">SELECT DEAL</span>
            </div>

            <div className="space-y-2.5">
              {deals.map((d, idx) => {
                const isSelected = d.dealId === activeDeal?.dealId;
                const isPaid = d.status === "PAID";
                const isValidated = d.status === "VALIDATED";
                const isRejected = d.status === "REJECTED" || d.status === "COMPILATION_FAILED";

                return (
                  <div
                    key={d.dealId}
                    onClick={() => setSelectedDealId(d.dealId)}
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
                          <span className="font-bold text-slate-100 truncate">{d.merchantName}</span>
                          <span className="text-[10px] text-slate-500">#{d.dealId.substring(0, 16)}</span>
                        </div>
                        <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-400">
                          <span>{new Date(d.createdAt).toLocaleTimeString()}</span>
                          <span className="text-slate-200 font-bold">₹{d.finalAmount.toLocaleString("en-IN")}</span>
                          <span className="text-purple-400 font-bold">({d.eventsCount} Events)</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span
                          className={`px-2.5 py-0.5 rounded-md border text-[10px] font-bold ${
                            isPaid
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

          {/* Right Column: Complete Audit Event Stream for Selected Deal */}
          {activeDeal && (
            <div className="lg:col-span-7 space-y-4 font-mono">
              <SpotlightCard
                spotlightColor="rgba(168, 85, 247, 0.15)"
                className="bg-slate-950/90 border border-slate-800 p-6 rounded-2xl space-y-5"
              >
                {/* Header for Active Deal */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-purple-400" />
                      <h2 className="text-sm font-bold text-slate-100">
                        AUDIT TRAIL FOR DEAL
                      </h2>
                    </div>
                    <p className="text-xs text-slate-400 font-mono">
                      Deal: <code className="text-purple-300">{activeDeal.dealId}</code> ({activeDeal.merchantName})
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-emerald-400 font-bold">
                      ₹{activeDeal.finalAmount.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                {/* Filter Search */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search events in this deal..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-purple-500"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                </div>

                {/* Event Stream */}
                <div className="space-y-2.5">
                  {filteredEvents.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                      No matching audit events found.
                    </div>
                  ) : (
                    filteredEvents.map((evt, index) => {
                      const actorInfo = ACTOR_CONFIG[evt.actor] || ACTOR_CONFIG.SYSTEM;
                      const ActorIcon = actorInfo.icon;
                      const statusInfo = getEventStatus(evt.eventType);
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
                                className="text-[11px] font-mono text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer"
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
