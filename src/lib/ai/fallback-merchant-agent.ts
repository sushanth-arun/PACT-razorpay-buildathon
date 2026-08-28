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

  // Pick top matching product
  const primary = inStockCandidates[0];
  const alternatives = inStockCandidates.slice(1, 3);

  // Propose discount up to policy cap
  let proposedDiscount = 5;
  if (buyerIntent.requestedDiscount === "best possible" || typeof buyerIntent.requestedDiscount === "number") {
    proposedDiscount = Math.min(10, merchant.maxDiscountPercent);
  }

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
