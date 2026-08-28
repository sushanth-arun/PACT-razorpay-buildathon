import { NextRequest, NextResponse } from "next/server";
import { getGeminiApiKey, isGeminiConfigured, callGeminiRaw } from "@/lib/ai/gemini";
import { parseBuyerIntentFallback } from "@/lib/ai/buyer-intent";
import { BuyerIntentSchema } from "@/lib/ai/schemas";
import { saveBuyerIntent, recordAuditEvent } from "@/services/buyer-intent-service";

// GET endpoint to return Gemini configuration status without exposing API key
export async function GET() {
  const configured = isGeminiConfigured();
  return NextResponse.json({
    configured,
    provider: "gemini",
    model: process.env.AI_MODEL || "gemini-3.6-flash",
    message: configured
      ? "Gemini API is configured server-side."
      : "GEMINI_API_KEY is missing from server environment.",
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawUserRequest = body?.request;
    const useDevFallback = Boolean(body?.useDevFallback);

    // 1. Input Validation
    if (!rawUserRequest || typeof rawUserRequest !== "string" || !rawUserRequest.trim()) {
      return NextResponse.json(
        { success: false, error: "Request text is required." },
        { status: 400 }
      );
    }

    const requestText = rawUserRequest.trim();
    if (requestText.length > 1000) {
      return NextResponse.json(
        { success: false, error: "Request text exceeds maximum length of 1000 characters." },
        { status: 400 }
      );
    }

    // Record Audit Event 1: BUYER_REQUEST_RECEIVED
    await recordAuditEvent(
      "BUYER_REQUEST_RECEIVED",
      "USER",
      `Received natural language commercial request: "${requestText.substring(0, 80)}..."`,
      { rawRequest: requestText }
    );

    const apiKey = getGeminiApiKey();
    let parsedIntent;
    let aiProvider: "gemini" | "fallback_parser" = "gemini";
    let isFallback = false;

    // Explicit fallback requested
    if (useDevFallback) {
      const fallbackRes = parseBuyerIntentFallback(requestText);
      parsedIntent = fallbackRes.intent;
      aiProvider = "fallback_parser";
      isFallback = true;
    } else {
      if (!apiKey) {
        return NextResponse.json(
          {
            success: false,
            error: "GEMINI_API_KEY is missing in server configuration.",
            errorType: "GEMINI_API_KEY_MISSING",
          },
          { status: 500 }
        );
      }

      try {
        const rawAiOutput = await callGeminiRaw(requestText);

        // Sanitize markdown fences if present
        let cleanedJsonStr = rawAiOutput.trim();
        if (cleanedJsonStr.startsWith("```json")) {
          cleanedJsonStr = cleanedJsonStr.replace(/^```json\s*/, "").replace(/\s*```$/, "");
        } else if (cleanedJsonStr.startsWith("```")) {
          cleanedJsonStr = cleanedJsonStr.replace(/^```\s*/, "").replace(/\s*```$/, "");
        }

        let jsonObj: Record<string, unknown>;
        try {
          jsonObj = JSON.parse(cleanedJsonStr) as Record<string, unknown>;
        } catch {
          console.error("Gemini returned non-JSON response:", rawAiOutput);

          return NextResponse.json(
            {
              success: false,
              error: "Gemini response could not be parsed as valid JSON.",
              errorType: "INVALID_JSON_RESPONSE",
            },
            { status: 502 }
          );
        }

        jsonObj.rawRequest = requestText;
        jsonObj.createdAt = new Date().toISOString();

        // Validate via Zod Schema
        const validated = BuyerIntentSchema.parse(jsonObj);
        parsedIntent = validated;

        // Record Audit Event 2: BUYER_INTENT_PARSED
        await recordAuditEvent(
          "BUYER_INTENT_PARSED",
          "BUYER_AGENT",
          `Gemini 3.6 Flash parsed buyer intent with ${(validated.confidence * 100).toFixed(0)}% confidence.`,
          { productIntent: validated.productIntent, confidence: validated.confidence }
        );
      } catch (geminiErr: unknown) {
        const errMessage = geminiErr instanceof Error ? geminiErr.message : "Gemini API request failed.";
        console.error("Gemini API server-side execution error:", errMessage);

        return NextResponse.json(
          {
            success: false,
            error: errMessage,
            errorType: "GEMINI_API_ERROR",
          },
          { status: 502 }
        );
      }
    }

    // 3. Final Zod Verification & Firestore Persistence
    const validatedIntent = BuyerIntentSchema.parse(parsedIntent);

    // Record Audit Event 3: BUYER_INTENT_VALIDATED
    await recordAuditEvent(
      "BUYER_INTENT_VALIDATED",
      "BUYER_AGENT",
      `Structured buyer intent validated by Zod schema and persisted to Firestore.`,
      { productIntent: validatedIntent.productIntent }
    );

    const savedDoc = await saveBuyerIntent(validatedIntent, aiProvider);

    return NextResponse.json({
      success: true,
      intent: savedDoc,
      isFallback,
      aiProvider,
    });
  } catch (err: unknown) {
    console.error("Error in /api/buyer-intent:", err);
    const errorMessage = err instanceof Error ? err.message : "Failed to process buyer intent.";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

