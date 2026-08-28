"use client";

import React, { useEffect, useState, useMemo } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { MetricCard } from "@/components/ui/MetricCard";
import { SectionCard } from "@/components/ui/SectionCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProductEditModal } from "@/components/ui/ProductEditModal";
import SpotlightCard from "@/components/SpotlightCard";

import { 
  Store, 
  Package, 
  Settings, 
  AlertCircle, 
  RefreshCw, 
  Search, 
  Filter, 
  Edit3, 
  Check, 
  Loader2, 
  ShieldCheck, 
  AlertTriangle,
  Zap,
  SlidersHorizontal,
  Info,
  XCircle
} from "lucide-react";
import { getMerchant, getMerchantProducts, updateMerchantPolicies, saveProduct } from "@/services/firestore";
import { DEMO_MERCHANT_ID } from "@/services/seed";
import { Merchant, Product } from "@/types";
import { motion, AnimatePresence } from "framer-motion";

const LOW_STOCK_THRESHOLD = 5;

export default function MerchantPage() {
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");

  // Product Edit Modal State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Policy Form State
  const [policyForm, setPolicyForm] = useState({
    maxDiscountPercent: 15,
    minimumMarginPercent: 20,
    maxAutoTransactionAmount: 50000,
    approvalRequiredAbove: 50000,
    allowSlowMovingInventoryDiscount: true,
  });
  const [policySaving, setPolicySaving] = useState(false);
  const [policySuccess, setPolicySuccess] = useState(false);
  const [policyError, setPolicyError] = useState<string | null>(null);

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
      if (m) {
        setPolicyForm({
          maxDiscountPercent: m.maxDiscountPercent ?? 15,
          minimumMarginPercent: m.minimumMarginPercent ?? 20,
          maxAutoTransactionAmount: m.maxAutoTransactionAmount ?? 50000,
          approvalRequiredAbove: m.approvalRequiredAbove ?? 50000,
          allowSlowMovingInventoryDiscount: m.allowSlowMovingInventoryDiscount ?? true,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unable to load merchant catalog from Firestore.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMerchantData();
  }, []);

  // Filter Categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ["ALL", ...Array.from(set)];
  }, [products]);

  // Filtered Products (Case-insensitive product search)
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const queryLower = searchQuery.toLowerCase().trim();
      const matchesSearch = !queryLower || 
        p.name.toLowerCase().includes(queryLower) ||
        p.description?.toLowerCase().includes(queryLower) ||
        p.category?.toLowerCase().includes(queryLower);
      const matchesCat = selectedCategory === "ALL" || p.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [products, searchQuery, selectedCategory]);

  // Metrics Calculations
  const totalProductsCount = products.length;
  const inStockCount = products.filter((p) => p.stock > 0).length;
  const lowStockCount = products.filter((p) => p.stock > 0 && p.stock < LOW_STOCK_THRESHOLD).length;

  // Toggle active status directly
  const handleToggleProductActive = async (product: Product) => {
    const updated: Product = { ...product, active: !product.active, updatedAt: new Date().toISOString() };
    setProducts((prev) => prev.map((p) => (p.id === product.id ? updated : p)));
    try {
      await saveProduct(updated);
    } catch (err) {
      setProducts((prev) => prev.map((p) => (p.id === product.id ? product : p)));
      setError("Failed to update product visibility in Firestore.");
    }
  };

  // Policy Save Handler
  const handleSavePolicies = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!merchant) return;

    setPolicySaving(true);
    setPolicyError(null);
    setPolicySuccess(false);

    try {
      await updateMerchantPolicies(DEMO_MERCHANT_ID, {
        maxDiscountPercent: Number(policyForm.maxDiscountPercent),
        minimumMarginPercent: Number(policyForm.minimumMarginPercent),
        maxAutoTransactionAmount: Number(policyForm.maxAutoTransactionAmount),
        approvalRequiredAbove: Number(policyForm.approvalRequiredAbove),
        allowSlowMovingInventoryDiscount: policyForm.allowSlowMovingInventoryDiscount,
        slowMovingInventoryFlexibility: policyForm.allowSlowMovingInventoryDiscount,
      });

      setMerchant((prev) => prev ? {
        ...prev,
        ...policyForm,
        updatedAt: new Date().toISOString(),
      } : null);

      setPolicySuccess(true);
      setTimeout(() => setPolicySuccess(false), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to persist merchant policies to Firestore.";
      setPolicyError(msg);
    } finally {
      setPolicySaving(false);
    }
  };

  // Check unsaved policy changes
  const hasUnsavedPolicyChanges = useMemo(() => {
    if (!merchant) return false;
    return (
      merchant.maxDiscountPercent !== Number(policyForm.maxDiscountPercent) ||
      merchant.minimumMarginPercent !== Number(policyForm.minimumMarginPercent) ||
      merchant.maxAutoTransactionAmount !== Number(policyForm.maxAutoTransactionAmount) ||
      merchant.approvalRequiredAbove !== Number(policyForm.approvalRequiredAbove) ||
      merchant.allowSlowMovingInventoryDiscount !== policyForm.allowSlowMovingInventoryDiscount
    );
  }, [merchant, policyForm]);

  return (
    <PageContainer>
      {/* Header */}
      <PageHeader
        title="Merchant Control Center"
        description="Catalog inventory management and autonomous governance policy configuration for ErgoSpace."
        badge={<StatusBadge status={merchant ? "active" : loading ? "validating" : "neutral"} label={merchant ? "STORE ACTIVE" : loading ? "CONNECTING..." : "DEMO MODE"} />}

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

      {/* Firestore Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>
              {error.includes("PERMISSION_DENIED") || error.toLowerCase().includes("permission")
                ? "Firestore access needs permission. Please verify Firebase project credentials."
                : error.includes("CONFIGURATION_ERROR")
                ? "Firebase configuration error: environment variables or Admin SDK missing."
                : `Unable to load merchant catalog: ${error}`}
            </span>
          </div>
          <button
            onClick={fetchMerchantData}
            className="px-3 py-1 bg-rose-900/60 border border-rose-700/50 rounded font-mono text-[11px] hover:bg-rose-800 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Metric Cards Row with Staggered Entrance & SpotlightCard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-5 rounded-xl bg-slate-900/40 border border-slate-800/60 animate-pulse space-y-3">
              <div className="h-3 w-20 bg-slate-800 rounded" />
              <div className="h-7 w-14 bg-slate-800 rounded" />
              <div className="h-2 w-28 bg-slate-800/60 rounded" />
            </div>
          ))
        ) : (
          <>
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
              <MetricCard
                title="Total Products"
                value={totalProductsCount}
                subtitle="Live Firestore items"
                hoverDetail="Live catalog synced from Firestore"
                icon={Package}
              />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.05 }}>
              <MetricCard
                title="Products In Stock"
                value={inStockCount}
                subtitle="Available for AI deals"
                hoverDetail={`${inStockCount} of ${totalProductsCount} products currently available`}
                icon={Package}
                trend={{ value: `${Math.round((inStockCount / (totalProductsCount || 1)) * 100)}%`, isPositive: true }}
              />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.1 }}>
              <MetricCard
                title="Low Stock Warning"
                value={lowStockCount}
                subtitle={`Stock < ${LOW_STOCK_THRESHOLD} units`}
                hoverDetail="Products below low-stock threshold"
                icon={AlertTriangle}
                trend={lowStockCount > 0 ? { value: `${lowStockCount} LOW`, isPositive: false } : undefined}
              />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.15 }}>
              <MetricCard
                title="Active Deals"
                value="0"
                subtitle="No in-flight deals"
                hoverDetail="No deals have been created yet"
                icon={Store}
              />
            </motion.div>
          </>
        )}
      </div>


      {/* Main Grid: Left Catalog Management | Right Governance Policy Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left 7 Columns: Product Catalog Management */}
        <div className="lg:col-span-7 space-y-4">
          <SectionCard
            title="PRODUCT CATALOG MANAGEMENT"
            subtitle="Live inventory catalog exposed to Buyer AI & Merchant Agent"
            badge={<StatusBadge status="validated" label={`${filteredProducts.length} ITEMS`} />}
          >
            {/* Search and Category Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search catalog products by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors shrink-0 ${
                      selectedCategory === cat
                        ? "bg-blue-600 text-white"
                        : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Product Table / Cards with BorderGlow & Empty States */}
            {loading ? (
              <div className="space-y-2 py-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-14 bg-slate-950/60 border border-slate-800 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : error ? (
              <EmptyState
                icon={AlertCircle}
                title="Firestore access needs permission"
                description="Unable to query catalog items from Firestore. Check database connection or click Retry."
              />
            ) : products.length === 0 ? (
              <EmptyState
                icon={Package}
                title="No products in catalog"
                description="Catalog is currently empty in Firestore. Run `npm run seed` in your terminal to populate ErgoSpace items."
              />
            ) : filteredProducts.length === 0 ? (
              <div className="py-8 text-center space-y-3">
                <EmptyState
                  icon={Search}
                  title="No products match your search"
                  description={`No items found matching "${searchQuery}".`}
                />
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("ALL");
                  }}
                  className="px-3 py-1.5 rounded-lg bg-blue-950/60 border border-blue-800 text-xs font-mono text-blue-300 hover:bg-blue-900/80 transition-colors"
                >
                  Clear Search & Filters
                </button>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {filteredProducts.map((product) => {
                  const isLowStock = product.stock > 0 && product.stock < LOW_STOCK_THRESHOLD;
                  const isOutOfStock = product.stock === 0;

                  return (
                    <SpotlightCard
                      key={product.id}
                      spotlightColor="rgba(56, 189, 248, 0.12)"
                      className="bg-slate-950/80 border border-slate-800 p-0 rounded-xl transition-colors hover:border-slate-700"
                    >
                      <motion.div
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        whileHover={{ y: -1 }}
                        className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                      >
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm text-slate-100 truncate">{product.name}</span>
                            <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
                              {product.category}
                            </span>
                            {!product.active && (
                              <span className="text-xs font-mono px-2 py-0.5 rounded bg-rose-950/60 text-rose-400 border border-rose-900/40">
                                INACTIVE
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed font-normal mt-0.5">{product.description}</p>
                        </div>


                        <div className="flex items-center gap-4 shrink-0 font-mono text-xs">
                          {/* Price */}
                          <div className="flex flex-col items-end">
                            <span className="text-[11px] text-slate-400 font-medium">PRICE</span>
                            <span className="font-bold text-sm text-slate-100">₹{product.price.toLocaleString("en-IN")}</span>
                          </div>

                          {/* Stock Status Badge */}
                          <div className="flex flex-col items-end min-w-[85px]">
                            <span className="text-[11px] text-slate-400 font-medium">STOCK</span>
                            {isOutOfStock ? (
                              <span className="text-xs font-bold text-rose-400 px-2 py-0.5 rounded bg-rose-950/60 border border-rose-800/50">
                                OUT OF STOCK
                              </span>
                            ) : isLowStock ? (
                              <span className="text-xs font-bold text-amber-400 px-2 py-0.5 rounded bg-amber-950/60 border border-amber-800/50">
                                {product.stock} (LOW)
                              </span>
                            ) : (
                              <span className="text-xs font-bold text-emerald-400">
                                {product.stock} units
                              </span>
                            )}
                          </div>

                          {/* Delivery SLA */}
                          <div className="hidden sm:flex flex-col items-end">
                            <span className="text-[11px] text-slate-400 font-medium">SLA</span>
                            <span className="text-slate-200 text-xs font-semibold">{product.deliveryDays}d</span>
                          </div>


                          {/* Actions */}
                          <div className="flex items-center gap-1 pl-2 border-l border-slate-800">
                            <button
                              onClick={() => handleToggleProductActive(product)}
                              title={product.active ? "Deactivate Product" : "Activate Product"}
                              className={`p-1.5 rounded-lg border transition-colors ${
                                product.active
                                  ? "bg-slate-900 border-slate-800 text-emerald-400 hover:bg-slate-800"
                                  : "bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300"
                              }`}
                            >
                              <Zap className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => {
                                setEditingProduct(product);
                                setIsModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg bg-blue-950/40 border border-blue-800/50 text-blue-400 hover:bg-blue-900/60 transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    </SpotlightCard>

                  );
                })}
              </div>
            )}
          </SectionCard>
        </div>

        {/* Right 5 Columns: Merchant Governance Policies Form */}
        <div className="lg:col-span-5 space-y-4">
          <SectionCard
            title="AI AGENT GOVERNANCE POLICIES"
            subtitle="Deterministic commercial boundaries enforced by PACT Firewall"
            badge={
              <StatusBadge
                status={hasUnsavedPolicyChanges ? "validating" : "validated"}
                label={hasUnsavedPolicyChanges ? "UNSAVED CHANGES" : "FIREWALL SYNCED"}
              />
            }
          >
            <form onSubmit={handleSavePolicies} className="space-y-4">
              {policyError && (
                <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/50 text-xs text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{policyError}</span>
                </div>
              )}

              {/* Group 1: Discount Governance Card */}
              <SpotlightCard
                spotlightColor="rgba(56, 189, 248, 0.15)"
                className="bg-slate-950/80 border border-slate-800 p-0 rounded-xl"
              >
                <div className="p-3.5 space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-800/60">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
                    <h3 className="text-xs font-mono font-bold text-slate-200">1. DISCOUNT GOVERNANCE</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-slate-400 uppercase">Max Discount Cap (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={policyForm.maxDiscountPercent}
                        onChange={(e) => setPolicyForm({ ...policyForm, maxDiscountPercent: Number(e.target.value) })}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-slate-400 uppercase">Min Margin Floor (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={policyForm.minimumMarginPercent}
                        onChange={(e) => setPolicyForm({ ...policyForm, minimumMarginPercent: Number(e.target.value) })}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </SpotlightCard>

              {/* Group 2: Transaction Governance Card */}
              <SpotlightCard
                spotlightColor="rgba(34, 197, 94, 0.15)"
                className="bg-slate-950/80 border border-slate-800 p-0 rounded-xl"
              >
                <div className="p-3.5 space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-800/60">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <h3 className="text-xs font-mono font-bold text-slate-200">2. TRANSACTION GOVERNANCE</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-slate-400 uppercase">Auto Approval Limit (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={policyForm.maxAutoTransactionAmount}
                        onChange={(e) => setPolicyForm({ ...policyForm, maxAutoTransactionAmount: Number(e.target.value) })}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-slate-400 uppercase">Human Approval Above (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={policyForm.approvalRequiredAbove}
                        onChange={(e) => setPolicyForm({ ...policyForm, approvalRequiredAbove: Number(e.target.value) })}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </SpotlightCard>

              {/* Group 3: Inventory Strategy Card */}
              <SpotlightCard
                spotlightColor="rgba(168, 85, 247, 0.15)"
                className="bg-slate-950/80 border border-slate-800 p-0 rounded-xl"
              >
                <div className="p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <h3 className="text-xs font-mono font-bold text-slate-200">3. INVENTORY STRATEGY</h3>
                      <p className="text-[10px] text-slate-400">Allow extra discount flexibility on high/slow inventory</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPolicyForm({ ...policyForm, allowSlowMovingInventoryDiscount: !policyForm.allowSlowMovingInventoryDiscount })}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        policyForm.allowSlowMovingInventoryDiscount ? "bg-emerald-500" : "bg-slate-700"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          policyForm.allowSlowMovingInventoryDiscount ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </SpotlightCard>


              {/* Firewall Policy Guard Explainer */}
              <div className="p-3 rounded-lg bg-blue-950/30 border border-blue-800/40 flex items-start gap-2.5 text-[11px] text-slate-400">
                <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <span>
                  These policies will be deterministically enforced by the <strong>PACT Firewall</strong> before any transaction moves to Razorpay.
                </span>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={policySaving || !hasUnsavedPolicyChanges}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-mono font-semibold hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-950/50"
                >
                  {policySaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      SAVING TO FIRESTORE...
                    </>
                  ) : policySuccess ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-300" />
                      GOVERNANCE POLICIES PERSISTED!
                    </>
                  ) : hasUnsavedPolicyChanges ? (
                    "SAVE POLICIES TO FIRESTORE"
                  ) : (
                    "POLICIES FIRESTORE SYNCED"
                  )}
                </button>
              </div>
            </form>
          </SectionCard>
        </div>
      </div>

      {/* Product Edit Side Modal */}
      <ProductEditModal
        product={editingProduct}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingProduct(null);
        }}
        onSaved={(updated) => {
          setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        }}
      />
    </PageContainer>
  );
}



