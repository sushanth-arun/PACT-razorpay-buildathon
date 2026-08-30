/**
 * Server-Side Payment Service for PACT (Phase 7).
 * ZERO GEMINI CALLS.
 * STRICT SERVER AUTHORITY & DETERMINISTIC VALIDATION.
 */

import crypto from "crypto";
import { adminDb } from "@/lib/firebase/admin";
import { DEALS_COLLECTION } from "@/lib/deal-compiler";
import { DealContract } from "@/lib/deal-compiler/schema";
import { recordAuditEvent } from "@/services/buyer-intent-service";
import {
  getRazorpayClient,
  getRazorpayKeyId,
  getRazorpayWebhookSecret,
} from "./razorpay-client";
import {
  PACTOrder,
  PACTPayment,
  CreateOrderResponse,
  VerifyPaymentResponse,
} from "./schema";

export const ORDERS_COLLECTION = "orders";
export const PAYMENTS_COLLECTION = "payments";
export const PROCESSED_WEBHOOKS_COLLECTION = "processed_webhooks";

/**
 * Checks whether a deal contract is in an eligible payment state.
 * Only VALIDATED, PAYMENT_PENDING, or explicitly APPROVED deals are permitted.
 */
export function canCreatePayment(deal: DealContract): boolean {
  return (
    deal.status === "VALIDATED" ||
    deal.status === "PAYMENT_PENDING" ||
    (deal.status as string) === "APPROVED"
  );
}

/**
 * Creates a secure Razorpay Test Mode Order for a VALIDATED Deal.
 * Retrieves authoritative finalAmount directly from Firestore.
 */
