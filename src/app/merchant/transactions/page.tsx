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
  Clock
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { DEMO_MERCHANT_ID } from "@/services/seed";
import { TransactionRecord } from "@/types";

export default function MerchantTransactionsPage() {
  const { merchantId: authMerchantId } = useAuth();
  const merchantId = authMerchantId || DEMO_MERCHANT_ID;

  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

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
        badge={<StatusBadge status="active" label={`${transactions.length} STORE ORDERS`} />}
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
                <th className="py-3.5 px-4 uppercase text-right">Audit Trail</th>
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
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-4 px-4 font-bold text-slate-200">
                      {tx.dealId}
                      <span className="text-[10px] text-slate-500 block">{new Date(tx.createdAt).toLocaleDateString()}</span>
                    </td>
                    <td className="py-4 px-4 text-slate-300">
                      {tx.itemsCount} {tx.itemsCount === 1 ? "product" : "products"}
                    </td>
                    <td className="py-4 px-4 text-slate-400">₹{(tx.subtotal || tx.amount).toLocaleString("en-IN")}</td>
                    <td className="py-4 px-4 text-emerald-400">
                      {tx.discount?.percentage ? `${tx.discount.percentage}%` : "0%"}
                    </td>
                    <td className="py-4 px-4 font-bold text-slate-100 text-sm">
                      ₹{(tx.finalAmount || tx.amount).toLocaleString("en-IN")}
                    </td>
                    <td className="py-4 px-4">
                      <StatusBadge
                        status={tx.status === "PAID" ? "paid" : "pending_approval"}
                        label={tx.status === "PAID" ? "SETTLED" : tx.status}
                      />
                    </td>
                    <td className="py-4 px-4 text-right">
                      <Link
                        href={`/merchant/audit?dealId=${tx.dealId}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-blue-400 font-bold transition-colors"
                      >
                        <History className="w-3.5 h-3.5" />
                        <span>AUDIT</span>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </SpotlightCard>
    </PageContainer>
  );
}
