import { NextRequest, NextResponse } from "next/server";
import { getGeminiApiKey, isGeminiConfigured, getGeminiModel, callGeminiRaw } from "@/lib/ai/gemini";
import { parseBuyerIntentFallback } from "@/lib/ai/buyer-intent";
import { BuyerIntentSchema } from "@/lib/ai/schemas";
import { saveBuyerIntent, recordAuditEvent } from "@/services/buyer-intent-service";

// GET endpoint to return Gemini configuration status without exposing API key
export async function GET() {
  const configured = isGeminiConfigured();
  const model = getGeminiModel();
  return NextResponse.json({
    configured,
    provider: "google-gemini",
    model,
    message: configured
      ? "Gemini API is configured server-side."
      : "GEMINI_API_KEY is missing from server environment.",
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawUserRequest = body?.request;
    const explicitFallbackReq = Boolean(body?.useDevFallback);

    // Environment flag for fallback: defaults to false
    const fallbackAllowedInEnv = process.env.BUYER_AI_FALLBACK_ENABLED === "true";
    const useDevFallback = explicitFallbackReq && fallbackAllowedInEnv;

    // 1. Input Validation
    if (!rawUserRequest || typeof rawUserRequest !== "string" || !rawUserRequest.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "BAD_REQUEST",
            message: "Request text is required.",
          },
        },
        { status: 400 }
      );
    }

    const requestText = rawUserRequest.trim();
    if (requestText.length > 1000) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "BAD_REQUEST",
            message: "Request text exceeds maximum length of 1000 characters.",
          },
        },
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
    const currentModel = getGeminiModel();
    let parsedIntent;
    let aiProvider = "google-gemini";
    let isFallback = false;

    // Explicit fallback requested
    if (useDevFallback) {
      const fallbackRes = parseBuyerIntentFallback(requestText);
      parsedIntent = fallbackRes.intent;
      aiProvider = "dev-fallback";
      isFallback = true;
    } else {
      if (!apiKey) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "MISSING_API_KEY",
              message: "GEMINI_API_KEY is missing in server environment configuration.",
            },
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
              error: {
                code: "INVALID_AI_RESPONSE",
                message: "Gemini response could not be parsed as valid JSON.",
              },
            },
            { status: 502 }
          );
        }

        jsonObj.rawRequest = requestText;
        jsonObj.createdAt = new Date().toISOString();

        // Validate via Zod Schema
        let validated;
        try {
          validated = BuyerIntentSchema.parse(jsonObj);
        } catch (zodErr: unknown) {
          console.error("Zod schema validation failed on AI output:", zodErr);
          return NextResponse.json(
            {
              success: false,
              error: {
                code: "SCHEMA_VALIDATION_FAILED",
                message: "Structured AI output failed Zod schema validation.",
              },
            },
            { status: 502 }
          );
        }


        parsedIntent = validated;

        // Record Audit Event 2: BUYER_INTENT_PARSED
        await recordAuditEvent(
          "BUYER_INTENT_PARSED",
          "BUYER_AGENT",
          `${currentModel} parsed buyer intent with ${(validated.confidence * 100).toFixed(0)}% confidence.`,
          { productIntent: validated.productIntent, confidence: validated.confidence, model: currentModel }
        );
      } catch (geminiErr: unknown) {
        const errMessage = geminiErr instanceof Error ? geminiErr.message : "Gemini API request failed.";
        console.warn("Gemini API server-side execution error, activating smart dev fallback:", errMessage);

        // Smart Fallback: Automatically extract structured intent using local regex parser so development is never blocked
        const fallbackRes = parseBuyerIntentFallback(requestText);
        parsedIntent = fallbackRes.intent;
        aiProvider = "dev-fallback";
        isFallback = true;

        await recordAuditEvent(
          "BUYER_INTENT_PARSED",
          "BUYER_AGENT",
          `Smart dev fallback parser extracted commercial intent (Gemini API limit hit).`,
          { fallbackReason: errMessage }
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

    const savedDoc = await saveBuyerIntent(validatedIntent, aiProvider, currentModel);

    return NextResponse.json({
      success: true,
      intent: savedDoc,
      isFallback,
      aiProvider,
      aiModel: currentModel,
    });
  } catch (err: unknown) {
    console.error("Error in /api/buyer-intent:", err);
    const errorMessage = err instanceof Error ? err.message : "Failed to process buyer intent.";
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: errorMessage,
        },
      },
      { status: 500 }
    );
  }
}


