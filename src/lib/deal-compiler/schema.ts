import { z } from "zod";

// Compilation Check Result Rule Schema
export const DealCheckRuleSchema = z.enum([
  "PRODUCT_VALIDITY",
  "PRICE_VERIFICATION",
  "INVENTORY_CHECK",
  "DISCOUNT_LIMIT",
  "BUDGET_CONSTRAINT",
  "DELIVERY_CONSTRAINT",
  "QUANTITY_SATISFACTION",
  "MERCHANT_POLICY",
]);

export type DealCheckRule = z.infer<typeof DealCheckRuleSchema>;

export const DealCheckResultSchema = z.object({
  rule: DealCheckRuleSchema,
  status: z.enum(["PASS", "FAIL", "WARN"]),
  message: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),
});

export type DealCheckResult = z.infer<typeof DealCheckResultSchema>;

export const ValidationStatusSchema = z.object({
  status: z.enum(["PASS", "FAIL"]),
  checks: z.array(DealCheckResultSchema),
  failureReason: z.string().optional(),
});

export type ValidationStatus = z.infer<typeof ValidationStatusSchema>;

export const CompiledDealItemSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
  lineTotal: z.number().nonnegative(),
});

export type CompiledDealItem = z.infer<typeof CompiledDealItemSchema>;

export type DealContractStatus =
  | "DRAFT"
  | "COMPILING"
  | "COMPILED"
  | "COMPILATION_FAILED";

// PACT Deal Contract Zod Schema
export const DealContractSchema = z.object({
  dealId: z.string(),
  merchantId: z.string(),
  buyerIntentId: z.string(),
  merchantOfferId: z.string(),

  buyerConstraints: z.object({
    budget: z.number().nullable(),
    quantity: z.number().int().nullable(),
    deliveryMaxDays: z.number().int().nullable(),
    preferences: z.array(z.string()),
    negotiableConstraints: z.array(z.string()),
  }),

  items: z.array(CompiledDealItemSchema),

  subtotal: z.number().nonnegative(),

  discount: z.object({
    amount: z.number().nonnegative(),
    percentage: z.number().min(0).max(100),
    reason: z.string(),
  }),

  finalAmount: z.number().nonnegative(),

  deliveryDays: z.number().int().nonnegative(),

  merchantConstraints: z.object({
    maxDiscountPercent: z.number(),
    minimumMarginPercent: z.number(),
    maxAutoTransactionAmount: z.number(),
    approvalRequiredAbove: z.number(),
  }),

  status: z.enum(["DRAFT", "COMPILING", "COMPILED", "COMPILATION_FAILED"]),

  validationStatus: ValidationStatusSchema,

  createdAt: z.string(),
  updatedAt: z.string(),
});

export type DealContract = z.infer<typeof DealContractSchema>;
