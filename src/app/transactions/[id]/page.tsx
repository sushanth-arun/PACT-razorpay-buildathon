"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import SpotlightCard from "@/components/SpotlightCard";
import { Magnet } from "@/components/Magnet";
import { 
  Receipt, 
  ArrowLeft, 
  Store, 
  History, 
  ShieldCheck, 
  CreditCard, 
  Truck, 
  CheckCircle2, 
  Boxes,
  FileText,
  User,
  ExternalLink
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { CountUp } from "@/components/CountUp";

interface TransactionDetail {
  id: string;
  orderId: string;
  dealId: string;
  merchantId: string;
  merchantName?: string;
  amount: number;
  currency: string;
  status: string;
  razorpayOrderId?: string;
  createdAt: string;
  updatedAt?: string;
  deal: {
    id: string;
    status: string;
    subtotal: number;
    finalAmount: number;
    discount?: { percentage: number; amount: number; reasoning: string };
    items?: Array<{
      productId: string;
      productName: string;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
    }>;
    merchantId: string;
    merchantName?: string;
  } | null;
  payments: Array<{
    id: string;
    amount: number;
    status: string;
    providerPaymentId?: string;
    createdAt: string;
  }>;
  auditEventsCount: number;
  deliveryDays?: number;
}

export default function TransactionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const transactionId = resolvedParams.id;
  const { role } = useAuth();

  const [transaction, setTransaction] = useState<TransactionDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await fetch(`/api/transactions/${encodeURIComponent(transactionId)}`);
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Transaction not found.");
        }
        setTransaction(data.transaction);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load transaction";
        setError(msg);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [transactionId]);

  if (loading) {
    return (
      <PageContainer>
        <div className="p-16 text-center text-slate-400 font-mono text-xs">
          Loading immutable transaction contract from Firestore...
        </div>
      </PageContainer>
    );
  }

  if (error || !transaction) {
    return (
      <PageContainer>
        <div className="p-8 rounded-2xl bg-rose-950/40 border border-rose-800 text-rose-300 font-mono text-xs space-y-3">
          <p className="font-bold text-sm">Transaction Not Found</p>
          <p>{error || "This transaction record does not exist or you do not have permission to view it."}</p>
          <Link href={role === "MERCHANT_ADMIN" ? "/merchant/transactions" : "/transactions"} className="text-blue-400 underline block">
            ← Return to Transactions
          </Link>
        </div>
      </PageContainer>
    );
  }

  const deal = transaction.deal;
  const backHref = role === "MERCHANT_ADMIN" ? "/merchant/transactions" : "/transactions";
  const backLabel = role === "MERCHANT_ADMIN" ? "Back to Merchant Transactions" : "Back to All Transactions";
  const auditHref = role === "MERCHANT_ADMIN" ? `/merchant/audit?dealId=${transaction.dealId}` : `/audit?dealId=${transaction.dealId}`;

  return (
    <PageContainer>
      <div className="space-y-4">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{backLabel}</span>
        </Link>

        <PageHeader
          title={`TRANSACTION #${transaction.id.toUpperCase()}`}
          description={`Autonomous AI-negotiated deal recorded with ${transaction.merchantName || deal?.merchantName || "Merchant"}.`}
          badge={
            <StatusBadge
              status={transaction.status === "PAID" ? "paid" : transaction.status === "VALIDATED" ? "validated" : "pending_approval"}
              label={transaction.status === "PAID" ? "SETTLED & VERIFIED" : transaction.status}
            />
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-mono text-xs items-start">
        {/* Left 7 Columns: Contract & Line Items */}
        <div className="lg:col-span-7 space-y-4">
          <SpotlightCard
            spotlightColor="rgba(59, 130, 246, 0.15)"
            className="bg-slate-950/90 border border-slate-800 p-6 rounded-3xl space-y-5"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-blue-400" />
                <span className="font-bold text-slate-100 text-sm">DEAL CONTRACT BREAKDOWN</span>
              </div>
              <span className="text-[11px] text-slate-400">Deal: {transaction.dealId}</span>
            </div>

            {deal?.items && deal.items.length > 0 ? (
              <div className="space-y-3">
                <div className="divide-y divide-slate-800/80">
                  {deal.items.map((item, i: number) => (
                    <div key={i} className="py-3 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-200 font-sans text-sm">{item.productName}</p>
                        <p className="text-[11px] text-slate-500 flex items-center gap-1">
                          Qty: <strong className="text-slate-300"><CountUp to={item.quantity} /></strong> × <CountUp to={item.unitPrice} prefix="₹" />
                        </p>
                      </div>
                      <span className="font-extrabold text-slate-100 text-sm">
                        <CountUp to={item.lineTotal || item.unitPrice * item.quantity} prefix="₹" />
                      </span>
                    </div>
                  ))}
                </div>

                {/* Financial Summary Calculation */}
                <div className="pt-4 border-t border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Catalog Subtotal</span>
                    <span className="text-slate-200"><CountUp to={deal.subtotal || transaction.amount} prefix="₹" /></span>
                  </div>
                  {deal.discount && deal.discount.amount > 0 && (
                    <div className="flex justify-between text-emerald-400">
                      <span>Negotiated Discount (<CountUp to={deal.discount.percentage} suffix="%" />)</span>
                      <span>-<CountUp to={deal.discount.amount} prefix="₹" /></span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-100 text-base font-black pt-2 border-t border-slate-800/60">
                    <span>Settled Total</span>
                    <span className="text-emerald-400"><CountUp to={transaction.amount} prefix="₹" /></span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-900/60 rounded-xl text-slate-400 flex items-center gap-1">
                Single contracted package execution: <CountUp to={transaction.amount} prefix="₹" />
              </div>
            )}
          </SpotlightCard>
        </div>

        {/* Right 5 Columns: Gateway, Firewall & Decision Trail CTA */}
        <div className="lg:col-span-5 space-y-4">
          <SpotlightCard
            spotlightColor="rgba(56, 189, 248, 0.15)"
            className="bg-slate-950/90 border border-slate-800 p-6 rounded-3xl space-y-5"
          >
            <div className="flex items-center gap-2.5 border-b border-slate-800 pb-4 text-emerald-400 font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>SETTLEMENT GATING & AUDIT</span>
            </div>

            <div className="space-y-3 text-xs">
              {role === "MERCHANT_ADMIN" ? (
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <span className="text-slate-500 text-[10px] uppercase font-bold">BUYER CLIENT</span>
                  <div className="flex items-center gap-2 pt-0.5">
                    <div className="w-5 h-5 rounded-full bg-blue-950 border border-blue-800 flex items-center justify-center text-blue-300 text-[10px] font-bold">
                      <User className="w-3 h-3" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-200 font-sans text-xs">AI Buyer (PACT Network)</p>
                      <p className="text-[10px] text-slate-400 font-mono">buyer@pact.ai</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <span className="text-slate-500 text-[10px] uppercase font-bold">MERCHANT COUNTERPARTY</span>
                  <p className="font-bold text-slate-200 font-sans text-sm">{transaction.merchantName}</p>
                  <p className="text-[11px] text-slate-400">{transaction.merchantId}</p>
                </div>
              )}

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                <span className="text-slate-500 text-[10px] uppercase font-bold">RAZORPAY ORDER ID</span>
                <p className="font-bold text-slate-200 text-xs">{transaction.razorpayOrderId || "N/A"}</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                <span className="text-slate-500 text-[10px] uppercase font-bold">PACT FIREWALL STATUS</span>
                <p className={`font-bold text-xs flex items-center gap-1.5 ${
                  deal?.status === "VALIDATED" || deal?.status === "PAID"
                    ? "text-emerald-400"
                    : deal?.status === "PENDING_APPROVAL"
                    ? "text-amber-400"
                    : deal?.status === "REJECTED" || deal?.status === "COMPILATION_FAILED"
                    ? "text-rose-400"
                    : "text-blue-400"
                }`}>
                  {deal?.status === "VALIDATED" || deal?.status === "PAID" ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>9/9 GATES VALIDATED</span>
                    </>
                  ) : deal?.status === "PENDING_APPROVAL" ? (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>8/9 GATES PASSED (PENDING APPROVAL)</span>
                    </>
                  ) : deal?.status === "REJECTED" ? (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
                      <span>FIREWALL REJECTED</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{deal?.status || "DRAFT (NOT EVALUATED)"}</span>
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Merchant Reasoning Breakdown if in Offer / Proposal Stage */}
            {(deal as any)?.merchantOffer && (
              <div className="space-y-3 pt-2 border-t border-slate-800">
                {(deal as any).merchantOffer.buyerFitExplanation && (
                  <div className="p-3 rounded-xl bg-blue-950/20 border border-blue-800/40 space-y-1">
                    <span className="text-blue-400 text-[10px] uppercase font-bold tracking-wider">AI BUYER FIT</span>
                    <p className="text-xs text-slate-300 font-sans leading-relaxed">
                      {(deal as any).merchantOffer.buyerFitExplanation}
                    </p>
                  </div>
                )}
                {(deal as any).merchantOffer.merchantOpportunityExplanation && (
                  <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-800/40 space-y-1">
                    <span className="text-purple-400 text-[10px] uppercase font-bold tracking-wider">MERCHANT STRATEGY</span>
                    <p className="text-xs text-slate-300 font-sans leading-relaxed">
                      {(deal as any).merchantOffer.merchantOpportunityExplanation}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="pt-2 space-y-2">
              {transaction.status !== "PAID" && (
                <Magnet strength={6} className="w-full">
                  <Link
                    href={`/deal-room?dealId=${transaction.dealId}`}
                    className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold transition-all shadow-lg shadow-purple-950/50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>RESUME IN DEAL ROOM →</span>
                  </Link>
                </Magnet>
              )}

              <Magnet strength={8} className="w-full">
                <Link
                  href={auditHref}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-mono text-xs font-bold transition-all shadow-xl shadow-blue-950/60 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <History className="w-4 h-4" />
                  <span>VIEW AUDIT DECISION TRAIL</span>
                </Link>
              </Magnet>
            </div>
          </SpotlightCard>
        </div>
      </div>
    </PageContainer>
  );
}
