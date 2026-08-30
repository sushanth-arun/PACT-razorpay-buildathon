import { adminDb } from "@/lib/firebase/admin";
import { AuditEvent, AuditEventType, AuditActor, AuditQueryFilter } from "./schema";

export const AUDIT_EVENTS_COLLECTION = "audit_events";

/**
 * Strips sensitive data like API keys, secrets, CVVs before recording.
 */
function sanitizeMetadata(metadata?: Record<string, unknown>): Record<string, unknown> {
  if (!metadata) return {};
  const cleaned: Record<string, unknown> = {};
  const blockedKeys = ["key_secret", "secret", "cvv", "apiKey", "gemini_api_key", "password", "token"];

  for (const [k, v] of Object.entries(metadata)) {
    if (blockedKeys.some((b) => k.toLowerCase().includes(b))) {
      cleaned[k] = "[REDACTED]";
    } else if (v && typeof v === "object" && !Array.isArray(v)) {
      cleaned[k] = sanitizeMetadata(v as Record<string, unknown>);
    } else {
      cleaned[k] = v;
    }
  }
  return cleaned;
}

/**
 * Authoritative server-side audit event recorder.
 * Writes append-only immutable audit events to Firestore.
 */
export async function recordAuditEvent(
  eventType: AuditEventType,
  actor: AuditActor,
  humanReadableMessage: string,
  metadata?: Record<string, unknown> & { dealId?: string; merchantId?: string }
): Promise<void> {
  const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const dealId = metadata?.dealId || "system";
  const merchantId = (metadata?.merchantId as string) || undefined;
  const sanitized = sanitizeMetadata(metadata);

  const auditDoc: AuditEvent = {
    id: eventId,
    timestamp: new Date().toISOString(),
    dealId,
    merchantId,
    actor,
    eventType,
    humanReadableMessage,
    metadata: sanitized,
  };

  if (adminDb) {
    try {
      // 1. Root audit_events collection for global querying
      await adminDb.collection(AUDIT_EVENTS_COLLECTION).doc(eventId).set(auditDoc);

      // 2. Hierarchical sub-collection deals/{dealId}/audit_events/{eventId} for direct deal containment
      if (dealId && dealId !== "system") {
        await adminDb
          .collection("deals")
          .doc(dealId)
          .collection("audit_events")
          .doc(eventId)
          .set(auditDoc);
      }
    } catch (err) {
      console.error("[PACT Audit Service] Failed to write audit event to Firestore:", err);
    }
  } else {
    console.log(`[PACT Audit Standalone] ${auditDoc.timestamp} [${auditDoc.actor}] ${auditDoc.eventType}: ${auditDoc.humanReadableMessage}`);
  }
}

/**
 * Retrieves audit events with structured filtering and chronological ordering.
 */
export async function getAuditTrail(filter: AuditQueryFilter): Promise<AuditEvent[]> {
  if (!adminDb) {
    return [];
  }

  try {
    let query: FirebaseFirestore.Query = adminDb.collection(AUDIT_EVENTS_COLLECTION);

    // If filtering only by single equality, apply at database layer
    if (filter.dealId && filter.dealId.trim()) {
      query = query.where("dealId", "==", filter.dealId.trim());
    } else if (filter.merchantId && filter.merchantId.trim()) {
      query = query.where("merchantId", "==", filter.merchantId.trim());
    } else if (filter.actor) {
      query = query.where("actor", "==", filter.actor);
    } else if (filter.eventType) {
      query = query.where("eventType", "==", filter.eventType);
    }

    const snapshot = await query.limit(200).get();
    let events = snapshot.docs.map((doc) => doc.data() as AuditEvent);

    // Apply remaining filters in-memory for resilience against Firestore composite index limitations
    if (filter.dealId && filter.dealId.trim()) {
      events = events.filter((e) => e.dealId === filter.dealId?.trim());
    }
    if (filter.merchantId && filter.merchantId.trim()) {
      events = events.filter((e) => e.merchantId === filter.merchantId?.trim());
    }
    if (filter.actor) {
      events = events.filter((e) => e.actor === filter.actor);
    }
    if (filter.eventType) {
      events = events.filter((e) => e.eventType === filter.eventType);
    }

    // In-memory free text search if requested
    if (filter.search && filter.search.trim()) {
      const q = filter.search.toLowerCase().trim();
      events = events.filter(
        (e) =>
          e.dealId.toLowerCase().includes(q) ||
          e.eventType.toLowerCase().includes(q) ||
          e.humanReadableMessage.toLowerCase().includes(q) ||
          e.actor.toLowerCase().includes(q)
      );
    }

    // Sort in memory by timestamp
    events.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return filter.order === "desc" ? timeB - timeA : timeA - timeB;
    });

    if (filter.limit) {
      events = events.slice(0, filter.limit);
    }

    return events;
  } catch (err) {
    console.error("[PACT Audit Service] Failed to fetch audit trail:", err);
    return [];
  }
}

/**
 * Lists all distinct deal IDs that have audit events.
 */
export async function getAuditDealIds(): Promise<string[]> {
  if (!adminDb) return [];
  try {
    const set = new Set<string>();

    // 1. Fetch recent deals from deals collection
    const dealsSnap = await adminDb
      .collection("deals")
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();
    dealsSnap.docs.forEach((d) => set.add(d.id));

    // 2. Fetch distinct dealIds from audit_events
    const snapshot = await adminDb
      .collection(AUDIT_EVENTS_COLLECTION)
      .orderBy("timestamp", "desc")
      .limit(200)
      .get();

    snapshot.docs.forEach((d) => {
      const data = d.data() as AuditEvent;
      if (data.dealId && data.dealId !== "system") {
        set.add(data.dealId);
      }
    });

    return Array.from(set);
  } catch (err) {
    console.error("[PACT Audit Service] Failed to fetch audit deal IDs:", err);
    return [];
  }
}
