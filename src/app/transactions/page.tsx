import React from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SectionCard } from "@/components/ui/SectionCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Receipt } from "lucide-react";

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
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono">
                <th className="py-3 px-4 uppercase">Deal ID</th>
                <th className="py-3 px-4 uppercase">Merchant</th>
                <th className="py-3 px-4 uppercase">Amount</th>
                <th className="py-3 px-4 uppercase">Firewall Status</th>
                <th className="py-3 px-4 uppercase">Created At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {staticPlaceholderTransactions.map((tx) => (
                <tr key={tx.dealId} className="hover:bg-slate-900/40">
                  <td className="py-3 px-4 font-bold text-blue-400">{tx.dealId}</td>
                  <td className="py-3 px-4 text-slate-300">{tx.merchant}</td>
                  <td className="py-3 px-4 text-slate-100 font-bold">{tx.amount}</td>
                  <td className="py-3 px-4">{tx.status}</td>
                  <td className="py-3 px-4 text-slate-500">{tx.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </PageContainer>
  );
}


