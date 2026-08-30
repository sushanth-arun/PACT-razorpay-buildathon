"use client";

import React, { useEffect, useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import SpotlightCard from "@/components/SpotlightCard";
import { 
  Boxes, 
  Plus, 
  Minus, 
  Check, 
  AlertTriangle, 
  RefreshCw, 
  Search,
  Package
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getMerchantProducts, saveProduct } from "@/services/firestore";
import { DEMO_MERCHANT_ID } from "@/services/seed";
import { Product } from "@/types";

export default function MerchantInventoryPage() {
  const { merchantId: authMerchantId } = useAuth();
  const merchantId = authMerchantId || DEMO_MERCHANT_ID;

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [stockUpdates, setStockUpdates] = useState<Record<string, number>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

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
    } catch (err) {
      console.error("Failed to load inventory:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [merchantId]);

  const handleStockChange = (productId: string, delta: number) => {
    setStockUpdates((prev) => ({
      ...prev,
      [productId]: Math.max(0, (prev[productId] ?? 0) + delta),
    }));
  };

  const handleSaveStock = async (product: Product) => {
    const newStock = stockUpdates[product.id] ?? product.stock;
    setSavingId(product.id);
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
      setSavingId(null);
    }
  };

  const filteredProducts = products.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    return !q || p.name.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q);
  });

  const healthyStockCount = products.filter((p) => p.stock >= 5).length;
  const lowStockCount = products.filter((p) => p.stock > 0 && p.stock < 5).length;
  const outOfStockCount = products.filter((p) => p.stock === 0).length;

  return (
    <PageContainer>
      <PageHeader
        title="INVENTORY OPERATIONS"
        description="Monitor healthy stock levels, restock items, and prevent overselling during AI Buyer negotiations."
        badge={<StatusBadge status="active" label="REAL-TIME FIRESTORE INVENTORY" />}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
        <SpotlightCard
          spotlightColor="rgba(16, 185, 129, 0.2)"
          className="bg-slate-950/80 border border-slate-800 p-5 rounded-2xl"
        >
          <span className="text-slate-400 font-bold uppercase text-[11px]">HEALTHY STOCK</span>
          <p className="text-2xl font-black text-emerald-400 mt-1">{healthyStockCount} Items</p>
        </SpotlightCard>

        <SpotlightCard
          spotlightColor="rgba(245, 158, 11, 0.2)"
          className="bg-slate-950/80 border border-slate-800 p-5 rounded-2xl"
        >
          <span className="text-slate-400 font-bold uppercase text-[11px]">LOW STOCK (&lt; 5)</span>
          <p className="text-2xl font-black text-amber-400 mt-1">{lowStockCount} Items</p>
        </SpotlightCard>

        <SpotlightCard
          spotlightColor="rgba(244, 63, 94, 0.2)"
          className="bg-slate-950/80 border border-slate-800 p-5 rounded-2xl"
        >
          <span className="text-slate-400 font-bold uppercase text-[11px]">OUT OF STOCK</span>
          <p className="text-2xl font-black text-rose-400 mt-1">{outOfStockCount} Items</p>
        </SpotlightCard>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 font-mono text-xs">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="Search inventory items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
        </div>
      </div>

      {/* Inventory Table */}
      <SpotlightCard
        spotlightColor="rgba(59, 130, 246, 0.15)"
        className="bg-slate-950/90 border border-slate-800 p-0 rounded-2xl font-mono text-xs overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 font-bold">
                <th className="py-3.5 px-4 uppercase">Product</th>
                <th className="py-3.5 px-4 uppercase">Category</th>
                <th className="py-3.5 px-4 uppercase">Base Price</th>
                <th className="py-3.5 px-4 uppercase">Current Stock</th>
                <th className="py-3.5 px-4 uppercase text-right">Quick Restock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    Loading stock records...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    No products found matching query.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const currentInputStock = stockUpdates[p.id] ?? p.stock;
                  const hasChanged = currentInputStock !== p.stock;
                  const isSaving = savingId === p.id;

                  return (
                    <tr key={p.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-4 px-4">
                        <span className="font-bold text-slate-100 font-sans block">{p.name}</span>
                        <span className="text-[10px] text-slate-500">{p.id}</span>
                      </td>
                      <td className="py-4 px-4 text-slate-300">{p.category}</td>
                      <td className="py-4 px-4 font-bold text-slate-200">
                        ₹{p.price.toLocaleString("en-IN")}
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`px-2 py-0.5 rounded border text-[11px] font-bold ${
                            p.stock >= 5
                              ? "bg-emerald-950/80 border-emerald-800 text-emerald-400"
                              : p.stock > 0
                              ? "bg-amber-950/80 border-amber-800 text-amber-400"
                              : "bg-rose-950/80 border-rose-800 text-rose-400"
                          }`}
                        >
                          {p.stock} units
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleStockChange(p.id, -1)}
                            className="w-7 h-7 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 flex items-center justify-center text-slate-300 font-bold cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <input
                            type="number"
                            value={currentInputStock}
                            onChange={(e) =>
                              setStockUpdates((prev) => ({
                                ...prev,
                                [p.id]: Math.max(0, parseInt(e.target.value) || 0),
                              }))
                            }
                            className="w-16 px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-center text-slate-100 font-bold focus:outline-none focus:border-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleStockChange(p.id, 5)}
                            className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-blue-400 font-bold cursor-pointer"
                          >
                            +5
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveStock(p)}
                            disabled={!hasChanged || isSaving}
                            className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                              hasChanged
                                ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md"
                                : "bg-slate-900 border border-slate-800 text-slate-600 cursor-not-allowed"
                            }`}
                          >
                            {isSaving ? "SAVING..." : "APPLY"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </SpotlightCard>
    </PageContainer>
  );
}
