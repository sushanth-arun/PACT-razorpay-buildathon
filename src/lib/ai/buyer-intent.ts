/**
 * Deterministic Development Fallback Parser
 * Activated safely when GEMINI_API_KEY is missing or Gemini API fails during local dev.
 */

import { BuyerIntent } from "./schemas";

export function parseBuyerIntentFallback(rawRequest: string): { intent: BuyerIntent; isFallback: true } {
  const reqLower = rawRequest.toLowerCase();

  // 1. Quantity extraction (e.g. "5 developers", "10 standing desks", "for 3 people", "qty 4")
  let quantity: number | null = null;
  const qtyMatch = reqLower.match(/(\d+)\s*(setups?|developers?|desks?|chairs?|units?|people|items?)/);
  if (qtyMatch) {
    quantity = parseInt(qtyMatch[1], 10);
  } else {
    const numMatch = reqLower.match(/\b(\d+)\b/);
    if (numMatch && parseInt(numMatch[1], 10) < 100) {
      quantity = parseInt(numMatch[1], 10);
    }
  }

  // 2. Budget extraction (e.g. "under ₹60,000", "budget is 1,50,000", "under 60000", "rs 50000")
  let budget: number | null = null;
  const budgetMatch = reqLower.match(/(?:under|budget|below|max|rs\.?|₹)\s*([\d,]+)/i);
  if (budgetMatch) {
    const cleaned = budgetMatch[1].replace(/,/g, "");
    const parsedVal = parseFloat(cleaned);
    if (!isNaN(parsedVal) && parsedVal >= 500) {
      budget = parsedVal;
    }
  }

  // 3. Discount extraction (e.g. "15% discount", "best possible price", "best discount")
  let requestedDiscount: string | number | null = null;
  const discountNumMatch = reqLower.match(/(\d+)%\s*discount/);
  if (discountNumMatch) {
    requestedDiscount = parseInt(discountNumMatch[1], 10);
  } else if (reqLower.includes("best") || reqLower.includes("negotiate")) {
    requestedDiscount = "best possible";
  }

  // 4. Delivery SLA extraction (e.g. "within 7 days", "in 5 days", "7 day delivery")
  let deliveryMaxDays: number | null = null;
  const deliveryMatch = reqLower.match(/(?:within|in|under)?\s*(\d+)\s*days?/);
  if (deliveryMatch) {
    deliveryMaxDays = parseInt(deliveryMatch[1], 10);
  }

  // 5. Product intent summary
  let productIntent = "commercial purchase request";
  if (reqLower.includes("ergonomic setup") || reqLower.includes("developer")) {
    productIntent = "ergonomic office setup";
  } else if (reqLower.includes("standing desk")) {
    productIntent = "standing desks for office";
  } else if (reqLower.includes("chair")) {
    productIntent = "office ergonomic chairs";
  } else if (reqLower.includes("monitor") || reqLower.includes("accessory")) {
    productIntent = "office workspace accessories";
  }

  // 6. Preferences & Negotiable constraints
  const preferences: string[] = [];
  if (reqLower.includes("ergonomic")) preferences.push("ergonomic");
  if (reqLower.includes("developer") || reqLower.includes("startup")) preferences.push("suitable for team");
  if (reqLower.includes("oak") || reqLower.includes("wood")) preferences.push("solid wood finish");

  const negotiableConstraints: string[] = [];
  if (reqLower.includes("best possible") || reqLower.includes("negotiate")) negotiableConstraints.push("price flexibility");
  if (reqLower.includes("setup")) negotiableConstraints.push("product combination");

  // 7. Confidence estimation
  let confidence = 0.5;
  if (quantity) confidence += 0.15;
  if (budget) confidence += 0.15;
  if (deliveryMaxDays) confidence += 0.1;
  confidence = Math.min(0.92, Math.max(0.4, confidence));

  const createdAt = new Date().toISOString();

  return {
    intent: {
      productIntent,
      quantity,
      budget,
      requestedDiscount,
      deliveryMaxDays,
      preferences,
      negotiableConstraints,
      confidence: Math.round(confidence * 100) / 100,
      rawRequest,
      createdAt,
    },
    isFallback: true,
  };
}
