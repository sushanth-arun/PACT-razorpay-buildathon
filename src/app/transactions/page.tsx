"use client";

import React from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SectionCard } from "@/components/ui/SectionCard";
import BorderGlow from "@/components/BorderGlow";

const staticPlaceholderTransactions = [
  {
    dealId: "DEAL-8921",
    merchant: "ErgoSpace",
    amount: "₹54,000",
    status: <StatusBadge status="paid" label="PAID" />,
    createdAt: "2026-08-28 17:30",
  },
  {
    dealId: "DEAL-8922",
    merchant: "ErgoSpace",
    amount: "₹72,500",
    status: <StatusBadge status="pending_approval" label="APPROVAL REQD" />,
    createdAt: "2026-08-28 17:42",
  },
  {
    dealId: "DEAL-8923",
    merchant: "ErgoSpace",
    amount: "₹68,000",
    status: <StatusBadge status="rejected" label="DISCOUNT EXCEEDED" />,
    createdAt: "2026-08-28 17:55",
  },
];

export default function TransactionsPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Transactions"
        description="Settled and processing orders routed through Razorpay Test Mode after firewall validation."
        badge={<StatusBadge status="neutral" label="TEST MODE" />}
      />

      <SectionCard
        title="TRANSACTION LEDGER"
        subtitle="Static placeholder demonstration of validated order executions"
        badge={<StatusBadge status="neutral" label="PHASE 7 PREVIEW" />}
      >
        <BorderGlow
          edgeSensitivity={20}
          glowColor="40 80 80"
          backgroundColor="#090d16"
          borderRadius={12}
          glowRadius={25}
          glowIntensity={0.5}
          coneSpread={20}
          animated={false}
          colors={['#22c55e', '#38bdf8']}
        >
          <div className="p-3">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-300 font-mono font-bold">
                  <th className="py-3.5 px-4 uppercase text-xs">Deal ID</th>
                  <th className="py-3.5 px-4 uppercase text-xs">Merchant</th>
                  <th className="py-3.5 px-4 uppercase text-xs">Amount</th>
                  <th className="py-3.5 px-4 uppercase text-xs">Firewall Status</th>
                  <th className="py-3.5 px-4 uppercase text-xs">Created At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {staticPlaceholderTransactions.map((tx) => (
                  <tr key={tx.dealId} className="hover:bg-slate-900/60 transition-colors">
                    <td className="py-4 px-4 font-bold text-blue-400">{tx.dealId}</td>
                    <td className="py-4 px-4 text-slate-200 font-medium">{tx.merchant}</td>
                    <td className="py-4 px-4 text-slate-100 font-bold">{tx.amount}</td>
                    <td className="py-4 px-4">{tx.status}</td>
                    <td className="py-4 px-4 text-slate-400 font-medium text-xs">{tx.createdAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </BorderGlow>
      </SectionCard>
    </PageContainer>
  );
}



