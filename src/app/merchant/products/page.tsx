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
  Edit3, 
  Check, 
  XCircle, 
  Truck, 
  Layers, 
  AlertCircle 
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getMerchantProducts, saveProduct } from "@/services/firestore";
import { DEMO_MERCHANT_ID } from "@/services/seed";
import { Product } from "@/types";

export default function MerchantProductsPage() {
  const { merchantId: authMerchantId } = useAuth();
  const merchantId = authMerchantId || DEMO_MERCHANT_ID;

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const prods = await getMerchantProducts(merchantId);
      setProducts(prods);
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

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQ = !q || p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q);
      const matchC = selectedCategory === "ALL" || p.category === selectedCategory;
      return matchQ && matchC;
    });
  }, [products, searchQuery, selectedCategory]);

  const handleToggleActive = async (p: Product) => {
    const updated = { ...p, active: !p.active, updatedAt: new Date().toISOString() };
    setProducts((prev) => prev.map((item) => (item.id === p.id ? updated : item)));
    await saveProduct(updated);
  };

  return (
    <PageContainer>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="CATALOG MANAGEMENT"
          description="Maintain products and real-time inventory available for autonomous AI Buyer negotiation."
          badge={<StatusBadge status="active" label={`${products.length} PRODUCTS IN CATALOG`} />}
        />

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
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold transition-all shadow-lg flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>ADD NEW PRODUCT</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 font-mono text-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                selectedCategory === cat
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 font-mono">
        {loading ? (
          <div className="col-span-full p-12 text-center text-xs text-slate-500">
            Loading merchant catalog...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="col-span-full p-16 rounded-3xl bg-slate-950/80 border border-dashed border-slate-800 text-center space-y-2">
            <Package className="w-8 h-8 text-slate-500 mx-auto" />
            <h3 className="text-sm font-bold text-slate-300">No Products Found</h3>
            <p className="text-xs text-slate-500 font-sans">
              Add your first product to allow AI Buyers to discover and negotiate for your inventory.
            </p>
          </div>
        ) : (
          filteredProducts.map((product) => (
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
                    product.stock > 5 ? "bg-emerald-950 text-emerald-400 border-emerald-800/80" : "bg-amber-950 text-amber-400 border-amber-800/80"
                  }`}>
                    {product.stock} in stock
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
                      ₹{product.price.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="text-right text-[11px] text-slate-400 flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5 text-blue-400" />
                    <span>{product.deliveryDays}d SLA</span>
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
          ))
        )}
      </div>

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
