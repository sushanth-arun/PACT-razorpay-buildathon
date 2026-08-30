"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import SpotlightCard from "@/components/SpotlightCard";
import { 
  User, 
  Bot, 
  Store, 
  Cpu, 
  Flame, 
  CreditCard, 
  Server,
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Info,
  Search,
  Filter,
  RefreshCw,
  Clock,
  ChevronDown,
  ChevronUp,
  FileText,
  ShieldCheck
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AuditEvent, AuditActor, AuditEventType } from "@/lib/audit/schema";

// Actor icon and color mapping
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

// Event status classification helper
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

function AuditPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Selected filters from URL or internal state
  const initialDealId = searchParams.get("dealId") || "";

  const [selectedDealId, setSelectedDealId] = useState<string>(initialDealId);
  const [selectedActor, setSelectedActor] = useState<string>("");
  const [selectedEventType, setSelectedEventType] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [orderAsc, setOrderAsc] = useState<boolean>(true);

  // Data states
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [dealIds, setDealIds] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Expanded metadata toggle set
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());

  // Load distinct deal list
  const loadDeals = useCallback(async () => {
    try {
      const res = await fetch("/api/audit?action=deals");
      const data = await res.json();
      if (data.success && Array.isArray(data.deals)) {
        setDealIds(data.deals);
      }
    } catch {
      // ignore
    }
  }, []);

  // Fetch audit events with server-side query parameters
  const fetchAuditEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedDealId) params.set("dealId", selectedDealId);
      if (selectedActor) params.set("actor", selectedActor);
      if (selectedEventType) params.set("eventType", selectedEventType);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      params.set("order", orderAsc ? "asc" : "desc");
      params.set("limit", "150");

      const res = await fetch(`/api/audit?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load audit trail.");
      }

      setEvents(data.events || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load audit events.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [selectedDealId, selectedActor, selectedEventType, searchQuery, orderAsc]);

  useEffect(() => {
    loadDeals();
  }, [loadDeals]);

  useEffect(() => {
    fetchAuditEvents();
  }, [fetchAuditEvents]);

  // Sync selected deal into URL query
  const handleSelectDeal = (id: string) => {
    setSelectedDealId(id);
    if (id) {
      router.push(`/audit?dealId=${encodeURIComponent(id)}`);
    } else {
      router.push("/audit");
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = events.length;
    const passed = events.filter((e) => getEventStatus(e.eventType).type === "SUCCESS").length;
    const failed = events.filter((e) => getEventStatus(e.eventType).type === "FAILURE").length;
    const warnings = events.filter((e) => getEventStatus(e.eventType).type === "WARNING").length;
    return { total, passed, failed, warnings };
  }, [events]);

  return (
    <PageContainer>
      <PageHeader
        title="PACT AUDIT TRAIL"
        description="Immutable event telemetry recording agent reasoning, policy enforcement, deterministic compiler proofs, and Razorpay settlements."
        badge={
          <StatusBadge
            status={events.length > 0 ? "active" : "neutral"}
            label={`${events.length} IMMUTABLE EVENTS`}
          />
        }
      />

      {/* Control Bar: Filters & Deal Selector */}
      <SpotlightCard
        spotlightColor="rgba(59, 130, 246, 0.15)"
        className="bg-slate-950/90 border border-slate-800 p-0 rounded-2xl shadow-xl font-mono"
      >
        <div className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">
                AUDIT FILTERS & DEAL INSPECTOR
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOrderAsc(!orderAsc)}
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                <span>{orderAsc ? "OLDEST → NEWEST (LIFECYCLE)" : "NEWEST → OLDEST"}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  fetchAuditEvents();
                  loadDeals();
                }}
                disabled={loading}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                <span>REFRESH</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* Filter by Deal */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase">SELECT DEAL</label>
              <select
                value={selectedDealId}
                onChange={(e) => handleSelectDeal(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 focus:outline-none focus:border-blue-500"
              >
                <option value="">ALL DEALS ({dealIds.length} deals)</option>
                {dealIds.map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Actor */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase">FILTER BY ACTOR</label>
              <select
                value={selectedActor}
                onChange={(e) => setSelectedActor(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 focus:outline-none focus:border-blue-500"
              >
                <option value="">ALL ACTORS</option>
                <option value="USER">USER</option>
                <option value="BUYER_AGENT">BUYER_AGENT</option>
                <option value="MERCHANT_AGENT">MERCHANT_AGENT</option>
                <option value="DEAL_COMPILER">DEAL_COMPILER</option>
                <option value="PACT_FIREWALL">PACT_FIREWALL</option>
                <option value="RAZORPAY">RAZORPAY</option>
                <option value="SYSTEM">SYSTEM</option>
              </select>
            </div>

            {/* Filter by Event Type */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase">FILTER EVENT TYPE</label>
              <select
                value={selectedEventType}
                onChange={(e) => setSelectedEventType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 focus:outline-none focus:border-blue-500"
              >
                <option value="">ALL EVENT TYPES</option>
                <option value="BUYER_REQUEST_RECEIVED">BUYER_REQUEST_RECEIVED</option>
                <option value="BUYER_INTENT_PARSED">BUYER_INTENT_PARSED</option>
                <option value="MERCHANT_OFFER_GENERATED">MERCHANT_OFFER_GENERATED</option>
                <option value="DEAL_COMPILED">DEAL_COMPILED</option>
                <option value="POLICY_CHECK_PASSED">POLICY_CHECK_PASSED</option>
                <option value="POLICY_CHECK_FAILED">POLICY_CHECK_FAILED</option>
                <option value="DEAL_VALIDATED">DEAL_VALIDATED</option>
                <option value="DEAL_REJECTED">DEAL_REJECTED</option>
                <option value="HUMAN_APPROVAL_REQUIRED">HUMAN_APPROVAL_REQUIRED</option>
                <option value="RAZORPAY_ORDER_CREATED">RAZORPAY_ORDER_CREATED</option>
                <option value="PAYMENT_SUCCESSFUL">PAYMENT_SUCCESSFUL</option>
                <option value="PAYMENT_FAILED">PAYMENT_FAILED</option>
              </select>
            </div>

            {/* Free Search */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase">SEARCH MESSAGE</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search keywords..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 focus:outline-none focus:border-blue-500"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
              </div>
            </div>
          </div>

          {/* Quick Filter Reset */}
          {(selectedDealId || selectedActor || selectedEventType || searchQuery) && (
            <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs">
              <div className="flex items-center gap-2 text-slate-400">
                <span>Active Filters:</span>
                {selectedDealId && (
                  <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                    Deal: {selectedDealId}
                  </span>
                )}
                {selectedActor && (
                  <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                    Actor: {selectedActor}
                  </span>
                )}
                {selectedEventType && (
                  <span className="px-2 py-0.5 rounded bg-orange-950 text-orange-300 border border-orange-800">
                    Event: {selectedEventType}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedDealId("");
                  setSelectedActor("");
                  setSelectedEventType("");
                  setSearchQuery("");
                  router.push("/audit");
                }}
                className="text-rose-400 hover:text-rose-300 underline cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          )}
        </div>
      </SpotlightCard>

      {/* Summary Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1 text-center">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">TOTAL EVENTS</span>
          <p className="text-xl font-extrabold text-slate-100">{metrics.total}</p>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1 text-center">
          <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">PASSED / SUCCESS</span>
          <p className="text-xl font-extrabold text-emerald-400">{metrics.passed}</p>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1 text-center">
          <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">FAILURES / BLOCKED</span>
          <p className="text-xl font-extrabold text-rose-400">{metrics.failed}</p>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1 text-center">
          <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">WARNINGS / GATES</span>
          <p className="text-xl font-extrabold text-amber-400">{metrics.warnings}</p>
        </div>
      </div>

      {/* Main Audit Trail Timeline */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center space-y-3 rounded-2xl bg-slate-950/80 border border-slate-800 font-mono">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-400 mx-auto" />
            <p className="text-xs text-slate-300">Fetching verifiable audit records from Firestore...</p>
          </div>
        ) : error ? (
          <div className="p-6 rounded-2xl bg-rose-950/40 border border-rose-800/80 text-rose-300 font-mono text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm">
              <XCircle className="w-4 h-4 text-rose-400" />
              <span>Failed to Load Audit Trail</span>
            </div>
            <p>{error}</p>
          </div>
        ) : events.length === 0 ? (
          <div className="p-16 rounded-3xl bg-slate-950/80 border border-dashed border-slate-800 text-center font-mono space-y-3">
            <FileText className="w-8 h-8 text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-slate-300 uppercase">NO AUDIT EVENTS RECORDED</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto font-sans">
              System activity will appear here as deals progress through Buyer AI parsing, Merchant Offers, Deal Compilation, Firewall checks, and Razorpay settlements.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((evt, idx) => {
              const actorCfg = ACTOR_CONFIG[evt.actor] || ACTOR_CONFIG.SYSTEM;
              const statusInfo = getEventStatus(evt.eventType);
              const ActorIcon = actorCfg.icon;
              const StatusIcon = statusInfo.icon;
              const isExpanded = expandedEvents.has(evt.id);

              return (
                <SpotlightCard
                  key={evt.id}
                  spotlightColor="rgba(59, 130, 246, 0.15)"
                  className="bg-slate-950/90 border border-slate-800 p-0 rounded-2xl transition-all"
                >
                  <div className="p-4 sm:p-5 space-y-3 font-mono text-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/60 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center">
                          <ActorIcon className={`w-3.5 h-3.5 ${actorCfg.color}`} />
                        </div>
                        <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${actorCfg.badgeClass}`}>
                          {actorCfg.label}
                        </span>
                        <span className="font-bold text-slate-200">{evt.eventType}</span>
                        {evt.dealId && evt.dealId !== "system" && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                            {evt.dealId}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(evt.timestamp).toLocaleString()}</span>
                      </div>
                    </div>

                    <p className="text-slate-200 font-sans text-xs sm:text-sm leading-relaxed">
                      {evt.humanReadableMessage}
                    </p>

                    {evt.metadata && Object.keys(evt.metadata).length > 0 && (
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => toggleExpand(evt.id)}
                          className="text-[11px] text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 cursor-pointer"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="w-3.5 h-3.5" />
                              <span>Hide Metadata</span>
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-3.5 h-3.5" />
                              <span>Inspect Event Metadata ({Object.keys(evt.metadata).length} fields)</span>
                            </>
                          )}
                        </button>

                        {isExpanded && (
                          <div className="mt-2.5 p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] text-slate-300 overflow-x-auto">
                            <pre>{JSON.stringify(evt.metadata, null, 2)}</pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </SpotlightCard>
              );
            })}
          </div>
        )}
      </div>
    </PageContainer>
  );
}

export default function AuditPage() {
  return (
    <React.Suspense
      fallback={
        <PageContainer>
          <div className="p-12 text-center text-slate-400 font-mono text-xs">
            Loading PACT Audit Telemetry...
          </div>
        </PageContainer>
      }
    >
      <AuditPageContent />
    </React.Suspense>
  );
}
