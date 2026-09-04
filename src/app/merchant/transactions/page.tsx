"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import SpotlightCard from "@/components/SpotlightCard";
import { 
  Receipt, 
  Store, 
  History, 
  ExternalLink,
  ShieldCheck, 
  CreditCard,
  Clock,
  ChevronDown,
  ChevronUp,
  Package
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { DEMO_MERCHANT_ID } from "@/services/seed";
import { TransactionRecord } from "@/types";
import { CountUp } from "@/components/CountUp";

export default function MerchantTransactionsPage() {
  const { merchantId: authMerchantId } = useAuth();
  const merchantId = authMerchantId || DEMO_MERCHANT_ID;

  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    async function loadMerchantTransactions() {
      try {
        setLoading(true);
        const res = await fetch(`/api/transactions?merchantId=${encodeURIComponent(merchantId)}&scope=merchant`);
        const data = await res.json();
        if (data.success && Array.isArray(data.transactions)) {
          setTransactions(data.transactions);
        }
      } catch (err) {
        console.error("Failed to load merchant transactions:", err);
      } finally {
        setLoading(false);
      }
    }
    loadMerchantTransactions();
  }, [merchantId]);

  return (
    <PageContainer>
      <PageHeader
        title="MERCHANT SETTLEMENT TRANSACTIONS"
        description="Live stream of orders negotiated by your Merchant Agent and settled into your Razorpay account."
        badge={
          <StatusBadge
            status="active"
            label={
              <span className="flex items-center gap-1">
                <CountUp to={transactions.length} /> STORE ORDERS
              </span>
            }
          />
        }
      />

      <SpotlightCard
        spotlightColor="rgba(16, 185, 129, 0.15)"
        className="bg-slate-950/90 border border-slate-800 p-0 rounded-2xl font-mono text-xs overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 font-bold">
                <th className="py-3.5 px-4 uppercase">Deal Reference</th>
                <th className="py-3.5 px-4 uppercase">Items</th>
                <th className="py-3.5 px-4 uppercase">Gross Value</th>
                <th className="py-3.5 px-4 uppercase">Discount</th>
                <th className="py-3.5 px-4 uppercase">Settled Total</th>
                <th className="py-3.5 px-4 uppercase">Status</th>
                <th className="py-3.5 px-4 uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Loading merchant transactions from Firestore...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No orders completed for this merchant yet.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const isExpanded = expandedId === tx.id;
                  return (
                    <React.Fragment key={tx.id}>
                      <tr 
                        onClick={() => setExpandedId(isExpanded ? null : tx.id)}
                        className={`transition-colors cursor-pointer ${
                          isExpanded ? "bg-slate-900/80" : "hover:bg-slate-900/40"
                        }`}
                      >
                        <td className="py-4 px-4 font-bold text-slate-200">
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-emerald-400 shrink-0" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                            )}
                            <div>
                              <span>{tx.dealId}</span>
                              <span className="text-[10px] text-slate-500 block font-normal">
                                {new Date(tx.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-slate-300">
                          <span className="inline-flex items-center gap-1.5 font-bold text-slate-200">
                            <Package className="w-3.5 h-3.5 text-blue-400" />
                            <span>
                              <CountUp to={tx.itemsCount || 0} /> {tx.itemsCount === 1 ? "product" : "products"}
                            </span>
                          </span>
                        </td>
                        <td className="py-4 px-4 text-slate-400">
                          <CountUp to={tx.subtotal || tx.amount} prefix="₹" />
                        </td>
                        <td className="py-4 px-4 text-emerald-400 font-bold">
                          <CountUp to={tx.discount?.percentage || 0} suffix="%" />
                        </td>
                        <td className="py-4 px-4 font-black text-slate-100 text-sm">
                          <CountUp to={tx.finalAmount || tx.amount} prefix="₹" />
                        </td>
                        <td className="py-4 px-4">
                          <StatusBadge
                            status={tx.status === "PAID" ? "paid" : "pending_approval"}
                            label={tx.status === "PAID" ? "SETTLED" : tx.status}
                          />
                        </td>
                        <td className="py-4 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex items-center gap-2 justify-end">
                            <Link
                              href={`/merchant/audit?dealId=${tx.dealId}`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-blue-400 font-bold transition-colors text-xs"
                            >
                              <History className="w-3.5 h-3.5" />
                              <span>AUDIT</span>
                            </Link>
                            <Link
                              href={`/transactions/${tx.id}`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 font-bold transition-colors text-xs"
                            >
                              <span>DETAILS</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Product Breakdown Row */}
                      {isExpanded && (
                        <tr className="bg-slate-900/90 border-b border-emerald-950">
                          <td colSpan={7} className="px-6 py-4">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                  <Package className="w-3.5 h-3.5 text-emerald-400" />
                                  <span className="flex items-center gap-1">ORDERED PRODUCTS BREAKDOWN (<CountUp to={tx.items?.length || 0} />)</span>
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  Razorpay Order: {tx.razorpayOrderId || "N/A"}
                                </span>
                              </div>

                              {tx.items && tx.items.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {tx.items.map((item, idx) => (
                                    <div
                                      key={idx}
                                      className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between space-y-2 shadow-inner"
                                    >
                                      <div className="space-y-1">
                                        <div className="flex items-start justify-between gap-2">
                                          <h4 className="font-bold text-slate-100 text-xs line-clamp-1">
                                            {item.productName || `Product SKU: ${item.productId}`}
                                          </h4>
                                          <span className="px-2 py-0.5 rounded bg-blue-950 border border-blue-800 text-blue-300 text-[10px] font-bold shrink-0 flex items-center gap-0.5">
                                            ×<CountUp to={item.quantity} />
                                          </span>
                                        </div>
                                        <p className="text-[11px] text-slate-400 font-sans line-clamp-1">
                                          Unit Price: <CountUp to={item.unitPrice} prefix="₹" />
                                        </p>
                                      </div>

                                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                                        <span className="text-[10px] text-slate-500 font-mono">Line Total</span>
                                        <span className="font-black text-emerald-400">
                                          <CountUp to={item.lineTotal || item.unitPrice * item.quantity} prefix="₹" />
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-400 text-xs flex items-center justify-between">
                                  <span>Contract items embedded in deal. Click Full Details to view raw contract receipt.</span>
                                  <Link
                                    href={`/transactions/${tx.id}`}
                                    className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold"
                                  >
                                    View Full Receipt →
                                  </Link>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
