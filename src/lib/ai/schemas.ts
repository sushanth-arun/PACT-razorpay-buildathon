import { z } from "zod";

// Zod Schema for Structured Buyer Intent
export const BuyerIntentSchema = z.object({
  productIntent: z.string({
    message: "productIntent is required",
  }),

  quantity: z.number().int().positive().nullable(),
  budget: z.number().positive().nullable(),
  requestedDiscount: z
    .union([
      z.number(),
      z.string(),
      z.null(),
    ])
    .nullable(),
  deliveryMaxDays: z.number().positive().nullable(),
  preferences: z.array(z.string()).default([]),
  negotiableConstraints: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1).default(0.8),
  rawRequest: z.string(),
  createdAt: z.string(),
});

export type BuyerIntent = z.infer<typeof BuyerIntentSchema>;

export interface BuyerIntentDocument extends BuyerIntent {
  id: string;
  aiProvider: string;
}
