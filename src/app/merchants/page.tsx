"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import SpotlightCard from "@/components/SpotlightCard";
import { Magnet } from "@/components/Magnet";
import { 
  Store, 
  Building2, 
  ArrowRight, 
  Boxes, 
  Percent, 
  Sparkles,
  ExternalLink,
  Search
} from "lucide-react";
import { motion } from "framer-motion";

interface DiscoveredMerchant {
  id: string;
  name: string;
  description: string;
  categories: string[];
  activeProductCount: number;
  maxDiscountPercent: number;
  active: boolean;
}

export default function MerchantsPage() {
  const router = useRouter();
  const [merchants, setMerchants] = useState<DiscoveredMerchant[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedMerchantId, setSelectedMerchantId] = useState<string>("ergospace");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    async function loadMerchants() {
      try {
        const res = await fetch("/api/merchants");
        const data = await res.json();
        if (data.success && Array.isArray(data.merchants)) {
          setMerchants(data.merchants);
          if (data.merchants.length > 0) {
            setSelectedMerchantId(data.merchants[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load merchants:", err);
      } finally {
        setLoading(false);
      }
    }
    loadMerchants();
  }, []);

  const allCategories = Array.from(
    new Set(merchants.flatMap((m) => m.categories || []))
  );

  const filteredMerchants = merchants.filter((m) => {
    const matchesCat = categoryFilter === "ALL" || m.categories.includes(categoryFilter);
    const matchesSearch =
      !searchQuery.trim() ||
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const selectedMerchant = merchants.find((m) => m.id === selectedMerchantId) || merchants[0];

  return (
    <PageContainer>
      <PageHeader
        title="MERCHANT AGENT DIRECTORY"
        description="Browse active autonomous merchant agents ready to negotiate commercial contracts directly with your Buyer AI."
        badge={
          <StatusBadge
            status={merchants.length > 0 ? "active" : "neutral"}
            label={`${merchants.length} ACTIVE MERCHANTS`}
          />
        }
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 font-mono text-xs">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setCategoryFilter("ALL")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              categoryFilter === "ALL"
                ? "bg-blue-600 text-white shadow-md"
                : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
            }`}
          >
            ALL
          </button>
          {allCategories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                categoryFilter === cat
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search Box */}
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Search merchants..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
        </div>
      </div>

      {/* Main Merchant Stack Grid & Inspection Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Interactive Layered Merchant Stack */}
        <div className="lg:col-span-7 space-y-3.5">
          <div className="flex items-center justify-between px-1 text-xs font-mono text-slate-400 font-bold">
            <span>AVAILABLE MERCHANTS ({filteredMerchants.length})</span>
            <span className="text-[11px] text-slate-500">Click to inspect capabilities</span>
          </div>

          {loading ? (
            <div className="p-12 rounded-2xl bg-slate-950/80 border border-slate-800 text-center font-mono text-xs text-slate-400">
              Loading merchant agents from Firestore...
            </div>
          ) : filteredMerchants.length === 0 ? (
            <div className="p-12 rounded-2xl bg-slate-950/80 border border-dashed border-slate-800 text-center font-mono text-xs text-slate-400">
              No merchants found matching your filter criteria.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMerchants.map((merchant, idx) => {
                const isSelected = selectedMerchantId === merchant.id;
                return (
                  <motion.div
                    key={merchant.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => setSelectedMerchantId(merchant.id)}
                    className="cursor-pointer"
                  >
                    <SpotlightCard
                      spotlightColor={
                        isSelected
                          ? "rgba(59, 130, 246, 0.25)"
                          : "rgba(148, 163, 184, 0.1)"
                      }
                      className={`p-0 rounded-2xl border transition-all duration-200 ${
                        isSelected
                          ? "bg-slate-900/90 border-blue-500 shadow-xl shadow-blue-950/40 scale-[1.01]"
                          : "bg-slate-950/90 border-slate-800/80 hover:border-slate-700 hover:scale-[1.005]"
                      }`}
                    >
                      <div className="p-4 sm:p-5 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-xl border flex items-center justify-center font-bold ${
                                isSelected
                                  ? "bg-blue-950 border-blue-700 text-blue-300"
                                  : "bg-slate-900 border-slate-800 text-slate-400"
                              }`}
                            >
                              <Building2 className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-bold text-base text-slate-100 font-sans">
                                  {merchant.name}
                                </h3>
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                                  ONLINE
                                </span>
                              </div>
                              <p className="text-xs text-slate-400 font-sans line-clamp-1">
                                {merchant.description}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0 font-mono">
                            <span className="text-xs text-slate-400 block">Catalog</span>
                            <span className="text-sm font-extrabold text-slate-200">
                              {merchant.activeProductCount} items
                            </span>
                          </div>
                        </div>

                        {/* Badges Bar */}
                        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/60 font-mono text-[11px]">
                          {merchant.categories?.map((cat) => (
                            <span
                              key={cat}
                              className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400"
                            >
                              {cat}
                            </span>
                          ))}
                          <span className="text-blue-400 ml-auto flex items-center gap-1 font-bold">
                            Max Discount: {merchant.maxDiscountPercent}%
                          </span>
                        </div>
                      </div>
                    </SpotlightCard>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Selected Merchant Deep Inspection & Action */}
        <div className="lg:col-span-5 sticky top-24">
          {selectedMerchant ? (
            <SpotlightCard
              spotlightColor="rgba(59, 130, 246, 0.2)"
              className="bg-slate-950/95 border border-slate-800 p-0 rounded-3xl shadow-2xl font-mono"
            >
              <div className="p-6 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-950">
                      <Store className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-100 font-sans">{selectedMerchant.name}</h2>
                      <p className="text-xs text-slate-400">Merchant ID: {selectedMerchant.id}</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-xs font-bold">
                    ACTIVE AGENT
                  </span>
                </div>

                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    COMMERCIAL CAPABILITIES
                  </span>
                  <p className="text-xs text-slate-300 font-sans leading-relaxed">
                    {selectedMerchant.description}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold">
                      <Boxes className="w-3.5 h-3.5 text-blue-400" />
                      <span>INVENTORY</span>
                    </div>
                    <p className="text-lg font-black text-slate-100">
                      {selectedMerchant.activeProductCount} Active
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold">
                      <Percent className="w-3.5 h-3.5 text-emerald-400" />
                      <span>MAX DISCOUNT</span>
                    </div>
                    <p className="text-lg font-black text-emerald-400">
                      {selectedMerchant.maxDiscountPercent}% Cap
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    AVAILABLE CATEGORIES
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedMerchant.categories?.map((cat) => (
                      <span
                        key={cat}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 font-sans"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Primary CTA: Start Deal Room with this Merchant */}
                <div className="pt-3 space-y-2">
                  <Magnet strength={8} className="w-full">
                    <button
                      type="button"
                      onClick={() => router.push(`/deal-room?merchantId=${selectedMerchant.id}`)}
                      className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-mono text-xs font-bold transition-all shadow-xl shadow-blue-950/60 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-blue-200" />
                      <span>START DEAL ROOM WITH {selectedMerchant.name.toUpperCase()}</span>
                      <ArrowRight className="w-3.5 h-3.5 opacity-80" />
                    </button>
                  </Magnet>

                  <Link
                    href={`/merchants/${selectedMerchant.id}`}
                    className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>EXPLORE CATALOG & POLICIES</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                  </Link>
                </div>
              </div>
            </SpotlightCard>
          ) : (
            <div className="p-12 rounded-2xl bg-slate-950/80 border border-slate-800 text-center font-mono text-xs text-slate-500">
              Select a merchant to inspect details
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
