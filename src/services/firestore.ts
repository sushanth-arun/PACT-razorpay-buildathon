import { db } from "@/lib/firebase/client";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import {
  Merchant,
  Product,
  Deal,
  ActionProposal,
  PolicyEvaluation,
  Order,
  Payment,
  AuditEvent,
} from "@/types";

// Collection Names
export const COLLECTIONS = {
  MERCHANTS: "merchants",
  PRODUCTS: "products",
  DEALS: "deals",
  ACTION_PROPOSALS: "action_proposals",
  POLICY_EVALUATIONS: "policy_evaluations",
  ORDERS: "orders",
  PAYMENTS: "payments",
  AUDIT_EVENTS: "audit_events",
} as const;

// 1. Merchants Service
export async function getMerchant(merchantId: string): Promise<Merchant | null> {
  // Always try Server API Route directly or fallback cleanly on client error
  try {
    const res = await fetch(`/api/merchant?id=${encodeURIComponent(merchantId)}`);
    const data = await res.json();
    if (res.ok && data.success) {
      return data.merchant as Merchant;
    }
  } catch (apiErr) {
    console.warn("Server API read failed, attempting client SDK fallback...", apiErr);
  }

  if (db) {
    const docRef = doc(db, COLLECTIONS.MERCHANTS, merchantId);
    const snap = await getDoc(docRef);
    if (snap.exists()) return snap.data() as Merchant;
  }

  return null;
}

export async function saveMerchant(merchant: Merchant): Promise<void> {
  const res = await fetch("/api/merchant", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ merchantId: merchant.id, policies: merchant }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to save merchant via server API");
  }
}

export async function updateMerchantPolicies(
  merchantId: string,
  policies: Partial<Pick<Merchant, "maxDiscountPercent" | "minimumMarginPercent" | "maxAutoTransactionAmount" | "approvalRequiredAbove" | "allowSlowMovingInventoryDiscount" | "slowMovingInventoryFlexibility">>
): Promise<void> {
  const res = await fetch("/api/merchant", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ merchantId, policies }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to update merchant policies via server API");
  }
}

// 2. Products Service
export async function getMerchantProducts(merchantId: string): Promise<Product[]> {
  try {
    const res = await fetch(`/api/products?merchantId=${encodeURIComponent(merchantId)}`);
    const data = await res.json();
    if (res.ok && data.success) {
      return (data.products || []) as Product[];
    }
  } catch (apiErr) {
    console.warn("Server API products fetch failed, attempting client SDK fallback...", apiErr);
  }

  if (db) {
    const q = query(
      collection(db, COLLECTIONS.PRODUCTS),
      where("merchantId", "==", merchantId)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as Product);
  }

  return [];
}


export async function getProduct(productId: string): Promise<Product | null> {
  if (db) {
    try {
      const docRef = doc(db, COLLECTIONS.PRODUCTS, productId);
      const snap = await getDoc(docRef);
      if (snap.exists()) return snap.data() as Product;
    } catch (err) {
      console.warn("Client Firestore product get failed...", err);
    }
  }

  const products = await getMerchantProducts("ergospace");
  return products.find((p) => p.id === productId) || null;
}

export async function saveProduct(product: Product): Promise<void> {
  if (db) {
    try {
      const docRef = doc(db, COLLECTIONS.PRODUCTS, product.id);
      await setDoc(docRef, { ...product, updatedAt: new Date().toISOString() }, { merge: true });
      return;
    } catch (err) {
      console.warn("Client Firestore product save failed, falling back to server API...", err);
    }
  }

  const res = await fetch("/api/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ product }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to save product via server API");
  }
}


// 3. Deals Service
export async function getDeal(dealId: string): Promise<Deal | null> {
  if (!db) return null;
  const docRef = doc(db, COLLECTIONS.DEALS, dealId);
  const snap = await getDoc(docRef);
  return snap.exists() ? (snap.data() as Deal) : null;
}

export async function saveDeal(deal: Deal): Promise<void> {
  if (!db) throw new Error("Firebase DB not initialized");
  const docRef = doc(db, COLLECTIONS.DEALS, deal.id);
  await setDoc(docRef, deal, { merge: true });
}

// 4. Action Proposals Service
export async function saveActionProposal(proposal: ActionProposal): Promise<void> {
  if (!db) throw new Error("Firebase DB not initialized");
  const docRef = doc(db, COLLECTIONS.ACTION_PROPOSALS, proposal.id);
  await setDoc(docRef, proposal, { merge: true });
}

// 5. Policy Evaluation Service
export async function savePolicyEvaluation(evaluation: PolicyEvaluation): Promise<void> {
  if (!db) throw new Error("Firebase DB not initialized");
  const docRef = doc(db, COLLECTIONS.POLICY_EVALUATIONS, evaluation.id);
  await setDoc(docRef, evaluation, { merge: true });
}

// 6. Orders Service
export async function saveOrder(order: Order): Promise<void> {
  if (!db) throw new Error("Firebase DB not initialized");
  const docRef = doc(db, COLLECTIONS.ORDERS, order.id);
  await setDoc(docRef, order, { merge: true });
}

// 7. Payments Service
export async function savePayment(payment: Payment): Promise<void> {
  if (!db) throw new Error("Firebase DB not initialized");
  const docRef = doc(db, COLLECTIONS.PAYMENTS, payment.id);
  await setDoc(docRef, payment, { merge: true });
}

// 8. Audit Events Service
export async function logAuditEvent(event: AuditEvent): Promise<void> {
  if (!db) throw new Error("Firebase DB not initialized");
  const docRef = doc(db, COLLECTIONS.AUDIT_EVENTS, event.id);
  await setDoc(docRef, event, { merge: true });
}

export async function getDealAuditEvents(dealId: string): Promise<AuditEvent[]> {
  if (!db) return [];
  const q = query(
    collection(db, COLLECTIONS.AUDIT_EVENTS),
    where("dealId", "==", dealId),
    orderBy("timestamp", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as AuditEvent);
}


