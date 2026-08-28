"use client";

import React from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { MetricCard } from "@/components/ui/MetricCard";
import { SectionCard } from "@/components/ui/SectionCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Store, Package, Settings, AlertCircle } from "lucide-react";

export default function MerchantPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Merchant Dashboard"
        description="Catalog inventory management and autonomous governance policy configuration for ErgoSpace."
        badge={<StatusBadge status="active" label="STORE ACTIVE" />}
      />

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Products"
          value="12"
          subtitle="Demo catalog items"
          icon={Package}
        />
        <MetricCard
          title="Products In Stock"
          value="10"
          subtitle="Available for AI deals"
          icon={Package}
          trend={{ value: "83%", isPositive: true }}
        />
        <MetricCard
          title="Active Deals"
          value="0"
          subtitle="In-flight negotiations"
          icon={Store}
        />
        <MetricCard
          title="Average Order Value"
          value="₹45,000"
          subtitle="Target B2B transaction size"
          icon={Store}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Product Catalog Section */}
        <SectionCard
          title="PRODUCT CATALOG"
          subtitle="Managed catalog items accessible to Merchant Agent"
          badge={<StatusBadge status="neutral" label="PHASE 2" />}
        >
          <EmptyState
            icon={Store}
            title="Catalog Management Locked"
            description="Product search, inventory updates, and category filters will be powered by Firestore in Phase 2."
          />
        </SectionCard>

        {/* Merchant Policy Controls Section */}
        <SectionCard
          title="MERCHANT GOVERNANCE POLICIES"
          subtitle="Deterministic boundaries enforced by PACT Firewall"
          badge={<StatusBadge status="neutral" label="PHASE 2" />}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Max Discount</span>
                <p className="text-sm font-bold font-mono text-slate-200">15%</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Min Margin</span>
                <p className="text-sm font-bold font-mono text-slate-200">20%</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Auto Approval Limit</span>
                <p className="text-sm font-bold font-mono text-slate-200">₹50,000</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Human Approval Threshold</span>
                <p className="text-sm font-bold font-mono text-slate-200">&gt; ₹50,000</p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/40 border border-amber-900/30 flex items-start gap-2.5 text-xs text-slate-400">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                These static policy thresholds will be connected to Firebase and validated server-side by the PACT Firewall engine in subsequent phases.
              </span>
            </div>
          </div>
        </SectionCard>
      </div>
    </PageContainer>
  );
}


