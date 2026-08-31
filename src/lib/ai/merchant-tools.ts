/**
 * Server-Side Controlled Tools for Merchant Agent Reasoning
 * Enforces deterministic Firestore filtering, inventory checks, policy constraints, and math calculations.
 */

import { adminDb } from "@/lib/firebase/admin";
import { Merchant, Product } from "@/types";
import { DEMO_MERCHANT_ID } from "@/services/seed";

export const MERCHANT_OFFERS_COLLECTION = "merchant_offers";

// Tool 1: Fetch Authoritative Merchant Record & Policies
export async function getMerchantPolicies(merchantId: string = DEMO_MERCHANT_ID): Promise<Merchant | null> {
  if (!adminDb) return null;
  try {
    const docSnap = await adminDb.collection("merchants").doc(merchantId).get();
    if (docSnap.exists) {
      return docSnap.data() as Merchant;
    }
  } catch (err) {
    console.error("Failed to fetch merchant policies from Firestore:", err);
  }
  return null;
}

// Tool 2: Search Active Firestore Products for a Merchant
export async function searchProducts(
  merchantId: string = DEMO_MERCHANT_ID,
  options?: { category?: string; query?: string; minStock?: number }
): Promise<Product[]> {
  if (!adminDb) return [];
  try {
    // 1. Try subcollection first: merchants/{merchantId}/products
    let snap = await adminDb
      .collection("merchants")
      .doc(merchantId)
      .collection("products")
      .where("active", "==", true)
      .get();

    // 2. Fallback to root collection if subcollection is empty
    if (snap.empty) {
      snap = await adminDb
        .collection("products")
        .where("merchantId", "==", merchantId)
        .where("active", "==", true)
        .get();
    }

    let items: Product[] = [];
    snap.forEach((doc) => {
      items.push(doc.data() as Product);
    });

    // Apply deterministic in-memory filtering
    if (options?.minStock !== undefined) {
      items = items.filter((p) => p.stock >= (options.minStock || 1));
    }

    if (options?.category) {
      const catLower = options.category.toLowerCase();
      items = items.filter((p) => p.category?.toLowerCase() === catLower);
    }

    if (options?.query) {
      const q = options.query.toLowerCase().trim();
      const tokens = q.split(/\W+/).filter((t) => t.length > 2);

      items = items.filter((p) => {
        const fullText = `${p.name} ${p.category} ${p.description || ""}`.toLowerCase();
        if (fullText.includes(q)) return true;
        return tokens.some((tok) => {
          const singular = tok.endsWith("s") ? tok.slice(0, -1) : tok;
          return fullText.includes(tok) || (singular.length > 2 && fullText.includes(singular));
        });
      });
    }

    return items;
  } catch (err) {
    console.error("Failed to search products in Firestore:", err);
    return [];
  }
}

// Tool 3: Check Authoritative Inventory for a Product
export async function checkInventory(productId: string, requestedQuantity: number, merchantId: string = DEMO_MERCHANT_ID) {
  if (!adminDb) return { productId, requestedQuantity, availableStock: 0, sufficientStock: false };
  try {
    // 1. Try root collection first
    let docSnap = await adminDb.collection("products").doc(productId).get();
    
    // 2. If not found at root, check subcollection: merchants/{merchantId}/products/{productId}
    if (!docSnap.exists) {
      docSnap = await adminDb.collection("merchants").doc(merchantId).collection("products").doc(productId).get();
    }

    // 3. If still not found, search by id field in products collection
    if (!docSnap.exists) {
      const qSnap = await adminDb.collection("products").where("id", "==", productId).limit(1).get();
      if (!qSnap.empty) {
        docSnap = qSnap.docs[0];
      }
    }

    if (docSnap.exists) {
      const prod = docSnap.data() as Product;
      return {
        productId,
        requestedQuantity,
        availableStock: prod.stock,
        sufficientStock: prod.stock >= requestedQuantity && (prod.active !== false),
      };
    }
  } catch (err) {
    console.error(`Failed to check inventory for product ${productId}:`, err);
  }
  return { productId, requestedQuantity, availableStock: 0, sufficientStock: false };
}

// Tool 4: Deterministic Subtotal & Discount Calculation (AI is NEVER trusted for arithmetic)
export function calculateOfferTotals(
  items: Array<{ productId: string; productName: string; quantity: number; unitPrice: number }>,
  proposedDiscountPercent: number,
  maxDiscountCap: number
) {
  // Cap proposed discount at merchant policy limit
  const validatedDiscountPercent = Math.min(
    Math.max(0, proposedDiscountPercent),
    maxDiscountCap
  );

  const calculatedItems = items.map((item) => {
    const lineTotal = item.quantity * item.unitPrice;
    return {
      ...item,
      lineTotal,
    };
  });

  const subtotal = calculatedItems.reduce((acc, curr) => acc + curr.lineTotal, 0);
  const discountAmount = Math.round(subtotal * (validatedDiscountPercent / 100));
  const estimatedFinalAmount = Math.max(0, subtotal - discountAmount);

  return {
    items: calculatedItems,
    subtotal,
    discount: {
      percentage: validatedDiscountPercent,
      amount: discountAmount,
    },
    estimatedFinalAmount,
  };
}

// Tool 5: Identify Bundle & Complementary Product Opportunities
export function identifyBundleOpportunities(selectedProducts: Product[], allProducts: Product[]): Product[] {
  const selectedIds = new Set(selectedProducts.map((p) => p.id));
  const complementary: Product[] = [];

  const hasSeating = selectedProducts.some((p) => p.category?.toLowerCase() === "seating");
  const hasDesk = selectedProducts.some((p) => p.category?.toLowerCase() === "desks");

  allProducts.forEach((prod) => {
    if (selectedIds.has(prod.id) || !prod.active || prod.stock < 1) return;

    if (hasSeating && prod.category?.toLowerCase() === "accessories") {
      complementary.push(prod);
    } else if (hasDesk && (prod.category?.toLowerCase() === "seating" || prod.category?.toLowerCase() === "accessories")) {
      complementary.push(prod);
    }
  });

  return complementary.slice(0, 2);
}
