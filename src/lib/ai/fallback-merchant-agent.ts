/**
 * Deterministic Fallback Merchant Agent Reasoner
 * Activated when Gemini API key is missing or when dev fallback mode is enabled.
 */

import { BuyerIntent } from "./schemas";
import { Merchant, Product } from "@/types";
import { GeminiMerchantProposal } from "./merchant-agent";

export function runFallbackMerchantAgent(
  buyerIntent: BuyerIntent,
  merchant: Merchant,
  candidateProducts: Product[]
): GeminiMerchantProposal {
  const reqQty = buyerIntent.quantity || 1;
  const inStockCandidates = candidateProducts.filter((p) => p.stock >= reqQty);

  if (inStockCandidates.length === 0) {
    return {
      selectedProductIds: [],
      alternativeProductIds: candidateProducts.slice(0, 2).map((p) => ({ productId: p.id, quantity: 1 })),
      bundleProductIds: [],
      proposedDiscountPercent: 0,
      discountReasoning: "No items with sufficient inventory available.",
      buyerFitExplanation: "Unable to satisfy requested quantity with current in-stock catalog.",
      merchantOpportunityExplanation: "High demand detected; re-stocking recommendation logged.",
      reasoningSummary: "Insufficient inventory to fulfill exact request.",
    };
  }

  // Check if combo/bundle/gift request
  const isCombo = /combo|bundle|gift|setup|kit|package/i.test(buyerIntent.productIntent || "");
  
  // Propose discount up to policy cap
  let proposedDiscount = 0;
  if (buyerIntent.requestedDiscount === "best possible" || typeof buyerIntent.requestedDiscount === "number") {
    proposedDiscount = Math.min(10, merchant.maxDiscountPercent);
  }

  if (isCombo && inStockCandidates.length >= 2) {
    const selected = inStockCandidates.slice(0, 2);
    const alternatives = inStockCandidates.slice(2, 4);
    return {
      selectedProductIds: selected.map((p) => ({ productId: p.id, quantity: 1 })),
      alternativeProductIds: alternatives.map((a) => ({ productId: a.id, quantity: 1 })),
      bundleProductIds: [],
      proposedDiscountPercent: proposedDiscount,
      discountReasoning: proposedDiscount > 0
        ? `Proposed ${proposedDiscount}% bundle discount within merchant policy cap (${merchant.maxDiscountPercent}% max).`
        : "No discount requested.",
      buyerFitExplanation: `Curated a premium gift bundle featuring ${selected.map((s) => s.name).join(" and ")} tailored for your executive gifting need.`,
      merchantOpportunityExplanation: `Increases average order value (AOV) and packages complementary products efficiently.`,
      reasoningSummary: `Packaged ${selected.length} items (${selected.map((s) => s.name).join(", ")}) into a curated combo proposal.`,
    };
  }

  // Pick top matching product
  const primary = inStockCandidates[0];
  const alternatives = inStockCandidates.slice(1, 3);

  return {
    selectedProductIds: [{ productId: primary.id, quantity: reqQty }],
    alternativeProductIds: alternatives.map((a) => ({ productId: a.id, quantity: reqQty })),
    bundleProductIds: [],
    proposedDiscountPercent: proposedDiscount,
    discountReasoning: `Proposed ${proposedDiscount}% discount within merchant policy cap (${merchant.maxDiscountPercent}% max).`,
    buyerFitExplanation: `${primary.name} matches your requested ${buyerIntent.productIntent} requirements.`,
    merchantOpportunityExplanation: `High available inventory makes ${primary.name} an optimal commercial deal.`,
    reasoningSummary: `Selected ${primary.name} for ${reqQty} units with ${proposedDiscount}% discount.`,
  };
}
