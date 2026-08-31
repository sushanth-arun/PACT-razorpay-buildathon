"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import SpotlightCard from "@/components/SpotlightCard";
import { Magnet } from "@/components/Magnet";
import { 
  ArrowLeft, 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  Truck
} from "lucide-react";
import { Merchant, Product } from "@/types";

export default function MerchantDetailPage({
  params,
}: {
  params: Promise<{ merchantId: string }>;
}) {
  const resolvedParams = use(params);
  const merchantId = resolvedParams.merchantId;
  const router = useRouter();

  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        // 1. Fetch Merchant Info
        const mRes = await fetch(`/api/merchant?id=${encodeURIComponent(merchantId)}`);
        const mData = await mRes.json();
        if (!mRes.ok || !mData.success) {
          throw new Error(mData.error || "Merchant not found.");
        }
        setMerchant(mData.merchant);

        // 2. Fetch Active Products
        const pRes = await fetch(`/api/products?merchantId=${encodeURIComponent(merchantId)}`);
        const pData = await pRes.json();
        if (pRes.ok && pData.success) {
          setProducts(pData.products || []);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load merchant.";
        setError(msg);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [merchantId]);

  if (loading) {
    return (
      <PageContainer>
        <div className="p-16 text-center text-slate-400 font-mono text-xs">
          Loading merchant catalog and governance profile...
        </div>
      </PageContainer>
    );
  }

  if (error || !merchant) {
    return (
      <PageContainer>
        <div className="p-8 rounded-2xl bg-rose-950/40 border border-rose-800 text-rose-300 font-mono text-xs space-y-3">
          <p className="font-bold text-sm">Merchant Not Found</p>
          <p>{error || "This merchant is not currently active on PACT."}</p>
          <Link href="/merchants" className="text-blue-400 underline block">
            ← Return to Merchant Directory
          </Link>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="space-y-4">
        <Link
          href="/merchants"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to All Merchants</span>
        </Link>

        <PageHeader
          title={merchant.name.toUpperCase()}
          description={merchant.description}
          badge={<StatusBadge status="active" label="VERIFIED AGENT" />}
        />
      </div>

      {/* Hero Overview */}
      <SpotlightCard
        spotlightColor="rgba(59, 130, 246, 0.2)"
        className="bg-slate-950/90 border border-slate-800 p-0 rounded-3xl shadow-2xl font-mono"
      >
        <div className="p-6 sm:p-8 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase">ACTIVE CATALOG</span>
              <p className="text-2xl font-extrabold text-slate-100">{products.length} Products</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
              <span className="text-[11px] font-bold text-emerald-400 uppercase">MAX NEGOTIATED DISCOUNT</span>
              <p className="text-2xl font-extrabold text-emerald-400">{merchant.maxDiscountPercent}% Cap</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
              <span className="text-[11px] font-bold text-blue-400 uppercase">AUTO-SETTLEMENT LIMIT</span>
              <p className="text-2xl font-extrabold text-blue-400">
                ₹{merchant.maxAutoTransactionAmount.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
              <span className="text-[11px] font-bold text-purple-400 uppercase">FIREWALL ENFORCEMENT</span>
              <p className="text-2xl font-extrabold text-purple-400">9 Gates PASS</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-800/80">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-slate-300 font-sans">
                Transactions with {merchant.name} are deterministically guaranteed by PACT Firewall & Razorpay.
              </span>
            </div>

            <Magnet strength={8}>
              <button
                type="button"
                onClick={() => router.push(`/deal-room?merchantId=${merchant.id}`)}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-mono text-xs font-bold transition-all shadow-xl shadow-blue-950/60 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-blue-200" />
                <span>START NEGOTIATION WITH {merchant.name.toUpperCase()}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </Magnet>
          </div>
        </div>
      </SpotlightCard>

      {/* Catalog Products List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1 font-mono text-xs font-bold text-slate-400">
          <span>AVAILABLE PRODUCT CATALOG ({products.length})</span>
          <span>REAL-TIME FIRESTORE INVENTORY</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product) => (
            <SpotlightCard
              key={product.id}
              spotlightColor="rgba(56, 189, 248, 0.15)"
              className="bg-slate-950/90 border border-slate-800 p-0 rounded-2xl shadow-lg hover:border-slate-700 transition-all font-mono"
            >
              <div className="p-5 space-y-3.5 flex flex-col h-full justify-between">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs px-2.5 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300 font-medium">
                      {product.category}
                    </span>
                    <span className={`text-xs px-2.5 py-0.5 rounded-md border font-bold ${
                      product.stock > 5 ? "bg-emerald-950 text-emerald-300 border-emerald-800" : "bg-amber-950 text-amber-300 border-amber-800"
                    }`}>
                      {product.stock} in stock
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-100 font-sans line-clamp-1">{product.name}</h3>
                  <p className="text-sm text-slate-400 font-sans line-clamp-2 leading-relaxed">
                    {product.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 block font-bold">CATALOG PRICE</span>
                    <span className="text-lg font-black text-slate-100">
                      ₹{product.price.toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="text-right text-xs text-slate-300 flex items-center gap-1 font-bold">
                    <Truck className="w-4 h-4 text-blue-400" />
                    <span>{product.deliveryDays}d SLA</span>
                  </div>
                </div>
              </div>
            </SpotlightCard>
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
