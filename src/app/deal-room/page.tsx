import React from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Handshake } from "lucide-react";

export default function DealRoomPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Deal Room"
        description="Autonomous AI-to-AI intent negotiation, deal compilation, and firewall gatekeeping."
        badge={<StatusBadge status="active" label="READY" />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="border border-slate-800 rounded-xl bg-slate-900/40 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-semibold text-slate-200 font-mono">1. BUYER AI INTENT</h2>
            <StatusBadge status="neutral" label="STANDBY" />
          </div>
          <EmptyState
            icon={Handshake}
            title="No Buyer Intent"
            description="Enter a natural language purchase request in Phase 3 to parse structured buyer intent."
          />
        </div>

        <div className="border border-slate-800 rounded-xl bg-slate-900/40 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-semibold text-slate-200 font-mono">2. MERCHANT OFFER</h2>
            <StatusBadge status="neutral" label="STANDBY" />
          </div>
          <EmptyState
            icon={Handshake}
            title="No Offer Generated"
            description="The Merchant Agent will construct valid offers using real catalog data in Phase 4."
          />
        </div>

        <div className="border border-slate-800 rounded-xl bg-slate-900/40 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-semibold text-slate-200 font-mono">3. PACT DEAL CONTRACT</h2>
            <StatusBadge status="neutral" label="UNCOMPILED" />
          </div>
          <EmptyState
            icon={Handshake}
            title="Uncompiled Deal"
            description="The Deal Compiler will create deterministic commercial contracts in Phase 5."
          />
        </div>
      </div>
    </PageContainer>
  );
}


