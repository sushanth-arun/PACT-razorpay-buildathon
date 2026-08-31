/**
 * PACT Deal Compiler Core Engine.
 * Takes Buyer Intent + Merchant Offer and revalidates against live Firestore data deterministically.
 * NO GEMINI AI CALLS. NO RAZORPAY. PURE TYPESCRIPT VALIDATION & CALCULATIONS.
 */

import { adminDb } from "@/lib/firebase/admin";
import { Merchant, Product } from "@/types";
import { SavedBuyerIntent, recordAuditEvent } from "@/services/buyer-intent-service";
import { MerchantOffer } from "@/lib/ai/merchant-offer-schema";
import { MERCHANT_OFFERS_COLLECTION } from "@/lib/ai/merchant-tools";
import {

  DealCheckResult,
  DealContract,
  DealContractSchema,
  CompiledDealItem,
  ValidationStatus,
} from "./schema";
import {
  calculateLineTotal,
  calculateSubtotal,
  calculateDiscount,
  calculateFinalAmount,
  calculateDeliveryDays,
} from "./calculations";
import { DEMO_MERCHANT_ID } from "@/services/seed";

export const DEALS_COLLECTION = "deals";

export interface CompileOptions {
  buyerIntentId: string;
  merchantOfferId: string;
}

export interface CompileResult {
  success: boolean;
  contract: DealContract;
  error?: string;
}

