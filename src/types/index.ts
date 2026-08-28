export type DealStatus =
  | "DRAFT"
  | "NEGOTIATING"
  | "COMPILED"
  | "VALIDATING"
  | "VALIDATED"
  | "REJECTED"
  | "PENDING_APPROVAL"
  | "PAYMENT_PENDING"
  | "PAID"
  | "FAILED";

export type ActorType =
  | "USER"
  | "BUYER_AGENT"
  | "MERCHANT_AGENT"
  | "DEAL_COMPILER"
  | "PACT_FIREWALL"
  | "SYSTEM"
  | "RAZORPAY";

export type AuditEventType =
  | "BUYER_REQUEST_RECEIVED"
  | "BUYER_INTENT_PARSED"
  | "CATALOG_SEARCH_COMPLETED"
  | "MERCHANT_OPPORTUNITY_DETECTED"
  | "MERCHANT_OFFER_GENERATED"
  | "DEAL_COMPILED"
  | "POLICY_CHECK_STARTED"
  | "POLICY_CHECK_PASSED"
  | "POLICY_CHECK_FAILED"
  | "DEAL_VALIDATED"
  | "DEAL_REJECTED"
  | "HUMAN_APPROVAL_REQUIRED"
  | "DEAL_APPROVED"
  | "PAYMENT_INITIATED"
  | "RAZORPAY_ORDER_CREATED"
  | "WEBHOOK_RECEIVED"
  | "PAYMENT_SUCCESSFUL"
  | "PAYMENT_FAILED";

// 1. Merchant Entity
export interface Merchant {
  id: string;
  name: string;
  description: string;
  maxDiscountPercent: number;
  minimumMarginPercent: number;
  maxAutoTransactionAmount: number;
  approvalRequiredAbove: number;
  allowSlowMovingInventoryDiscount: boolean;
  createdAt: string;
  updatedAt: string;
}

// 2. Product Entity
export interface Product {
  id: string;
  merchantId: string;
  name: string;
  description: string;
  category: string;
  price: number;
  stock: number;
  attributes: Record<string, string | number | boolean>;
  deliveryDays: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

// Structured Buyer Intent Placeholder Type
export interface BuyerIntent {
  rawRequest: string;
  productIntent: string;
  quantity: number;
  maxBudget?: number;
  requestedDiscountPercent?: number;
  deliveryMaxDays?: number;
  preferences?: string[];
  negotiableConstraints?: string[];
  confidence?: number;
}

// Deal Item Structure
export interface DealItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

// 3. Deal Entity
export interface Deal {
  id: string;
  merchantId: string;
  status: DealStatus;
  buyerIntent: BuyerIntent;
  items: DealItem[];
  subtotal: number;
  discount: {
    amount: number;
    percentage: number;
    reason?: string;
  };
  finalAmount: number;
  deliveryDays: number;
  createdAt: string;
  updatedAt: string;
}

// 4. Action Proposal Entity
export interface ActionProposal {
  id: string;
  dealId: string;
  actor: ActorType;
  actionType: string;
  status: "PROPOSED" | "ACCEPTED" | "REJECTED" | "SUPERSEDED";
  payload: Record<string, unknown>;
  createdAt: string;
}

// 5. Policy Evaluation Entity
export interface PolicyEvaluation {
  id: string;
  dealId: string;
  ruleName: string;
  status: "PASS" | "FAIL";
  severity: "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  explanation: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// 6. Order Entity
export interface Order {
  id: string;
  dealId: string;
  merchantId: string;
  amount: number;
  currency: string;
  status: "CREATED" | "PROCESSING" | "PAID" | "CANCELLED" | "FAILED";
  createdAt: string;
  updatedAt: string;
}

// 7. Payment Entity
export interface Payment {
  id: string;
  dealId: string;
  orderId: string;
  provider: "RAZORPAY";
  providerPaymentId?: string;
  amount: number;
  currency: string;
  status: "PENDING" | "PROCESSING" | "SUCCESS" | "FAILED";
  createdAt: string;
  updatedAt: string;
}

// 8. Audit Event Entity
export interface AuditEvent {
  id: string;
  dealId: string;
  timestamp: string;
  actor: ActorType;
  eventType: AuditEventType;
  humanReadableMessage: string;
  metadata?: Record<string, unknown>;
}


