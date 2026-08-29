import { z } from "zod";

export const FirewallRuleNameSchema = z.enum([
  "INVENTORY_CHECK",
  "PRICE_VERIFICATION",
  "DISCOUNT_LIMIT",
  "BUDGET_CONSTRAINT",
  "DELIVERY_CONSTRAINT",
  "TRANSACTION_LIMIT",
  "HUMAN_APPROVAL_GATE",
  "DUPLICATE_PROTECTION",
  "PRODUCT_VALIDITY",
]);

export type FirewallRuleName = z.infer<typeof FirewallRuleNameSchema>;

export const RuleStatusSchema = z.enum(["PASS", "FAIL"]);
export type RuleStatus = z.infer<typeof RuleStatusSchema>;

export const RuleSeveritySchema = z.enum(["INFO", "WARNING", "CRITICAL"]);
export type RuleSeverity = z.infer<typeof RuleSeveritySchema>;

export const OverallFirewallStatusSchema = z.enum([
  "VALIDATED",
  "REJECTED",
  "PENDING_APPROVAL",
]);
export type OverallFirewallStatus = z.infer<typeof OverallFirewallStatusSchema>;

// Individual Rule Evaluation Output
export const RuleEvaluationSchema = z.object({
  ruleName: FirewallRuleNameSchema,
  status: RuleStatusSchema,
  severity: RuleSeveritySchema,
  explanation: z.string(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export type RuleEvaluation = z.infer<typeof RuleEvaluationSchema>;

// Complete Firewall Evaluation Document
export const FirewallEvaluationSchema = z.object({
  id: z.string(),
  dealId: z.string(),
  evaluatedAt: z.string(),
  overallStatus: OverallFirewallStatusSchema,
  evaluations: z.array(RuleEvaluationSchema),
  rulesCheckedCount: z.number().int().nonnegative(),
  passedCount: z.number().int().nonnegative(),
  failedCount: z.number().int().nonnegative(),
  warningCount: z.number().int().nonnegative(),
  summary: z.string(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export type FirewallEvaluation = z.infer<typeof FirewallEvaluationSchema>;

// Request payload for /api/firewall/evaluate
export const EvaluateFirewallRequestSchema = z.object({
  dealId: z.string().min(1, "dealId is required"),
});

export type EvaluateFirewallRequest = z.infer<typeof EvaluateFirewallRequestSchema>;
