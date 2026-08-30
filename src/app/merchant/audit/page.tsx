"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import SpotlightCard from "@/components/SpotlightCard";
import { 
  History, 
  Search, 
  Store, 
  Bot, 
  Cpu, 
  ShieldCheck, 
  CreditCard, 
  CheckCircle2, 
  AlertTriangle,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { DEMO_MERCHANT_ID } from "@/services/seed";
import { AuditEvent, AuditEventType } from "@/lib/audit/schema";
import { ActorType } from "@/types";

function MerchantAuditContent() {
  const searchParams = useSearchParams();
  const queryDealId = searchParams.get("dealId") || "";

  const { merchantId: authMerchantId } = useAuth();
  const merchantId = authMerchantId || DEMO_MERCHANT_ID;

  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [dealIdFilter, setDealIdFilter] = useState<string>(queryDealId);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    async function loadAudit() {
      try {
        setLoading(true);
        const url = `/api/audit?merchantId=${encodeURIComponent(merchantId)}${dealIdFilter ? `&dealId=${encodeURIComponent(dealIdFilter)}` : ""}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.success && Array.isArray(data.events)) {
          setEvents(data.events);
          if (data.events.length > 0) {
            setExpandedId(data.events[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load merchant audit trail:", err);
      } finally {
        setLoading(false);
      }
    }
    loadAudit();
  }, [merchantId, dealIdFilter]);

  return (
    <PageContainer>
      <PageHeader
        title="MERCHANT AGENT AUDIT TIMELINE"
        description="Trace every autonomous negotiation step, offer compilation, and policy check conducted by your Merchant Agent."
        badge={<StatusBadge status="active" label={`${events.length} RECORDED AUDIT EVENTS`} />}
      />

      {/* Filter Bar */}
      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 font-mono text-xs">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="Filter by Deal ID (e.g. DEAL-1234)..."
            value={dealIdFilter}
            onChange={(e) => setDealIdFilter(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
        </div>
      </div>

      {/* Timeline Stream */}
      <div className="space-y-3 font-mono text-xs">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            Loading merchant decision timeline from Firestore...
          </div>
        ) : events.length === 0 ? (
          <div className="p-16 rounded-3xl bg-slate-950/80 border border-dashed border-slate-800 text-center space-y-2">
            <History className="w-8 h-8 text-slate-500 mx-auto" />
            <h3 className="text-sm font-bold text-slate-300">No Audit Events Logged</h3>
            <p className="text-xs text-slate-500 font-sans">
              Audit records will appear here as soon as an AI Buyer initiates a deal with your store.
            </p>
          </div>
        ) : (
          events.map((evt) => {
            const isExpanded = expandedId === evt.id;
            return (
              <SpotlightCard
                key={evt.id}
                spotlightColor="rgba(59, 130, 246, 0.15)"
                className="bg-slate-950/90 border border-slate-800 p-5 rounded-2xl cursor-pointer hover:border-slate-700 transition-all"
              >
                <div onClick={() => setExpandedId(isExpanded ? null : evt.id)} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold">
                        {evt.actor}
                      </span>
                      <span className="text-slate-400 font-bold">{evt.eventType}</span>
                      {evt.dealId && (
                        <span className="text-[10px] text-slate-500">({evt.dealId})</span>
                      )}
                    </div>
                    <span className="text-slate-500 text-[11px]">
                      {new Date(evt.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  <p className="text-slate-200 font-sans text-xs">{evt.humanReadableMessage}</p>

                  {isExpanded && evt.metadata && Object.keys(evt.metadata).length > 0 && (
                    <div className="mt-3 p-3 rounded-xl bg-slate-900/90 border border-slate-800 font-mono text-[11px] overflow-x-auto text-slate-300">
                      <pre>{JSON.stringify(evt.metadata, null, 2)}</pre>
                    </div>
                  )}
                </div>
              </SpotlightCard>
            );
          })
        )}
      </div>
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