export async function createPaymentOrder(
  dealId: string
): Promise<{ success: boolean; data?: CreateOrderResponse; error?: string; code?: string }> {
  if (!adminDb) {
    return {
      success: false,
      error: "Database configuration unavailable.",
      code: "DB_UNAVAILABLE",
    };
  }

  // 1. Retrieve the Deal Contract from Firestore
  const dealRef = adminDb.collection(DEALS_COLLECTION).doc(dealId);
  const dealSnap = await dealRef.get();

  if (!dealSnap.exists) {
    return {
      success: false,
      error: `Deal Contract ${dealId} was not found.`,
      code: "DEAL_NOT_FOUND",
    };
  }

  const deal = dealSnap.data() as DealContract;

  // 2. Strict Payment Eligibility Gate
  if (!canCreatePayment(deal)) {
    await recordAuditEvent(
      "PAYMENT_FAILED",
      "PACT_PAYMENT_SERVICE",
      `Payment creation rejected: Deal ${dealId} status is '${deal.status}', but must be 'VALIDATED'.`,
      { dealId, dealStatus: deal.status }
    );

    return {
      success: false,
      error: `Payment order cannot be created for a deal with status '${deal.status}'. Only VALIDATED deals can be paid.`,
      code: "DEAL_NOT_ELIGIBLE",
    };
  }

  // 3. Prevent duplicate payment if already PAID
  if (deal.status === "PAID") {
    await recordAuditEvent(
      "DUPLICATE_PAYMENT_PREVENTED",
      "PACT_PAYMENT_SERVICE",
      `Duplicate payment prevented: Deal ${dealId} is already PAID.`,
      { dealId }
    );

    return {
      success: false,
      error: "This deal has already been paid and settled.",
      code: "ALREADY_PAID",
    };
  }

  // 4. Check for existing active Order (Duplicate Protection / Idempotency)
  const existingOrdersSnap = await adminDb
    .collection(ORDERS_COLLECTION)
    .where("dealId", "==", dealId)
    .where("status", "in", ["CREATED", "PROCESSING"])
    .limit(1)
    .get();

  const razorpay = getRazorpayClient();
  const keyId = getRazorpayKeyId();

  // Authoritative amount from Deal Contract in paise (integer arithmetic)
  const amountInPaise = Math.round(deal.finalAmount * 100);

  // If active order exists, return existing order to avoid creating duplicates
  if (!existingOrdersSnap.empty) {
    const existingOrder = existingOrdersSnap.docs[0].data() as PACTOrder;
    await recordAuditEvent(
      "DUPLICATE_PAYMENT_PREVENTED",
      "PACT_PAYMENT_SERVICE",
      `Returning existing active Razorpay order ${existingOrder.razorpayOrderId} for Deal ${dealId}.`,
      { dealId, orderId: existingOrder.id, razorpayOrderId: existingOrder.razorpayOrderId }
    );

    const productSummary = deal.items.map((i) => `${i.productName} (x${i.quantity})`).join(", ");

    return {
      success: true,
      data: {
        success: true,
        orderId: existingOrder.id,
        razorpayOrderId: existingOrder.razorpayOrderId,
        amount: existingOrder.amount,
        currency: "INR",
        keyId,
        merchantName: "ErgoSpace",
        dealId,
        productSummary,
      },
    };
  }

  if (!razorpay || !keyId) {
    // If Razorpay API credentials are not configured in test environment, return a helpful error
    return {
      success: false,
      error: "Razorpay Test Mode credentials (RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET) are not configured in .env.local.",
      code: "RAZORPAY_CONFIG_MISSING",
    };
  }

  const nowStr = new Date().toISOString();
  const orderId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // 5. Create Razorpay Order via SDK
  try {
    const rzOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: orderId,
      notes: {
        dealId,
        merchantId: deal.merchantId,
        itemCount: deal.items.length,
      },
    });

    // 6. Save Order in Firestore
    const newOrder: PACTOrder = {
      id: orderId,
      dealId,
      merchantId: deal.merchantId,
      razorpayOrderId: rzOrder.id,
      amount: amountInPaise,
      currency: "INR",
      status: "CREATED",
      createdAt: nowStr,
      updatedAt: nowStr,
      metadata: { receipt: orderId },
    };

    await adminDb.collection(ORDERS_COLLECTION).doc(orderId).set(newOrder);

    // 7. Save Payment record as PAYMENT_PENDING
    const newPayment: PACTPayment = {
      id: paymentId,
      dealId,
      orderId,
      razorpayOrderId: rzOrder.id,
      amount: amountInPaise,
      currency: "INR",
      status: "PAYMENT_PENDING",
      createdAt: nowStr,
      updatedAt: nowStr,
      metadata: {},
    };

    await adminDb.collection(PAYMENTS_COLLECTION).doc(paymentId).set(newPayment);

    // 8. Update Deal state to PAYMENT_PENDING
    await dealRef.update({
      status: "PAYMENT_PENDING",
      updatedAt: nowStr,
    });

    // 9. Record Audit Events with merchantId
    await recordAuditEvent(
      "PAYMENT_INITIATED",
      "USER",
      `Payment checkout initiated for Deal ${dealId} (₹${deal.finalAmount.toLocaleString("en-IN")}).`,
      { dealId, merchantId: deal.merchantId, amount: deal.finalAmount, orderId }
    );

    await recordAuditEvent(
      "RAZORPAY_ORDER_CREATED",
      "RAZORPAY",
      `Razorpay Test Order ${rzOrder.id} created for ₹${deal.finalAmount.toLocaleString("en-IN")}.`,
      { dealId, merchantId: deal.merchantId, orderId, razorpayOrderId: rzOrder.id, amountInPaise }
    );

    const productSummary = deal.items.map((i) => `${i.productName} (x${i.quantity})`).join(", ");

    return {
      success: true,
      data: {
        success: true,
        orderId,
        razorpayOrderId: rzOrder.id,
        amount: amountInPaise,
        currency: "INR",
        keyId,
        merchantName: "ErgoSpace",
        dealId,
        productSummary,
      },
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Razorpay order creation failed.";
    await recordAuditEvent(
      "PAYMENT_FAILED",
      "RAZORPAY",
      `Failed to create Razorpay order for Deal ${dealId}: ${errorMsg}`,
      { dealId, error: errorMsg }
    );

    return {
      success: false,
      error: `Razorpay Error: ${errorMsg}`,
      code: "RAZORPAY_API_ERROR",
    };
  }
}

/**
 * Verifies Razorpay Payment Signature Server-Side.
 * Cryptographically verifies HMAC-SHA256 signature using RAZORPAY_KEY_SECRET.
 */
