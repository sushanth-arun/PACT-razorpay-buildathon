"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { MetricCard } from "@/components/ui/MetricCard";
import SpotlightCard from "@/components/SpotlightCard";
import { 
  Package, 
  Boxes, 
  DollarSign, 
  Percent, 
  ShieldCheck, 
  Activity, 
  ArrowRight, 
  ExternalLink,
  Store,
  Clock,
  Sparkles
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getMerchant, getMerchantProducts } from "@/services/firestore";
import { DEMO_MERCHANT_ID } from "@/services/seed";
import { Merchant, Product, TransactionRecord } from "@/types";

export default function MerchantDashboardPage() {
  const { merchantId: authMerchantId } = useAuth();
  const merchantId = authMerchantId || DEMO_MERCHANT_ID;

  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadMerchantOverview() {
      try {
        setLoading(true);
        const [m, p, tRes] = await Promise.all([
          getMerchant(merchantId),
          getMerchantProducts(merchantId),
          fetch(`/api/transactions?merchantId=${encodeURIComponent(merchantId)}&scope=merchant`).then((r) => r.json()),
        ]);
        setMerchant(m);
        setProducts(p);
        if (tRes.success && Array.isArray(tRes.transactions)) {
          setTransactions(tRes.transactions);
        }
      } catch (err) {
        console.error("Failed to load merchant overview:", err);
      } finally {
        setLoading(false);
      }
    }
    loadMerchantOverview();
  }, [merchantId]);

  const activeProducts = products.filter((p) => p.active);
  const lowStockProducts = products.filter((p) => p.stock > 0 && p.stock < 5);
  const outOfStockProducts = products.filter((p) => p.stock === 0);
  const totalRevenue = transactions
    .filter((t) => t.status === "PAID")
    .reduce((sum, t) => sum + (t.finalAmount || t.amount), 0);

  return (
    <PageContainer>
      <PageHeader
        title={`${merchant?.name?.toUpperCase() || "MERCHANT"} OPERATIONS CONSOLE`}
        description="Autonomous sales operations, real-time catalog governance, and commercial policy telemetry."
        badge={<StatusBadge status="active" label="AGENT REPRESENTATIVE ONLINE" />}
      />

      {/* Hero Agent Status Card */}
      <SpotlightCard
        spotlightColor="rgba(16, 185, 129, 0.2)"
        className="bg-slate-950/90 border border-emerald-800/60 p-6 rounded-3xl font-mono text-xs shadow-2xl"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-950/90 border border-emerald-600/60 flex items-center justify-center text-emerald-400 font-bold shadow-lg shadow-emerald-950/50">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100 font-sans">
                  {merchant?.name || "Merchant"} AI Sales Representative
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">
                  ACTIVE
                </span>
              </div>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Your Merchant Agent autonomously constructs deals from your catalog within the discount and margin policies you control below.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/merchant/policies"
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-bold transition-colors whitespace-nowrap"
            >
              Adjust Agent Policies →
            </Link>
          </div>
        </div>
      </SpotlightCard>

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
        <MetricCard
          title="Catalog Items"
          value={products.length}
          subtitle={`${activeProducts.length} active in AI negotiation`}
          icon={Package}
        />
        <MetricCard
          title="Low / Out of Stock"
          value={lowStockProducts.length + outOfStockProducts.length}
          subtitle={`${outOfStockProducts.length} zero stock items`}
          icon={Boxes}
          trend={outOfStockProducts.length > 0 ? { value: `${outOfStockProducts.length} OOS`, isPositive: false } : undefined}
        />
        <MetricCard
          title="Max Negotiated Discount"
          value={`${merchant?.maxDiscountPercent ?? 15}%`}
          subtitle={`Min margin ${merchant?.minimumMarginPercent ?? 20}%`}
          icon={Percent}
        />
        <MetricCard
          title="Settled Revenue"
          value={`₹${totalRevenue.toLocaleString("en-IN")}`}
          subtitle={`${transactions.filter((t) => t.status === "PAID").length} Razorpay orders`}
          icon={DollarSign}
          trend={{ value: "LIVE", isPositive: true }}
        />
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
        <Link href="/merchant/products">
          <SpotlightCard
            spotlightColor="rgba(59, 130, 246, 0.2)"
            className="bg-slate-950/80 border border-slate-800 hover:border-blue-500/60 p-5 rounded-2xl transition-all h-full flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-blue-400 font-bold">
                <Package className="w-4 h-4" />
                <span>CATALOG & INVENTORY</span>
              </div>
              <p className="text-slate-400 font-sans text-xs">
                Add, edit, deactivate products, adjust live pricing, and manage real-time inventory stock levels.
              </p>
            </div>
            <span className="text-blue-400 font-bold flex items-center gap-1 pt-3">
              Manage Products & Stock <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </SpotlightCard>
        </Link>

        <Link href="/merchant/policies">
          <SpotlightCard
            spotlightColor="rgba(245, 158, 11, 0.2)"
            className="bg-slate-950/80 border border-slate-800 hover:border-amber-500/60 p-5 rounded-2xl transition-all h-full flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold">
                <Percent className="w-4 h-4" />
                <span>COMMERCIAL POLICIES</span>
              </div>
              <p className="text-slate-400 font-sans text-xs">
                Configure discount ceilings, minimum profit margins, and auto-settlement caps for PACT Firewall.
              </p>
            </div>
            <span className="text-amber-400 font-bold flex items-center gap-1 pt-3">
              Configure Policies <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </SpotlightCard>
        </Link>

        <Link href="/merchant/audit">
          <SpotlightCard
            spotlightColor="rgba(16, 185, 129, 0.2)"
            className="bg-slate-950/80 border border-slate-800 hover:border-emerald-500/60 p-5 rounded-2xl transition-all h-full flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <Boxes className="w-4 h-4" />
                <span>AUDIT TRAIL & APPROVALS</span>
              </div>
              <p className="text-slate-400 font-sans text-xs">
                Review store deal audit trails and approve or reject deals exceeding automated settlement caps.
              </p>
            </div>
            <span className="text-emerald-400 font-bold flex items-center gap-1 pt-3">
              View Audit & Approvals <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </SpotlightCard>
        </Link>
      </div>

      {/* Recent Merchant Agent Settlements */}
      <div className="space-y-3 font-mono text-xs">
        <div className="flex items-center justify-between px-1 font-bold text-slate-400">
          <span>RECENT SETTLED TRANSACTIONS ({transactions.length})</span>
          <Link href="/merchant/transactions" className="text-blue-400 hover:underline">
            View All Transactions →
          </Link>
        </div>

        {transactions.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-950/80 border border-slate-800 text-center text-slate-500">
            No completed customer transactions yet. When an AI Buyer purchases from your catalog, records appear here.
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.slice(0, 5).map((tx) => (
              <div
                key={tx.id}
                className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between"
              >
                <div>
                  <span className="font-bold text-slate-200">{tx.dealId}</span>
                  <p className="text-[11px] text-slate-500">{new Date(tx.createdAt).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-100 text-sm">
                    ₹{(tx.finalAmount || tx.amount).toLocaleString("en-IN")}
                  </span>
                  <p className="text-[10px] text-emerald-400">{tx.status}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
