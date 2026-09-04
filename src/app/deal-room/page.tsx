"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import SpotlightCard from "@/components/SpotlightCard";

import { 
  Bot, 
  Sparkles, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Handshake, 
  RefreshCw, 
  Cpu,
  Info,
  Download,
  FileText,
  Flame,
  ShieldCheck,
  ShieldAlert,
  CreditCard,
  Lock,
  ExternalLink,
  Check,
  Store,
  History
} from "lucide-react";
import { SavedBuyerIntent } from "@/services/buyer-intent-service";
import { MerchantOffer } from "@/lib/ai/merchant-offer-schema";
import { DealContract } from "@/lib/deal-compiler/schema";
import { FirewallEvaluation } from "@/lib/firewall/schema";
import { motion, AnimatePresence } from "framer-motion";
import { Ripple } from "@/components/Ripple";
import { useDealLifecycle } from "@/hooks/useDealLifecycle";
import { DealStepper } from "@/components/ui/DealStepper";
import { getMerchant } from "@/services/firestore";
import { Merchant } from "@/types";
import { CountUp } from "@/components/CountUp";

// Razorpay standard checkout global interface
interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpaySuccessResponse) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
    method?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
  config?: {
    display?: {
      blocks?: Record<string, unknown>;
      sequence?: string[];
      preferences?: {
        show_default_blocks?: boolean;
      };
    };
  };
  modal?: {
    ondismiss?: () => void;
  };
}

interface RazorpayInstance {
  open: () => void;
  on: (event: string, callback: (response: { error?: { description?: string; reason?: string } }) => void) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}


const MERCHANT_PROMPT_RECOMMENDATIONS: Record<string, Array<{ prompt: string; merchantId: string; merchantName: string }>> = {
  all: [
    { prompt: "5 ergonomic chairs for engineering team under ₹15,000", merchantId: "ergospace", merchantName: "ErgoSpace" },
    { prompt: "4 dual-motor motorized standing desks under ₹14,000", merchantId: "deskforge", merchantName: "DeskForge" },
    { prompt: "3 Thunderbolt 4 enterprise docking stations with 4K output", merchantId: "cybertech", merchantName: "CyberTech" },
    { prompt: "4K enterprise video bar conference setup under ₹9,000", merchantId: "officepro", merchantName: "OfficePro" },
    { prompt: "4 minimalist birch natural wood desks under ₹9,000", merchantId: "nordicliving", merchantName: "NordicLiving" },
    { prompt: "Ergonomic lumbar support cushions for 15 developers", merchantId: "ergospace", merchantName: "ErgoSpace" },
    { prompt: "5 split ergonomic mechanical keyboards with OLED displays", merchantId: "cybertech", merchantName: "CyberTech" },
    { prompt: "Scandinavian modular breakroom conference table for 6 seats", merchantId: "nordicliving", merchantName: "NordicLiving" },
  ],
  ergospace: [
    { prompt: "5 ergonomic chairs for engineering team under ₹15,000", merchantId: "ergospace", merchantName: "ErgoSpace" },
    { prompt: "3 executive leather chairs with dynamic lumbar within 5 days", merchantId: "ergospace", merchantName: "ErgoSpace" },
    { prompt: "10 ErgoChair Lite setups with 10% discount", merchantId: "ergospace", merchantName: "ErgoSpace" },
    { prompt: "Ergonomic lumbar support cushions for 15 developers", merchantId: "ergospace", merchantName: "ErgoSpace" },
  ],
  deskforge: [
    { prompt: "4 dual-motor motorized standing desks under ₹14,000", merchantId: "deskforge", merchantName: "DeskForge" },
    { prompt: "Solid walnut height-adjustable workstation with cable tray", merchantId: "deskforge", merchantName: "DeskForge" },
    { prompt: "8 sit-stand motorized desks for developer squad within 5 days", merchantId: "deskforge", merchantName: "DeskForge" },
    { prompt: "Anti-fatigue active standing mat with acupressure", merchantId: "deskforge", merchantName: "DeskForge" },
  ],
  cybertech: [
    { prompt: "3 Thunderbolt 4 enterprise docking stations with 4K output", merchantId: "cybertech", merchantName: "CyberTech" },
    { prompt: "5 split ergonomic mechanical keyboards with OLED displays", merchantId: "cybertech", merchantName: "CyberTech" },
    { prompt: "Developer battlestation bundle under ₹15,000 with 8% discount", merchantId: "cybertech", merchantName: "CyberTech" },
    { prompt: "Apex code executive recliner chair with carbon skeleton", merchantId: "cybertech", merchantName: "CyberTech" },
  ],
  officepro: [
    { prompt: "4K AI Conference Soundbar & Auto-Framing Cam under ₹10,000", merchantId: "officepro", merchantName: "OfficePro" },
    { prompt: "Acoustic desktop privacy divider set of 4 under ₹4,000", merchantId: "officepro", merchantName: "OfficePro" },
    { prompt: "Magnetic glass whiteboard mobile easel with locking wheels", merchantId: "officepro", merchantName: "OfficePro" },
    { prompt: "Conference room AV equipment bundle for board room", merchantId: "officepro", merchantName: "OfficePro" },
  ],
  nordicliving: [
    { prompt: "4 minimalist birch natural wood desks under ₹9,000", merchantId: "nordicliving", merchantName: "NordicLiving" },
    { prompt: "Scandinavian modular breakroom conference table for 6 seats", merchantId: "nordicliving", merchantName: "NordicLiving" },
    { prompt: "Natural circadian daylight task lamps for 10 workstations", merchantId: "nordicliving", merchantName: "NordicLiving" },
    { prompt: "Sustainable solid wood office furniture setup within 7 days", merchantId: "nordicliving", merchantName: "NordicLiving" },
  ],
};

// Known keyword to best merchant mapper to auto-detect cross-merchant queries and advise the buyer
const MERCHANT_CATALOG_KEYWORDS: Record<string, { merchantId: string; merchantName: string; keywords: string[] }> = {
  ergospace: {
    merchantId: "ergospace",
    merchantName: "ErgoSpace",
    keywords: ["chair", "seating", "lumbar", "mesh", "executive chair", "ergochair", "cushion"],
  },
  deskforge: {
    merchantId: "deskforge",
    merchantName: "DeskForge",
    keywords: ["desk", "standing desk", "motorized", "sit-stand", "workstation", "cable spine", "standing mat", "oak"],
  },
  cybertech: {
    merchantId: "cybertech",
    merchantName: "CyberTech",
    keywords: ["dock", "docking", "thunderbolt", "keyboard", "mechanical keyboard", "oled", "gaming chair", "electronics"],
  },
  officepro: {
    merchantId: "officepro",
    merchantName: "OfficePro",
    keywords: ["soundbar", "conference", "camera", "video bar", "privacy divider", "acoustic", "whiteboard", "easel", "av"],
  },
  nordicliving: {
    merchantId: "nordicliving",
    merchantName: "NordicLiving Commercial",
    keywords: ["birch", "scandinavian", "nordic", "breakroom", "daylight", "lamp", "sustainable", "natural wood"],
  },
};

const PROCESSING_STEPS = [
  "UNDERSTANDING REQUEST",
  "EXTRACTING CONSTRAINTS",
  "NORMALIZING COMMERCIAL INTENT",
  "SAVING BUYER INTENT",
  "INTENT READY",
];

const MERCHANT_PROCESSING_STEPS = [
  "SEARCHING FIRESTORE CATALOG",
  "CHECKING AUTHORITATIVE INVENTORY",
  "EVALUATING COMMERCIAL OPTIONS",
  "CONSTRUCTING OFFER",
  "OFFER READY",
];

const COMPILER_PROCESSING_STEPS = [
  "VERIFYING PRODUCTS",
  "RECHECKING PRICES",
  "CALCULATING TOTAL",
  "CHECKING CONSTRAINTS",
  "COMPILING CONTRACT",
];

const FIREWALL_PROCESSING_STEPS = [
  "LOADING CURRENT CATALOG & MERCHANTS",
  "VERIFYING REAL-TIME INVENTORY",
  "CHECKING PRICE DRIFT & DISCOUNTS",
  "ENFORCING BUDGET & SETTLEMENT GATES",
  "FINALIZING FIREWALL DECISION",
];

const DEFAULT_FIREWALL_RULES = [
  { ruleName: "INVENTORY_CHECK", description: "Verifies stock availability across all requested product IDs in live Firestore warehouse catalog." },
  { ruleName: "PRICE_VERIFICATION", description: "Ensures unit prices match authoritative Firestore product catalog with 0% price drift." },
  { ruleName: "DISCOUNT_LIMIT", description: "Verifies negotiated commercial discount does not exceed merchant maximum policy cap." },
  { ruleName: "BUDGET_CONSTRAINT", description: "Validates final payable amount against buyer explicit budget ceiling." },
  { ruleName: "DELIVERY_CONSTRAINT", description: "Enforces delivery lead time SLA against merchant fulfillment warehouse capability." },
  { ruleName: "TRANSACTION_LIMIT", description: "Ensures transaction value complies with maximum settlement platform risk ceilings." },
  { ruleName: "HUMAN_APPROVAL_GATE", description: "Routes deals exceeding auto-settlement threshold to merchant store manager approval." },
  { ruleName: "DUPLICATE_PROTECTION", description: "Guarantees cryptographic transaction idempotency preventing duplicate settlements." },
  { ruleName: "PRODUCT_VALIDITY", description: "Checks active catalog status, category domain relevance, and SKU integrity." },
];

