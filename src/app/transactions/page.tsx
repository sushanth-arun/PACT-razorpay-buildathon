"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import SpotlightCard from "@/components/SpotlightCard";
import { 
  Receipt, 
  ArrowRight, 
  History, 
  ExternalLink,
  Clock, 
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";

interface TransactionSummary {
  id: string;
  orderId: string;
  dealId: string;
  merchantId: string;
  merchantName: string;
  amount: number;
  status: "CREATED" | "PROCESSING" | "PAID" | "PENDING" | "FAILED";
  razorpayOrderId?: string;
  createdAt: string;
  itemsCount: number;
  items: Array<{ productName: string; quantity: number; unitPrice: number; lineTotal: number }>;
  discount?: { amount: number; percentage: number };
  finalAmount: number;
  subtotal: number;
}

export default function TransactionsPage() {
  const { user, role } = useAuth();
  const [transactions, setTransactions] = useState<TransactionSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    async function loadTransactions() {
      try {
        setLoading(true);
        const res = await fetch("/api/transactions");
        const data = await res.json();
        if (data.success && Array.isArray(data.transactions)) {
          setTransactions(data.transactions);
          if (data.transactions.length > 0) {
            setExpandedId(data.transactions[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load transactions:", err);
      } finally {
        setLoading(false);
      }
    }
    loadTransactions();
  }, []);

  const totalSpent = transactions
    .filter((t) => t.status === "PAID")
    .reduce((sum, t) => sum + (t.finalAmount || t.amount), 0);

  return (
    <PageContainer>
      <PageHeader
        title="TRANSACTION COMMAND CENTER"
        description="Immutable financial ledger of AI-negotiated contracts settled via Razorpay Test Mode."
        badge={
          <StatusBadge
            status={transactions.length > 0 ? "active" : "neutral"}
            label={`${transactions.length} RECORDED TRANSACTIONS`}
          />
        }
      />

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
        <SpotlightCard
          spotlightColor="rgba(59, 130, 246, 0.2)"
          className="bg-slate-950/80 border border-slate-800 p-5 rounded-2xl"
        >
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase">SETTLED VALUE</span>
            <p className="text-2xl font-black text-emerald-400">
              ₹{totalSpent.toLocaleString("en-IN")}
            </p>
          </div>
        </SpotlightCard>

        <SpotlightCard
          spotlightColor="rgba(59, 130, 246, 0.2)"
          className="bg-slate-950/80 border border-slate-800 p-5 rounded-2xl"
        >
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase">COMPLETED CONTRACTS</span>
            <p className="text-2xl font-black text-slate-100">
              {transactions.filter((t) => t.status === "PAID").length} / {transactions.length}
            </p>
          </div>
        </SpotlightCard>

        <SpotlightCard
          spotlightColor="rgba(59, 130, 246, 0.2)"
          className="bg-slate-950/80 border border-slate-800 p-5 rounded-2xl"
        >
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase">FIREWALL COMPLIANCE</span>
            <p className="text-2xl font-black text-blue-400">100% PASS</p>
          </div>
        </SpotlightCard>
      </div>

      {/* Transactions Stack & List */}
      <div className="space-y-3 font-mono">
        <div className="flex items-center justify-between px-1 text-xs font-bold text-slate-400">
          <span>RECENT TRANSACTIONS ({transactions.length})</span>
          <span>CLICK CARD TO EXPAND DECISION CONTEXT</span>
        </div>

        {loading ? (
          <div className="p-12 rounded-2xl bg-slate-950/80 border border-slate-800 text-center text-xs text-slate-400">
            Loading cryptographic transaction ledger from Firestore...
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-16 rounded-3xl bg-slate-950/80 border border-dashed border-slate-800 text-center space-y-3">
            <Receipt className="w-8 h-8 text-slate-500 mx-auto" />
            <h3 className="text-sm font-bold text-slate-200">No Transactions Yet</h3>
            <p className="text-xs text-slate-400 font-sans max-w-sm mx-auto">
              Start an autonomous commercial session in the Deal Room to see your negotiated transactions here.
            </p>
            <Link
              href="/deal-room"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-lg"
            >
              <span>Go to Deal Room</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx, idx) => {
              const isExpanded = expandedId === tx.id;
              const dateStr = new Date(tx.createdAt).toLocaleString("en-IN", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  onClick={() => setExpandedId(isExpanded ? null : tx.id)}
                  className="cursor-pointer"
                >
                  <SpotlightCard
                    spotlightColor="rgba(59, 130, 246, 0.15)"
                    className={`p-0 rounded-2xl border transition-all duration-200 ${
                      isExpanded
                        ? "bg-slate-900/90 border-blue-500/80 shadow-xl shadow-blue-950/40"
                        : "bg-slate-950/90 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="p-5 space-y-4">
                      {/* Top Summary Bar */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center font-bold ${
                            tx.status === "PAID"
                              ? "bg-emerald-950/80 border-emerald-800 text-emerald-400"
                              : "bg-blue-950/80 border-blue-800 text-blue-400"
                          }`}>
                            <Receipt className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-bold text-slate-100 font-sans">
                                {tx.merchantName}
                              </h3>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                                {tx.dealId}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-0.5">
                              <Clock className="w-3 h-3 text-slate-500" />
                              <span>{dateStr}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-4">
                          <div className="text-right">
                            <span className="text-xs font-black text-slate-100 text-base">
                              ₹{(tx.finalAmount || tx.amount).toLocaleString("en-IN")}
                            </span>
                            {tx.discount && tx.discount.percentage > 0 && (
                              <span className="text-[10px] text-emerald-400 block">
                                {tx.discount.percentage}% Discount Applied
                              </span>
                            )}
                          </div>

                          <StatusBadge
                            status={tx.status === "PAID" ? "paid" : "pending_approval"}
                            label={tx.status === "PAID" ? "SETTLED" : tx.status}
                          />
                        </div>
                      </div>

                      {/* Expanded Context Drawer */}
                      {isExpanded && (
                        <div className="pt-4 border-t border-slate-800/80 space-y-4 text-xs font-mono">
                          {/* Item Breakdown */}
                          {tx.items && tx.items.length > 0 && (
                            <div className="space-y-2 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/60">
                              <span className="text-[11px] font-bold text-slate-400 uppercase">
                                CONTRACTED ITEMS ({tx.items.length})
                              </span>
                              <div className="space-y-1.5 pt-1">
                                {tx.items.map((it, i) => (
                                  <div key={i} className="flex items-center justify-between text-slate-300">
                                    <span>
                                      {it.productName} <strong className="text-blue-400">×{it.quantity}</strong>
                                    </span>
                                    <span className="font-bold text-slate-100">
                                      ₹{(it.lineTotal || it.unitPrice * it.quantity).toLocaleString("en-IN")}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Gateway References */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                            <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                              <span className="text-slate-500 block">RAZORPAY ORDER ID</span>
                              <span className="text-slate-200 font-bold truncate block">
                                {tx.razorpayOrderId || "N/A"}
                              </span>
                            </div>
                            <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                              <span className="text-slate-500 block">INTERNAL TX ID</span>
                              <span className="text-slate-200 font-bold truncate block">{tx.id}</span>
                            </div>
                          </div>

                          {/* Actions: View Decision Trail & Detail */}
                          <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                            <Link
                              href={`/audit?dealId=${tx.dealId}`}
                              className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-blue-400 hover:text-blue-300 font-bold text-xs flex items-center gap-1.5 transition-colors"
                            >
                              <History className="w-3.5 h-3.5" />
                              <span>VIEW DECISION TRAIL</span>
                            </Link>

                            <Link
                              href={`/transactions/${tx.id}`}
                              className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-md"
                            >
                              <span>FULL DETAILS</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>
                  </SpotlightCard>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
