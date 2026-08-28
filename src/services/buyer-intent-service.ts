/**
 * Firestore Service Layer for Buyer Intents and Real Audit Telemetry
 */

import { adminDb } from "@/lib/firebase/admin";
import { BuyerIntent } from "@/lib/ai/schemas";

export const BUYER_INTENTS_COLLECTION = "buyer_intents";
export const AUDIT_EVENTS_COLLECTION = "audit_events";

export interface SavedBuyerIntent extends BuyerIntent {
  id: string;
  aiProvider: "gemini" | "fallback_parser";
}

/**
 * Persists parsed Buyer Intent document to Firestore safely via Admin SDK
 */
export async function saveBuyerIntent(
  intent: BuyerIntent,
  aiProvider: "gemini" | "fallback_parser"
): Promise<SavedBuyerIntent> {
  const docId = `intent_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const savedDoc: SavedBuyerIntent = {
    ...intent,
    id: docId,
    aiProvider,
  };

  if (adminDb) {
    try {
      await adminDb.collection(BUYER_INTENTS_COLLECTION).doc(docId).set(savedDoc);
    } catch (err) {
      console.warn("Failed to write buyer intent to Firestore:", err);
    }
  }

  return savedDoc;
}

/**
 * Records real Audit Events into Firestore
 */
export async function recordAuditEvent(
  eventType: string,
  actor: string,
  humanReadableMessage: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const auditDoc = {
    id: eventId,
    timestamp: new Date().toISOString(),
    actor,
    eventType,
    humanReadableMessage,
    metadata: metadata || {},
  };

  if (adminDb) {
    try {
      await adminDb.collection(AUDIT_EVENTS_COLLECTION).doc(eventId).set(auditDoc);
    } catch (err) {
      console.warn("Failed to record audit event in Firestore:", err);
    }
  }
}
