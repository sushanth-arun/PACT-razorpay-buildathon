"use client";

import React, { useEffect, useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { MetricCard } from "@/components/ui/MetricCard";
import { SectionCard } from "@/components/ui/SectionCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Store, Package, Settings, AlertCircle, RefreshCw } from "lucide-react";
import { getMerchant, getMerchantProducts } from "@/services/firestore";
import { DEMO_MERCHANT_ID } from "@/services/seed";
import { Merchant, Product } from "@/types";

export default function MerchantPage() {
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMerchantData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [m, p] = await Promise.all([
        getMerchant(DEMO_MERCHANT_ID),
        getMerchantProducts(DEMO_MERCHANT_ID),
      ]);
      setMerchant(m);
      setProducts(p);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load Firestore data";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMerchantData();
  }, []);

  const totalProductsCount = products.length;
  const inStockCount = products.filter((p) => p.stock > 0).length;
  const inStockPercentage = totalProductsCount > 0 ? Math.round((inStockCount / totalProductsCount) * 100) : 0;

  return (
    <PageContainer>
      <PageHeader
        title="Merchant Dashboard"
        description="Catalog inventory management and autonomous governance policy configuration for ErgoSpace."
        badge={<StatusBadge status="active" label={merchant ? "STORE ACTIVE" : "DEMO STORE"} />}
        actions={
          <button
            onClick={fetchMerchantData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            REFRESH FIRESTORE
          </button>
        }
      />

      {error && (
        <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/50 text-xs text-rose-300 flex items-center justify-between">
          <span>Firestore query error: {error}</span>
          <span className="font-mono text-[10px] text-rose-400">FIRESTORE ERROR</span>
        </div>
      )}

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Products"
          value={loading ? "..." : totalProductsCount > 0 ? totalProductsCount : "10 (Seed Reqd)"}
          subtitle={totalProductsCount > 0 ? "Live Firestore products" : "Run `npm run seed` to seed"}
          icon={Package}
        />
        <MetricCard
          title="Products In Stock"
          value={loading ? "..." : totalProductsCount > 0 ? inStockCount : "10 (Seed Reqd)"}
          subtitle={totalProductsCount > 0 ? "Available in inventory" : "Run `npm run seed` to seed"}
          icon={Package}
          trend={totalProductsCount > 0 ? { value: `${inStockPercentage}%`, isPositive: inStockPercentage > 50 } : undefined}
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
          badge={<StatusBadge status={totalProductsCount > 0 ? "validated" : "neutral"} label={totalProductsCount > 0 ? `${totalProductsCount} FIRESTORE ITEMS` : "PHASE 2"} />}
        >
          {totalProductsCount > 0 ? (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {products.map((p) => (
                <div key={p.id} className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-mono font-bold text-slate-200">{p.name}</span>
                    <span className="text-[10px] font-mono text-slate-500 ml-2">[{p.category}]</span>
                  </div>
                  <div className="flex items-center gap-3 font-mono">
                    <span className="text-slate-400">Stock: <strong className={p.stock < 5 ? "text-amber-400" : "text-emerald-400"}>{p.stock}</strong></span>
                    <span className="font-bold text-slate-100">₹{p.price.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Store}
              title="Catalog Empty in Firestore"
              description="Run `npm run seed` in your terminal to seed the 10 demo products for ErgoSpace."
            />
          )}
        </SectionCard>

        {/* Merchant Policy Controls Section */}
        <SectionCard
          title="MERCHANT GOVERNANCE POLICIES"
          subtitle="Deterministic boundaries enforced by PACT Firewall"
          badge={<StatusBadge status={merchant ? "validated" : "neutral"} label={merchant ? "FIRESTORE POLICIES" : "DEFAULT POLICIES"} />}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Max Discount</span>
                <p className="text-sm font-bold font-mono text-slate-200">
                  {merchant ? `${merchant.maxDiscountPercent}%` : "15%"}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Min Margin</span>
                <p className="text-sm font-bold font-mono text-slate-200">
                  {merchant ? `${merchant.minimumMarginPercent}%` : "20%"}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Auto Approval Limit</span>
                <p className="text-sm font-bold font-mono text-slate-200">
                  {merchant ? `₹${merchant.maxAutoTransactionAmount.toLocaleString("en-IN")}` : "₹50,000"}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Human Approval Threshold</span>
                <p className="text-sm font-bold font-mono text-slate-200">
                  {merchant ? `> ₹${merchant.approvalRequiredAbove.toLocaleString("en-IN")}` : "> ₹50,000"}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/40 border border-amber-900/30 flex items-start gap-2.5 text-xs text-slate-400">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                {merchant
                  ? `Loaded live governance parameters for merchant [ ${merchant.name} ] from Firestore.`
                  : "These policy thresholds are ready for server-side evaluation by the PACT Firewall."}
              </span>
            </div>
          </div>
        </SectionCard>
      </div>
    </PageContainer>
  );
}


