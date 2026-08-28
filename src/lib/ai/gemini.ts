/**
 * Server-Side Gemini AI Provider Abstraction
 * Uses @google/genai or fetch fallback to call Google Gemini API safely on the server.
 */

const GEMINI_SYSTEM_INSTRUCTION = `You are the Buyer AI for PACT, an AI-to-AI Agentic Commerce Engine.
Your ONLY role is to parse a buyer's natural language commercial request into a structured JSON representation of purchase intent.

CRITICAL CONSTRAINTS:
1. You MUST NOT invent products, invent prices, invent discounts, check inventory, promise delivery dates, or simulate payments.
2. If a value (like budget, quantity, delivery max days, or discount) is not specified or ambiguous in the request, set its value to null.
3. Your output MUST be ONLY valid JSON matching this schema:
{
  "productIntent": "short summary of required product/service",
  "quantity": number or null,
  "budget": number or null,
  "requestedDiscount": number or string or null (e.g. 15, "15%", "best possible", or null),
  "deliveryMaxDays": number or null,
  "preferences": ["array of explicit preferences or requirements"],
  "negotiableConstraints": ["array of flexible terms"],
  "confidence": number between 0.0 and 1.0 representing how clearly constraints were parsed
}

EXAMPLES:
Input: "I need ergonomic setups for 5 developers under ₹60,000 with delivery within 7 days."
Output:
{
  "productIntent": "ergonomic office setup for developers",
  "quantity": 5,
  "budget": 60000,
  "requestedDiscount": "best possible",
  "deliveryMaxDays": 7,
  "preferences": ["ergonomic", "developer setups"],
  "negotiableConstraints": ["accessories", "product combination"],
  "confidence": 0.95
}

Input: "I want 10 standing desks for our office. Budget is ₹1,50,000. Get me around 15% discount."
Output:
{
  "productIntent": "standing desks for office",
  "quantity": 10,
  "budget": 150000,
  "requestedDiscount": 15,
  "deliveryMaxDays": null,
  "preferences": ["office standing desks"],
  "negotiableConstraints": ["discount flexibility"],
  "confidence": 0.92
}

Input: "I need some chairs."
Output:
{
  "productIntent": "chairs",
  "quantity": null,
  "budget": null,
  "requestedDiscount": null,
  "deliveryMaxDays": null,
  "preferences": [],
  "negotiableConstraints": [],
  "confidence": 0.40
}
`;

export function getGeminiApiKey(): string | undefined {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
}

export function isGeminiConfigured(): boolean {
  return Boolean(getGeminiApiKey());
}

export async function callGeminiRaw(userPrompt: string): Promise<string> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY_MISSING: GEMINI_API_KEY environment variable is not configured.");
  }

  const model = process.env.AI_MODEL || "gemini-3.6-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const payload = {
    system_instruction: {
      parts: [{ text: GEMINI_SYSTEM_INSTRUCTION }],
    },
    contents: [
      {
        parts: [{ text: `Parse this purchase request:\n"${userPrompt}"` }],
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
    const errBodyText = await response.text();
    let errDetail = response.statusText;
    try {
      const errJson = JSON.parse(errBodyText);
      errDetail = errJson?.error?.message || response.statusText;
    } catch {
      // keep fallback
    }

    console.error(`Gemini API call failed [HTTP ${response.status}]:`, errDetail);

    if (response.status === 429) {
      throw new Error(`Gemini API Quota Exceeded (HTTP 429): ${errDetail}`);
    }
    if (response.status === 404) {
      throw new Error(`Gemini Model Not Found (HTTP 404): ${errDetail}`);
    }
    if (response.status === 400 || response.status === 401 || response.status === 403) {
      throw new Error(`Gemini Authentication/Request Error (HTTP ${response.status}): ${errDetail}`);
    }

    throw new Error(`Gemini API Error (HTTP ${response.status}): ${errDetail}`);
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw new Error("Gemini returned an empty response candidate.");
  }

  return rawText;
}

