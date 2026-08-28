"use client";

import React from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SectionCard } from "@/components/ui/SectionCard";
import SpotlightCard from "@/components/SpotlightCard";
import { 
  User, 
  Bot, 
  Store, 
  FileCheck, 
  ShieldCheck, 
  CreditCard
} from "lucide-react";

const placeholderTimelineEvents = [
  {
    step: "1. Buyer Request",
    actor: "USER",
    actorIcon: User,
    badge: <StatusBadge status="neutral" label="USER INPUT" />,
    description: "User submits natural language request in Deal Room.",
    example: '"I need ergonomic setups for 5 developers under ₹60,000 within 7 days."',
  },
  {
    step: "2. Buyer Intent Parsed",
    actor: "BUYER AGENT",
    actorIcon: Bot,
    badge: <StatusBadge status="negotiating" label="INTENT PARSED" />,
    description: "LLM parses intent into structured constraints (budget, qty, delivery max days).",
    example: '{"product": "ergonomic chair", "qty": 5, "maxBudget": 60000, "deliveryMaxDays": 7}',
  },
  {
    step: "3. Merchant Offer Generated",
    actor: "MERCHANT AGENT",
    actorIcon: Store,
    badge: <StatusBadge status="negotiating" label="OFFER PROPOSED" />,
    description: "Merchant agent evaluates catalog inventory and margin policy to compose candidate bundle.",
    example: "ErgoChair Lite x 5 + Lumbar Support x 5 @ ₹54,000 after 10% bundle discount",
  },
  {
    step: "4. Deal Compiled",
    actor: "PACT DEAL COMPILER",
    actorIcon: FileCheck,
    badge: <StatusBadge status="compiled" label="CONTRACT GENERATED" />,
    description: "Deterministic math recalculates line totals, discounts, and terms into structured contract.",
    example: "Deal Contract #DEAL-9842 compiled deterministically",
  },
  {
    step: "5. PACT Firewall Check",
    actor: "PACT FIREWALL",
    actorIcon: ShieldCheck,
    badge: <StatusBadge status="validated" label="ALL RULES PASSED" />,
    description: "Server-side rules check Stock, Catalog Price, Discount Cap, Budget, and Transaction Limit.",
    example: "INVENTORY: PASS | PRICE: PASS | DISCOUNT: PASS (10% <= 15%) | BUDGET: PASS",
  },
  {
    step: "6. Payment Settlement",
    actor: "RAZORPAY",
    actorIcon: CreditCard,
    badge: <StatusBadge status="paid" label="RAZORPAY PAID" />,
    description: "Validated contract proceeds to Razorpay Test Mode order creation and payment confirmation.",
    example: "Order id: order_N92x78a | Payment status: PAID",
  },
];

export default function AuditPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Audit Trail"
        description="Immutable event telemetry recording agent reasoning, policy enforcement, and execution state."
        badge={<StatusBadge status="active" label="LOGGER ONLINE" />}
      />

      <SectionCard
        title="LIFECYCLE TIMELINE PREVIEW"
        subtitle="Chronological demonstration of PACT agentic execution and firewall gatekeeping"
        badge={<StatusBadge status="neutral" label="DEMO LIFECYCLE" />}
      >
        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
          {placeholderTimelineEvents.map((evt, idx) => {
            const Icon = evt.actorIcon;
            return (
              <div key={idx} className="relative flex items-start gap-4 group">
                <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-300 font-mono text-xs font-bold">
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <SpotlightCard
                    spotlightColor="rgba(56, 189, 248, 0.15)"
                    className="bg-slate-950/80 border border-slate-800 p-0 rounded-xl hover:border-slate-700 transition-colors"
                  >
                    <div className="p-4 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4.5 h-4.5 text-blue-400" />
                          <span className="text-sm font-bold font-mono text-slate-100">{evt.step}</span>
                          <span className="text-xs font-mono text-slate-400 font-medium">[{evt.actor}]</span>
                        </div>
                        {evt.badge}
                      </div>
                      <p className="text-xs text-slate-300 font-normal leading-relaxed">{evt.description}</p>
                      <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800/80 font-mono text-xs text-slate-200 font-medium">
                        {evt.example}
                      </div>
                    </div>
                  </SpotlightCard>

                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>
    </PageContainer>
  );
}



