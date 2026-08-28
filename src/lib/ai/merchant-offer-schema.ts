import { z } from "zod";

// Zod Schema for an individual item in a Merchant Offer
export const MerchantOfferItemSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().positive(),
  lineTotal: z.number().positive(),
});

export type MerchantOfferItem = z.infer<typeof MerchantOfferItemSchema>;

// Merchant Offer Statuses
export type MerchantOfferStatus =
  | "OFFER_GENERATED"
  | "ALTERNATIVE_FOUND"
  | "NO_VALID_OFFER"
  | "INSUFFICIENT_INVENTORY"
  | "DELIVERY_CONSTRAINT_FAILED"
  | "BUDGET_CONSTRAINT_FAILED";

// Zod Schema for Structured Merchant Offer
export const MerchantOfferSchema = z.object({
  id: z.string(),
  buyerIntentId: z.string(),
  merchantId: z.string(),
  status: z.enum([
    "OFFER_GENERATED",
    "ALTERNATIVE_FOUND",
    "NO_VALID_OFFER",
    "INSUFFICIENT_INVENTORY",
    "DELIVERY_CONSTRAINT_FAILED",
    "BUDGET_CONSTRAINT_FAILED",
  ]),
  selectedItems: z.array(MerchantOfferItemSchema),
  alternativeItems: z.array(MerchantOfferItemSchema).default([]),
  bundleItems: z.array(MerchantOfferItemSchema).default([]),
  subtotal: z.number().nonnegative(),
  proposedDiscount: z.object({
    percentage: z.number().min(0).max(100),
    amount: z.number().nonnegative(),
    reasoning: z.string(),
  }),
  estimatedFinalAmount: z.number().nonnegative(),
  deliveryDays: z.number().int().positive(),
  buyerFitExplanation: z.string(),
  merchantOpportunityExplanation: z.string(),
  reasoningSummary: z.string(),
  aiProvider: z.string(),
  aiModel: z.string(),
  createdAt: z.string(),
});

export type MerchantOffer = z.infer<typeof MerchantOfferSchema>;