export async function verifyPaymentSignature(payload: {
  dealId: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}): Promise<VerifyPaymentResponse> {
  const { dealId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = payload;
  const keySecret = process.env.RAZORPAY_KEY_SECRET || "";
  const nowStr = new Date().toISOString();

  if (!keySecret) {
    throw new Error("RAZORPAY_KEY_SECRET is not configured on the server.");
  }

  if (!adminDb) {
    throw new Error("Firestore Admin DB unavailable.");
  }

  // 1. Cryptographic HMAC SHA256 verification
  const generatedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  const isSignatureValid = generatedSignature === razorpay_signature;

  // Retrieve matching Order & Payment
  const ordersSnap = await adminDb
    .collection(ORDERS_COLLECTION)
    .where("razorpayOrderId", "==", razorpay_order_id)
    .limit(1)
    .get();

  const orderDoc = ordersSnap.empty ? null : ordersSnap.docs[0];
  const orderId = orderDoc ? orderDoc.id : "";

  const paymentsSnap = await adminDb
    .collection(PAYMENTS_COLLECTION)
    .where("razorpayOrderId", "==", razorpay_order_id)
    .limit(1)
    .get();

  const paymentDoc = paymentsSnap.empty ? null : paymentsSnap.docs[0];
  const paymentId = paymentDoc ? paymentDoc.id : `pay_${Date.now()}`;

  if (!isSignatureValid) {
    // Record payment failure
    if (paymentDoc) {
      await paymentDoc.ref.update({
        status: "PAYMENT_FAILED",
        razorpayPaymentId: razorpay_payment_id,
        updatedAt: nowStr,
        metadata: { failureReason: "INVALID_SIGNATURE" },
      });
    }

    if (orderDoc) {
      await orderDoc.ref.update({
        status: "FAILED",
        updatedAt: nowStr,
      });
    }

    await recordAuditEvent(
      "PAYMENT_FAILED",
      "PACT_FIREWALL",
      `Payment signature verification FAILED for Deal ${dealId}. Order: ${razorpay_order_id}`,
      { dealId, razorpay_order_id, razorpay_payment_id }
    );

    return {
      success: false,
      message: "Payment signature verification failed. Invalid signature.",
      dealId,
      orderId,
      paymentId,
      status: "PAYMENT_FAILED",
    };
  }

  // 2. Successful Verification -> Update Payment, Order, and Deal to PAID
  if (paymentDoc) {
    await paymentDoc.ref.update({
      status: "PAID",
      razorpayPaymentId: razorpay_payment_id,
      updatedAt: nowStr,
    });
  } else {
    await adminDb.collection(PAYMENTS_COLLECTION).doc(paymentId).set({
      id: paymentId,
      dealId,
      orderId,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      amount: orderDoc ? (orderDoc.data() as PACTOrder).amount : 0,
      currency: "INR",
      status: "PAID",
      createdAt: nowStr,
      updatedAt: nowStr,
      metadata: {},
    });
  }

  if (orderDoc) {
    await orderDoc.ref.update({
      status: "PAID",
      updatedAt: nowStr,
    });
  }

  // Update Deal document to PAID
  await adminDb.collection(DEALS_COLLECTION).doc(dealId).update({
    status: "PAID",
    updatedAt: nowStr,
    paidAt: nowStr,
  });

  // Record real audit events
  const dealSnap = await adminDb.collection(DEALS_COLLECTION).doc(dealId).get();
  const dealMerchantId = dealSnap.exists ? (dealSnap.data() as { merchantId?: string }).merchantId : undefined;

  await recordAuditEvent(
    "PAYMENT_SUCCESSFUL",
    "RAZORPAY",
    `Payment ${razorpay_payment_id} successfully verified for Deal ${dealId}. Contract is now PAID.`,
    { dealId, merchantId: dealMerchantId, orderId, razorpay_order_id, razorpay_payment_id }
  );

  return {
    success: true,
    message: "Payment successfully verified and deal finalized as PAID.",
    dealId,
    orderId,
    paymentId,
    status: "PAID",
  };
}

/**
 * Validates and processes a Razorpay Webhook event idempotently.
 */
export async function processRazorpayWebhook(
  rawBody: string,
  signatureHeader: string
): Promise<{ success: boolean; event?: string; message: string }> {
  const webhookSecret = getRazorpayWebhookSecret();

  if (!webhookSecret) {
    return {
      success: false,
      message: "RAZORPAY_WEBHOOK_SECRET is not configured on the server.",
    };
  }

  // 1. Raw Body Signature Verification
  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  if (expectedSignature !== signatureHeader) {
    await recordAuditEvent(
      "WEBHOOK_RECEIVED",
      "RAZORPAY",
      "Rejected incoming webhook: Invalid webhook signature.",
      { reason: "SIGNATURE_MISMATCH" }
    );
    return {
      success: false,
      message: "Invalid webhook signature.",
    };
  }

  if (!adminDb) {
    return {
      success: false,
      message: "Firestore DB unavailable.",
    };
  }

  // 2. Parse Event JSON safely
  let eventPayload: {
    event: string;
    payload?: {
      payment?: {
        entity?: {
          id: string;
          order_id: string;
          amount: number;
          status: string;
          notes?: Record<string, string>;
        };
      };
      order?: {
        entity?: {
          id: string;
          receipt: string;
          status: string;
        };
      };
    };
  };

  try {
    eventPayload = JSON.parse(rawBody);
  } catch {
    return {
      success: false,
      message: "Malformed webhook payload JSON.",
    };
  }

  const eventName = eventPayload.event;
  const paymentEntity = eventPayload.payload?.payment?.entity;
  const orderId = paymentEntity?.order_id || eventPayload.payload?.order?.entity?.id;
  const paymentId = paymentEntity?.id;
  const dealId = paymentEntity?.notes?.dealId || "";

  // 3. Webhook Idempotency Guard (Processed Webhooks Collection)
  const webhookId = `wh_${crypto.createHash("sha256").update(rawBody).digest("hex").substring(0, 16)}`;
  const webhookDocRef = adminDb.collection(PROCESSED_WEBHOOKS_COLLECTION).doc(webhookId);
  const webhookSnap = await webhookDocRef.get();

  if (webhookSnap.exists) {
    // Idempotently acknowledge without repeating transitions
    return {
      success: true,
      event: eventName,
      message: "Webhook event already processed (Idempotent acknowledge).",
    };
  }

  const nowStr = new Date().toISOString();

  // Save webhook event to prevent future duplicates
  await webhookDocRef.set({
    id: webhookId,
    event: eventName,
    orderId: orderId || null,
    paymentId: paymentId || null,
    dealId: dealId || null,
    processedAt: nowStr,
  });

  await recordAuditEvent(
    "WEBHOOK_RECEIVED",
    "RAZORPAY",
    `Verified Razorpay Webhook received: '${eventName}' for Order ${orderId || "N/A"}.`,
    { eventName, orderId, paymentId, dealId }
  );

  // 4. Handle Specific Event Types
  if (eventName === "payment.captured" || eventName === "order.paid") {
    if (orderId) {
      const ordersSnap = await adminDb
        .collection(ORDERS_COLLECTION)
        .where("razorpayOrderId", "==", orderId)
        .limit(1)
        .get();

      if (!ordersSnap.empty) {
        const orderDoc = ordersSnap.docs[0];
        const orderData = orderDoc.data() as PACTOrder;
        const targetDealId = orderData.dealId || dealId;

        await orderDoc.ref.update({
          status: "PAID",
          updatedAt: nowStr,
        });

        if (targetDealId) {
          await adminDb.collection(DEALS_COLLECTION).doc(targetDealId).update({
            status: "PAID",
            updatedAt: nowStr,
            paidAt: nowStr,
          });
        }
      }
    }

    if (paymentId && orderId) {
      const paymentsSnap = await adminDb
        .collection(PAYMENTS_COLLECTION)
        .where("razorpayOrderId", "==", orderId)
        .limit(1)
        .get();

      if (!paymentsSnap.empty) {
        await paymentsSnap.docs[0].ref.update({
          status: "PAID",
          razorpayPaymentId: paymentId,
          updatedAt: nowStr,
        });
      }
    }

    await recordAuditEvent(
      "PAYMENT_SUCCESSFUL",
      "RAZORPAY",
      `Webhook confirmed payment captured (${paymentId}) for Order ${orderId}.`,
      { eventName, orderId, paymentId, dealId }
    );
  } else if (eventName === "payment.failed") {
    if (orderId) {
      const ordersSnap = await adminDb
        .collection(ORDERS_COLLECTION)
        .where("razorpayOrderId", "==", orderId)
        .limit(1)
        .get();

      if (!ordersSnap.empty) {
        await ordersSnap.docs[0].ref.update({
          status: "FAILED",
          updatedAt: nowStr,
        });
      }
    }

    if (orderId) {
      const paymentsSnap = await adminDb
        .collection(PAYMENTS_COLLECTION)
        .where("razorpayOrderId", "==", orderId)
        .limit(1)
        .get();

      if (!paymentsSnap.empty) {
        await paymentsSnap.docs[0].ref.update({
          status: "PAYMENT_FAILED",
          razorpayPaymentId: paymentId,
          updatedAt: nowStr,
        });
      }
    }

    await recordAuditEvent(
      "PAYMENT_FAILED",
      "RAZORPAY",
      `Webhook reported payment failed (${paymentId}) for Order ${orderId}.`,
      { eventName, orderId, paymentId, dealId }
    );
  }

  return {
    success: true,
    event: eventName,
    message: "Webhook processed successfully.",
  };
}