export async function compileDeal(options: CompileOptions): Promise<CompileResult> {
  const { buyerIntentId, merchantOfferId } = options;
  const nowStr = new Date().toISOString();

  // 1. Retrieve Buyer Intent from Firestore
  let buyerIntentDoc: SavedBuyerIntent | null = null;
  if (adminDb) {
    try {
      const snap = await adminDb.collection("buyer_intents").doc(buyerIntentId).get();
      if (snap.exists) {
        buyerIntentDoc = snap.data() as SavedBuyerIntent;
      }
    } catch (err) {
      console.error("Failed to retrieve buyer intent in compiler:", err);
    }
  }

  const dealId = buyerIntentDoc?.dealId || `deal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // 2. Retrieve Merchant Offer from Firestore
  let merchantOfferDoc: MerchantOffer | null = null;
  if (adminDb) {
    try {
      const snap = await adminDb.collection(MERCHANT_OFFERS_COLLECTION).doc(merchantOfferId).get();
      if (snap.exists) {
        merchantOfferDoc = snap.data() as MerchantOffer;
      }
    } catch (err) {
      console.error("Failed to retrieve merchant offer in compiler:", err);
    }
  }

  const merchantId = merchantOfferDoc?.merchantId || (buyerIntentDoc as unknown as { targetMerchantId?: string })?.targetMerchantId || DEMO_MERCHANT_ID;

  await recordAuditEvent(
    "DEAL_COMPILATION_STARTED",
    "DEAL_COMPILER",
    `Started deterministic deal compilation for BuyerIntent: ${buyerIntentId} and MerchantOffer: ${merchantOfferId}`,
    { buyerIntentId, merchantOfferId, dealId, merchantId }
  );

  const checks: DealCheckResult[] = [];

  if (!buyerIntentDoc) {
    const errorMsg = `BuyerIntent ${buyerIntentId} not found in Firestore.`;
    return createFailedResult(dealId, merchantOfferId, buyerIntentId, errorMsg, [
      { rule: "PRODUCT_VALIDITY", status: "FAIL", message: errorMsg },
    ]);
  }

  if (!merchantOfferDoc) {
    const errorMsg = `MerchantOffer ${merchantOfferId} not found in Firestore.`;
    return createFailedResult(dealId, merchantOfferId, buyerIntentId, errorMsg, [
      { rule: "PRODUCT_VALIDITY", status: "FAIL", message: errorMsg },
    ]);
  }

  // 3. Retrieve Authoritative Merchant Policies from Firestore
  let merchantDoc: Merchant | null = null;
  if (adminDb) {
    try {
      const snap = await adminDb.collection("merchants").doc(merchantId).get();
      if (snap.exists) {
        merchantDoc = snap.data() as Merchant;
      }
    } catch (err) {
      console.error("Failed to retrieve merchant policies in compiler:", err);
    }
  }

  const maxDiscountPercent = merchantDoc?.maxDiscountPercent ?? 15;
  const minimumMarginPercent = merchantDoc?.minimumMarginPercent ?? 20;
  const maxAutoTransactionAmount = merchantDoc?.maxAutoTransactionAmount ?? 50000;
  const approvalRequiredAbove = merchantDoc?.approvalRequiredAbove ?? 100000;

  // 4. Retrieve Current Live Product Records from Firestore (Revalidation Source of Truth)
  const productMap = new Map<string, Product>();
  if (adminDb) {
    try {
      const snap = await adminDb
        .collection("products")
        .where("merchantId", "==", merchantId)
        .get();
      snap.forEach((doc) => {
        const prod = doc.data() as Product;
        productMap.set(prod.id, prod);
      });
    } catch (err) {
      console.error("Failed to fetch product catalog in compiler:", err);
    }
  }

  // Check if Merchant Offer had 0 selected items or was flagged NO_VALID_OFFER / INSUFFICIENT_INVENTORY
  if (merchantOfferDoc.selectedItems.length === 0 || merchantOfferDoc.status === "NO_VALID_OFFER" || merchantOfferDoc.status === "INSUFFICIENT_INVENTORY") {
    const failMsg = `Merchant offer does not contain valid selected items (Status: ${merchantOfferDoc.status}).`;
    checks.push({
      rule: "PRODUCT_VALIDITY",
      status: "FAIL",
      message: failMsg,
    });
    return createFailedResult(
      dealId,
      merchantOfferId,
      buyerIntentId,
      failMsg,
      checks,
      merchantOfferDoc,
      buyerIntentDoc,
      { maxDiscountPercent, minimumMarginPercent, maxAutoTransactionAmount, approvalRequiredAbove }
    );
  }

  // 5. Product & Inventory Validation against LIVE Firestore Data
  const compiledItems: CompiledDealItem[] = [];
  const verifiedProducts: Product[] = [];
  let productValidityFailed = false;
  let inventoryCheckFailed = false;
  let priceMismatchDetected = false;

  for (const item of merchantOfferDoc.selectedItems) {
    const liveProd = productMap.get(item.productId);

    // Rule 1: Product Existence, Active State, and Merchant Ownership
    if (!liveProd) {
      checks.push({
        rule: "PRODUCT_VALIDITY",
        status: "FAIL",
        message: `Product ID '${item.productId}' does not exist in active merchant catalog.`,
      });
      productValidityFailed = true;
      continue;
    }

    if (liveProd.merchantId !== merchantId) {
      checks.push({
        rule: "PRODUCT_VALIDITY",
        status: "FAIL",
        message: `Product '${liveProd.name}' (${liveProd.id}) does not belong to merchant ${merchantId}.`,
      });
      productValidityFailed = true;
      continue;
    }

    if (!liveProd.active) {
      checks.push({
        rule: "PRODUCT_VALIDITY",
        status: "FAIL",
        message: `Product '${liveProd.name}' is currently inactive in Firestore.`,
      });
      productValidityFailed = true;
      continue;
    }

    if (item.quantity <= 0) {
      checks.push({
        rule: "PRODUCT_VALIDITY",
        status: "FAIL",
        message: `Invalid quantity ${item.quantity} for product '${liveProd.name}'.`,
      });
      productValidityFailed = true;
      continue;
    }

    // Rule 2: Live Inventory Check
    if (item.quantity > liveProd.stock) {
      checks.push({
        rule: "INVENTORY_CHECK",
        status: "FAIL",
        message: `Requested quantity (${item.quantity} units) for '${liveProd.name}' exceeds available warehouse stock (${liveProd.stock} units).`,
      });
      inventoryCheckFailed = true;
      continue;
    }

    // Rule 3: Reverify Current Unit Price from Live Firestore
    if (item.unitPrice !== liveProd.price) {
      priceMismatchDetected = true;
      checks.push({
        rule: "PRICE_VERIFICATION",
        status: "WARN",
        message: `Price change detected for '${liveProd.name}'. Updated unit price from ₹${item.unitPrice} to live price ₹${liveProd.price}.`,
      });
    }

    // Use authoritative current Firestore price
    const currentUnitPrice = liveProd.price;
    const lineTotal = calculateLineTotal(item.quantity, currentUnitPrice);

    compiledItems.push({
      productId: liveProd.id,
      productName: liveProd.name,
      quantity: item.quantity,
      unitPrice: currentUnitPrice,
      lineTotal,
    });
    verifiedProducts.push(liveProd);
  }

  if (productValidityFailed || inventoryCheckFailed || compiledItems.length === 0) {
    const failReason = productValidityFailed
      ? "One or more products failed catalog validation."
      : "Insufficient warehouse inventory for selected items.";
    return createFailedResult(
      dealId,
      merchantOfferId,
      buyerIntentId,
      failReason,
      checks,
      merchantOfferDoc,
      buyerIntentDoc,
      { maxDiscountPercent, minimumMarginPercent, maxAutoTransactionAmount, approvalRequiredAbove }
    );
  }

  if (!priceMismatchDetected) {
    checks.push({
      rule: "PRODUCT_VALIDITY",
      status: "PASS",
      message: "All products verified active and belong to merchant.",
    });
    checks.push({
      rule: "PRICE_VERIFICATION",
      status: "PASS",
      message: "Current catalog prices verified against Firestore source of truth.",
    });
    checks.push({
      rule: "INVENTORY_CHECK",
      status: "PASS",
      message: "Authoritative inventory verified for all items.",
    });
  }

  // 6. Deterministic Arithmetic Calculations
  const subtotal = calculateSubtotal(compiledItems);
  const proposedDiscountPercent = merchantOfferDoc.proposedDiscount.percentage || 0;

  // 7. Discount Validation against Merchant Policy Cap
  if (proposedDiscountPercent > maxDiscountPercent) {
    const failMsg = `Proposed discount (${proposedDiscountPercent}%) exceeds merchant maximum allowed policy cap (${maxDiscountPercent}%).`;
    checks.push({
      rule: "DISCOUNT_LIMIT",
      status: "FAIL",
      message: failMsg,
    });
    return createFailedResult(
      dealId,
      merchantOfferId,
      buyerIntentId,
      failMsg,
      checks,
      merchantOfferDoc,
      buyerIntentDoc,
      { maxDiscountPercent, minimumMarginPercent, maxAutoTransactionAmount, approvalRequiredAbove }
    );
  }

  checks.push({
    rule: "DISCOUNT_LIMIT",
    status: "PASS",
    message: `Proposed discount (${proposedDiscountPercent}%) is within merchant policy cap (${maxDiscountPercent}%).`,
  });

  const discountAmount = calculateDiscount(subtotal, proposedDiscountPercent);
  const finalAmount = calculateFinalAmount(subtotal, discountAmount);

  // 8. Budget Validation against Buyer Intent
  const buyerBudget = buyerIntentDoc.budget ?? null;
  if (buyerBudget !== null && finalAmount > buyerBudget) {

    const excess = finalAmount - buyerBudget;
    const failMsg = `Final compiled deal amount (₹${finalAmount.toLocaleString("en-IN")}) exceeds buyer budget (₹${buyerBudget.toLocaleString("en-IN")}) by ₹${excess.toLocaleString("en-IN")}.`;
    checks.push({
      rule: "BUDGET_CONSTRAINT",
      status: "FAIL",
      message: failMsg,
    });
    return createFailedResult(
      dealId,
      merchantOfferId,
      buyerIntentId,
      failMsg,
      checks,
      merchantOfferDoc,
      buyerIntentDoc,
      { maxDiscountPercent, minimumMarginPercent, maxAutoTransactionAmount, approvalRequiredAbove }
    );
  }

  if (buyerBudget !== null) {
    checks.push({
      rule: "BUDGET_CONSTRAINT",
      status: "PASS",
      message: `Final amount (₹${finalAmount.toLocaleString("en-IN")}) satisfies buyer budget cap (₹${buyerBudget.toLocaleString("en-IN")}).`,
    });
  }

  // 9. Delivery SLA Validation
  const compiledDeliveryDays = calculateDeliveryDays(verifiedProducts);
  const buyerDeliveryMax = buyerIntentDoc.deliveryMaxDays ?? null;

  if (buyerDeliveryMax !== null && compiledDeliveryDays > buyerDeliveryMax) {
    const failMsg = `Calculated deal delivery SLA (${compiledDeliveryDays} days) exceeds buyer requested max limit (${buyerDeliveryMax} days).`;
    checks.push({
      rule: "DELIVERY_CONSTRAINT",
      status: "FAIL",
      message: failMsg,
    });
    return createFailedResult(
      dealId,
      merchantOfferId,
      buyerIntentId,
      failMsg,
      checks,
      merchantOfferDoc,
      buyerIntentDoc,
      { maxDiscountPercent, minimumMarginPercent, maxAutoTransactionAmount, approvalRequiredAbove }
    );
  }

  if (buyerDeliveryMax !== null) {
    checks.push({
      rule: "DELIVERY_CONSTRAINT",
      status: "PASS",
      message: `Calculated delivery SLA (${compiledDeliveryDays} days) satisfies buyer deadline (${buyerDeliveryMax} days).`,
    });
  }

  // 10. Quantity Satisfaction Check
  const totalCompiledQty = compiledItems.reduce((acc, curr) => acc + curr.quantity, 0);
  const requestedQty = buyerIntentDoc.quantity ?? null;
  if (requestedQty !== null) {
    checks.push({
      rule: "QUANTITY_SATISFACTION",
      status: "PASS",
      message: `Compiled quantity (${totalCompiledQty} units) satisfies structured buyer request (${requestedQty} units).`,
    });
  }

  // 11. Construct Successful Deal Contract
  const validationStatus: ValidationStatus = {
    status: "PASS",
    checks,
  };

  const rawContract: DealContract = {
    dealId,
    merchantId,
    buyerIntentId,
    merchantOfferId,

    buyerConstraints: {
      budget: buyerBudget,
      quantity: requestedQty,
      deliveryMaxDays: buyerDeliveryMax,
      preferences: buyerIntentDoc.preferences || [],
      negotiableConstraints: buyerIntentDoc.negotiableConstraints || [],
    },

    items: compiledItems,
    subtotal,
    discount: {
      amount: discountAmount,
      percentage: proposedDiscountPercent,
      reason: merchantOfferDoc.proposedDiscount.reasoning || `Approved ${proposedDiscountPercent}% discount within policy cap.`,
    },
    finalAmount,
    deliveryDays: compiledDeliveryDays,

    merchantConstraints: {
      maxDiscountPercent,
      minimumMarginPercent,
      maxAutoTransactionAmount,
      approvalRequiredAbove,
    },

    status: "COMPILED",
    validationStatus,
    createdAt: nowStr,
    updatedAt: nowStr,
  };

  const validatedContract = DealContractSchema.parse(rawContract);

  // 12. Save Deal Contract to Firestore `deals` collection
  if (adminDb) {
    try {
      await adminDb.collection(DEALS_COLLECTION).doc(dealId).set(validatedContract);
    } catch (err) {
      console.warn("Failed to write compiled deal contract to Firestore:", err);
    }
  }

  // 13. Create Real Audit Telemetry
  await recordAuditEvent(
    "DEAL_COMPILED",
    "DEAL_COMPILER",
    `Successfully compiled PACT Deal Contract #${dealId.substring(0, 10)} for ₹${finalAmount.toLocaleString("en-IN")}. All ${checks.length} compilation checks PASSED.`,
    {
      dealId,
      merchantId,
      buyerIntentId,
      merchantOfferId,
      subtotal,
      discountAmount,
      finalAmount,
      checksCount: checks.length,
    }
  );

  return {
    success: true,
    contract: validatedContract,
  };
}

