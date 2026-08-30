import { z } from "zod";

// Strict Audit Actor Types
export const AuditActorSchema = z.enum([
  "USER",
  "BUYER_AGENT",
  "MERCHANT_AGENT",
  "DEAL_COMPILER",
  "PACT_FIREWALL",
  "SYSTEM",
  "RAZORPAY",
]);

export type AuditActor = z.infer<typeof AuditActorSchema>;

// Comprehensive PACT Real Lifecycle Event Types
export const AuditEventTypeSchema = z.enum([
  "BUYER_REQUEST_RECEIVED",
  "BUYER_INTENT_PARSED",
  "CATALOG_SEARCH_STARTED",
  "CATALOG_SEARCH_COMPLETED",
  "MERCHANT_POLICIES_RETRIEVED",
  "MERCHANT_OPPORTUNITY_DETECTED",
  "MERCHANT_OFFER_GENERATED",
  "MERCHANT_OFFER_FAILED",
  "MERCHANT_OFFER_VALIDATED",
  "DEAL_COMPILATION_STARTED",
  "DEAL_COMPILED",
  "DEAL_COMPILATION_FAILED",
  "POLICY_CHECK_STARTED",
  "POLICY_CHECK_PASSED",
  "POLICY_CHECK_FAILED",
  "DEAL_VALIDATED",
  "DEAL_REJECTED",
  "HUMAN_APPROVAL_REQUIRED",
  "DEAL_APPROVED",
  "PAYMENT_INITIATED",
  "RAZORPAY_ORDER_CREATED",
  "PAYMENT_PROCESSING",
  "PAYMENT_SUCCESSFUL",
  "PAYMENT_FAILED",
  "WEBHOOK_RECEIVED",
  "WEBHOOK_VERIFIED",
  "DUPLICATE_PAYMENT_PREVENTED",
]);

export type AuditEventType = z.infer<typeof AuditEventTypeSchema>;

// Strict Audit Event Record Schema
export const AuditEventSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  dealId: z.string(),
  merchantId: z.string().optional(),
  actor: AuditActorSchema,
  eventType: AuditEventTypeSchema,
  humanReadableMessage: z.string(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export type AuditEvent = z.infer<typeof AuditEventSchema>;

// API Query Filter Schema
export const AuditQueryFilterSchema = z.object({
  dealId: z.string().optional(),
  merchantId: z.string().optional(),
  actor: AuditActorSchema.optional(),
  eventType: AuditEventTypeSchema.optional(),
  search: z.string().optional(),
  limit: z.number().min(1).max(200).default(100),
  order: z.enum(["asc", "desc"]).default("asc"),
});

export type AuditQueryFilter = z.infer<typeof AuditQueryFilterSchema>;
