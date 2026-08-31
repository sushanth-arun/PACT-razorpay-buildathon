"use client";

import React, { useEffect, useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import SpotlightCard from "@/components/SpotlightCard";
import { Magnet } from "@/components/Magnet";
import { 
  Sliders, 
  Percent, 
  ShieldCheck, 
  Check, 
  AlertCircle, 
  Loader2, 
  Info,
  DollarSign
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getMerchant, updateMerchantPolicies } from "@/services/firestore";
import { DEMO_MERCHANT_ID } from "@/services/seed";
import { Merchant } from "@/types";

export default function MerchantPoliciesPage() {
  const { merchantId: authMerchantId } = useAuth();
  const merchantId = authMerchantId || DEMO_MERCHANT_ID;

  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    maxDiscountPercent: 15,
    minimumMarginPercent: 20,
    maxAutoTransactionAmount: 50000,
    approvalRequiredAbove: 50000,
    allowSlowMovingInventoryDiscount: true,
  });

  useEffect(() => {
    async function loadPolicies() {
      try {
        setLoading(true);
        const m = await getMerchant(merchantId);
        if (m) {
          setMerchant(m);
          setForm({
            maxDiscountPercent: m.maxDiscountPercent ?? 15,
            minimumMarginPercent: m.minimumMarginPercent ?? 20,
            maxAutoTransactionAmount: m.maxAutoTransactionAmount ?? 50000,
            approvalRequiredAbove: m.approvalRequiredAbove ?? 50000,
            allowSlowMovingInventoryDiscount: m.allowSlowMovingInventoryDiscount ?? true,
          });
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load policies");
      } finally {
        setLoading(false);
      }
    }
    loadPolicies();
  }, [merchantId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await updateMerchantPolicies(merchantId, {
        maxDiscountPercent: Number(form.maxDiscountPercent),
        minimumMarginPercent: Number(form.minimumMarginPercent),
        maxAutoTransactionAmount: Number(form.maxAutoTransactionAmount),
        approvalRequiredAbove: Number(form.approvalRequiredAbove),
        allowSlowMovingInventoryDiscount: form.allowSlowMovingInventoryDiscount,
        slowMovingInventoryFlexibility: form.allowSlowMovingInventoryDiscount,
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save policies");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="COMMERCIAL AGENT POLICIES"
        description="Define strict mathematical boundaries and governance limits within which your Merchant Agent negotiates."
        badge={<StatusBadge status="active" label="PACT FIREWALL ENFORCED" />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-mono text-xs items-start">
        {/* Left 7 Columns: Interactive Policy Controls */}
        <div className="lg:col-span-7 space-y-5">
          <SpotlightCard
            spotlightColor="rgba(245, 158, 11, 0.15)"
            className="bg-slate-950/90 border border-slate-800 p-6 rounded-3xl space-y-5"
          >
            <form onSubmit={handleSave} className="space-y-6">
              {/* Max Discount Percent */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-200 font-bold uppercase flex items-center gap-2">
                    <Percent className="w-3.5 h-3.5 text-amber-400" />
                    <span>Maximum Negotiated Discount</span>
                  </label>
                  <span className="text-sm font-black text-amber-400">{form.maxDiscountPercent}% Cap</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={40}
                  step={1}
                  value={form.maxDiscountPercent}
                  onChange={(e) => setForm({ ...form, maxDiscountPercent: Number(e.target.value) })}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
                <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                  Your Merchant Agent will never propose or accept discounts above this threshold. PACT Firewall automatically blocks deals that exceed this limit.
                </p>
              </div>

              {/* Minimum Margin Percent */}
              <div className="space-y-2 pt-4 border-t border-slate-800/80">
                <div className="flex items-center justify-between">
                  <label className="text-slate-200 font-bold uppercase flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Minimum Profit Margin</span>
                  </label>
                  <span className="text-sm font-black text-emerald-400">{form.minimumMarginPercent}% Min</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={50}
                  step={1}
                  value={form.minimumMarginPercent}
                  onChange={(e) => setForm({ ...form, minimumMarginPercent: Number(e.target.value) })}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                  Protects unit economics. Deals yielding margins below this percentage are rejected during Deal Compilation.
                </p>
              </div>

              {/* Auto Transaction Limit */}
              <div className="space-y-2 pt-4 border-t border-slate-800/80">
                <div className="flex items-center justify-between">
                  <label className="text-slate-200 font-bold uppercase flex items-center gap-2">
                    <DollarSign className="w-3.5 h-3.5 text-blue-400" />
                    <span>Autonomous Settlement Cap</span>
                  </label>
                  <span className="text-sm font-black text-blue-400">
                    ₹{form.maxAutoTransactionAmount.toLocaleString("en-IN")}
                  </span>
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.maxAutoTransactionAmount === 0 ? "" : form.maxAutoTransactionAmount}
                  placeholder="0"
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "") {
                      setForm({ ...form, maxAutoTransactionAmount: 0 });
                    } else if (/^\d+$/.test(val)) {
                      setForm({ ...form, maxAutoTransactionAmount: parseInt(val, 10) });
                    }
                  }}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 font-bold focus:outline-none focus:border-blue-500"
                />
                <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                  Maximum monetary value allowed for instant autonomous settlement without human manual approval.
                </p>
              </div>

              {/* Slow Moving Inventory Flexibility */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-800/80">
                <div className="space-y-1">
                  <span className="text-slate-200 font-bold uppercase block">
                    Slow-Moving Inventory Flexibility
                  </span>
                  <p className="text-[11px] text-slate-400 font-sans max-w-sm">
                    Allow agent to prioritize bundle discounts on high-stock or slower moving items.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={form.allowSlowMovingInventoryDiscount}
                  onChange={(e) =>
                    setForm({ ...form, allowSlowMovingInventoryDiscount: e.target.checked })
                  }
                  className="w-5 h-5 rounded bg-slate-900 border-slate-800 accent-blue-600 cursor-pointer"
                />
              </div>

              {/* Save CTA */}
              <div className="pt-4 border-t border-slate-800">
                {error && (
                  <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2 mb-3">
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                    <span>{error}</span>
                  </div>
                )}

                {success && (
                  <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2 mb-3">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Policies synced to PACT Firewall & Firestore.</span>
                  </div>
                )}

                <Magnet strength={8} className="w-full">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-mono text-xs font-bold transition-all shadow-xl shadow-blue-950/60 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>UPDATING PACT FIREWALL RULES...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>PERSIST AGENT POLICIES</span>
                      </>
                    )}
                  </button>
                </Magnet>
              </div>
            </form>
          </SpotlightCard>
        </div>

        {/* Right 5 Columns: Conceptual Education & Agent Trace */}
        <div className="lg:col-span-5 space-y-4">
          <SpotlightCard
            spotlightColor="rgba(56, 189, 248, 0.15)"
            className="bg-slate-950/90 border border-slate-800 p-6 rounded-3xl space-y-4"
          >
            <div className="flex items-center gap-2 text-blue-400 font-bold border-b border-slate-800 pb-3">
              <Info className="w-4 h-4" />
              <span>HOW PACT POLICY GATES WORK</span>
            </div>

            <div className="space-y-3 font-sans text-xs text-slate-300 leading-relaxed">
              <p>
                1. <strong>Autonomous Reasoning:</strong> Your Merchant Agent reasons dynamically over buyer requests, but can NEVER breach the maximum discount slider.
              </p>
              <p>
                2. <strong>Deterministic Firewall:</strong> Before any Razorpay checkout is generated, PACT Firewall tests the deal against these live database rules.
              </p>
              <p>
                3. <strong>Immutable Audit:</strong> Any deal attempting to breach your policy is permanently logged with an explicit REJECTED decision event.
              </p>
            </div>
          </SpotlightCard>
        </div>
      </div>
    </PageContainer>
  );
}