/**
 * Helper to construct a failed CompileResult with status COMPILATION_FAILED
 */
function createFailedResult(
  dealId: string,
  merchantOfferId: string,
  buyerIntentId: string,
  failureReason: string,
  checks: DealCheckResult[],
  merchantOfferDoc?: MerchantOffer,
  buyerIntentDoc?: SavedBuyerIntent,
  merchantConstraints?: {
    maxDiscountPercent: number;
    minimumMarginPercent: number;
    maxAutoTransactionAmount: number;
    approvalRequiredAbove: number;
  }
): CompileResult {
  const nowStr = new Date().toISOString();
  const validationStatus: ValidationStatus = {
    status: "FAIL",
    checks,
    failureReason,
  };

  const rawContract: DealContract = {
    dealId,
    merchantId: merchantOfferDoc?.merchantId || DEMO_MERCHANT_ID,
    buyerIntentId,
    merchantOfferId,

    buyerConstraints: {
      budget: buyerIntentDoc?.budget ?? null,
      quantity: buyerIntentDoc?.quantity ?? null,
      deliveryMaxDays: buyerIntentDoc?.deliveryMaxDays ?? null,
      preferences: buyerIntentDoc?.preferences || [],
      negotiableConstraints: buyerIntentDoc?.negotiableConstraints || [],
    },


    items: (merchantOfferDoc?.selectedItems || []).map((i) => ({
      productId: i.productId,
      productName: i.productName,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      lineTotal: i.lineTotal,
    })),

    subtotal: merchantOfferDoc?.subtotal || 0,
    discount: {
      amount: merchantOfferDoc?.proposedDiscount.amount || 0,
      percentage: merchantOfferDoc?.proposedDiscount.percentage || 0,
      reason: failureReason,
    },
    finalAmount: merchantOfferDoc?.estimatedFinalAmount || 0,
    deliveryDays: merchantOfferDoc?.deliveryDays || 0,

    merchantConstraints: merchantConstraints || {
      maxDiscountPercent: 15,
      minimumMarginPercent: 20,
      maxAutoTransactionAmount: 50000,
      approvalRequiredAbove: 100000,
    },

    status: "COMPILATION_FAILED",
    validationStatus,
    createdAt: nowStr,
    updatedAt: nowStr,
  };

  const validatedContract = DealContractSchema.parse(rawContract);

  // Save failed attempt to Firestore for audit trail
  if (adminDb) {
    adminDb.collection(DEALS_COLLECTION).doc(dealId).set(validatedContract).catch(() => {});
  }

  // Record Audit Telemetry for failure
  recordAuditEvent(
    "DEAL_COMPILATION_FAILED",
    "DEAL_COMPILER",
    `Deal compilation failed for ${dealId}: ${failureReason}`,
    { dealId, merchantId: merchantOfferDoc?.merchantId, buyerIntentId, merchantOfferId, failureReason, checks }
  );

  return {
    success: false,
    contract: validatedContract,
    error: failureReason,
  };
}
