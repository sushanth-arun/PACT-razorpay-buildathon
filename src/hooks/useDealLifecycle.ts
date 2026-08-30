import { useMemo } from "react";
import { SavedBuyerIntent } from "@/services/buyer-intent-service";
import { MerchantOffer } from "@/lib/ai/merchant-offer-schema";
import { DealContract } from "@/lib/deal-compiler/schema";
import { FirewallEvaluation } from "@/lib/firewall/schema";

export type StepState = "NOT_STARTED" | "ACTIVE" | "COMPLETE" | "ERROR" | "WARNING" | "BLOCKED";

export interface LifecycleStepInfo {
  id: "INTENT" | "DISCOVER" | "OFFER" | "COMPILE" | "FIREWALL" | "PAYMENT";
  stepNumber: number;
  label: string;
  sublabel: string;
  state: StepState;
  isAccessible: boolean;
  statusText: string;
}

export interface DealLifecycleState {
  steps: LifecycleStepInfo[];
  activeStepNumber: number;
  highestCompletedStep: number;
  overallLifecycleStatus: string;
}

export function useDealLifecycle(params: {
  intentResult: SavedBuyerIntent | null;
  intentLoading: boolean;
  intentError: string | null;

  offerResult: MerchantOffer | null;
  offerLoading: boolean;
  offerError: string | null;

  dealContractResult: DealContract | null;
  compilerLoading: boolean;
  compilerError: string | null;

  firewallResult: FirewallEvaluation | null;
  firewallLoading: boolean;
  firewallError: string | null;

  paymentResult: {
    status: "IDLE" | "PENDING" | "PROCESSING" | "PAID" | "FAILED";
    paymentId?: string;
    orderId?: string;
    message?: string;
  };
  paymentLoading: boolean;
  paymentVerifying: boolean;
  paymentError: string | null;
}): DealLifecycleState {
  const {
    intentResult,
    intentLoading,
    intentError,
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
  } = params;

  return useMemo(() => {
    // 1. INTENT
    let intentState: StepState = "NOT_STARTED";
    let intentStatusText = "Awaiting buyer request";
    if (intentLoading) {
      intentState = "ACTIVE";
      intentStatusText = "AI extracting intent...";
    } else if (intentError) {
      intentState = "ERROR";
      intentStatusText = "Intent parsing failed";
    } else if (intentResult) {
      intentState = "COMPLETE";
      intentStatusText = intentResult.productIntent || "Structured intent saved";
    }

    // 2. DISCOVER & OFFER (Catalog search & proposal)
    let offerState: StepState = "NOT_STARTED";
    let offerStatusText = "Awaiting buyer intent";
    if (intentResult) {
      if (offerLoading) {
        offerState = "ACTIVE";
        offerStatusText = "Searching catalog & constructing offer...";
      } else if (offerError) {
        offerState = "ERROR";
        offerStatusText = "Discovery error";
      } else if (offerResult) {
        if (offerResult.status === "NO_VALID_OFFER" || offerResult.status === "INSUFFICIENT_INVENTORY") {
          offerState = "ERROR";
          offerStatusText = "No matching inventory or stock";
        } else if (offerResult.status === "OFFER_GENERATED") {
          offerState = "COMPLETE";
          offerStatusText = `Offer generated (₹${offerResult.estimatedFinalAmount?.toLocaleString("en-IN") || 0})`;
        } else if (offerResult.status === "ALTERNATIVE_FOUND") {
          offerState = "COMPLETE";
          offerStatusText = `Alternative offer (₹${offerResult.estimatedFinalAmount?.toLocaleString("en-IN") || 0})`;
        } else {
          offerState = "ERROR";
          offerStatusText = offerResult.reasoningSummary || "Offer could not be generated";
        }
      } else {
        offerState = "ACTIVE";
        offerStatusText = "Ready to construct offer";
      }
    }

    // 4. COMPILE (Deterministic Contract Creation)
    let compileState: StepState = "NOT_STARTED";
    let compileStatusText = "Awaiting offer";
    if (compilerLoading) {
      compileState = "ACTIVE";
      compileStatusText = "Compiling contract...";
    } else if (compilerError || dealContractResult?.status === "COMPILATION_FAILED") {
      compileState = "ERROR";
      compileStatusText = compilerError || dealContractResult?.validationStatus?.failureReason || "Compilation failed";
    } else if (dealContractResult) {
      compileState = "COMPLETE";
      compileStatusText = `Contract compiled (₹${dealContractResult.finalAmount.toLocaleString("en-IN")})`;
    } else if (offerState === "COMPLETE") {
      compileState = "NOT_STARTED";
      compileStatusText = "Ready to compile";
    }

    // 5. FIREWALL (9-Rule Security & Policy Gate)
    let firewallState: StepState = "NOT_STARTED";
    let firewallStatusText = "Awaiting contract";
    if (firewallLoading) {
      firewallState = "ACTIVE";
      firewallStatusText = "Evaluating 9 security gates...";
    } else if (firewallError) {
      firewallState = "ERROR";
      firewallStatusText = firewallError;
    } else if (firewallResult) {
      if (firewallResult.overallStatus === "VALIDATED") {
        firewallState = "COMPLETE";
        firewallStatusText = "✓ 9 Rules Passed — Deal Validated";
      } else if (firewallResult.overallStatus === "PENDING_APPROVAL") {
        firewallState = "WARNING";
        firewallStatusText = "⚠ Human Approval Required (> ₹50k)";
      } else {
        firewallState = "ERROR";
        firewallStatusText = `✕ Firewall Blocked (${firewallResult.failedCount} rule failed)`;
      }
    } else if (compileState === "COMPLETE") {
      firewallState = "NOT_STARTED";
      firewallStatusText = "Ready for firewall check";
    }

    // 6. PAYMENT (Razorpay Test Mode Settlement)
    let paymentState: StepState = "BLOCKED";
    let paymentStatusText = "Locked until firewall validation";
    if (dealContractResult?.status === "PAID" || paymentResult.status === "PAID") {
      paymentState = "COMPLETE";
      paymentStatusText = "✓ PAID & SETTLED";
    } else if (paymentLoading || paymentVerifying || paymentResult.status === "PROCESSING") {
      paymentState = "ACTIVE";
      paymentStatusText = paymentVerifying ? "Verifying signature..." : "Creating Razorpay order...";
    } else if (paymentError || paymentResult.status === "FAILED") {
      paymentState = "ERROR";
      paymentStatusText = paymentError || "Payment failed or rejected";
    } else if (firewallResult?.overallStatus === "VALIDATED") {
      paymentState = "ACTIVE";
      paymentStatusText = `Ready to pay ₹${dealContractResult?.finalAmount.toLocaleString("en-IN")}`;
    } else if (firewallResult?.overallStatus === "PENDING_APPROVAL") {
      paymentState = "BLOCKED";
      paymentStatusText = "Blocked (Awaiting merchant approval)";
    } else if (firewallResult?.overallStatus === "REJECTED") {
      paymentState = "BLOCKED";
      paymentStatusText = "Blocked by firewall policy";
    }

    const steps: LifecycleStepInfo[] = [
      {
        id: "INTENT",
        stepNumber: 1,
        label: "INTENT",
        sublabel: "Buyer AI",
        state: intentState,
        isAccessible: true,
        statusText: intentStatusText,
      },
      {
        id: "OFFER",
        stepNumber: 2,
        label: "OFFER",
        sublabel: "Merchant Proposal",
        state: offerState,
        isAccessible: Boolean(offerResult || intentResult),
        statusText: offerStatusText,
      },
      {
        id: "COMPILE",
        stepNumber: 3,
        label: "COMPILE",
        sublabel: "Deterministic Deal",
        state: compileState,
        isAccessible: Boolean(dealContractResult || offerResult),
        statusText: compileStatusText,
      },
      {
        id: "FIREWALL",
        stepNumber: 4,
        label: "FIREWALL",
        sublabel: "Policy Gate",
        state: firewallState,
        isAccessible: Boolean(dealContractResult),
        statusText: firewallStatusText,
      },
      {
        id: "PAYMENT",
        stepNumber: 5,
        label: "PAYMENT",
        sublabel: "Razorpay Test",
        state: paymentState,
        isAccessible: Boolean(firewallResult?.overallStatus === "VALIDATED" || dealContractResult?.status === "PAID" || dealContractResult?.status === "PAYMENT_PENDING"),
        statusText: paymentStatusText,
      },
    ];

    // Determine highest completed step number
    let highestCompleted = 0;
    steps.forEach((s) => {
      if (s.state === "COMPLETE") {
        highestCompleted = Math.max(highestCompleted, s.stepNumber);
      }
    });

    // Determine current active step number
    let activeStepNumber = 1;
    if (paymentState === "COMPLETE" || paymentState === "ACTIVE") {
      activeStepNumber = 5;
    } else if (firewallState === "ACTIVE" || firewallState === "ERROR" || firewallState === "WARNING" || (firewallState === "COMPLETE" && paymentState !== "BLOCKED")) {
      activeStepNumber = 4;
    } else if (compileState === "ACTIVE" || compileState === "ERROR" || (compileState === "COMPLETE" && firewallState === "NOT_STARTED")) {
      activeStepNumber = 3;
    } else if (offerState === "ACTIVE" || offerState === "ERROR" || (offerState === "COMPLETE" && compileState === "NOT_STARTED")) {
      activeStepNumber = 2;
    }

    let overallLifecycleStatus = "NOT_STARTED";
    if (paymentState === "COMPLETE") overallLifecycleStatus = "SETTLED";
    else if (firewallState === "COMPLETE") overallLifecycleStatus = "VALIDATED";
    else if (firewallState === "WARNING") overallLifecycleStatus = "PENDING_APPROVAL";
    else if (firewallState === "ERROR" || compileState === "ERROR" || offerState === "ERROR") overallLifecycleStatus = "FAILED";
    else if (intentState === "COMPLETE") overallLifecycleStatus = "IN_PROGRESS";

    return {
      steps,
      activeStepNumber,
      highestCompletedStep: highestCompleted,
      overallLifecycleStatus,
    };
  }, [
    intentResult,
    intentLoading,
    intentError,
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
  ]);
}
