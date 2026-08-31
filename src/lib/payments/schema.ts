import { z } from "zod";

// Payment State Machine
export const PaymentStatusSchema = z.enum([
  "PAYMENT_PENDING",
  "PAYMENT_PROCESSING",
  "PAID",
  "PAYMENT_FAILED",
]);
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;

// Order Status
export const OrderStatusSchema = z.enum([
  "CREATED",
  "PROCESSING",
  "PAID",
  "FAILED",
  "CANCELLED",
]);
export type OrderStatus = z.infer<typeof OrderStatusSchema>;

// Firestore Order Model
export const PACTOrderSchema = z.object({
  id: z.string(),
  dealId: z.string(),
  merchantId: z.string(),
  razorpayOrderId: z.string(),
  amount: z.number().int().positive(), // in paise (integer)
  currency: z.literal("INR"),
  status: OrderStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});
export type PACTOrder = z.infer<typeof PACTOrderSchema>;

// Firestore Payment Model
export const PACTPaymentSchema = z.object({
  id: z.string(),
  dealId: z.string(),
  orderId: z.string(),
  razorpayOrderId: z.string(),
  razorpayPaymentId: z.string().optional(),
  amount: z.number().int().positive(), // in paise
  currency: z.literal("INR"),
  status: PaymentStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});
export type PACTPayment = z.infer<typeof PACTPaymentSchema>;

// Request Schema: Create Razorpay Order
export const CreateOrderRequestSchema = z.object({
  dealId: z.string().min(1, "dealId is required"),
});
export type CreateOrderRequest = z.infer<typeof CreateOrderRequestSchema>;

// Response Schema: Create Order Response
export const CreateOrderResponseSchema = z.object({
  success: z.boolean(),
  orderId: z.string(),
  razorpayOrderId: z.string(),
  amount: z.number().int().positive(), // in paise
  currency: z.literal("INR"),
  keyId: z.string(),
  merchantName: z.string(),
  dealId: z.string(),
  productSummary: z.string(),
});
export type CreateOrderResponse = z.infer<typeof CreateOrderResponseSchema>;

// Request Schema: Verify Payment
export const VerifyPaymentRequestSchema = z.object({
  dealId: z.string().min(1, "dealId is required"),
  razorpay_order_id: z.string().min(1, "razorpay_order_id is required"),
  razorpay_payment_id: z.string().min(1, "razorpay_payment_id is required"),
  razorpay_signature: z.string().min(1, "razorpay_signature is required"),
  isSimulatedTest: z.boolean().optional(),
});
export type VerifyPaymentRequest = z.infer<typeof VerifyPaymentRequestSchema>;

// Response Schema: Verify Payment
export const VerifyPaymentResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  dealId: z.string(),
  orderId: z.string(),
  paymentId: z.string(),
  status: PaymentStatusSchema,
});
export type VerifyPaymentResponse = z.infer<typeof VerifyPaymentResponseSchema>;