function DealRoomContent() {
  const searchParams = useSearchParams();
  const queryMerchantId = searchParams.get("merchantId");
  const [activeTargetMerchantId, setActiveTargetMerchantId] = useState<string>(queryMerchantId || "all");
  const [targetMerchant, setTargetMerchant] = useState<Merchant | null>(null);
  const [availableMerchants, setAvailableMerchants] = useState<Array<{ id: string; name: string }>>([]);
  const [promptCategory, setPromptCategory] = useState<string>("all");

  const [requestText, setRequestText] = useState("");
  const [loading, setLoading] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [intentResult, setIntentResult] = useState<SavedBuyerIntent | null>(null);
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const [isGeminiConnected, setIsGeminiConnected] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRawJson, setShowRawJson] = useState(false);

  // Real-time multi-merchant detector and cross-catalog conflict analyzer
  const detectedMerchantAnalysis = React.useMemo(() => {
    if (!requestText.trim()) return null;
    const lower = requestText.toLowerCase();

    // Map matches across all stores
    const matchedStores: Array<{
      merchantId: string;
      merchantName: string;
      matchedKeywords: string[];
    }> = [];

    for (const [mId, meta] of Object.entries(MERCHANT_CATALOG_KEYWORDS)) {
      const matches = meta.keywords.filter((kw) => lower.includes(kw));
      if (matches.length > 0) {
        matchedStores.push({
          merchantId: meta.merchantId,
          merchantName: meta.merchantName,
          matchedKeywords: matches,
        });
      }
    }

    if (matchedStores.length === 0) return null;

    // Multi-merchant conflict detected: user is requesting products from 2+ different merchants in one prompt
    if (matchedStores.length > 1) {
      return {
        type: "MULTI_MERCHANT_CONFLICT" as const,
        stores: matchedStores,
        primaryStore: matchedStores[0],
        message: `Your request contains items from multiple stores (${matchedStores.map((s) => s.merchantName).join(" & ")}). PACT settles single-merchant contracts per transaction.`,
      };
    }

    // Single merchant detected
    const singleMatch = matchedStores[0];
    if (activeTargetMerchantId !== "all" && singleMatch.merchantId !== activeTargetMerchantId) {
      return {
        type: "SWITCH_RECOMMENDED" as const,
        suggestedMerchantId: singleMatch.merchantId,
        suggestedMerchantName: singleMatch.merchantName,
        matchedKeyword: singleMatch.matchedKeywords[0],
        message: `"${singleMatch.matchedKeywords[0]}" is supplied by ${singleMatch.merchantName}.`,
      };
    }

    return null;
  }, [requestText, activeTargetMerchantId]);

  // Merchant Offer state
  const [offerLoading, setOfferLoading] = useState(false);
  const [offerProcessingStep, setOfferProcessingStep] = useState(0);
  const [offerResult, setOfferResult] = useState<MerchantOffer | null>(null);
  const [offerError, setOfferError] = useState<string | null>(null);

  // Deal Compiler state
  const [compilerLoading, setCompilerLoading] = useState(false);
  const [compilerProcessingStep, setCompilerProcessingStep] = useState(0);
  const [dealContractResult, setDealContractResult] = useState<DealContract | null>(null);
  const [compilerError, setCompilerError] = useState<string | null>(null);
  const [showRawContractJson, setShowRawContractJson] = useState(false);

  // PACT Firewall state (Phase 6)
  const [firewallLoading, setFirewallLoading] = useState(false);
  const [firewallProcessingStep, setFirewallProcessingStep] = useState(0);
  const [firewallResult, setFirewallResult] = useState<FirewallEvaluation | null>(null);
  const [firewallError, setFirewallError] = useState<string | null>(null);
  const [showRawFirewallJson, setShowRawFirewallJson] = useState(false);

  // Phase 7: Razorpay Payment State
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentVerifying, setPaymentVerifying] = useState(false);
  const [paymentResult, setPaymentResult] = useState<{
    status: "IDLE" | "PENDING" | "PROCESSING" | "PAID" | "FAILED";
    message?: string;
    dealId?: string;
    orderId?: string;
    paymentId?: string;
  }>({ status: "IDLE" });
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Tab state: "pipeline" (Active Deal Room) vs "history" (Deals History)
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<"pipeline" | "history">(tabParam === "history" ? "history" : "pipeline");
  const [dealsHistory, setDealsHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);

  // Sync active tab with URL query parameter
  React.useEffect(() => {
    if (tabParam === "history") {
      setActiveTab("history");
    } else {
      setActiveTab("pipeline");
    }
  }, [tabParam]);

  // Fetch deal history from Firestore
  const loadDealsHistory = React.useCallback(async () => {
    try {
      setHistoryLoading(true);
      const res = await fetch("/api/transactions");
      const data = await res.json();
      if (data.success) {
        const list = Array.isArray(data.transactions) ? data.transactions : Array.isArray(data.orders) ? data.orders : [];
        setDealsHistory(list);
      }
    } catch {
      // ignore
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (activeTab === "history") {
      loadDealsHistory();
    }
  }, [activeTab, loadDealsHistory]);

  // Active Stage Navigation State (1 to 5 for focused stage display)
  const [selectedStage, setSelectedStage] = useState<number>(1);

  // Single derived authoritative Deal Room lifecycle state
  const isDealPaid =
    paymentResult?.status === "PAID" ||
    dealContractResult?.status === "PAID" ||
    (dealContractResult as any)?.validationStatus?.status === "PAID";

  const lifecycle = useDealLifecycle({
    intentResult,
    intentLoading: loading,
    intentError: error,
    offerResult,
    offerLoading,
    offerError,
    dealContractResult,
    compilerLoading,
    compilerError,
    firewallResult,
    firewallLoading,
    firewallError,
    paymentResult,
    paymentLoading,
    paymentVerifying,
    paymentError,
  });

  // Auto-focus the stage view when a new step becomes active
  React.useEffect(() => {
    if (lifecycle.activeStepNumber) {
      setSelectedStage(lifecycle.activeStepNumber);
    }
  }, [lifecycle.activeStepNumber]);

  // Load target merchant info & all merchants
  React.useEffect(() => {
    fetch("/api/merchants")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.merchants)) {
          setAvailableMerchants(data.merchants.map((m: { id: string; name: string }) => ({ id: m.id, name: m.name })));
        }
      })
      .catch(() => {});

    getMerchant(activeTargetMerchantId).then((m) => {
      if (m) setTargetMerchant(m);
    });
  }, [activeTargetMerchantId]);

  // Restore active deal session cache and check Gemini health on entry
  React.useEffect(() => {
    const dealIdParam = searchParams.get("dealId");

    // If dealId is explicitly passed in URL query, load the complete deal state from Firestore into Deal Room
    if (dealIdParam) {
      setActiveTab("pipeline");
      fetch(`/api/transactions/${dealIdParam}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.deal) {
            const deal = data.deal;
            setDealContractResult(deal);
            
            // Immediately sync active merchant to the deal's counterparty
            if (deal.merchantId) {
              setActiveTargetMerchantId(deal.merchantId);
            }

            // Set buyer intent if present
            if (deal.buyerConstraints) {
              setIntentResult({
                id: deal.buyerIntentId || `intent_${deal.dealId}`,
                dealId: deal.dealId,
                productIntent: deal.items?.[0]?.productName || "Commercial Purchase",
                quantity: deal.buyerConstraints.quantity,
                budget: deal.buyerConstraints.budget,
                requestedDiscount: deal.discount?.percentage || null,
                deliveryMaxDays: deal.deliveryDays,
                preferences: deal.buyerConstraints.preferences || [],
                negotiableConstraints: deal.buyerConstraints.negotiableConstraints || [],
                confidence: 0.95,
                rawRequest: `Purchase deal #${deal.dealId}`,
                createdAt: deal.createdAt,
                aiProvider: "google-gemini",
                aiModel: "gemini-3.1-flash-lite",
              });
            }

            // Set merchant offer if items exist
            if (deal.items && deal.items.length > 0) {
              setOfferResult({
                id: deal.merchantOfferId || `offer_${deal.dealId}`,
                buyerIntentId: deal.buyerIntentId || "",
                merchantId: deal.merchantId,
                status: "OFFER_GENERATED",
                selectedItems: deal.items.map((it: any) => ({
                  productId: it.productId,
                  productName: it.productName,
                  quantity: it.quantity,
                  unitPrice: it.unitPrice,
                  lineTotal: it.lineTotal,
                })),
                alternativeItems: [],
                bundleItems: [],
                subtotal: deal.subtotal,
                proposedDiscount: {
                  percentage: deal.discount?.percentage || 0,
                  amount: deal.discount?.amount || 0,
                  reasoning: deal.discount?.reason || "Contract discount",
                },
                estimatedFinalAmount: deal.finalAmount,
                deliveryDays: deal.deliveryDays || 5,
                buyerFitExplanation: "Fulfills requested commercial parameters.",
                merchantOpportunityExplanation: "Matches merchant catalog.",
                reasoningSummary: "Deal contract loaded from Firestore ledger.",
                aiProvider: "google-gemini",
                aiModel: "gemini-3.1-flash-lite",
                createdAt: deal.createdAt,
              });
            }

            // Set firewall status (restoring full 9-rule evaluations matrix)
            if (data.evaluation && Array.isArray(data.evaluation.evaluations) && data.evaluation.evaluations.length > 0) {
              setFirewallResult(data.evaluation);
            } else if (deal.status === "VALIDATED" || deal.status === "PENDING_APPROVAL" || deal.status === "REJECTED") {
              const syntheticEvaluations = DEFAULT_FIREWALL_RULES.map((rule) => {
                let status: "PASS" | "FAIL" = "PASS";
                let severity: "INFO" | "WARNING" | "CRITICAL" = "INFO";
                let explanation = rule.description;

                if (deal.status === "REJECTED") {
                  if (rule.ruleName === "DISCOUNT_LIMIT" || rule.ruleName === "BUDGET_CONSTRAINT") {
                    status = "FAIL";
                    severity = "CRITICAL";
                    explanation = `Constraint violation detected: Deal violates commercial threshold limits.`;
                  }
                } else if (deal.status === "PENDING_APPROVAL") {
                  if (rule.ruleName === "HUMAN_APPROVAL_GATE") {
                    status = "PASS";
                    severity = "WARNING";
                    explanation = `Total amount ₹${(deal.finalAmount || 0).toLocaleString("en-IN")} exceeds merchant auto-settlement ceiling. Human manager approval required.`;
                  }
                }

                return {
                  ruleName: rule.ruleName as any,
                  status,
                  severity,
                  explanation,
                  metadata: {},
                };
              });

              setFirewallResult({
                id: `fw_${deal.dealId}`,
                dealId: deal.dealId,
                evaluatedAt: deal.updatedAt || deal.createdAt,
                overallStatus: deal.status as "VALIDATED" | "PENDING_APPROVAL" | "REJECTED",
                rulesCheckedCount: 9,
                passedCount: deal.status === "VALIDATED" ? 9 : 8,
                failedCount: deal.status === "REJECTED" ? 1 : 0,
                warningCount: deal.status === "PENDING_APPROVAL" ? 1 : 0,
                summary: `Loaded evaluation decision: ${deal.status}`,
                evaluations: syntheticEvaluations,
                metadata: {},
              });
            }

            // If paid, set payment state
            if (deal.status === "PAID") {
              setPaymentResult({
                status: "PAID",
                dealId: deal.dealId,
                message: "Deal successfully settled",
              });
            }
          }
        })
        .catch((err) => console.error("Failed to load deal by dealIdParam:", err));
      return;
    }

    // 1. Restore any active, uncompleted in-progress deal state from sessionStorage
    try {
      const savedPayment = sessionStorage.getItem("pact_payment_result");
      const parsedPayment = savedPayment ? JSON.parse(savedPayment) : null;
      
      const savedContract = sessionStorage.getItem("pact_contract_result");
      const parsedContract = savedContract ? JSON.parse(savedContract) : null;

      // If the cached deal was already PAID or completed, do not restore it into the active workspace
      if (parsedPayment?.status === "PAID" || parsedContract?.status === "PAID") {
        sessionStorage.removeItem("pact_intent_result");
        sessionStorage.removeItem("pact_offer_result");
        sessionStorage.removeItem("pact_contract_result");
        sessionStorage.removeItem("pact_firewall_result");
        sessionStorage.removeItem("pact_payment_result");
        sessionStorage.removeItem("pact_request_text");
      } else {
        const savedIntent = sessionStorage.getItem("pact_intent_result");
        if (savedIntent) setIntentResult(JSON.parse(savedIntent));

        const savedOffer = sessionStorage.getItem("pact_offer_result");
        if (savedOffer) setOfferResult(JSON.parse(savedOffer));

        if (parsedContract) setDealContractResult(parsedContract);

        const savedFirewall = sessionStorage.getItem("pact_firewall_result");
        if (savedFirewall) setFirewallResult(JSON.parse(savedFirewall));

        if (parsedPayment) setPaymentResult(parsedPayment);

        const savedText = sessionStorage.getItem("pact_request_text");
        if (savedText) setRequestText(savedText);
      }
    } catch {
      // ignore JSON parse errors
    }

    // 2. Check Gemini server-side health
    fetch("/api/buyer-intent")
      .then((res) => res.json())
      .then((data) => {
        setIsGeminiConnected(Boolean(data.configured));
      })
      .catch(() => setIsGeminiConnected(false));

    // 3. Dynamically load Razorpay Checkout script
    if (typeof window !== "undefined" && !window.Razorpay) {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, [searchParams]);

  const handleStartNewDeal = async () => {
    // If there is an active uncommitted/unpaid deal, delete it from Firestore so it doesn't clutter deal history
    const activeDealId = dealContractResult?.dealId || intentResult?.dealId;
    const activeIntentId = intentResult?.id;
    const activeOfferId = offerResult?.id;
    const isSettled = paymentResult?.status === "PAID" || dealContractResult?.status === "PAID";

    if (!isSettled && (activeDealId || activeIntentId || activeOfferId)) {
      try {
        fetch("/api/deal/cancel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dealId: activeDealId,
            buyerIntentId: activeIntentId,
            offerId: activeOfferId,
          }),
        }).catch(() => {});
      } catch {
        // ignore
      }
    }

    try {
      sessionStorage.removeItem("pact_intent_result");
      sessionStorage.removeItem("pact_offer_result");
      sessionStorage.removeItem("pact_contract_result");
      sessionStorage.removeItem("pact_firewall_result");
      sessionStorage.removeItem("pact_payment_result");
      sessionStorage.removeItem("pact_request_text");
    } catch {
      // ignore
    }
    setRequestText("");
    setIntentResult(null);
    setOfferResult(null);
    setDealContractResult(null);
    setFirewallResult(null);
    setPaymentResult({ status: "IDLE" });
    setError(null);
    setCompilerError(null);
    setFirewallError(null);
    setOfferError(null);
    setPaymentError(null);
    setSelectedStage(1);
  };


  const handleSubmitRequest = async (e: React.FormEvent, forceFallback = false) => {
    e.preventDefault();
    if (!requestText.trim() || loading) return;

    setLoading(true);
    setError(null);
    setIntentResult(null);
    setOfferResult(null);
    setDealContractResult(null);
    setCompilerError(null);
    setProcessingStep(0);

    const stepInterval = setInterval(() => {
      setProcessingStep((prev) => (prev < 3 ? prev + 1 : prev));
    }, 400);

    try {
      const res = await fetch("/api/buyer-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request: requestText.trim(),
          dealId: dealContractResult?.dealId || intentResult?.dealId || undefined,
          useDevFallback: forceFallback,
        }),
      });

      const data = await res.json();
      clearInterval(stepInterval);

      if (!res.ok || !data.success) {
        const errObj = data.error;
        let errMsg = "Failed to process buyer intent.";
        if (typeof errObj === "string") {
          errMsg = errObj;
        } else if (errObj && typeof errObj === "object") {
          errMsg = errObj.message || errObj.code || JSON.stringify(errObj);
        }
        throw new Error(errMsg);
      }

      setProcessingStep(4);
      setIntentResult(data.intent);
      setIsFallbackMode(Boolean(data.isFallback));
      setRequestText(""); // Clear the input textarea box after submitting
      try {
        sessionStorage.removeItem("pact_request_text");
        sessionStorage.setItem("pact_intent_result", JSON.stringify(data.intent));
        sessionStorage.removeItem("pact_offer_result");
        sessionStorage.removeItem("pact_contract_result");
        sessionStorage.removeItem("pact_firewall_result");
      } catch {
        // ignore
      }

      // Seamless Autonomous Pipeline: Auto-trigger Stage 2 Merchant Offer Construction
      if (data.intent?.id) {
        setOfferLoading(true);
        setOfferError(null);
        setDealContractResult(null);
        setCompilerError(null);
        setFirewallResult(null);
        setFirewallError(null);
        setOfferProcessingStep(0);

        const offerStepInterval = setInterval(() => {
          setOfferProcessingStep((prev) => (prev < 4 ? prev + 1 : prev));
        }, 450);

        try {
          const offerRes = await fetch("/api/merchant-offer", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              buyerIntentId: data.intent.id,
              merchantId: activeTargetMerchantId,
            }),
          });

          const offerData = await offerRes.json();
          clearInterval(offerStepInterval);

          if (offerRes.ok && offerData.success && offerData.offer) {
            setOfferProcessingStep(5);
            setOfferResult(offerData.offer);
            // If we were in auto discovery mode, sync active store to the matched merchant
            if (offerData.offer.merchantId && offerData.offer.merchantId !== activeTargetMerchantId) {
              setActiveTargetMerchantId(offerData.offer.merchantId);
            }
            setSelectedStage(2); // Focus directly on the generated offer stage
            try {
              sessionStorage.setItem("pact_offer_result", JSON.stringify(offerData.offer));
            } catch {
              // ignore
            }
          } else {
            const errObj = offerData.error;
            let errMsg = "Failed to generate merchant offer.";
            if (typeof errObj === "string") {
              errMsg = errObj;
            } else if (errObj && typeof errObj === "object") {
              errMsg = errObj.message || errObj.code || JSON.stringify(errObj);
            }
            setOfferError(errMsg);
          }
        } catch (offerErr: unknown) {
          clearInterval(offerStepInterval);
          const msg = offerErr instanceof Error ? offerErr.message : "Failed to generate merchant offer.";
          setOfferError(msg);
        } finally {
          setOfferLoading(false);
        }
      }

    } catch (err: unknown) {
      clearInterval(stepInterval);
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateOffer = async () => {
    if (!intentResult?.id || offerLoading) return;

    setOfferLoading(true);
    setOfferError(null);
    setDealContractResult(null);
    setCompilerError(null);
    setFirewallResult(null);
    setFirewallError(null);
    setOfferProcessingStep(0);

    const stepInterval = setInterval(() => {
      setOfferProcessingStep((prev) => (prev < 4 ? prev + 1 : prev));
    }, 450);

    try {
      const res = await fetch("/api/merchant-offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyerIntentId: intentResult.id,
          merchantId: activeTargetMerchantId,
        }),
      });

      const data = await res.json();
      clearInterval(stepInterval);

      if (!res.ok || !data.success) {
        const errObj = data.error;
        let errMsg = "Failed to generate merchant offer.";
        if (typeof errObj === "string") {
          errMsg = errObj;
        } else if (errObj && typeof errObj === "object") {
          errMsg = errObj.message || errObj.code || JSON.stringify(errObj);
        }
        throw new Error(errMsg);
      }

      setOfferProcessingStep(5);
      setOfferResult(data.offer);
      try {
        sessionStorage.setItem("pact_offer_result", JSON.stringify(data.offer));
        sessionStorage.removeItem("pact_contract_result");
      } catch {
        // ignore
      }

    } catch (err: unknown) {
      clearInterval(stepInterval);
      const msg = err instanceof Error ? err.message : "Failed to generate merchant offer.";
      setOfferError(msg);
    } finally {
      setOfferLoading(false);
    }
  };

  const handleCompileDeal = async () => {
    if (!intentResult?.id || !offerResult?.id || compilerLoading) return;

    setCompilerLoading(true);
    setCompilerError(null);
    setCompilerProcessingStep(0);

    const stepInterval = setInterval(() => {
      setCompilerProcessingStep((prev) => (prev < 4 ? prev + 1 : prev));
    }, 350);

    try {
      const res = await fetch("/api/deal/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyerIntentId: intentResult.id,
          merchantOfferId: offerResult.id,
        }),
      });

      const data = await res.json();
      clearInterval(stepInterval);

      if (!res.ok) {
        const errObj = data.error;
        let errMsg = "Failed to compile deal contract.";
        if (typeof errObj === "string") {
          errMsg = errObj;
        } else if (errObj && typeof errObj === "object") {
          errMsg = errObj.message || errObj.code || JSON.stringify(errObj);
        }
        throw new Error(errMsg);
      }

      setCompilerProcessingStep(5);
      setDealContractResult(data.contract);
      setFirewallResult(null);
      setFirewallError(null);
      try {
        sessionStorage.setItem("pact_contract_result", JSON.stringify(data.contract));
        sessionStorage.removeItem("pact_firewall_result");
      } catch {
        // ignore
      }

    } catch (err: unknown) {
      clearInterval(stepInterval);
      const msg = err instanceof Error ? err.message : "Deal compilation failed.";
      setCompilerError(msg);
    } finally {
      setCompilerLoading(false);
    }
  };

  const handleRunFirewall = async () => {
    if (!dealContractResult?.dealId || firewallLoading) return;

    setFirewallLoading(true);
    setFirewallError(null);
    setFirewallProcessingStep(0);

    const stepInterval = setInterval(() => {
      setFirewallProcessingStep((prev) => (prev < 4 ? prev + 1 : prev));
    }, 400);

    try {
      const res = await fetch("/api/firewall/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealId: dealContractResult.dealId,
        }),
      });

      const data = await res.json();
      clearInterval(stepInterval);

      if (!res.ok || !data.success) {
        const errObj = data.error;
        let errMsg = "Failed to execute PACT Firewall evaluation.";
        if (typeof errObj === "string") {
          errMsg = errObj;
        } else if (errObj && typeof errObj === "object") {
          errMsg = errObj.message || errObj.code || JSON.stringify(errObj);
        }
        throw new Error(errMsg);
      }

      setFirewallProcessingStep(5);
      setFirewallResult(data.evaluation);

      // Update local contract status if it changed
      if (dealContractResult && data.evaluation?.overallStatus) {
        const updatedContract = {
          ...dealContractResult,
          status: data.evaluation.overallStatus as DealContract["status"],
        };
        setDealContractResult(updatedContract);
        try {
          sessionStorage.setItem("pact_contract_result", JSON.stringify(updatedContract));
        } catch {
          // ignore
        }
      }

      try {
        sessionStorage.setItem("pact_firewall_result", JSON.stringify(data.evaluation));
      } catch {
        // ignore
      }

    } catch (err: unknown) {
      clearInterval(stepInterval);
      const msg = err instanceof Error ? err.message : "PACT Firewall evaluation failed.";
      setFirewallError(msg);
    } finally {
      setFirewallLoading(false);
    }
  };

  // Phase 7: Initiate Razorpay Test Mode Payment Order & Checkout Modal
  const handleInitiatePayment = async () => {
    if (!dealContractResult?.dealId || paymentLoading || paymentVerifying) return;

    setPaymentLoading(true);
    setPaymentError(null);

    try {
      // 1. Create Razorpay order on server (authoritative amount strictly from Firestore)
      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealId: dealContractResult.dealId,
        }),
      });

      const orderData = await res.json();

      if (!res.ok || !orderData.success) {
        throw new Error(orderData.error || "Failed to create secure Razorpay payment order.");
      }

      setPaymentResult({
        status: "PENDING",
        orderId: orderData.orderId,
      });

      // 2. Open Razorpay Standard Checkout in Test Mode
      if (typeof window !== "undefined" && window.Razorpay) {
        const merchantMatch = availableMerchants.find((m) => m.id === (dealContractResult.merchantId || activeTargetMerchantId));
        const activeMerchantTitle = targetMerchant?.name || merchantMatch?.name || "ErgoSpace";

        const options: RazorpayOptions = {
          key: orderData.keyId,
          amount: orderData.amount,
          currency: orderData.currency || "INR",
          name: `PACT — ${activeMerchantTitle}`,
          description: `Contract #${dealContractResult.dealId}: ${orderData.productSummary}`,
          order_id: orderData.razorpayOrderId,
          handler: async (response: RazorpaySuccessResponse) => {
            // 3. Client receives response -> Submit to server for HMAC signature verification
            setPaymentVerifying(true);
            setPaymentResult({
              status: "PROCESSING",
              paymentId: response.razorpay_payment_id,
              orderId: response.razorpay_order_id,
            });

            try {
              const verifyRes = await fetch("/api/payments/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  dealId: dealContractResult.dealId,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                }),
              });

              const verifyData = await verifyRes.json();

              if (!verifyRes.ok || !verifyData.success) {
                throw new Error(verifyData.error || "Payment signature verification failed.");
              }

              // Update deal contract local state to PAID
              const paidContract = {
                ...dealContractResult,
                status: "PAID" as DealContract["status"],
              };
              setDealContractResult(paidContract);
              setPaymentResult({
                status: "PAID",
                paymentId: response.razorpay_payment_id,
                orderId: response.razorpay_order_id,
                message: "Payment successfully verified! Deal status is now PAID.",
              });

              try {
                sessionStorage.setItem("pact_contract_result", JSON.stringify(paidContract));
                sessionStorage.setItem("pact_payment_result", JSON.stringify({
                  status: "PAID",
                  paymentId: response.razorpay_payment_id,
                  orderId: response.razorpay_order_id,
                }));
              } catch {
                // ignore
              }
            } catch (err: unknown) {
              const errMsg = err instanceof Error ? err.message : "Payment verification failed.";
              setPaymentError(errMsg);
              setPaymentResult({
                status: "FAILED",
                message: errMsg,
              });
            } finally {
              setPaymentVerifying(false);
            }
          },
          prefill: {
            name: "PACT Buyer Agent",
            email: "buyer@pact-commerce.ai",
            contact: "9876543210",
          },
          notes: {
            dealId: dealContractResult.dealId,
            paymentMode: "Razorpay Standard Checkout (UPI / Cards / Netbanking)",
          },
          theme: {
            color: "#2563eb",
          },
          modal: {
            ondismiss: () => {
              setPaymentLoading(false);
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on("payment.failed", (response) => {
          const failReason = response.error?.description || response.error?.reason || "Payment was rejected or cancelled.";
          setPaymentError(failReason);
          setPaymentResult({
            status: "FAILED",
            message: failReason,
          });
        });
        rzp.open();
      } else {
        throw new Error("Razorpay Checkout SDK is still loading. Please try again in a moment.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Payment order creation failed.";
      setPaymentError(msg);
      setPaymentResult({ status: "FAILED", message: msg });
    } finally {
      setPaymentLoading(false);
    }
  };

  // Status Badge Logic
  const getHeaderStatusBadge = () => {
    if (paymentVerifying || paymentLoading) {
      return <StatusBadge status="payment_pending" label="PAYMENT IN PROGRESS" />;
    }
    if (dealContractResult?.status === "PAID" || paymentResult.status === "PAID") {
      return <StatusBadge status="paid" label="PAID & SETTLED" />;
    }
    if (firewallLoading || compilerLoading || loading || offerLoading) {
      return <StatusBadge status="validating" label="PROCESSING" />;
    }
    if (firewallResult) {
      if (firewallResult.overallStatus === "VALIDATED") {
        return <StatusBadge status="validated" label="FIREWALL VALIDATED" />;
      }
      if (firewallResult.overallStatus === "PENDING_APPROVAL") {
        return <StatusBadge status="pending_approval" label="APPROVAL REQUIRED" />;
      }
      return <StatusBadge status="rejected" label="FIREWALL BLOCKED" />;
    }
    if (dealContractResult) {
      return <StatusBadge status="compiled" label="CONTRACT COMPILED" />;
    }
    if (offerResult) {
      return <StatusBadge status="validated" label="OFFER GENERATED" />;
    }
    if (intentResult) {
      return <StatusBadge status="validated" label="AI PARSED" />;
    }
    if (error || offerError || compilerError || firewallError || paymentError) {
      return <StatusBadge status="rejected" label="REQUEST FAILED" />;
    }
    if (isGeminiConnected) {
      return <StatusBadge status="active" label="AI COMMERCE ENGINE ONLINE" />;
    }
    return <StatusBadge status="neutral" label="STANDBY" />;
  };

  // Helper for confidence badge colors
  const getConfidenceBadge = (confidence: number = 0) => {
    const percent = Math.round(confidence * 100);
    if (percent >= 80) {
      return {
        label: `${percent}% HIGH`,
        style: "bg-emerald-950/70 text-emerald-400 border-emerald-800/60",
      };
    }
    if (percent >= 50) {
      return {
        label: `${percent}% MEDIUM`,
        style: "bg-amber-950/70 text-amber-400 border-amber-800/60",
      };
    }
    return {
      label: `${percent}% LOW`,
      style: "bg-rose-950/70 text-rose-400 border-rose-800/60",
    };
  };

  return (
    <PageContainer>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <PageHeader
            title="PACT DEAL ROOM"
            description="Autonomous AI-to-AI commerce pipeline with real-time intent parsing, catalog offers, deterministic compilation, and policy firewall gates."
            badge={getHeaderStatusBadge()}
          />
        </div>

        {/* Tab Switcher: Deal Pipeline vs Deals History */}
        <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs self-start sm:self-center shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("pipeline")}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "pipeline"
                ? "bg-blue-600 text-white shadow-md shadow-blue-950/40"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Handshake className="w-3.5 h-3.5" />
            <span>ACTIVE PIPELINE</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "history"
                ? "bg-purple-600 text-white shadow-md shadow-purple-950/40"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>DEALS HISTORY</span>
          </button>
        </div>
      </div>

      {activeTab === "history" ? (
        /* 📜 DEALS HISTORY TAB VIEW */
        <div className="space-y-6 font-mono pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wide">
              NEGOTIATED DEALS LEDGER ({dealsHistory.length})
            </h2>
            <button
              type="button"
              onClick={loadDealsHistory}
              disabled={historyLoading}
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${historyLoading ? "animate-spin" : ""}`} />
              <span>REFRESH</span>
            </button>
          </div>

          {historyLoading ? (
            <div className="p-12 text-center text-xs text-slate-400 border border-slate-800 rounded-2xl bg-slate-950/80">
              Loading past deals from Firestore...
            </div>
          ) : dealsHistory.length === 0 ? (
            <div className="p-12 text-center space-y-3 border border-dashed border-slate-800 rounded-2xl bg-slate-950/80">
              <History className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="text-xs text-slate-400">No completed deals found in Firestore ledger yet.</p>
              <button
                type="button"
                onClick={() => setActiveTab("pipeline")}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold"
              >
                Create First Deal
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dealsHistory.map((item) => {
                const deal = item.deal;
                const dealId = deal?.dealId || item.dealId || item.id;
                const amountVal = typeof item.amount === "number" ? item.amount : (item.finalAmount || 0);
                const displayAmount = amountVal > 1000 ? amountVal : amountVal;

                return (
                  <SpotlightCard
                    key={item.id || item.orderId || dealId}
                    spotlightColor="rgba(168, 85, 247, 0.15)"
                    className="bg-slate-950/90 border border-slate-800 p-5 rounded-2xl space-y-3 shadow-lg"
                  >
                    <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-3">
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-slate-500 font-bold uppercase">DEAL ID</span>
                        <p className="text-xs font-bold text-slate-100 font-mono">{dealId}</p>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.status === "PAID"
                            ? "bg-emerald-950 border border-emerald-800 text-emerald-300"
                            : "bg-blue-950 border border-blue-800 text-blue-300"
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-400">
                        <span>Merchant:</span>
                        <span className="text-slate-200 font-bold">{item.merchantName || "ErgoSpace"}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Settled Amount:</span>
                        <span className="text-emerald-400 font-bold"><CountUp to={displayAmount} prefix="₹" /></span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Date & Time:</span>
                        <span className="text-slate-300">{new Date(item.createdAt).toLocaleString()}</span>
                      </div>
                      <div className="pt-2 flex items-center gap-2 border-t border-slate-800/80">
                        <Link
                          href={`/deal-room?dealId=${dealId}`}
                          onClick={() => {
                            const mId = item.merchantId || deal?.merchantId;
                            if (mId) {
                              setActiveTargetMerchantId(mId);
                            }
                            setActiveTab("pipeline");
                          }}
                          className="flex-1 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-center text-xs font-bold transition-all shadow-md shadow-blue-950/40 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Handshake className="w-3.5 h-3.5" />
                          <span>OPEN IN DEAL ROOM</span>
                        </Link>
                      </div>
                    </div>
                  </SpotlightCard>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* 🚀 ACTIVE DEAL PIPELINE TAB VIEW */
        <>
      {/* 🧭 REACT BITS POWERED PACT DEAL LIFECYCLE STEPPER RAIL */}
      <DealStepper
        steps={lifecycle.steps}
        selectedStep={selectedStage}
        onSelectStep={(stepNum) => {
          if (typeof stepNum === "number") setSelectedStage(stepNum);
        }}
        overallStatus={lifecycle.overallLifecycleStatus}
        dealId={dealContractResult?.dealId}
      />

      {/* Target Merchant Context Header */}
      <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 font-mono text-xs flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg shadow-slate-950/20">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-950/80 border border-emerald-800/80 flex items-center justify-center text-emerald-400 shrink-0">
            <Store className="w-4 h-4" />
          </div>
          <div className="space-y-0.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-extrabold text-sm text-slate-100">
                {activeTargetMerchantId === "all" ? "All Stores (Network Discovery)" : targetMerchant?.name || activeTargetMerchantId}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold tracking-wide">
                {activeTargetMerchantId === "all" ? "MULTI-STORE AUTO DISCOVERY" : "ACTIVE SELLER"}
              </span>
            </div>
            <p 
              title={activeTargetMerchantId === "all" ? "Autonomous discovery across all verified merchant catalogs in the PACT network." : (targetMerchant?.description || "Autonomous commercial seller on PACT")}
              className="text-xs text-slate-400 font-sans truncate hover:whitespace-normal hover:overflow-visible transition-all duration-200 cursor-help"
            >
              {activeTargetMerchantId === "all" 
                ? "Autonomous discovery across all verified merchant catalogs in the PACT network." 
                : (targetMerchant?.description || "Autonomous commercial seller on PACT")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-start md:self-center">
          <label htmlFor="merchant-selector" className="text-slate-400 text-xs font-mono whitespace-nowrap">
            Switch Merchant Store:
          </label>
          <select
            id="merchant-selector"
            value={activeTargetMerchantId}
            onChange={(e) => {
              const newMerchantId = e.target.value;
              setActiveTargetMerchantId(newMerchantId);
              setPromptCategory(newMerchantId);
              // Cleanly reset deal room state and return to Stage 1
              try {
                sessionStorage.removeItem("pact_intent_result");
                sessionStorage.removeItem("pact_offer_result");
                sessionStorage.removeItem("pact_contract_result");
                sessionStorage.removeItem("pact_firewall_result");
                sessionStorage.removeItem("pact_payment_result");
                sessionStorage.removeItem("pact_request_text");
              } catch {
                // ignore
              }
              setRequestText("");
              setIntentResult(null);
              setOfferResult(null);
              setDealContractResult(null);
              setFirewallResult(null);
              setPaymentResult({ status: "IDLE" });
              setError(null);
              setCompilerError(null);
              setFirewallError(null);
              setOfferError(null);
              setPaymentError(null);
              setSelectedStage(1);
            }}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs font-mono focus:outline-none focus:border-blue-500 cursor-pointer shadow-sm"
          >
            <option value="all">All Stores (Network Discovery)</option>
            {availableMerchants.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Top Main Section: Stage 1 Natural Language Input & Sample Chips */}
      {selectedStage === 1 && (
        <SpotlightCard
          spotlightColor="rgba(56, 189, 248, 0.15)"
          className="bg-slate-950/80 border border-slate-800 p-0 rounded-2xl"
        >
          <div className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-blue-400" />
                <h2 className="text-base font-bold text-slate-100 font-mono">BUYER AI NATURAL LANGUAGE INPUT</h2>
              </div>
              {isFallbackMode && (
                <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-amber-950/70 text-amber-400 border border-amber-800/60 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" />
                  DEV FALLBACK
                </span>
              )}
            </div>

          <form onSubmit={handleSubmitRequest} className="space-y-4">
            <div className="relative">
              <textarea
                value={requestText}
                onChange={(e) => setRequestText(e.target.value)}
                maxLength={1000}
                rows={3}
                placeholder="Enter your purchase request here, or select a recommended prompt below..."
                className="w-full p-4 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors resize-none"
              />
              <div className="absolute right-3 bottom-3 text-[11px] font-mono text-slate-500">
                {requestText.length} / 1000
              </div>
            </div>

            {/* Cross-Merchant Product & Multi-Merchant Conflict Warning Banner */}
            {detectedMerchantAnalysis && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3.5 rounded-xl bg-amber-950/60 border border-amber-800/90 text-amber-200 text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg"
              >
                <div className="flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
                  <div>
                    {detectedMerchantAnalysis.type === "MULTI_MERCHANT_CONFLICT" ? (
                      <div>
                        <span className="font-bold text-amber-300">Multi-Store Notice: </span>
                        <span>{detectedMerchantAnalysis.message}</span>
                        <div className="text-[11px] text-amber-300/80 mt-1">
                          Select one store to proceed with autonomous negotiation:
                        </div>
                      </div>
                    ) : (
                      <div>
                        <span className="font-bold text-amber-300">Catalog Notice: </span>
                        <span>
                          &quot;{detectedMerchantAnalysis.matchedKeyword}&quot; is supplied by{" "}
                          <strong className="text-amber-100">{detectedMerchantAnalysis.suggestedMerchantName}</strong>. Your active store is{" "}
                          <strong className="text-slate-200">{targetMerchant?.name || activeTargetMerchantId}</strong>.
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {detectedMerchantAnalysis.type === "MULTI_MERCHANT_CONFLICT" ? (
                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    {detectedMerchantAnalysis.stores.map((s) => (
                      <button
                        key={s.merchantId}
                        type="button"
                        onClick={() => {
                          setActiveTargetMerchantId(s.merchantId);
                          setPromptCategory(s.merchantId);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer shadow-md shadow-amber-950/40"
                      >
                        <Store className="w-3 h-3" />
                        <span>Use {s.merchantName}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTargetMerchantId(detectedMerchantAnalysis.suggestedMerchantId);
                      setPromptCategory(detectedMerchantAnalysis.suggestedMerchantId);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-md shadow-amber-950/40"
                  >
                    <Store className="w-3.5 h-3.5" />
                    <span>Switch to {detectedMerchantAnalysis.suggestedMerchantName}</span>
                  </button>
                )}
              </motion.div>
            )}

            {/* Prompt Recommendation Filter & Chips */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/60 pb-2">
                <span className="text-xs font-mono text-slate-400 font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  <span>EXPLORE PROMPTS BY MERCHANT:</span>
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPromptCategory("all")}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-colors cursor-pointer ${
                      promptCategory === "all"
                        ? "bg-blue-600 text-white font-bold"
                        : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    All Stores
                  </button>
                  {availableMerchants.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPromptCategory(m.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-colors cursor-pointer ${
                        promptCategory === m.id
                          ? "bg-blue-600 text-white font-bold"
                          : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {m.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                {(MERCHANT_PROMPT_RECOMMENDATIONS[promptCategory] || MERCHANT_PROMPT_RECOMMENDATIONS.all).map((item, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setRequestText(item.prompt);
                      if (activeTargetMerchantId !== item.merchantId) {
                        setActiveTargetMerchantId(item.merchantId);
                      }
                    }}
                    className="group px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 hover:text-slate-100 hover:border-blue-700/60 hover:bg-slate-800/80 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                  >
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400 group-hover:text-blue-300 group-hover:border-blue-900">
                      {item.merchantName}
                    </span>
                    <span>&quot;{item.prompt}&quot;</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Active In-Progress Deal / Settled Deal Control Bar */}
            {Boolean(intentResult || offerResult || dealContractResult) && (
              <div className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono ${
                paymentResult?.status === "PAID" || dealContractResult?.status === "PAID"
                  ? "bg-emerald-950/30 border-emerald-800/50"
                  : "bg-slate-900/80 border-blue-900/40"
              }`}>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${
                    paymentResult?.status === "PAID" || dealContractResult?.status === "PAID"
                      ? "bg-emerald-400"
                      : "bg-blue-400 animate-pulse"
                  }`} />
                  <span className={`${
                    paymentResult?.status === "PAID" || dealContractResult?.status === "PAID"
                      ? "text-emerald-300"
                      : "text-slate-300"
                  } font-bold`}>
                    {paymentResult?.status === "PAID" || dealContractResult?.status === "PAID"
                      ? "Completed Transaction:"
                      : "Active Deal in Progress:"}
                  </span>
                  <span className={`${
                    paymentResult?.status === "PAID" || dealContractResult?.status === "PAID"
                      ? "text-slate-200"
                      : "text-blue-300"
                  } font-bold`}>
                    {dealContractResult?.dealId || "Negotiating with " + (targetMerchant?.name || activeTargetMerchantId)}
                  </span>
                  <span className={`${
                    paymentResult?.status === "PAID" || dealContractResult?.status === "PAID"
                      ? "text-emerald-400 font-bold"
                      : "text-slate-500 font-normal"
                  }`}>
                    {paymentResult?.status === "PAID" || dealContractResult?.status === "PAID"
                      ? "(PAID & SETTLED)"
                      : `(Stage ${selectedStage} / 5)`}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {paymentResult?.status === "PAID" || dealContractResult?.status === "PAID" ? (
                    <Link
                      href={`/transactions/${dealContractResult?.dealId || ""}`}
                      className="px-3 py-1 rounded-lg bg-emerald-950 hover:bg-emerald-900 border border-emerald-700 text-emerald-300 text-xs font-mono transition-colors font-bold"
                    >
                      View Receipt →
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={handleStartNewDeal}
                      className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-rose-950 hover:border-rose-800 border border-slate-700 text-slate-300 hover:text-rose-300 text-xs font-mono transition-colors cursor-pointer"
                    >
                      Cancel / New Deal
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-2">


              <span className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isGeminiConnected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
                Autonomous AI Commerce Intent Engine
              </span>
              <Ripple className="rounded-xl">
                <button
                  type="submit"
                  disabled={loading || !requestText.trim()}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-mono text-xs font-bold hover:bg-blue-500 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-blue-950/40 cursor-pointer"
                >

                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>{PROCESSING_STEPS[processingStep]}...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-blue-200" />
                      <span>PARSE BUYER INTENT</span>
                    </>
                  )}
                </button>
              </Ripple>
            </div>

          </form>

          {/* Error Message Alert */}
          {error && (
            <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs font-mono flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => handleSubmitRequest(e, false)}
                  className="px-3 py-1 rounded bg-rose-900/80 border border-rose-700 hover:bg-rose-800 transition-colors text-white font-mono text-[11px] flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Retry Request
                </button>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="text-slate-400 hover:text-slate-200 text-xs"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>
      </SpotlightCard>
      )}

      {/* Lifecycle Pipeline View (Stages 1-3) - focused single stage presentation */}
      {Boolean(intentResult || offerResult || dealContractResult) && (selectedStage === 1 || selectedStage === 2 || selectedStage === 3) && (
        <div className="grid grid-cols-1 max-w-3xl mx-auto pt-2 items-start">
          {/* Column 1: BUYER INTENT */}
          {selectedStage === 1 && (
            <div className="space-y-4">
          {intentResult ? (
            <SpotlightCard
              spotlightColor="rgba(56, 189, 248, 0.18)"
              className="bg-slate-950/90 border border-slate-800 p-0 rounded-2xl shadow-xl shadow-slate-950/40"
            >
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 space-y-4 font-mono"
              >
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 gap-2">
                  <div className="flex items-center gap-2 shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wide whitespace-nowrap">1. BUYER INTENT</h2>
                  </div>
                  <StatusBadge status="validated" label="PARSED & SAVED" />
                </div>

                <div className="space-y-3.5">
                  {/* Product Need */}
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">PRODUCT NEED</span>
                    <p className="text-base font-bold text-slate-100">{intentResult.productIntent}</p>
                  </div>

                  {/* Quantity & Budget */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">QUANTITY</span>
                      <p className="text-base font-bold text-slate-100">
                        {intentResult.quantity !== null ? `${intentResult.quantity} units` : <span className="text-slate-500 italic font-normal text-sm">Not specified</span>}
                      </p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">BUDGET</span>
                      <p className="text-base font-bold text-emerald-400">
                        {intentResult.budget !== null ? <CountUp to={intentResult.budget} prefix="₹" /> : <span className="text-slate-500 italic font-normal text-sm">Not specified</span>}
                      </p>
                    </div>
                  </div>

                  {/* Discount Request & Delivery SLA */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">DISCOUNT</span>
                      <p className="text-sm font-bold text-slate-100">
                        {intentResult.requestedDiscount !== null ? (
                          typeof intentResult.requestedDiscount === "number" ? `${intentResult.requestedDiscount}%` : intentResult.requestedDiscount
                        ) : (
                          <span className="text-slate-500 italic font-normal text-sm">Not specified</span>
                        )}
                      </p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">DELIVERY SLA</span>
                      <p className="text-sm font-bold text-slate-100">
                        {intentResult.deliveryMaxDays !== null ? `${intentResult.deliveryMaxDays} days max` : <span className="text-slate-500 italic font-normal text-sm">Not specified</span>}
                      </p>
                    </div>
                  </div>

                  {/* Preferences */}
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">PREFERENCES</span>
                    <div className="flex flex-wrap gap-2">
                      {intentResult.preferences && intentResult.preferences.length > 0 ? (
                        intentResult.preferences.map((p, i) => (
                          <span key={i} className="px-2.5 py-1 rounded-md bg-blue-950/70 border border-blue-800/60 text-blue-300 text-xs font-semibold">
                            [{p}]
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-500 italic text-xs">None specified</span>
                      )}
                    </div>
                  </div>

                  {/* Negotiable Constraints */}
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">NEGOTIABLE TERMS</span>
                    <div className="flex flex-wrap gap-2">
                      {intentResult.negotiableConstraints && intentResult.negotiableConstraints.length > 0 ? (
                        intentResult.negotiableConstraints.map((n, i) => (
                          <span key={i} className="px-2.5 py-1 rounded-md bg-purple-950/70 border border-purple-800/60 text-purple-300 text-xs font-semibold">
                            [{n}]
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-500 italic text-xs">None specified</span>
                      )}
                    </div>
                  </div>

                  {/* Confidence Indicator */}
                  {(() => {
                    const badge = getConfidenceBadge(intentResult.confidence);
                    return (
                      <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">PARSER CONFIDENCE</span>
                          <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${badge.style}`}>
                            {badge.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-sans leading-relaxed">
                          Confidence reflects how clearly the AI could extract the requested constraints from your prompt.
                        </p>
                      </div>
                    );
                  })()}

                  {/* Generate Merchant Offer Action Button */}
                  <div className="pt-2">
                    <Ripple className="w-full rounded-xl">
                      <button
                        type="button"
                        onClick={handleGenerateOffer}
                        disabled={offerLoading}
                        className="w-full py-3 rounded-xl bg-emerald-600 text-white font-mono text-sm font-bold hover:bg-emerald-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 cursor-pointer"
                      >
                        {offerLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>{MERCHANT_PROCESSING_STEPS[offerProcessingStep]}...</span>
                          </>
                        ) : (
                          <>
                            <Bot className="w-4 h-4" />
                            <span>GENERATE MERCHANT OFFER</span>
                          </>
                        )}
                      </button>
                    </Ripple>
                  </div>

                  {/* View Raw JSON Accordion */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setShowRawJson(!showRawJson)}
                      className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 hover:text-slate-100 transition-colors"
                    >
                      <span>{showRawJson ? "Hide Raw Structure" : "View Raw Structure"}</span>
                      {showRawJson ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    <AnimatePresence>
                      {showRawJson && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-2 rounded-xl bg-slate-950 border border-slate-800/90 overflow-hidden shadow-inner">
                            <div className="px-3.5 py-2 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
                              <span>BUYER INTENT PAYLOAD</span>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(JSON.stringify(intentResult, null, 2));
                                }}
                                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] transition-colors cursor-pointer"
                              >
                                COPY JSON
                              </button>
                            </div>
                            <pre className="p-3.5 text-xs font-mono text-emerald-400/90 max-h-60 overflow-y-auto overflow-x-auto leading-relaxed scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                              {JSON.stringify(intentResult, null, 2)}
                            </pre>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            </SpotlightCard>
          ) : (
            <SpotlightCard
              spotlightColor="rgba(56, 189, 248, 0.15)"
              className="bg-slate-950/80 border border-slate-800 p-0 rounded-2xl"
            >
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h2 className="text-base font-bold text-slate-100 font-mono">1. BUYER INTENT</h2>
                  <StatusBadge status="neutral" label="STANDBY" />
                </div>
              </div>
            </SpotlightCard>
          )}
            </div>
          )}

          {/* Column 2: MERCHANT OFFER (Gate #2: DISCOVER) */}
          {selectedStage === 2 && (
            <div className="space-y-4">
              {offerResult ? (
                <SpotlightCard
                  spotlightColor="rgba(34, 197, 94, 0.18)"
                  className="bg-slate-950/90 border border-slate-800 p-0 rounded-2xl shadow-xl shadow-slate-950/40"
                >
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 space-y-4 font-mono"
              >
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 gap-2">
                  <div className="flex items-center gap-2 shrink-0">
                    <CheckCircle2 className={`w-4 h-4 shrink-0 ${offerResult.status === "OFFER_GENERATED" ? "text-emerald-400" : "text-amber-400"}`} />
                    <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wide whitespace-nowrap">2. MERCHANT OFFER</h2>
                  </div>
                  <StatusBadge
                    status={
                      offerResult.status === "OFFER_GENERATED"
                        ? "validated"
                        : offerResult.status === "ALTERNATIVE_FOUND"
                        ? "negotiating"
                        : "rejected"
                    }
                    label={offerResult.status}
                  />
                </div>

                {/* Selected Products Table */}
                <div className="space-y-2.5">
                  <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">SELECTED PRODUCTS</span>
                  {offerResult.selectedItems.length > 0 ? (
                    <div className="divide-y divide-slate-800 rounded-xl bg-slate-900/60 border border-slate-800/80 overflow-hidden">
                      {offerResult.selectedItems.map((item, idx) => (
                        <div key={idx} className="p-3.5 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-100">{item.productName}</span>
                            <span className="text-sm font-bold text-emerald-400"><CountUp to={item.lineTotal} prefix="₹" /></span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <span className="flex items-center gap-1"><CountUp to={item.quantity} /> units @ <CountUp to={item.unitPrice} prefix="₹" /></span>
                            <span className="text-[11px] text-emerald-400 font-bold font-mono">IN STOCK</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-800/60 text-xs text-amber-300 flex items-center justify-between gap-2">
                      <span>No exact match pre-selected. Please adopt a recommended alternative below to proceed.</span>
                    </div>
                  )}
                </div>

                {/* Totals Breakdown */}
                {offerResult.selectedItems.length > 0 ? (
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-sm">Subtotal</span>
                      <span className="font-bold text-sm text-slate-100"><CountUp to={offerResult.subtotal} prefix="₹" /></span>
                    </div>
                    <div className="flex items-center justify-between text-amber-400">
                      <span className="text-sm">Proposed Discount (<CountUp to={offerResult.proposedDiscount.percentage} suffix="%" />)</span>
                      <span className="font-bold text-sm">-<CountUp to={offerResult.proposedDiscount.amount} prefix="₹" /></span>
                    </div>
                    {offerResult.status !== "NO_VALID_OFFER" && (
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="text-sm">Delivery SLA</span>
                        <span className="font-bold text-sm text-slate-100"><CountUp to={offerResult.deliveryDays} suffix=" days" /></span>
                      </div>
                    )}
                    <div className="pt-2.5 border-t border-slate-800 flex items-center justify-between text-base font-bold text-slate-100">
                      <span>Estimated Total</span>
                      <span className="text-emerald-400 text-lg font-extrabold"><CountUp to={offerResult.estimatedFinalAmount} prefix="₹" /></span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs font-mono text-center text-slate-400">
                    Awaiting alternative selection to calculate final deal totals
                  </div>
                )}

                {/* Commercial Reasoning */}
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1.5">
                    <span className="text-xs text-blue-400 uppercase font-bold tracking-wider">BUYER FIT</span>
                    <p className="text-xs text-slate-300 font-sans leading-relaxed">{offerResult.buyerFitExplanation}</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1.5">
                    <span className="text-xs text-purple-400 uppercase font-bold tracking-wider">MERCHANT OPPORTUNITY</span>
                    <p className="text-xs text-slate-300 font-sans leading-relaxed">{offerResult.merchantOpportunityExplanation}</p>
                  </div>
                </div>

                {/* Alternative Products Recommendation (if status is ALTERNATIVE_FOUND or alternatives exist) */}
                {offerResult.alternativeItems && offerResult.alternativeItems.length > 0 && (
                  <div className="space-y-2.5 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-amber-400 uppercase font-bold tracking-wider">
                        RECOMMENDED ALTERNATIVES ({offerResult.alternativeItems.length})
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">1-CLICK ADOPT</span>
                    </div>
                    <div className="divide-y divide-slate-800 rounded-xl bg-amber-950/20 border border-amber-800/60 overflow-hidden">
                      {offerResult.alternativeItems.map((alt, idx) => (
                        <div key={idx} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-slate-100">{alt.productName}</span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 border border-amber-800 text-amber-300">
                                AVAILABLE
                              </span>
                            </div>
                            <p className="text-xs text-slate-400">
                              {alt.quantity} units @ ₹{alt.unitPrice.toLocaleString("en-IN")} = <strong className="text-emerald-400 font-mono">₹{alt.lineTotal.toLocaleString("en-IN")}</strong>
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              // Adopt alternative item as the primary selected item and remove it from remaining alternatives
                              const remainingAlternatives = (offerResult.alternativeItems || []).filter(
                                (a) => a.productId !== alt.productId
                              );
                              const discountPercent = offerResult.proposedDiscount?.percentage || 0;
                              const discountAmount = Math.round(alt.lineTotal * (discountPercent / 100));
                              const updatedOffer: MerchantOffer = {
                                ...offerResult,
                                status: "OFFER_GENERATED",
                                selectedItems: [alt],
                                alternativeItems: remainingAlternatives,
                                subtotal: alt.lineTotal,
                                proposedDiscount: {
                                  percentage: discountPercent,
                                  amount: discountAmount,
                                  reasoning: offerResult.proposedDiscount?.reasoning || "Adopted catalog alternative discount",
                                },
                                estimatedFinalAmount: alt.lineTotal - discountAmount,
                              };
                              setOfferResult(updatedOffer);
                              try {
                                sessionStorage.setItem("pact_offer_result", JSON.stringify(updatedOffer));
                              } catch {
                                // ignore
                              }
                            }}
                            className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-md shadow-amber-950/40"
                          >
                            <Handshake className="w-3.5 h-3.5" />
                            <span>ADOPT ALTERNATIVE</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Compile Deal Action Button (Phase 5) */}
                {isDealPaid ? (
                  <div className="pt-2 p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-emerald-300 text-xs font-mono">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>This commercial offer has been compiled and settled.</span>
                    </div>
                    <Link
                      href={`/transactions/${dealContractResult?.dealId || ""}`}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs font-mono transition-colors shrink-0"
                    >
                      View Receipt →
                    </Link>
                  </div>
                ) : offerResult.selectedItems.length > 0 ? (
                  <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                    <Ripple className="flex-1 rounded-xl w-full">
                      <button
                        type="button"
                        onClick={handleCompileDeal}
                        disabled={compilerLoading}
                        className="w-full py-3 rounded-xl bg-purple-600 text-white font-mono text-sm font-bold hover:bg-purple-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-purple-950/50 cursor-pointer"
                      >
                        {compilerLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>{COMPILER_PROCESSING_STEPS[compilerProcessingStep]}...</span>
                          </>
                        ) : (
                          <>
                            <Cpu className="w-4 h-4" />
                            <span>COMPILE DEAL</span>
                          </>
                        )}
                      </button>
                    </Ripple>
                    <button
                      type="button"
                      onClick={handleStartNewDeal}
                      className="w-full sm:w-auto py-3 px-4 rounded-xl bg-slate-900 hover:bg-rose-950/60 border border-slate-800 hover:border-rose-800 text-slate-400 hover:text-rose-300 font-mono text-xs font-bold transition-all cursor-pointer"
                    >
                      CANCEL DEAL
                    </button>
                  </div>
                ) : (
                  <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                    <button
                      type="button"
                      onClick={handleStartNewDeal}
                      className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-rose-950/50"
                    >
                      <AlertCircle className="w-4 h-4" />
                      <span>CANCEL & RE-NEGOTIATE DEAL</span>
                    </button>
                  </div>
                )}
              </motion.div>
            </SpotlightCard>
          ) : (
            <SpotlightCard
              spotlightColor="rgba(34, 197, 94, 0.15)"
              className="bg-slate-950/80 border border-slate-800 p-0 rounded-2xl"
            >
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h2 className="text-base font-bold text-slate-100 font-mono">2. MERCHANT OFFER</h2>
                  <StatusBadge status="neutral" label="STANDBY" />
                </div>
                <EmptyState
                  icon={Handshake}
                  title="No Offer Generated"
                  description={intentResult ? "Click 'GENERATE MERCHANT OFFER' under Buyer Intent to construct a valid offer." : "The Merchant Agent will construct valid commercial offers using real catalog data."}
                />
              </div>
            </SpotlightCard>
          )}

          {offerError && (
            <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs font-mono flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{offerError}</span>
            </div>
          )}
            </div>
          )}

          {/* Column 3: PACT DEAL CONTRACT (Gate #3: COMPILE) */}
          {selectedStage === 3 && (
            <div className="space-y-4">
              {dealContractResult ? (
                <SpotlightCard
                  spotlightColor="rgba(168, 85, 247, 0.25)"
                  className="bg-slate-950/90 border-2 border-purple-800/80 p-0 rounded-2xl shadow-xl shadow-purple-950/30"
                >
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="p-5 space-y-4 font-mono"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 gap-2">
                  <div className="flex items-center gap-2 shrink-0">
                    <Cpu className="w-4 h-4 text-purple-400 animate-pulse shrink-0" />
                    <div>
                      <h2 className="text-sm font-extrabold text-slate-100 uppercase tracking-wide whitespace-nowrap">3. PACT DEAL CONTRACT</h2>
                      <p className="text-[10px] text-slate-400 font-mono">#{dealContractResult.dealId}</p>
                    </div>
                  </div>
                  <StatusBadge
                    status={
                      dealContractResult.status === "VALIDATED"
                        ? "validated"
                        : dealContractResult.status === "PENDING_APPROVAL"
                        ? "pending_approval"
                        : dealContractResult.status === "REJECTED" || dealContractResult.status === "COMPILATION_FAILED"
                        ? "rejected"
                        : "compiled"
                    }
                    label={dealContractResult.status}
                  />
                </div>

                {/* Validation Checks Structured Card */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-purple-900/50 space-y-3">
                  <span className="text-xs text-purple-400 uppercase font-bold tracking-wider">COMPILATION VERIFICATION</span>
                  <div className="space-y-2 pt-1">
                    {dealContractResult.validationStatus.checks.map((check, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-200">{check.rule}</span>
                          <span className={check.status === "PASS" ? "text-emerald-400 font-bold text-xs" : "text-rose-400 font-bold text-xs"}>
                            [{check.status}]
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-sans leading-relaxed">{check.message}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Failure Alert Box if COMPILATION_FAILED */}
                {dealContractResult.status === "COMPILATION_FAILED" && (
                  <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-700/80 text-rose-200 text-xs font-mono space-y-2">
                    <div className="flex items-center gap-2 font-bold text-rose-300 text-sm">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>DEAL COMPILATION FAILED</span>
                    </div>
                    <p className="text-xs text-rose-200 leading-relaxed font-sans">
                      {dealContractResult.validationStatus.failureReason || "Compilation constraints violated. No contract was established."}
                    </p>
                  </div>
                )}

                {/* Selected Products Table */}
                {dealContractResult.items.length > 0 && (
                  <div className="space-y-2.5">
                    <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">CONTRACTED ITEMS</span>
                    <div className="divide-y divide-slate-800 rounded-xl bg-slate-900/60 border border-slate-800 overflow-hidden">
                      {dealContractResult.items.map((item, idx) => (
                        <div key={idx} className="p-3.5 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-100">{item.productName}</span>
                            <span className="text-sm font-bold text-purple-400"><CountUp to={item.lineTotal} prefix="₹" /></span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <span className="flex items-center gap-1"><CountUp to={item.quantity} /> units @ <CountUp to={item.unitPrice} prefix="₹" /></span>
                            <span className="text-[11px] text-emerald-400 font-bold">CATALOG VERIFIED</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Contract Financial Totals */}
                <div className="p-4 rounded-xl bg-slate-900/80 border border-purple-900/60 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-sm">Subtotal</span>
                    <span className="font-bold text-sm text-slate-100"><CountUp to={dealContractResult.subtotal} prefix="₹" /></span>
                  </div>
                  <div className="flex items-center justify-between text-amber-400">
                    <span className="text-sm">Discount (<CountUp to={dealContractResult.discount.percentage} suffix="%" />)</span>
                    <span className="font-bold text-sm">-<CountUp to={dealContractResult.discount.amount} prefix="₹" /></span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-sm">Delivery SLA</span>
                    <span className="font-bold text-sm text-slate-100"><CountUp to={dealContractResult.deliveryDays} suffix=" days" /></span>
                  </div>
                  <div className="pt-2.5 border-t border-purple-900/80 flex items-center justify-between text-base font-extrabold text-slate-100">
                    <span className="tracking-wider uppercase">FINAL AMOUNT</span>
                    <span className="text-emerald-400 text-xl font-mono"><CountUp to={dealContractResult.finalAmount} prefix="₹" /></span>
                  </div>
                </div>

                {/* Contract Download Options */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dealContractResult, null, 2));
                      const downloadAnchor = document.createElement("a");
                      downloadAnchor.setAttribute("href", dataStr);
                      downloadAnchor.setAttribute("download", `${dealContractResult.dealId}_contract.json`);
                      document.body.appendChild(downloadAnchor);
                      downloadAnchor.click();
                      downloadAnchor.remove();
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-purple-950/60 border border-purple-800/80 text-xs font-mono text-purple-300 hover:bg-purple-900/80 hover:text-white transition-colors cursor-pointer"
                    title="Download structured contract as JSON"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>DOWNLOAD JSON</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const textSummary = `PACT DEAL CONTRACT SUMMARY
=========================================
Deal ID:       ${dealContractResult.dealId}
Status:        ${dealContractResult.status}
Created At:    ${dealContractResult.createdAt}
Merchant ID:   ${dealContractResult.merchantId}
Buyer Intent:  ${dealContractResult.buyerIntentId}

BUYER REQUIREMENTS:
- Budget:       ${dealContractResult.buyerConstraints.budget ? `₹${dealContractResult.buyerConstraints.budget.toLocaleString("en-IN")}` : "None"}
- Quantity:     ${dealContractResult.buyerConstraints.quantity || "None"} units
- Delivery SLA: ${dealContractResult.buyerConstraints.deliveryMaxDays ? `${dealContractResult.buyerConstraints.deliveryMaxDays} days max` : "None"}

CONTRACTED ITEMS:
${dealContractResult.items.map((it) => `• ${it.productName} - ${it.quantity} units @ ₹${it.unitPrice.toLocaleString("en-IN")} = ₹${it.lineTotal.toLocaleString("en-IN")}`).join("\n")}

FINANCIAL BREAKDOWN:
- Subtotal:        ₹${dealContractResult.subtotal.toLocaleString("en-IN")}
- Discount:        ${dealContractResult.discount.percentage}% (-₹${dealContractResult.discount.amount.toLocaleString("en-IN")})
- Delivery Days:   ${dealContractResult.deliveryDays} days
- FINAL AMOUNT:    ₹${dealContractResult.finalAmount.toLocaleString("en-IN")}

COMPILATION CHECKS:
${dealContractResult.validationStatus.checks.map((c) => `[${c.status}] ${c.rule}: ${c.message}`).join("\n")}
=========================================`;

                      const dataStr = "data:text/plain;charset=utf-8," + encodeURIComponent(textSummary);
                      const downloadAnchor = document.createElement("a");
                      downloadAnchor.setAttribute("href", dataStr);
                      downloadAnchor.setAttribute("download", `${dealContractResult.dealId}_summary.txt`);
                      document.body.appendChild(downloadAnchor);
                      downloadAnchor.click();
                      downloadAnchor.remove();
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 hover:bg-slate-800 hover:text-slate-100 transition-colors cursor-pointer"
                    title="Download human-readable contract summary text"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>EXPORT SUMMARY</span>
                  </button>
                </div>

                {/* Raw Contract Structure Accordion */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowRawContractJson(!showRawContractJson)}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 hover:text-slate-100 transition-colors cursor-pointer"
                  >
                    <span>{showRawContractJson ? "Hide Structured Contract" : "View Structured Contract"}</span>
                    {showRawContractJson ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  <AnimatePresence>
                    {showRawContractJson && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-2 rounded-xl bg-slate-950 border border-slate-800/90 overflow-hidden shadow-inner">
                          <div className="px-3.5 py-2 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
                            <span>COMPILED CONTRACT PAYLOAD</span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(JSON.stringify(dealContractResult, null, 2));
                              }}
                              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] transition-colors cursor-pointer"
                            >
                              COPY JSON
                            </button>
                          </div>
                          <pre className="p-3.5 text-xs font-mono text-purple-300/90 max-h-60 overflow-y-auto overflow-x-auto leading-relaxed scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                            {JSON.stringify(dealContractResult, null, 2)}
                          </pre>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Compile Deal Contract Button to trigger Firewall */}
                {!firewallResult && dealContractResult.dealId && (
                  <div className="pt-2">
                    <Ripple className="w-full rounded-xl">
                      <button
                        type="button"
                        onClick={handleRunFirewall}
                        disabled={firewallLoading}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 text-white font-mono text-sm font-bold hover:from-orange-500 hover:to-amber-500 transition-all shadow-lg shadow-orange-950/50 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {firewallLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>{FIREWALL_PROCESSING_STEPS[firewallProcessingStep]}...</span>
                          </>
                        ) : (
                          <>
                            <Flame className="w-4 h-4 text-amber-200 animate-pulse" />
                            <span>EVALUATE WITH PACT FIREWALL</span>
                          </>
                        )}
                      </button>
                    </Ripple>
                  </div>
                )}
              </motion.div>
            </SpotlightCard>
          ) : (
            <SpotlightCard
              spotlightColor="rgba(168, 85, 247, 0.15)"
              className="bg-slate-950/80 border border-slate-800 p-0 rounded-2xl"
            >
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h2 className="text-base font-bold text-slate-100 font-mono">3. PACT DEAL CONTRACT</h2>
                  <StatusBadge status="neutral" label="UNCOMPILED" />
                </div>
                <EmptyState
                  icon={Handshake}
                  title="Uncompiled Deal"
                  description={offerResult ? "Click 'COMPILE DEAL' under Merchant Offer to execute deterministic compilation." : "The Deal Compiler will construct deterministic commercial contracts once an offer exists."}
                />
              </div>
            </SpotlightCard>
          )}
            </div>
          )}
        </div>
      )}

      {/* STAGE 4: PACT FIREWALL POLICY EVALUATION PANEL (Gate #4) */}
      {selectedStage === 4 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="pt-4"
        >
          <SpotlightCard
            spotlightColor={
              firewallResult?.overallStatus === "VALIDATED"
                ? "rgba(16, 185, 129, 0.25)"
                : firewallResult?.overallStatus === "PENDING_APPROVAL"
                ? "rgba(245, 158, 11, 0.25)"
                : firewallResult?.overallStatus === "REJECTED"
                ? "rgba(244, 63, 94, 0.25)"
                : "rgba(249, 115, 22, 0.2)"
            }
            className="w-full bg-slate-950/95 border-2 border-slate-800 rounded-3xl overflow-hidden shadow-2xl p-0"
          >
            <div className="p-5 sm:p-7 space-y-6 font-mono w-full max-w-full box-border overflow-hidden">
              {/* Firewall Panel Header */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-orange-950/80 border border-orange-800/60 text-orange-400 shrink-0">
                      <Flame className="w-6 h-6 animate-pulse" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-lg sm:text-xl font-extrabold tracking-wide text-slate-100 uppercase truncate">
                        PACT FIREWALL POLICY GATE
                      </h2>
                      <p className="text-xs text-slate-400 font-sans leading-relaxed">
                        Deterministic, zero-hallucination commercial governance enforcing live catalog, pricing, budget, and merchant policy constraints.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  {firewallResult ? (
                    <StatusBadge
                      status={
                        firewallResult.overallStatus === "VALIDATED"
                          ? "validated"
                          : firewallResult.overallStatus === "PENDING_APPROVAL"
                          ? "pending_approval"
                          : "rejected"
                      }
                      label={
                        firewallResult.overallStatus === "VALIDATED"
                          ? "FIREWALL VALIDATED"
                          : firewallResult.overallStatus === "PENDING_APPROVAL"
                          ? "PENDING APPROVAL"
                          : "FIREWALL REJECTED"
                      }
                      className="text-xs px-3 py-1 font-bold"
                    />
                  ) : (
                    <StatusBadge status="neutral" label="AWAITING EVALUATION" className="text-xs px-3 py-1 font-bold" />
                  )}

                  {dealContractResult && (
                    <Ripple className="rounded-xl">
                      <button
                        type="button"
                        onClick={handleRunFirewall}
                        disabled={firewallLoading}
                        className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 text-white font-mono text-xs font-bold hover:from-orange-500 hover:to-amber-500 transition-all shadow-lg shadow-orange-950/50 flex items-center gap-2 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                      >
                        {firewallLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>EVALUATING...</span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-4 h-4" />
                            <span>{firewallResult ? "RE-EVALUATE FIREWALL" : "RUN FIREWALL CHECK"}</span>
                          </>
                        )}
                      </button>
                    </Ripple>
                  )}
                </div>
              </div>

              {/* Loading State Banner */}
              {firewallLoading && (
                <div className="p-6 rounded-2xl bg-orange-950/30 border border-orange-800/50 flex flex-col items-center justify-center gap-3 text-center">
                  <div className="flex items-center gap-3 text-orange-400 font-bold text-sm">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{FIREWALL_PROCESSING_STEPS[firewallProcessingStep]}</span>
                  </div>
                  <p className="text-xs text-slate-400 font-sans max-w-lg">
                    Executing server-side deterministic policy verification across 9 security rules against live Firestore catalog data...
                  </p>
                </div>
              )}

              {/* Error Message if API fails */}
              {firewallError && (
                <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-700 text-rose-200 text-xs font-mono flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                  <div>
                    <span className="font-bold">Evaluation Error: </span>
                    <span>{firewallError}</span>
                  </div>
                </div>
              )}

              {/* Firewall Evaluation Decision Banner & Rule Grid */}
              {firewallResult && !firewallLoading && (
                <div className="space-y-6">
                  {/* Decision Banner */}
                  {firewallResult.overallStatus === "VALIDATED" && (
                    <div className="p-4 sm:p-5 rounded-2xl bg-emerald-950/60 border-2 border-emerald-700/80 text-emerald-200 space-y-2 shadow-lg shadow-emerald-950/30 overflow-hidden">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 text-sm sm:text-base font-extrabold text-emerald-300">
                          <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400 shrink-0" />
                          <span>✓ PACT FIREWALL PASSED — DEAL VALIDATED</span>
                        </div>
                        <span className="text-[11px] font-mono text-emerald-400/80 shrink-0">Evaluation #{firewallResult.id}</span>
                      </div>
                      <p className="text-xs font-sans text-emerald-100/90 leading-relaxed break-words">
                        {firewallResult.summary || "Deal satisfies all required merchant and buyer constraints. Eligible for settlement progression."}
                      </p>
                    </div>
                  )}

                  {firewallResult.overallStatus === "PENDING_APPROVAL" && (
                    <div className="p-4 sm:p-5 rounded-2xl bg-amber-950/60 border-2 border-amber-700/80 text-amber-200 space-y-2 shadow-lg shadow-amber-950/30 overflow-hidden">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 text-sm sm:text-base font-extrabold text-amber-300">
                          <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400 shrink-0" />
                          <span>⚠ HUMAN APPROVAL REQUIRED — PENDING APPROVAL</span>
                        </div>
                        <span className="text-[11px] font-mono text-amber-400/80 shrink-0">Evaluation #{firewallResult.id}</span>
                      </div>
                      <p className="text-xs font-sans text-amber-100/90 leading-relaxed break-words">
                        {firewallResult.summary || "Transaction exceeds the merchant's configured approval threshold. Routed to PENDING_APPROVAL state."}
                      </p>
                    </div>
                  )}

                  {firewallResult.overallStatus === "REJECTED" && (
                    <div className="p-4 sm:p-5 rounded-2xl bg-rose-950/70 border-2 border-rose-700/80 text-rose-200 space-y-2 shadow-lg shadow-rose-950/30 overflow-hidden">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 text-sm sm:text-base font-extrabold text-rose-300">
                          <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-rose-400 shrink-0" />
                          <span>✕ PACT FIREWALL BLOCKED — DEAL REJECTED</span>
                        </div>
                        <span className="text-[11px] font-mono text-rose-400/80 shrink-0">Evaluation #{firewallResult.id}</span>
                      </div>
                      <p className="text-xs font-sans text-rose-100/90 leading-relaxed break-words">
                        {firewallResult.summary || "Deal contains critical policy or constraint violations. Contract is rejected and prevented from executing."}
                      </p>
                    </div>
                  )}

                  {/* Firewall Summary Metric Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1 text-center">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">RULES CHECKED</span>
                      <p className="text-xl font-extrabold text-slate-100 font-mono">{firewallResult.rulesCheckedCount}</p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1 text-center">
                      <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">PASSED</span>
                      <p className="text-xl font-extrabold text-emerald-400 font-mono">{firewallResult.passedCount}</p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1 text-center">
                      <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">FAILED</span>
                      <p className="text-xl font-extrabold text-rose-400 font-mono">{firewallResult.failedCount}</p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1 text-center">
                      <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">FINAL DECISION</span>
                      <p className="text-sm font-extrabold text-purple-300 font-mono">{firewallResult.overallStatus}</p>
                    </div>
                  </div>

                  {/* 9-Rule Verification Matrix Cards */}
                  <div className="space-y-3">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      DETERMINISTIC POLICY CHECKPOINT MATRIX (9 RULES)
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                      {(firewallResult.evaluations && firewallResult.evaluations.length > 0
                        ? firewallResult.evaluations
                        : DEFAULT_FIREWALL_RULES.map((r) => ({
                            ruleName: r.ruleName as any,
                            status: (firewallResult.overallStatus === "VALIDATED" ? "PASS" : firewallResult.overallStatus === "REJECTED" && (r.ruleName === "DISCOUNT_LIMIT" || r.ruleName === "BUDGET_CONSTRAINT") ? "FAIL" : "PASS") as "PASS" | "FAIL",
                            severity: (firewallResult.overallStatus === "REJECTED" && (r.ruleName === "DISCOUNT_LIMIT" || r.ruleName === "BUDGET_CONSTRAINT") ? "CRITICAL" : firewallResult.overallStatus === "PENDING_APPROVAL" && r.ruleName === "HUMAN_APPROVAL_GATE" ? "WARNING" : "INFO") as "INFO" | "WARNING" | "CRITICAL",
                            explanation: r.description,
                            metadata: {},
                          }))
                      ).map((evalItem, idx) => {
                        const isPass = evalItem.status === "PASS";
                        const isWarning = evalItem.severity === "WARNING";
                        return (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 ${
                              !isPass
                                ? "bg-rose-950/40 border-rose-800/70"
                                : isWarning
                                ? "bg-amber-950/30 border-amber-800/60"
                                : "bg-slate-900/70 border-slate-800/90"
                            }`}
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-bold text-slate-200 font-mono">{evalItem.ruleName}</span>
                                <span
                                  className={`px-2 py-0.5 rounded text-[11px] font-extrabold font-mono border ${
                                    !isPass
                                      ? "bg-rose-950 text-rose-400 border-rose-700"
                                      : isWarning
                                      ? "bg-amber-950 text-amber-400 border-amber-700"
                                      : "bg-emerald-950 text-emerald-400 border-emerald-700"
                                  }`}
                                >
                                  [{isWarning ? "GATE WARNING" : evalItem.status}]
                                </span>
                              </div>
                              <p className="text-xs text-slate-300 font-sans leading-relaxed">{evalItem.explanation}</p>
                            </div>

                            <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                              <span>SEVERITY:</span>
                              <span
                                className={`font-bold ${
                                  evalItem.severity === "CRITICAL"
                                    ? "text-rose-400"
                                    : evalItem.severity === "WARNING"
                                    ? "text-amber-400"
                                    : "text-emerald-400"
                                }`}
                              >
                                {evalItem.severity}
                              </span>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Firewall Document Export Actions */}
                  <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(firewallResult, null, 2));
                        const downloadAnchor = document.createElement("a");
                        downloadAnchor.setAttribute("href", dataStr);
                        downloadAnchor.setAttribute("download", `${firewallResult.id}_firewall_evaluation.json`);
                        document.body.appendChild(downloadAnchor);
                        downloadAnchor.click();
                        downloadAnchor.remove();
                      }}
                      className="flex-1 w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-orange-950/70 border border-orange-800/80 text-xs font-mono text-orange-300 hover:bg-orange-900/80 hover:text-white transition-colors cursor-pointer"
                      title="Download full structured Firewall evaluation as JSON"
                    >
                      <Download className="w-4 h-4" />
                      <span>DOWNLOAD FIREWALL JSON</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const textReport = `PACT FIREWALL POLICY EVALUATION AUDIT REPORT
================================================================
Evaluation ID:    ${firewallResult.id}
Deal ID:          ${firewallResult.dealId}
Timestamp:        ${firewallResult.evaluatedAt}
Overall Status:   ${firewallResult.overallStatus}
Rules Checked:    ${firewallResult.rulesCheckedCount}
Rules Passed:     ${firewallResult.passedCount}
Rules Failed:     ${firewallResult.failedCount}

POLICY SUMMARY:
${firewallResult.summary}

================================================================
9-RULE VERIFICATION CHECKPOINT AUDIT LOG:
================================================================
${firewallResult.evaluations
  .map(
    (e, idx) =>
      `[${idx + 1}] RULE: ${e.ruleName.padEnd(22)} | STATUS: [${e.status}] | SEVERITY: ${e.severity}
    EXPLANATION: ${e.explanation}`
  )
  .join("\n\n")}
================================================================
Generated deterministically by PACT Firewall Security Layer.
`;
                        const dataStr = "data:text/plain;charset=utf-8," + encodeURIComponent(textReport);
                        const downloadAnchor = document.createElement("a");
                        downloadAnchor.setAttribute("href", dataStr);
                        downloadAnchor.setAttribute("download", `${firewallResult.id}_firewall_audit_report.txt`);
                        document.body.appendChild(downloadAnchor);
                        downloadAnchor.click();
                        downloadAnchor.remove();
                      }}
                      className="flex-1 w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 hover:bg-slate-800 hover:text-slate-100 transition-colors cursor-pointer"
                      title="Download human-readable Firewall audit report text"
                    >
                      <FileText className="w-4 h-4" />
                      <span>EXPORT AUDIT REPORT</span>
                    </button>
                  </div>

                  {/* Raw Firewall Evaluation Accordion */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setShowRawFirewallJson(!showRawFirewallJson)}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-mono text-slate-300 hover:text-white hover:bg-slate-850 hover:border-slate-700 transition-all cursor-pointer shadow-sm"
                    >
                      <div className="flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-orange-400" />
                        <span className="font-bold">{showRawFirewallJson ? "Hide Raw Policy Document" : "View Raw Policy Evaluation Document"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <span className="text-[11px] font-sans text-slate-400">JSON Payload</span>
                        {showRawFirewallJson ? <ChevronUp className="w-4 h-4 text-orange-400" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </button>

                    <AnimatePresence>
                      {showRawFirewallJson && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-2 rounded-xl bg-slate-950 border border-slate-800/90 overflow-hidden shadow-inner">
                            <div className="px-4 py-2 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
                              <span>POLICY EVALUATION PAYLOAD (READ-ONLY)</span>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(JSON.stringify(firewallResult, null, 2));
                                }}
                                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] transition-colors cursor-pointer"
                              >
                                COPY JSON
                              </button>
                            </div>
                            <pre className="p-4 text-xs font-mono text-orange-300/90 max-h-72 overflow-y-auto overflow-x-auto leading-relaxed scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                              {JSON.stringify(firewallResult, null, 2)}
                            </pre>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              {/* Standby State when Deal Contract is ready but Firewall has not yet been executed, OR no deal compiled yet */}
              {!firewallResult && !firewallLoading && (
                <div className="space-y-6">
                  <div className="p-6 rounded-2xl bg-orange-950/20 border border-orange-800/40 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 text-orange-400 font-bold text-sm">
                        <Flame className="w-5 h-5 animate-pulse" />
                        <span>STANDBY — 9 DETERMINISTIC POLICY GATES ARMED</span>
                      </div>
                      {dealContractResult ? (
                        <Ripple className="rounded-xl">
                          <button
                            type="button"
                            onClick={handleRunFirewall}
                            disabled={firewallLoading}
                            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 text-white font-mono text-xs font-bold hover:from-orange-500 hover:to-amber-500 transition-all shadow-lg shadow-orange-950/50 flex items-center gap-2 cursor-pointer"
                          >
                            <ShieldCheck className="w-4 h-4" />
                            <span>EXECUTE 9-RULE FIREWALL CHECK</span>
                          </button>
                        </Ripple>
                      ) : (
                        <span className="text-xs font-mono text-slate-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                          Awaiting Stage 3 Deal Contract
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 font-sans leading-relaxed">
                      PACT Firewall executes zero-hallucination deterministic verification across 9 security rules before any transaction can proceed to payment settlement.
                    </p>
                  </div>

                  {/* Always-Visible 9-Rule Verification Matrix Cards */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        DETERMINISTIC POLICY CHECKPOINT MATRIX (9 RULES)
                      </span>
                      <span className="text-[11px] font-mono text-orange-400">STANDBY VERIFICATION MATRIX</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                      {DEFAULT_FIREWALL_RULES.map((rule, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-xl border bg-slate-900/60 border-slate-800/80 flex flex-col justify-between space-y-3"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-slate-200 font-mono">{rule.ruleName}</span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-400 border border-slate-700">
                                [STANDBY]
                              </span>
                            </div>
                            <p className="text-xs text-slate-300 font-sans leading-relaxed">{rule.description}</p>
                          </div>

                          <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                            <span>GATE #{idx + 1}</span>
                            <span className="text-orange-400 font-bold">READY TO VERIFY</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </SpotlightCard>
        </motion.div>
      )}

      {/* STAGE 5: RAZORPAY TEST MODE PAYMENT SETTLEMENT (Gate #5) */}
      {selectedStage === 5 && (dealContractResult || firewallResult) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="pt-4"
        >
          <SpotlightCard
            spotlightColor={
              dealContractResult?.status === "PAID" || paymentResult.status === "PAID"
                ? "rgba(16, 185, 129, 0.25)"
                : firewallResult?.overallStatus === "VALIDATED"
                ? "rgba(59, 130, 246, 0.25)"
                : "rgba(100, 116, 139, 0.2)"
            }
            className="w-full bg-slate-950/95 border-2 border-slate-800 rounded-3xl overflow-hidden shadow-2xl p-0"
          >
            <div className="p-5 sm:p-7 space-y-6 font-mono w-full max-w-full box-border overflow-hidden">
              {/* Payment Panel Header */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-blue-950/80 border border-blue-800/60 text-blue-400 shrink-0">
                      <CreditCard className="w-6 h-6 animate-pulse" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg sm:text-xl font-extrabold tracking-wide text-slate-100 uppercase truncate">
                          RAZORPAY SETTLEMENT (TEST MODE)
                        </h2>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-950 border border-blue-800 text-blue-300">
                          TEST MODE ONLY
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-sans leading-relaxed">
                        Deterministic payment gateway layer. AI agents never touch payment credentials. Authoritative amounts enforced server-side.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  {dealContractResult?.status === "PAID" || paymentResult.status === "PAID" ? (
                    <StatusBadge status="paid" label="PAID & SETTLED" className="text-xs px-3 py-1 font-bold" />
                  ) : paymentVerifying ? (
                    <StatusBadge status="validating" label="VERIFYING HMAC..." className="text-xs px-3 py-1 font-bold" />
                  ) : paymentLoading ? (
                    <StatusBadge status="payment_pending" label="CREATING ORDER..." className="text-xs px-3 py-1 font-bold" />
                  ) : firewallResult?.overallStatus === "VALIDATED" ? (
                    <StatusBadge status="validated" label="READY FOR PAYMENT" className="text-xs px-3 py-1 font-bold" />
                  ) : (
                    <StatusBadge status="neutral" label="AWAITING VALIDATION" className="text-xs px-3 py-1 font-bold" />
                  )}
                </div>
              </div>

              {/* Payment Alert / Notification Box */}
              {paymentError && (
                <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-700 text-rose-200 text-xs font-mono flex items-center justify-between gap-3 shadow-lg">
                  <div className="flex items-center gap-2.5">
                    <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                    <div>
                      <span className="font-bold">Payment Notice: </span>
                      <span>
                        {paymentError.includes("exceeds maximum amount")
                          ? "The transaction amount exceeds the Razorpay test sandbox limit of ₹1,00,000. Please use the 'INSTANT TEST SETTLEMENT' button below to settle this deal."
                          : paymentError}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPaymentError(null)}
                    className="text-slate-400 hover:text-slate-200 text-xs px-2.5 py-1 rounded bg-slate-900 border border-slate-800 shrink-0 cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* CASE 1: Deal is PAID (Successful Settlement Screen) */}
              {(dealContractResult?.status === "PAID" || paymentResult.status === "PAID") && (
                <div className="p-6 rounded-2xl bg-emerald-950/50 border-2 border-emerald-700/80 space-y-4 shadow-xl shadow-emerald-950/30">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-800/60 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-emerald-900/80 border border-emerald-600 text-emerald-300">
                        <Check className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-base font-extrabold text-emerald-300 uppercase">
                          ✓ PAYMENT CONFIRMED & SETTLED
                        </h3>
                        <p className="text-xs text-emerald-200 font-sans">
                          Server verified HMAC signature and updated commercial contract to PAID state.
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-emerald-400">Order #{paymentResult.orderId || "ord_confirmed"}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3.5 rounded-xl bg-slate-950/80 border border-emerald-900/80 space-y-1">
                      <span className="text-[11px] font-bold text-slate-400 uppercase">SETTLED AMOUNT</span>
                      <p className="text-lg font-extrabold text-emerald-400 font-mono">
                        ₹{dealContractResult?.finalAmount.toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-950/80 border border-emerald-900/80 space-y-1">
                      <span className="text-[11px] font-bold text-slate-400 uppercase">PAYMENT ID</span>
                      <p className="text-sm font-bold text-slate-200 font-mono truncate">
                        {paymentResult.paymentId || "pay_razorpay_verified"}
                      </p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-950/80 border border-emerald-900/80 space-y-1">
                      <span className="text-[11px] font-bold text-slate-400 uppercase">GATEWAY PROVIDER</span>
                      <p className="text-sm font-bold text-blue-400 font-mono">RAZORPAY TEST MODE</p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-emerald-800/60 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Link
                        href="/transactions"
                        className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-mono font-bold transition-colors"
                      >
                        View in Transactions →
                      </Link>
                      <Link
                        href={`/audit?dealId=${dealContractResult?.dealId || paymentResult.dealId}`}
                        className="px-4 py-2 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-800 text-purple-300 text-xs font-mono font-bold transition-colors"
                      >
                        Inspect Audit Trail ↗
                      </Link>
                    </div>

                    <button
                      type="button"
                      onClick={handleStartNewDeal}
                      className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold shadow-lg shadow-emerald-950/40 cursor-pointer transition-colors"
                    >
                      + Start Another Deal
                    </button>
                  </div>
                </div>
              )}

              {/* CASE 2: Deal is VALIDATED and Eligible for Razorpay Payment */}
              {dealContractResult?.status !== "PAID" && paymentResult.status !== "PAID" && firewallResult?.overallStatus === "VALIDATED" && (
                <div className="space-y-6">
                  <div className="p-6 rounded-2xl bg-blue-950/40 border border-blue-800/60 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-emerald-400 text-sm font-bold">
                        <CheckCircle2 className="w-5 h-5" />
                        <span>PACT Firewall Validation Passed</span>
                      </div>
                      <h3 className="text-xl font-extrabold text-slate-100">
                        Ready for Razorpay Test Mode Payment
                      </h3>
                      <p className="text-xs text-slate-400 font-sans max-w-lg leading-relaxed">
                        Authoritative deal amount of <strong className="text-slate-200">₹{dealContractResult?.finalAmount.toLocaleString("en-IN")}</strong> will be transmitted securely to the server-side Razorpay order creator.
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-3 shrink-0">
                      <div className="text-right">
                        <span className="text-[11px] text-slate-400 font-mono uppercase">TOTAL PAYABLE AMOUNT</span>
                        <p className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono">
                          ₹{dealContractResult?.finalAmount.toLocaleString("en-IN")}
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <Ripple className="w-full sm:w-auto rounded-xl">
                          <button
                            type="button"
                            onClick={handleInitiatePayment}
                            disabled={paymentLoading || paymentVerifying}
                            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-mono text-xs font-bold transition-all shadow-xl shadow-blue-950/50 flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
                          >
                            {paymentLoading ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin text-white" />
                                <span>CREATING SECURE ORDER...</span>
                              </>
                            ) : paymentVerifying ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin text-white" />
                                <span>VERIFYING HMAC SIGNATURE...</span>
                              </>
                            ) : (
                              <>
                                <CreditCard className="w-4 h-4 text-blue-200" />
                                <span>PAY VIA RAZORPAY MODAL (TEST MODE)</span>
                                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                              </>
                            )}
                          </button>
                        </Ripple>
                      </div>
                    </div>
                  </div>

                  {/* Security & Isolation Checkpoints */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                      <div className="flex items-center gap-2 text-blue-400 text-xs font-bold">
                        <Lock className="w-3.5 h-3.5" />
                        <span>HMAC-SHA256 SIGNATURE</span>
                      </div>
                      <p className="text-xs text-slate-400 font-sans">
                        Cryptographic signature generated on server with secret key; invalid callbacks rejected.
                      </p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                      <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>AUTHORITATIVE AMOUNT</span>
                      </div>
                      <p className="text-xs text-slate-400 font-sans">
                        Frontend cannot override final amount. Razorpay order reads directly from Firestore.
                      </p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                      <div className="flex items-center gap-2 text-purple-400 text-xs font-bold">
                        <Cpu className="w-3.5 h-3.5" />
                        <span>AI AGENT ISOLATION</span>
                      </div>
                      <p className="text-xs text-slate-400 font-sans">
                        AI agents have 0 access to Razorpay credentials or payment creation pathways.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* CASE 3: Deal is PENDING_APPROVAL */}
              {firewallResult?.overallStatus === "PENDING_APPROVAL" && (
                <div className="p-6 rounded-2xl bg-amber-950/40 border border-amber-800/60 space-y-4">
                  <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                    <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
                    <span>Payment Gate Locked: Merchant Human Approval Required</span>
                  </div>
                  <p className="text-xs text-slate-300 font-sans leading-relaxed">
                    This deal exceeds the merchant auto-settlement threshold. The Merchant Store Manager must approve this deal in their <strong>Merchant Audit Trail Console</strong> before payment can proceed.
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-950 border border-amber-700 text-amber-300 font-mono text-xs font-bold">
                      STATUS: PENDING_APPROVAL
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!dealContractResult?.dealId) return;
                        try {
                          const res = await fetch(`/api/transactions/${dealContractResult.dealId}`);
                          const data = await res.json();
                          if (data.success && data.deal) {
                            const updatedDeal = data.deal;
                            setDealContractResult(updatedDeal);
                            if (updatedDeal.status === "VALIDATED") {
                              if (firewallResult) {
                                setFirewallResult({ ...firewallResult, overallStatus: "VALIDATED" });
                              }
                              // Save updated state into sessionStorage
                              if (typeof window !== "undefined") {
                                sessionStorage.setItem("pact_deal_contract", JSON.stringify(updatedDeal));
                              }
                            }
                          }
                        } catch (err) {
                          console.error("Error refreshing approval status:", err);
                        }
                      }}
                      className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-md shadow-emerald-950/40"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Check Merchant Approval Status</span>
                    </button>
                  </div>
                </div>
              )}

              {/* CASE 4: Deal is REJECTED */}
              {firewallResult?.overallStatus === "REJECTED" && (
                <div className="p-6 rounded-2xl bg-rose-950/40 border border-rose-800/60 space-y-3">
                  <div className="flex items-center gap-2 text-rose-300 font-bold text-sm">
                    <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                    <span>Payment Blocked: PACT Firewall Blocked</span>
                  </div>
                  <p className="text-xs text-slate-300 font-sans leading-relaxed">
                    Payment is unavailable because this deal did not satisfy PACT commercial policy validation constraints.
                  </p>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-rose-950 border border-rose-700 text-rose-300 font-mono text-xs">
                    STATUS: REJECTED (NO PAYMENT CREATION)
                  </div>
                </div>
              )}

              {/* CASE 5: Firewall has not yet evaluated */}
              {!firewallResult && (
                <div className="p-6 rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 text-center space-y-2">
                  <Lock className="w-6 h-6 text-slate-500 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-300">Payment Gateway Locked</h4>
                  <p className="text-xs text-slate-400 font-sans max-w-md mx-auto">
                    The Razorpay Test Mode settlement gate only unlocks after Stage 4 PACT Firewall returns a <strong>VALIDATED</strong> decision.
                  </p>
                </div>
              )}
            </div>
          </SpotlightCard>
        </motion.div>
      )}
      </>
      )}

    </PageContainer>
  );
}

export default function DealRoomPage() {
  return (
    <React.Suspense
      fallback={
        <PageContainer>
          <div className="p-12 text-center text-slate-400 font-mono text-xs">
            Loading PACT Deal Room Pipeline...
          </div>
        </PageContainer>
      }
    >
      <DealRoomContent />
    </React.Suspense>
  );
}
