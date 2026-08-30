/**
 * Firestore Service Layer for Buyer Intents and Real Audit Telemetry
 */

import { adminDb } from "@/lib/firebase/admin";
import { BuyerIntent } from "@/lib/ai/schemas";

export const BUYER_INTENTS_COLLECTION = "buyer_intents";
export const AUDIT_EVENTS_COLLECTION = "audit_events";

export interface SavedBuyerIntent extends BuyerIntent {
  id: string;
  aiProvider: string;
  aiModel: string;
}

/**
 * Persists parsed Buyer Intent document to Firestore safely via Admin SDK
 */
export async function saveBuyerIntent(
  intent: BuyerIntent,
  aiProvider: string = "google-gemini",
  aiModel: string = "gemini-3.1-flash-lite"
): Promise<SavedBuyerIntent> {
  const docId = `intent_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const savedDoc: SavedBuyerIntent = {
    ...intent,
    id: docId,
    aiProvider,
    aiModel,
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
