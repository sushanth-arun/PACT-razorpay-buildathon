/**
 * Merchant Agent AI Reasoning Engine
 * Uses Gemini 3.1 Flash-Lite to reason over verified Firestore candidate products & merchant policies.
 */

import { getGeminiApiKey, getGeminiModel } from "./gemini";
import { BuyerIntent } from "./schemas";
import { Merchant, Product } from "@/types";

const MERCHANT_AGENT_SYSTEM_INSTRUCTION = `You are the Merchant Agent for the active merchant in PACT (AI-to-AI Agentic Commerce Engine).
Your responsibility is to reason over a buyer's structured commercial intent and select candidate products from a VERIFIED LIST of active Firestore catalog items.

CRITICAL CONSTRAINTS:
1. You MUST NOT invent products, product IDs, prices, inventory, or delivery days.
2. You MUST ONLY select product IDs from the provided candidate list.
3. COMBO / BUNDLE / GIFT PACKAGING RULE (HIGH PRIORITY):
   - When the buyer asks for a "combo", "bundle", "gift", "setup", or multiple complementary items, you MUST actively curate and package suitable in-stock products into "selectedProductIds"!
   - For example, if a buyer asks for a "combo of items to gift a CEO of a chair company", select the flagship executive chair (e.g. ErgoChair Executive) AND complementary accessories (e.g. Lumbar Support Cushion, Monitor Arm) into "selectedProductIds" with quantity: 1 each (or requested quantity), respecting their budget limit.
   - Do NOT dump the combo into "alternativeProductIds" with empty selectedProductIds if the merchant carries relevant items. Populate "selectedProductIds" so the buyer gets a complete pre-selected combo cart proposal!
4. DOMAIN RELEVANCE RULE: If the buyer's requested product (e.g. cars, food, ice cream, real estate) is COMPLETELY unrelated to the merchant's catalog domain, set "selectedProductIds": [] and "alternativeProductIds": []. Explain clearly in buyerFitExplanation that the merchant does not sell or offer that category.
5. ALTERNATIVE RECOMMENDATION RULE: Populate "alternativeProductIds" ONLY for optional substitute models or secondary options that the buyer might prefer instead of the primary selected items. If in-stock products fit the request, "selectedProductIds" MUST contain the primary offer.
6. STRICT DISCOUNT RULE: Give discount to the buyer ONLY WHEN THEY EXPLICITLY ASK FOR IT in their requestedDiscount or prompt (e.g., asking for 10% off, discount, budget negotiation). If the buyer DID NOT ask for a discount or if requestedDiscount is null/0, set "proposedDiscountPercent": 0.
7. You MUST respect merchant policies (e.g. max discount cap).
8. Do NOT perform arithmetic yourself; simply propose selected product IDs, quantities, and recommended discount percentage.
9. Return your decision as ONLY valid JSON matching this schema:
{
  "selectedProductIds": [
    { "productId": "exact_id_from_candidates", "quantity": number }
  ],
  "alternativeProductIds": [
    { "productId": "exact_id_from_candidates", "quantity": number }
  ],
  "bundleProductIds": [
    { "productId": "exact_id_from_candidates", "quantity": number }
  ],
  "proposedDiscountPercent": number (0 if not asked, otherwise up to max discount cap),
  "discountReasoning": "explanation for proposed discount or state that no discount was requested",
  "buyerFitExplanation": "why this curated offer/bundle fits buyer intent",
  "merchantOpportunityExplanation": "why this offer benefits the merchant",
  "reasoningSummary": "short summary of merchant agent reasoning"
}
`;


export interface GeminiMerchantProposal {
  selectedProductIds: Array<{ productId: string; quantity: number }>;
  alternativeProductIds: Array<{ productId: string; quantity: number }>;
  bundleProductIds: Array<{ productId: string; quantity: number }>;
  proposedDiscountPercent: number;
  discountReasoning: string;
  buyerFitExplanation: string;
  merchantOpportunityExplanation: string;
  reasoningSummary: string;
}

export async function callMerchantAgent(
  buyerIntent: BuyerIntent,
  merchant: Merchant,
  candidateProducts: Product[]
): Promise<GeminiMerchantProposal> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error("MISSING_API_KEY: GEMINI_API_KEY environment variable is not configured.");
  }

  const model = getGeminiModel();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // Simplify candidate payload to save tokens and prevent hallucination
  const candidatesPayload = candidateProducts.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    price: p.price,
    stock: p.stock,
    deliveryDays: p.deliveryDays,
    description: p.description,
  }));

  const userPrompt = `
BUYER INTENT:
${JSON.stringify({
  productNeed: buyerIntent.productIntent,
  quantity: buyerIntent.quantity,
  budget: buyerIntent.budget,
  requestedDiscount: buyerIntent.requestedDiscount,
  deliveryMaxDays: buyerIntent.deliveryMaxDays,
  preferences: buyerIntent.preferences,
  negotiableConstraints: buyerIntent.negotiableConstraints,
}, null, 2)}

MERCHANT POLICIES (${merchant.name}):
- Max Discount Cap: ${merchant.maxDiscountPercent}%
- Minimum Margin Floor: ${merchant.minimumMarginPercent}%
- Allow High Inventory Flexibility: ${merchant.allowSlowMovingInventoryDiscount}

VERIFIED FIRESTORE CANDIDATE PRODUCTS:
${JSON.stringify(candidatesPayload, null, 2)}

Propose the optimal product selection and commercial terms.
`;

  const payload = {
    system_instruction: {
      parts: [{ text: MERCHANT_AGENT_SYSTEM_INSTRUCTION }],
    },
    contents: [
      {
        parts: [{ text: userPrompt }],
      },
    ],
    generationConfig: {
      response_mime_type: "application/json",
      temperature: 0.1,
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`Merchant Agent API Call Failed [${response.status}]:`, errText);
    throw new Error(`PROVIDER_ERROR: Merchant Agent request failed (HTTP ${response.status}).`);
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw new Error("INVALID_AI_RESPONSE: Merchant Agent returned empty candidate.");
  }

  let cleaned = rawText.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }

  return JSON.parse(cleaned) as GeminiMerchantProposal;
}
