"use client";

import React, { useEffect, useState, useMemo } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ProductEditModal } from "@/components/ui/ProductEditModal";
import SpotlightCard from "@/components/SpotlightCard";
import { 
  Package, 
  Search, 
  Plus, 
  Minus,
  Edit3, 
  Check, 
  Truck, 
  Layers, 
  AlertCircle,
  Boxes,
  RefreshCw,
  SlidersHorizontal,
  LayoutGrid,
  List
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getMerchantProducts, saveProduct } from "@/services/firestore";
import { DEMO_MERCHANT_ID } from "@/services/seed";
import { Product } from "@/types";
import { CountUp } from "@/components/CountUp";

export default function MerchantProductsPage() {
  const { merchantId: authMerchantId } = useAuth();
  const merchantId = authMerchantId || DEMO_MERCHANT_ID;

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [stockFilter, setStockFilter] = useState<"ALL" | "HEALTHY" | "LOW" | "OUT">("ALL");
  const [viewMode, setViewMode] = useState<"GRID" | "TABLE">("GRID");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Quick Stock Adjustment Tracking
  const [stockUpdates, setStockUpdates] = useState<Record<string, number | "">>({});
  const [savingStockId, setSavingStockId] = useState<string | null>(null);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const prods = await getMerchantProducts(merchantId);
      setProducts(prods);
      const initialStock: Record<string, number> = {};
      prods.forEach((p) => {
        initialStock[p.id] = p.stock;
      });
      setStockUpdates(initialStock);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [merchantId]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ["ALL", ...Array.from(set)];
  }, [products]);

  // Inventory Health Metrics
  const healthyStockCount = useMemo(() => products.filter((p) => p.stock >= 5).length, [products]);
  const lowStockCount = useMemo(() => products.filter((p) => p.stock > 0 && p.stock < 5).length, [products]);
  const outOfStockCount = useMemo(() => products.filter((p) => p.stock === 0).length, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQ = !q || p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q);
      const matchC = selectedCategory === "ALL" || p.category === selectedCategory;
      
      let matchS = true;
      if (stockFilter === "HEALTHY") matchS = p.stock >= 5;
      else if (stockFilter === "LOW") matchS = p.stock > 0 && p.stock < 5;
      else if (stockFilter === "OUT") matchS = p.stock === 0;

      return matchQ && matchC && matchS;
    });
  }, [products, searchQuery, selectedCategory, stockFilter]);

  const handleToggleActive = async (p: Product) => {
    const updated = { ...p, active: !p.active, updatedAt: new Date().toISOString() };
    setProducts((prev) => prev.map((item) => (item.id === p.id ? updated : item)));
    await saveProduct(updated);
  };

  const handleStockDelta = (productId: string, delta: number) => {
    setStockUpdates((prev) => {
      const current = typeof prev[productId] === "number" ? (prev[productId] as number) : 0;
      return {
        ...prev,
        [productId]: Math.max(0, current + delta),
      };
    });
  };

  const handleSaveStock = async (product: Product) => {
    const newStockRaw = stockUpdates[product.id];
    const newStock = typeof newStockRaw === "number" ? newStockRaw : product.stock;
    setSavingStockId(product.id);
    try {
      const updated = {
        ...product,
        stock: newStock,
        updatedAt: new Date().toISOString(),
      };
      await saveProduct(updated);
      setProducts((prev) => prev.map((p) => (p.id === product.id ? updated : p)));
    } catch (err) {
      console.error("Failed to save stock:", err);
    } finally {
      setSavingStockId(null);
    }
  };

  return (
    <PageContainer>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <PageHeader
          title="CATALOG & INVENTORY MANAGEMENT"
          description="Maintain products, price points, and real-time inventory stock available for autonomous AI Buyer negotiations."
          badge={
            <StatusBadge
              status="active"
              label={
                <span className="flex items-center gap-1">
                  <CountUp to={products.length} /> PRODUCTS IN STORE
                </span>
              }
            />
          }
        />

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setEditingProduct({
                id: `prod_${Date.now()}`,
                merchantId,
                name: "",
                description: "",
                category: "General",
                price: 1000,
                stock: 10,
                attributes: {},
                deliveryDays: 3,
                active: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
              setIsModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-blue-950/50 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>ADD PRODUCT</span>
          </button>
        </div>
      </div>

      {/* 📦 INVENTORY HEALTH SUMMARY CARDS (Integrated directly into Products) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
        <SpotlightCard
          spotlightColor="rgba(16, 185, 129, 0.2)"
          className={`bg-slate-950/80 border p-5 rounded-2xl cursor-pointer transition-all ${
            stockFilter === "HEALTHY" ? "border-emerald-500 ring-1 ring-emerald-500/30" : "border-slate-800 hover:border-slate-700"
          }`}
        >
          <div onClick={() => setStockFilter(stockFilter === "HEALTHY" ? "ALL" : "HEALTHY")} className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">HEALTHY STOCK (≥ 5)</span>
            <p className="text-2xl font-black text-emerald-400"><CountUp to={healthyStockCount} suffix=" Items" /></p>
          </div>
        </SpotlightCard>

        <SpotlightCard
          spotlightColor="rgba(245, 158, 11, 0.2)"
          className={`bg-slate-950/80 border p-5 rounded-2xl cursor-pointer transition-all ${
            stockFilter === "LOW" ? "border-amber-500 ring-1 ring-amber-500/30" : "border-slate-800 hover:border-slate-700"
          }`}
        >
          <div onClick={() => setStockFilter(stockFilter === "LOW" ? "ALL" : "LOW")} className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">LOW STOCK (&lt; 5)</span>
            <p className="text-2xl font-black text-amber-400"><CountUp to={lowStockCount} suffix=" Items" /></p>
          </div>
        </SpotlightCard>

        <SpotlightCard
          spotlightColor="rgba(244, 63, 94, 0.2)"
          className={`bg-slate-950/80 border p-5 rounded-2xl cursor-pointer transition-all ${
            stockFilter === "OUT" ? "border-rose-500 ring-1 ring-rose-500/30" : "border-slate-800 hover:border-slate-700"
          }`}
        >
          <div onClick={() => setStockFilter(stockFilter === "OUT" ? "ALL" : "OUT")} className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">OUT OF STOCK (0)</span>
            <p className="text-2xl font-black text-rose-400"><CountUp to={outOfStockCount} suffix=" Items" /></p>
          </div>
        </SpotlightCard>
      </div>

      {/* Filter and View Mode Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-slate-950/80 border border-slate-800 font-mono text-xs">
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="Search catalog items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setSelectedCategory(c)}
                className={`px-3 py-1 rounded-lg border text-xs transition-colors cursor-pointer whitespace-nowrap ${
                  selectedCategory === c
                    ? "bg-blue-600 border-blue-500 text-white font-bold"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-900 border border-slate-800 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode("GRID")}
              className={`p-1.5 rounded ${viewMode === "GRID" ? "bg-slate-800 text-blue-400" : "text-slate-500 hover:text-slate-300"}`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("TABLE")}
              className={`p-1.5 rounded ${viewMode === "TABLE" ? "bg-slate-800 text-blue-400" : "text-slate-500 hover:text-slate-300"}`}
              title="Table & Fast Inventory Mode"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Products Grid / Fast Inventory Table */}
      {loading ? (
        <div className="p-16 rounded-3xl bg-slate-950/80 border border-slate-800 text-center font-mono text-xs text-slate-400">
          Loading catalog & real-time inventory from Firestore...
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="p-16 rounded-3xl bg-slate-950/80 border border-dashed border-slate-800 text-center space-y-3 font-mono">
          <Package className="w-8 h-8 text-slate-500 mx-auto" />
          <h3 className="text-sm font-bold text-slate-300">No Products Found</h3>
          <p className="text-xs text-slate-500 font-sans">
            No items matched your search query or inventory filter.
          </p>
        </div>
      ) : viewMode === "TABLE" ? (
        /* 📋 FAST INVENTORY TABLE VIEW */
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 overflow-hidden font-mono text-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 text-[11px]">
                <th className="p-3.5 font-bold">PRODUCT</th>
                <th className="p-3.5 font-bold">CATEGORY</th>
                <th className="p-3.5 font-bold">PRICE</th>
                <th className="p-3.5 font-bold">INVENTORY STOCK</th>
                <th className="p-3.5 font-bold">SLA</th>
                <th className="p-3.5 font-bold text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredProducts.map((p) => {
                const currentStockVal = stockUpdates[p.id] ?? p.stock;
                const isChanged = currentStockVal !== p.stock;

                return (
                  <tr key={p.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="p-3.5">
                      <div className="font-bold text-slate-100">{p.name}</div>
                      <div className="text-[10px] text-slate-500">{p.id}</div>
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-400">
                        {p.category}
                      </span>
                    </td>
                    <td className="p-3.5 font-bold text-slate-200">
                      <CountUp to={p.price} prefix="₹" />
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleStockDelta(p.id, -1)}
                          className="w-6 h-6 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 flex items-center justify-center cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={stockUpdates[p.id] !== undefined ? stockUpdates[p.id] : p.stock}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "") {
                              setStockUpdates((prev) => ({ ...prev, [p.id]: "" }));
                            } else if (/^\d+$/.test(val)) {
                              setStockUpdates((prev) => ({ ...prev, [p.id]: parseInt(val, 10) }));
                            }
                          }}
                          className="w-16 px-2 py-1 rounded bg-slate-900 border border-slate-800 text-center text-xs font-bold text-slate-100 focus:outline-none focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleStockDelta(p.id, 1)}
                          className="w-6 h-6 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 flex items-center justify-center cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>

                        {isChanged && (
                          <button
                            type="button"
                            onClick={() => handleSaveStock(p)}
                            disabled={savingStockId === p.id}
                            className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Check className="w-3 h-3" />
                            <span>SAVE</span>
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="p-3.5 text-slate-400">
                      <CountUp to={p.deliveryDays} suffix="d" />
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(p)}
                          className={`text-[10px] px-2 py-0.5 rounded border font-bold ${
                            p.active
                              ? "bg-emerald-950 border-emerald-800 text-emerald-300"
                              : "bg-slate-900 border-slate-800 text-slate-500"
                          }`}
                        >
                          {p.active ? "ACTIVE" : "INACTIVE"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingProduct(p);
                            setIsModalOpen(true);
                          }}
                          className="p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-blue-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* 🎴 GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 font-mono">
          {filteredProducts.map((product) => (
            <SpotlightCard
              key={product.id}
              spotlightColor="rgba(59, 130, 246, 0.15)"
              className="bg-slate-950/90 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                    {product.category}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${
                    product.stock >= 5
                      ? "bg-emerald-950 text-emerald-400 border-emerald-800/80"
                      : product.stock > 0
                      ? "bg-amber-950 text-amber-400 border-amber-800/80"
                      : "bg-rose-950 text-rose-400 border-rose-800/80"
                  }`}>
                    <CountUp to={product.stock} suffix=" in stock" />
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-slate-100 font-sans text-sm line-clamp-1">{product.name}</h3>
                  <p className="text-xs text-slate-400 font-sans line-clamp-2 leading-relaxed mt-1">
                    {product.description}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block">BASE PRICE</span>
                    <span className="text-base font-black text-slate-100">
                      <CountUp to={product.price} prefix="₹" />
                    </span>
                  </div>
                  <div className="text-right text-[11px] text-slate-400 flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5 text-blue-400" />
                    <span><CountUp to={product.deliveryDays} suffix="d SLA" /></span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/40">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(product)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border font-bold transition-colors cursor-pointer ${
                      product.active
                        ? "bg-emerald-950/60 border-emerald-800 text-emerald-400 hover:bg-emerald-900/60"
                        : "bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {product.active ? "ACTIVE" : "INACTIVE"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingProduct(product);
                      setIsModalOpen(true);
                    }}
                    className="px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-blue-400" />
                    <span>EDIT</span>
                  </button>
                </div>
              </div>
            </SpotlightCard>
          ))}
        </div>
      )}

      {isModalOpen && editingProduct && (
        <ProductEditModal
          product={editingProduct}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingProduct(null);
          }}
          onSaved={async () => {
            setIsModalOpen(false);
            setEditingProduct(null);
            fetchProducts();
          }}
        />
      )}
    </PageContainer>
  );
}
