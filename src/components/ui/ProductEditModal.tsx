"use client";

import React, { useState, useEffect } from "react";
import { Product } from "@/types";
import { saveProduct } from "@/services/firestore";
import { X, Check, Loader2, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ProductEditModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (updatedProduct: Product) => void;
}

export const ProductEditModal: React.FC<ProductEditModalProps> = ({
  product,
  isOpen,
  onClose,
  onSaved,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState<number>(0);
  const [stock, setStock] = useState<number>(0);
  const [deliveryDays, setDeliveryDays] = useState<number>(1);
  const [active, setActive] = useState<boolean>(true);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (product) {
      setName(product.name);
      setDescription(product.description || "");
      setCategory(product.category || "");
      setPrice(product.price);
      setStock(product.stock);
      setDeliveryDays(product.deliveryDays);
      setActive(product.active);
      setError(null);
      setSuccess(false);
    }
  }, [product]);

  if (!isOpen || !product) return null;

  // Validation Rules
  const errors: Record<string, string> = {};
  if (!name.trim()) errors.name = "Product name is required.";
  if (!category.trim()) errors.category = "Category is required.";
  if (isNaN(price) || price < 0) errors.price = "Price must be >= 0.";
  if (isNaN(stock) || stock < 0) errors.stock = "Stock must be >= 0.";
  if (isNaN(deliveryDays) || deliveryDays <= 0) errors.deliveryDays = "Delivery SLA must be > 0 days.";

  const isValid = Object.keys(errors).length === 0;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setIsSaving(true);
    setError(null);
    setSuccess(false);

    const updated: Product = {
      ...product,
      name: name.trim(),
      description: description.trim(),
      category: category.trim(),
      price: Number(price),
      stock: Number(stock),
      deliveryDays: Number(deliveryDays),
      active,
      updatedAt: new Date().toISOString(),
    };

    try {
      await saveProduct(updated);
      setSuccess(true);
      setTimeout(() => {
        onSaved(updated);
        onClose();
      }, 600);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to persist product to Firestore";
      setError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/70 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 100 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto"
        >
          {/* Modal Header */}
          <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
            <div>
              <span className="text-[10px] font-mono text-blue-400 font-bold uppercase tracking-wider">EDIT CATALOG ITEM</span>
              <h2 className="text-base font-bold text-slate-100 font-mono">{product.name}</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSave} className="p-5 space-y-4 flex-1">
            {error && (
              <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/50 text-xs text-rose-300 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Product Name */}
            <div className="space-y-1">
              <label className="text-xs font-mono font-medium text-slate-300">Product Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
              />
              {errors.name && <p className="text-[10px] text-rose-400 font-mono">{errors.name}</p>}
            </div>

            {/* Category */}
            <div className="space-y-1">
              <label className="text-xs font-mono font-medium text-slate-300">Category *</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
              />
              {errors.category && <p className="text-[10px] text-rose-400 font-mono">{errors.category}</p>}
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="text-xs font-mono font-medium text-slate-300">Description</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Numeric Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-slate-300">Price (₹) *</label>
                <input
                  type="number"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 focus:outline-none focus:border-blue-500"
                />
                {errors.price && <p className="text-[9px] text-rose-400 font-mono">{errors.price}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-mono text-slate-300">Stock Qty *</label>
                <input
                  type="number"
                  min="0"
                  value={stock}
                  onChange={(e) => setStock(parseInt(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 focus:outline-none focus:border-blue-500"
                />
                {errors.stock && <p className="text-[9px] text-rose-400 font-mono">{errors.stock}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-mono text-slate-300">Delivery (Days) *</label>
                <input
                  type="number"
                  min="1"
                  value={deliveryDays}
                  onChange={(e) => setDeliveryDays(parseInt(e.target.value) || 1)}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 focus:outline-none focus:border-blue-500"
                />
                {errors.deliveryDays && <p className="text-[9px] text-rose-400 font-mono">{errors.deliveryDays}</p>}
              </div>
            </div>

            {/* Active Toggle */}
            <div className="pt-2 flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="space-y-0.5">
                <span className="text-xs font-mono font-medium text-slate-200">Catalog Visibility</span>
                <p className="text-[10px] text-slate-500">Expose product to Buyer AI & Merchant Agent</p>
              </div>
              <button
                type="button"
                onClick={() => setActive(!active)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  active ? "bg-emerald-500" : "bg-slate-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    active ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-mono hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!isValid || isSaving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-mono font-semibold hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    PERSISTING TO FIRESTORE...
                  </>
                ) : success ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    PERSISTED!
                  </>
                ) : (
                  "SAVE CHANGES"
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};


