/**
 * Firestore Service Layer for Buyer Intents and Real Audit Telemetry
 */

import { adminDb } from "@/lib/firebase/admin";
import { BuyerIntent } from "@/lib/ai/schemas";

export const BUYER_INTENTS_COLLECTION = "buyer_intents";
export const AUDIT_EVENTS_COLLECTION = "audit_events";

export interface SavedBuyerIntent extends BuyerIntent {
  id: string;
  dealId?: string;
  aiProvider: string;
  aiModel: string;
}

/**
 * Persists parsed Buyer Intent document to Firestore safely via Admin SDK.
 * Also initializes the PACT Deal record in Firestore so the deal is immediately tracked.
 */
export async function saveBuyerIntent(
  intent: BuyerIntent,
  aiProvider: string = "google-gemini",
  aiModel: string = "gemini-3.1-flash-lite"
): Promise<SavedBuyerIntent> {
  const timestamp = Date.now();
  const suffix = Math.random().toString(36).substring(2, 7);
  const docId = `intent_${timestamp}_${suffix}`;
  const dealId = intent.dealId || `deal_${timestamp}_${suffix}`;

  const savedDoc: SavedBuyerIntent = {
    ...intent,
    id: docId,
    dealId,
    aiProvider,
    aiModel,
  };

  if (adminDb) {
    try {
      // 1. Save Buyer Intent in root collection and under deals/{dealId}/buyer_intents/{docId} subcollection
      await adminDb.collection(BUYER_INTENTS_COLLECTION).doc(docId).set(savedDoc);
      await adminDb.collection("deals").doc(dealId).collection(BUYER_INTENTS_COLLECTION).doc(docId).set(savedDoc);

      // 2. Initialize Deal in deals collection right upon intent creation
      const nowStr = new Date().toISOString();
      const initialDeal = {
        dealId,
        buyerIntentId: docId,
        merchantId: "ergospace",
        merchantName: "ErgoSpace",
        status: "DRAFT",
        finalAmount: intent.budget || 0,
        subtotal: intent.budget || 0,
        items: [],
        discount: { amount: 0, percentage: 0, reason: "Initial Draft" },
        deliveryDays: intent.deliveryMaxDays || 5,
        buyerConstraints: {
          budget: intent.budget,
          quantity: intent.quantity,
          deliveryMaxDays: intent.deliveryMaxDays,
          preferences: intent.preferences || [],
          negotiableConstraints: intent.negotiableConstraints || [],
        },
        merchantConstraints: {
          maxDiscountPercent: 15,
          minimumMarginPercent: 20,
          maxAutoTransactionAmount: 50000,
          approvalRequiredAbove: 50000,
        },
        validationStatus: {
          status: "PASS",
          checks: [],
        },
        createdAt: nowStr,
        updatedAt: nowStr,
      };

      await adminDb.collection("deals").doc(dealId).set(initialDeal, { merge: true });
    } catch (err) {
      console.warn("Failed to write buyer intent / deal to Firestore:", err);
    }
  }

  return savedDoc;
}


import { recordAuditEvent as recordAuditEventInternal } from "@/lib/audit/audit-service";
import { AuditActor, AuditEventType } from "@/lib/audit/schema";

/**
 * Records real Audit Events into Firestore (delegates to centralized audit service)
 */
export async function recordAuditEvent(
  eventType: string,
  actor: string,
  humanReadableMessage: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await recordAuditEventInternal(
    eventType as AuditEventType,
    actor as AuditActor,
    humanReadableMessage,
    metadata
  );
}
