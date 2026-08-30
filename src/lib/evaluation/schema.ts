import { z } from "zod";

export type ScenarioId =
  | "SUCCESSFUL_DEAL"
  | "INVALID_DISCOUNT"
  | "OUT_OF_STOCK"
  | "BUDGET_EXCEEDED"
  | "DELIVERY_CONSTRAINT_FAILURE"
  | "DUPLICATE_PAYMENT_ATTEMPT"
  | "PAYMENT_FAILURE";

export type ScenarioStatus = "NOT_RUN" | "RUNNING" | "PASSED" | "FAILED" | "ERROR";

export type LifecycleStageStatus = "COMPLETE" | "BLOCKED" | "FAILED" | "SKIPPED" | "ACTIVE" | "PENDING";

export interface LifecycleTraceItem {
  stage: "BUYER_INTENT" | "MERCHANT_OFFER" | "DEAL_COMPILER" | "PACT_FIREWALL" | "PAYMENT";
  label: string;
  status: LifecycleStageStatus;
  summary: string;
  timestamp?: string;
}

export interface EvaluationScenario {
  id: ScenarioId;
  name: string;
  category: "HAPPY_PATH" | "POLICY_GOVERNANCE" | "INVENTORY_SAFETY" | "BUDGET_SECURITY" | "SLA_ENFORCEMENT" | "IDEMPOTENCY_SAFETY" | "SETTLEMENT_RELIABILITY";
  description: string;
  expectedOutcome: {
    buyerIntent: string;
    merchantOffer: string;
    dealCompiler: string;
    pactFirewall: string;
    payment: string;
    summary: string;
  };
  actualOutcome?: {
    buyerIntent?: string;
    merchantOffer?: string;
    dealCompiler?: string;
    pactFirewall?: string;
    payment?: string;
    summary?: string;
    blockedRule?: string;
  };
  status: ScenarioStatus;
  trace: LifecycleTraceItem[];
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  relatedDealId?: string;
  auditEventIds: string[];
  failureReasoning?: {
    whatHappened: string;
    whyItHappened: string;
    whatWasExpected: string;
    whatActuallyHappened: string;
    failedComponent: string;
    rule?: string;
  };
}

export interface EvaluationRun {
  runId: string;
  startedAt: string;
  completedAt: string;
  totalScenarios: number;
  passed: number;
  failed: number;
  errors: number;
  durationMs: number;
  firewallBlocks: number;
  duplicatesPrevented: number;
  paymentFailures: number;
  scenarios: EvaluationScenario[];
}

export const EvaluationScenarioSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  description: z.string(),
  status: z.enum(["NOT_RUN", "RUNNING", "PASSED", "FAILED", "ERROR"]),
});
