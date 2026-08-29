/**
 * PACT Server-Side Firewall Engine (Phase 6).
 * Deterministic policy gate checking 9 security rules against live Firestore state.
 * 
 * ZERO GEMINI AI CALLS. ZERO RAZORPAY CALLS.
 * PURE TYPESCRIPT POLICY EVALUATION & GOVERNANCE.
 */

import { adminDb } from "@/lib/firebase/admin";
import { Merchant, Product } from "@/types";
import { recordAuditEvent } from "@/services/buyer-intent-service";
import { DealContract } from "@/lib/deal-compiler/schema";
import { DEALS_COLLECTION } from "@/lib/deal-compiler";
import { DEMO_MERCHANT_ID } from "@/services/seed";
import {
  FirewallEvaluation,
  RuleEvaluation,
  OverallFirewallStatus,
} from "./schema";

export const POLICY_EVALUATIONS_COLLECTION = "policy_evaluations";

export interface EvaluateFirewallOptions {
  dealId: string;
}

export interface EvaluateFirewallResult {
  success: boolean;
  evaluation: FirewallEvaluation;
  error?: string;
}

export async function evaluateDealWithFirewall(
  options: EvaluateFirewallOptions
): Promise<EvaluateFirewallResult> {
  const { dealId } = options;
  const nowStr = new Date().toISOString();
  const evalId = `peval_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // Log audit start
  await recordAuditEvent(
    "POLICY_CHECK_STARTED",
    "PACT_FIREWALL",
    `PACT Firewall started deterministic policy evaluation for Deal: ${dealId}`,
    { dealId, evaluationId: evalId }
  );

  const evaluations: RuleEvaluation[] = [];

  // 1. Retrieve the Deal Contract from Firestore
  let dealDoc: DealContract | null = null;
  if (adminDb) {
    try {
      const snap = await adminDb.collection(DEALS_COLLECTION).doc(dealId).get();
      if (snap.exists) {
        dealDoc = snap.data() as DealContract;
      }
    } catch (err) {
      console.error("Failed to read Deal Contract from Firestore:", err);
    }
  }

  if (!dealDoc) {
    const errorMsg = `Deal Contract ${dealId} was not found in Firestore.`;
    const failEval: RuleEvaluation = {
      ruleName: "PRODUCT_VALIDITY",
      status: "FAIL",
      severity: "CRITICAL",
      explanation: errorMsg,
      metadata: { dealId },
    };
    evaluations.push(failEval);

    const resultEvaluation: FirewallEvaluation = {
      id: evalId,
      dealId,
      evaluatedAt: nowStr,
      overallStatus: "REJECTED",
      evaluations,
      rulesCheckedCount: 1,
      passedCount: 0,
      failedCount: 1,
      warningCount: 0,
      summary: errorMsg,
      metadata: { reason: "DEAL_NOT_FOUND" },
    };

    await recordAuditEvent(
      "DEAL_REJECTED",
      "PACT_FIREWALL",
      `Deal ${dealId} blocked: ${errorMsg}`,
      { dealId }
    );

    return {
      success: false,
      evaluation: resultEvaluation,
      error: errorMsg,
    };
  }

  // 2. DUPLICATE_PROTECTION Check
  // Check if deal is already validated or evaluated into a terminal state
  let duplicateWarning = false;
  if (dealDoc.status === "VALIDATED") {
    duplicateWarning = true;
    evaluations.push({
      ruleName: "DUPLICATE_PROTECTION",
      status: "PASS",
      severity: "INFO",
      explanation: "Deal contract has previously satisfied all firewall policies. Re-verifying current live parameters.",
      metadata: { previousStatus: dealDoc.status },
    });
  } else {
    evaluations.push({
      ruleName: "DUPLICATE_PROTECTION",
      status: "PASS",
      severity: "INFO",
      explanation: "Idempotent state verification: Deal is fresh and eligible for policy enforcement.",
      metadata: { currentDealStatus: dealDoc.status },
    });
  }

  const merchantId = dealDoc.merchantId || DEMO_MERCHANT_ID;

  // 3. Retrieve Live Merchant and Policies from Firestore
  let merchantDoc: Merchant | null = null;
  if (adminDb) {
    try {
      const snap = await adminDb.collection("merchants").doc(merchantId).get();
      if (snap.exists) {
        merchantDoc = snap.data() as Merchant;
      }
    } catch (err) {
      console.error("Failed to read Merchant from Firestore in Firewall:", err);
    }
  }

  const maxDiscountPercent = merchantDoc?.maxDiscountPercent ?? 15;
  const maxAutoTransactionAmount = merchantDoc?.maxAutoTransactionAmount ?? 100000;
  const approvalRequiredAbove = merchantDoc?.approvalRequiredAbove ?? 50000;

  // 4. Retrieve Live Products for Items in the Deal
  const liveProductMap: Map<string, Product> = new Map();
  if (adminDb && dealDoc.items.length > 0) {
    try {
      const productIds = Array.from(new Set(dealDoc.items.map((it) => it.productId)));
      const productSnaps = await Promise.all(
        productIds.map((pid) => adminDb!.collection("products").doc(pid).get())
      );
      for (const snap of productSnaps) {
        if (snap.exists) {
          liveProductMap.set(snap.id, snap.data() as Product);
        }
      }
    } catch (err) {
      console.error("Failed to fetch live products in Firewall:", err);
    }
  }

  // ==========================================
  // RULE 1: PRODUCT_VALIDITY
  // ==========================================
  let productValidityPass = true;
  const invalidProducts: string[] = [];

  if (dealDoc.items.length === 0) {
    productValidityPass = false;
    invalidProducts.push("No contracted items present");
  } else {
    for (const item of dealDoc.items) {
      const liveProd = liveProductMap.get(item.productId);
      if (!liveProd) {
        productValidityPass = false;
        invalidProducts.push(`Product ${item.productName} (${item.productId}) does not exist in catalog`);
      } else if (!liveProd.active) {
        productValidityPass = false;
        invalidProducts.push(`Product ${item.productName} is currently marked inactive`);
      } else if (liveProd.merchantId !== merchantId) {
        productValidityPass = false;
        invalidProducts.push(`Product ${item.productName} does not belong to merchant ${merchantId}`);
      }
    }
  }

  if (productValidityPass) {
    evaluations.push({
      ruleName: "PRODUCT_VALIDITY",
      status: "PASS",
      severity: "INFO",
      explanation: "All contracted products exist, belong to merchant, and are currently active.",
      metadata: { itemCount: dealDoc.items.length },
    });
    await recordAuditEvent("POLICY_CHECK_PASSED", "PACT_FIREWALL", "PRODUCT_VALIDITY rule passed.", { dealId });
  } else {
    evaluations.push({
      ruleName: "PRODUCT_VALIDITY",
      status: "FAIL",
      severity: "CRITICAL",
      explanation: `Product validity failed: ${invalidProducts.join("; ")}`,
      metadata: { invalidProducts },
    });
    await recordAuditEvent("POLICY_CHECK_FAILED", "PACT_FIREWALL", `PRODUCT_VALIDITY rule failed: ${invalidProducts.join("; ")}`, { dealId });
  }

  // ==========================================
  // RULE 2: INVENTORY_CHECK
  // ==========================================
  let inventoryPass = true;
  const inventoryFailures: string[] = [];

  for (const item of dealDoc.items) {
    const liveProd = liveProductMap.get(item.productId);
    if (!liveProd) {
      inventoryPass = false;
      inventoryFailures.push(`Product ${item.productName} not found`);
    } else if (liveProd.stock < item.quantity) {
      inventoryPass = false;
      inventoryFailures.push(
        `Insufficient inventory for ${item.productName}. Requested: ${item.quantity}, Live Stock: ${liveProd.stock}`
      );
    }
  }

  if (inventoryPass) {
    evaluations.push({
      ruleName: "INVENTORY_CHECK",
      status: "PASS",
      severity: "INFO",
      explanation: "Real-time stock verified for all contracted items against live catalog inventory.",
      metadata: { itemsVerified: dealDoc.items.map((i) => ({ productId: i.productId, requested: i.quantity, available: liveProductMap.get(i.productId)?.stock })) },
    });
    await recordAuditEvent("POLICY_CHECK_PASSED", "PACT_FIREWALL", "INVENTORY_CHECK rule passed.", { dealId });
  } else {
    evaluations.push({
      ruleName: "INVENTORY_CHECK",
      status: "FAIL",
      severity: "CRITICAL",
      explanation: inventoryFailures.join("; "),
      metadata: { inventoryFailures },
    });
    await recordAuditEvent("POLICY_CHECK_FAILED", "PACT_FIREWALL", `INVENTORY_CHECK rule failed: ${inventoryFailures.join("; ")}`, { dealId });
  }

  // ==========================================
  // RULE 3: PRICE_VERIFICATION (Stale Contract Guard)
  // ==========================================
  let pricePass = true;
  const priceMismatches: string[] = [];

  for (const item of dealDoc.items) {
    const liveProd = liveProductMap.get(item.productId);
    if (liveProd && liveProd.price !== item.unitPrice) {
      pricePass = false;
      priceMismatches.push(
        `Price mismatch for ${item.productName}: Contracted ₹${item.unitPrice.toLocaleString("en-IN")}, Live Catalog ₹${liveProd.price.toLocaleString("en-IN")}`
      );
    }
  }

  if (pricePass) {
    evaluations.push({
      ruleName: "PRICE_VERIFICATION",
      status: "PASS",
      severity: "INFO",
      explanation: "Contracted unit prices match live catalog prices with 0% drift.",
      metadata: { verifiedPrices: dealDoc.items.map((i) => ({ productId: i.productId, unitPrice: i.unitPrice })) },
    });
    await recordAuditEvent("POLICY_CHECK_PASSED", "PACT_FIREWALL", "PRICE_VERIFICATION rule passed.", { dealId });
  } else {
    evaluations.push({
      ruleName: "PRICE_VERIFICATION",
      status: "FAIL",
      severity: "CRITICAL",
      explanation: `Product price changed after deal compilation: ${priceMismatches.join("; ")}`,
      metadata: { priceMismatches },
    });
    await recordAuditEvent("POLICY_CHECK_FAILED", "PACT_FIREWALL", `PRICE_VERIFICATION rule failed: ${priceMismatches.join("; ")}`, { dealId });
  }

  // ==========================================
  // RULE 4: DISCOUNT_LIMIT
  // ==========================================
  const proposedDiscountPercent = dealDoc.discount.percentage;
  if (proposedDiscountPercent > maxDiscountPercent) {
    evaluations.push({
      ruleName: "DISCOUNT_LIMIT",
      status: "FAIL",
      severity: "CRITICAL",
      explanation: `Proposed discount (${proposedDiscountPercent}%) exceeds merchant maximum allowable discount cap (${maxDiscountPercent}%).`,
      metadata: { proposed: proposedDiscountPercent, allowed: maxDiscountPercent },
    });
    await recordAuditEvent("POLICY_CHECK_FAILED", "PACT_FIREWALL", `DISCOUNT_LIMIT rule failed (${proposedDiscountPercent}% > ${maxDiscountPercent}%).`, { dealId });
  } else {
    evaluations.push({
      ruleName: "DISCOUNT_LIMIT",
      status: "PASS",
      severity: "INFO",
      explanation: `Discount (${proposedDiscountPercent}%) is within merchant policy limit (${maxDiscountPercent}%).`,
      metadata: { proposed: proposedDiscountPercent, allowed: maxDiscountPercent },
    });
    await recordAuditEvent("POLICY_CHECK_PASSED", "PACT_FIREWALL", "DISCOUNT_LIMIT rule passed.", { dealId });
  }

  // ==========================================
  // RULE 5: BUDGET_CONSTRAINT
  // ==========================================
  const buyerBudget = dealDoc.buyerConstraints.budget;
  if (buyerBudget !== null && dealDoc.finalAmount > buyerBudget) {
    const excess = dealDoc.finalAmount - buyerBudget;
    evaluations.push({
      ruleName: "BUDGET_CONSTRAINT",
      status: "FAIL",
      severity: "CRITICAL",
      explanation: `Final deal amount (₹${dealDoc.finalAmount.toLocaleString("en-IN")}) exceeds buyer maximum budget (₹${buyerBudget.toLocaleString("en-IN")}) by ₹${excess.toLocaleString("en-IN")}.`,
      metadata: { finalAmount: dealDoc.finalAmount, buyerBudget, excess },
    });
    await recordAuditEvent("POLICY_CHECK_FAILED", "PACT_FIREWALL", `BUDGET_CONSTRAINT rule failed (Final: ₹${dealDoc.finalAmount} > Budget: ₹${buyerBudget}).`, { dealId });
  } else {
    evaluations.push({
      ruleName: "BUDGET_CONSTRAINT",
      status: "PASS",
      severity: "INFO",
      explanation: buyerBudget !== null
        ? `Final deal amount (₹${dealDoc.finalAmount.toLocaleString("en-IN")}) is within buyer budget (₹${buyerBudget.toLocaleString("en-IN")}).`
        : "No explicit buyer budget cap was specified in intent.",
      metadata: { finalAmount: dealDoc.finalAmount, buyerBudget },
    });
    await recordAuditEvent("POLICY_CHECK_PASSED", "PACT_FIREWALL", "BUDGET_CONSTRAINT rule passed.", { dealId });
  }

  // ==========================================
  // RULE 6: DELIVERY_CONSTRAINT
  // ==========================================
  const buyerDeliveryMaxDays = dealDoc.buyerConstraints.deliveryMaxDays;
  if (buyerDeliveryMaxDays !== null && dealDoc.deliveryDays > buyerDeliveryMaxDays) {
    evaluations.push({
      ruleName: "DELIVERY_CONSTRAINT",
      status: "FAIL",
      severity: "CRITICAL",
      explanation: `Estimated delivery SLA (${dealDoc.deliveryDays} days) violates buyer maximum delivery SLA requirement (≤ ${buyerDeliveryMaxDays} days).`,
      metadata: { deliveryDays: dealDoc.deliveryDays, buyerDeliveryMaxDays },
    });
    await recordAuditEvent("POLICY_CHECK_FAILED", "PACT_FIREWALL", `DELIVERY_CONSTRAINT rule failed (${dealDoc.deliveryDays}d > ${buyerDeliveryMaxDays}d).`, { dealId });
  } else {
    evaluations.push({
      ruleName: "DELIVERY_CONSTRAINT",
      status: "PASS",
      severity: "INFO",
      explanation: buyerDeliveryMaxDays !== null
        ? `Delivery SLA (${dealDoc.deliveryDays} days) satisfies buyer timeframe (≤ ${buyerDeliveryMaxDays} days).`
        : `Delivery SLA (${dealDoc.deliveryDays} days) confirmed. No explicit deadline specified by buyer.`,
      metadata: { deliveryDays: dealDoc.deliveryDays, buyerDeliveryMaxDays },
    });
    await recordAuditEvent("POLICY_CHECK_PASSED", "PACT_FIREWALL", "DELIVERY_CONSTRAINT rule passed.", { dealId });
  }

  // ==========================================
  // RULE 7: TRANSACTION_LIMIT
  // ==========================================
  if (dealDoc.finalAmount > maxAutoTransactionAmount) {
    evaluations.push({
      ruleName: "TRANSACTION_LIMIT",
      status: "PASS",
      severity: "WARNING",
      explanation: `Transaction amount (₹${dealDoc.finalAmount.toLocaleString("en-IN")}) exceeds automatic settlement threshold (₹${maxAutoTransactionAmount.toLocaleString("en-IN")}).`,
      metadata: { finalAmount: dealDoc.finalAmount, maxAutoTransactionAmount },
    });
    await recordAuditEvent("POLICY_CHECK_PASSED", "PACT_FIREWALL", `TRANSACTION_LIMIT warning noted for deal amount ₹${dealDoc.finalAmount}.`, { dealId });
  } else {
    evaluations.push({
      ruleName: "TRANSACTION_LIMIT",
      status: "PASS",
      severity: "INFO",
      explanation: `Transaction amount (₹${dealDoc.finalAmount.toLocaleString("en-IN")}) is within automatic transaction limits (≤ ₹${maxAutoTransactionAmount.toLocaleString("en-IN")}).`,
      metadata: { finalAmount: dealDoc.finalAmount, maxAutoTransactionAmount },
    });
    await recordAuditEvent("POLICY_CHECK_PASSED", "PACT_FIREWALL", "TRANSACTION_LIMIT rule passed.", { dealId });
  }

  // ==========================================
  // RULE 8: HUMAN_APPROVAL_GATE
  // ==========================================
  const requiresHumanApproval = dealDoc.finalAmount > approvalRequiredAbove;
  if (requiresHumanApproval) {
    evaluations.push({
      ruleName: "HUMAN_APPROVAL_GATE",
      status: "PASS",
      severity: "WARNING",
      explanation: `Transaction amount (₹${dealDoc.finalAmount.toLocaleString("en-IN")}) exceeds merchant approval threshold (₹${approvalRequiredAbove.toLocaleString("en-IN")}). Requires merchant human sign-off before payment execution.`,
      metadata: { finalAmount: dealDoc.finalAmount, approvalRequiredAbove, requiresHumanApproval: true },
    });
    await recordAuditEvent("HUMAN_APPROVAL_REQUIRED", "PACT_FIREWALL", `Deal ${dealId} (₹${dealDoc.finalAmount}) exceeds approval threshold (₹${approvalRequiredAbove}). State set to PENDING_APPROVAL.`, { dealId, approvalRequiredAbove });
  } else {
    evaluations.push({
      ruleName: "HUMAN_APPROVAL_GATE",
      status: "PASS",
      severity: "INFO",
      explanation: `Transaction amount (₹${dealDoc.finalAmount.toLocaleString("en-IN")}) is below human approval threshold (₹${approvalRequiredAbove.toLocaleString("en-IN")}). Pre-cleared for direct processing.`,
      metadata: { finalAmount: dealDoc.finalAmount, approvalRequiredAbove, requiresHumanApproval: false },
    });
    await recordAuditEvent("POLICY_CHECK_PASSED", "PACT_FIREWALL", "HUMAN_APPROVAL_GATE pre-cleared without manual gate.", { dealId });
  }

  // ==========================================
  // FINAL STATUS DETERMINATION (Deterministic Server Logic)
  // ==========================================
  const hasCriticalFailure = evaluations.some((e) => e.status === "FAIL");
  const failedCount = evaluations.filter((e) => e.status === "FAIL").length;
  const passedCount = evaluations.filter((e) => e.status === "PASS").length;
  const warningCount = evaluations.filter((e) => e.severity === "WARNING").length;

  let overallStatus: OverallFirewallStatus;
  let summaryMessage: string;

  if (hasCriticalFailure) {
    overallStatus = "REJECTED";
    const failedRules = evaluations.filter((e) => e.status === "FAIL").map((e) => e.ruleName).join(", ");
    summaryMessage = `PACT Firewall BLOCKED deal: Critical policy violations detected (${failedRules}).`;
    await recordAuditEvent("DEAL_REJECTED", "PACT_FIREWALL", summaryMessage, { dealId, failedCount, failedRules });
  } else if (requiresHumanApproval) {
    overallStatus = "PENDING_APPROVAL";
    summaryMessage = `PACT Firewall PASSED core verification: Deal exceeds merchant approval threshold (₹${approvalRequiredAbove.toLocaleString("en-IN")}) and is routed to PENDING_APPROVAL.`;
    await recordAuditEvent("HUMAN_APPROVAL_REQUIRED", "PACT_FIREWALL", summaryMessage, { dealId });
  } else {
    overallStatus = "VALIDATED";
    summaryMessage = "PACT Firewall PASSED: Deal satisfies all commercial, inventory, pricing, budget, and merchant policy constraints.";
    await recordAuditEvent("DEAL_VALIDATED", "PACT_FIREWALL", summaryMessage, { dealId });
  }

  const firewallEvaluation: FirewallEvaluation = {
    id: evalId,
    dealId,
    evaluatedAt: nowStr,
    overallStatus,
    evaluations,
    rulesCheckedCount: evaluations.length,
    passedCount,
    failedCount,
    warningCount,
    summary: summaryMessage,
    metadata: {
      merchantId,
      finalAmount: dealDoc.finalAmount,
      duplicateWarning,
    },
  };

  // 5. Persist Policy Evaluation to Firestore
  if (adminDb) {
    try {
      await adminDb.collection(POLICY_EVALUATIONS_COLLECTION).doc(evalId).set(firewallEvaluation);
      // Update Deal Contract document status in Firestore
      await adminDb.collection(DEALS_COLLECTION).doc(dealId).update({
        status: overallStatus,
        updatedAt: nowStr,
        lastFirewallEvaluationId: evalId,
      });
    } catch (err) {
      console.error("Failed to persist Firewall Evaluation in Firestore:", err);
    }
  }

  return {
    success: true,
    evaluation: firewallEvaluation,
  };
}
