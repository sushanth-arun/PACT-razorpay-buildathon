import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { BUYER_INTENTS_COLLECTION, recordAuditEvent } from "@/services/buyer-intent-service";
import { BuyerIntent, BuyerIntentSchema } from "@/lib/ai/schemas";
import { Merchant, Product } from "@/types";
import { DEMO_MERCHANT_ID } from "@/services/seed";
import {
  getMerchantPolicies,
  searchProducts,
  checkInventory,
  calculateOfferTotals,
  identifyBundleOpportunities,
  MERCHANT_OFFERS_COLLECTION,
} from "@/lib/ai/merchant-tools";
import { callMerchantAgent, GeminiMerchantProposal } from "@/lib/ai/merchant-agent";
import { runFallbackMerchantAgent } from "@/lib/ai/fallback-merchant-agent";
import { MerchantOffer, MerchantOfferSchema, MerchantOfferStatus, MerchantOfferItem } from "@/lib/ai/merchant-offer-schema";
import { getGeminiApiKey, getGeminiModel } from "@/lib/ai/gemini";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const buyerIntentId = body?.buyerIntentId;

    if (!buyerIntentId || typeof buyerIntentId !== "string") {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "buyerIntentId is required." } },
        { status: 400 }
      );
    }

    // Record Audit Event 1: CATALOG_SEARCH_STARTED
    await recordAuditEvent(
      "CATALOG_SEARCH_STARTED",
      "MERCHANT_AGENT",
      `Initiated merchant offer reasoning for Buyer Intent #${buyerIntentId.substring(0, 12)}...`,
      { buyerIntentId }
    );

    // 1. Retrieve Buyer Intent from Firestore
    let buyerIntent: BuyerIntent | null = null;
    if (adminDb) {
      const intentDoc = await adminDb.collection(BUYER_INTENTS_COLLECTION).doc(buyerIntentId).get();
      if (intentDoc.exists) {
        buyerIntent = BuyerIntentSchema.parse(intentDoc.data());
      }
    }

    if (!buyerIntent) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: `Buyer intent '${buyerIntentId}' not found.` } },
        { status: 404 }
      );
    }

    // 2. Retrieve Merchant Data & Governance Policies
    const merchant: Merchant | null = await getMerchantPolicies(DEMO_MERCHANT_ID);
    if (!merchant) {
      return NextResponse.json(
        { success: false, error: { code: "MERCHANT_NOT_FOUND", message: "ErgoSpace merchant profile not found in Firestore." } },
        { status: 500 }
      );
    }

    // Record Audit Event 2: MERCHANT_POLICIES_RETRIEVED
    await recordAuditEvent(
      "MERCHANT_POLICIES_RETRIEVED",
      "MERCHANT_AGENT",
      `Loaded ErgoSpace governance policies: Max Discount ${merchant.maxDiscountPercent}%, Min Margin ${merchant.minimumMarginPercent}%.`,
      { maxDiscountCap: merchant.maxDiscountPercent }
    );

    // 3. Retrieve Candidate Products from Firestore
    const candidateProducts: Product[] = await searchProducts(DEMO_MERCHANT_ID, {
      query: buyerIntent.productIntent,
    });

    // Fallback search if query filter was too strict
    const allActiveProducts: Product[] = candidateProducts.length > 0
      ? candidateProducts
      : await searchProducts(DEMO_MERCHANT_ID);

    // Record Audit Event 3: CATALOG_SEARCH_COMPLETED
    await recordAuditEvent(
      "CATALOG_SEARCH_COMPLETED",
      "MERCHANT_AGENT",
      `Retrieved ${allActiveProducts.length} verified candidate products from Firestore catalog.`,
      { candidateCount: allActiveProducts.length }
    );

    if (allActiveProducts.length === 0) {
      await recordAuditEvent("MERCHANT_OFFER_FAILED", "MERCHANT_AGENT", "No active products available in catalog.");
      return NextResponse.json(
        { success: false, error: { code: "NO_ACTIVE_PRODUCTS", message: "Catalog has no active items." } },
        { status: 400 }
      );
    }

    // 4. Run AI Agent Reasoning (Gemini or Fallback)
    const apiKey = getGeminiApiKey();
    const currentModel = getGeminiModel();
    let aiProposal: GeminiMerchantProposal;
    let aiProvider = "google-gemini";

    if (apiKey) {
      try {
        aiProposal = await callMerchantAgent(buyerIntent, merchant, allActiveProducts);
      } catch (aiErr) {
        console.warn("Gemini Merchant Agent execution failed, using fallback reasoner:", aiErr);
        aiProposal = runFallbackMerchantAgent(buyerIntent, merchant, allActiveProducts);
        aiProvider = "dev-fallback";
      }
    } else {
      aiProposal = runFallbackMerchantAgent(buyerIntent, merchant, allActiveProducts);
      aiProvider = "dev-fallback";
    }

    // 5. Anti-Hallucination Safeguards & Product Resolution
    const candidateMap = new Map<string, Product>();
    allActiveProducts.forEach((p) => candidateMap.set(p.id, p));

    const selectedItems: MerchantOfferItem[] = [];
    const alternativeItems: MerchantOfferItem[] = [];

    const requestedQty = buyerIntent.quantity || 1;

    // Validate Selected Items against Authoritative Firestore Map
    for (const sel of aiProposal.selectedProductIds || []) {
      const dbProd = candidateMap.get(sel.productId);
      if (dbProd && dbProd.active) {
        const qtyToOffer = sel.quantity || requestedQty;
        // Verify inventory
        const invCheck = await checkInventory(dbProd.id, qtyToOffer);
        if (invCheck.sufficientStock) {
          selectedItems.push({
            productId: dbProd.id,
            productName: dbProd.name,
            quantity: qtyToOffer,
            unitPrice: dbProd.price, // Authoritative price from Firestore
            lineTotal: qtyToOffer * dbProd.price,
          });
        }
      }
    }

    // Validate Alternative Items
    for (const alt of aiProposal.alternativeProductIds || []) {
      const dbProd = candidateMap.get(alt.productId);
      if (dbProd && dbProd.active && !selectedItems.some((s) => s.productId === dbProd.id)) {
        alternativeItems.push({
          productId: dbProd.id,
          productName: dbProd.name,
          quantity: alt.quantity || requestedQty,
          unitPrice: dbProd.price,
          lineTotal: (alt.quantity || requestedQty) * dbProd.price,
        });
      }
    }

    // Check if buyer intent is completely outside ErgoSpace catalog domain (e.g., cars, ice cream)
    const reqNeedLower = buyerIntent.productIntent.toLowerCase();
    const isOutofDomain = !allActiveProducts.some((p) =>
      reqNeedLower.includes(p.category.toLowerCase()) ||
      p.name.toLowerCase().includes(reqNeedLower) ||
      p.description?.toLowerCase().includes(reqNeedLower)
    );

    // Determine Merchant Offer Status & Fallbacks
    let offerStatus: MerchantOfferStatus = "OFFER_GENERATED";

    if (isOutofDomain || selectedItems.length === 0) {
      offerStatus = "NO_VALID_OFFER";
      // Clear any forced selections when out of domain
      if (isOutofDomain) {
        selectedItems.length = 0;
        alternativeItems.length = 0;
      }
    } else if (selectedItems.length === 0) {
      if (alternativeItems.length > 0) {
        offerStatus = "ALTERNATIVE_FOUND";
      } else {
        offerStatus = "NO_VALID_OFFER";
      }
    }



    // 6. Deterministic Arithmetic Calculations (Line Total, Subtotal, Discount, Final Amount)
    const totals = calculateOfferTotals(
      selectedItems,
      aiProposal.proposedDiscountPercent || 0,
      merchant.maxDiscountPercent
    );

    // 7. Verify Delivery SLA & Budget Constraints
    let maxDeliveryDays = 0;
    selectedItems.forEach((item) => {
      const p = candidateMap.get(item.productId);
      if (p && p.deliveryDays > maxDeliveryDays) {
        maxDeliveryDays = p.deliveryDays;
      }
    });

    if (buyerIntent.deliveryMaxDays !== null && maxDeliveryDays > buyerIntent.deliveryMaxDays) {
      offerStatus = "DELIVERY_CONSTRAINT_FAILED";
    }

    if (buyerIntent.budget !== null && totals.estimatedFinalAmount > buyerIntent.budget) {
      if (offerStatus === "OFFER_GENERATED") {
        offerStatus = "BUDGET_CONSTRAINT_FAILED";
      }
    }

    // 8. Bundle Opportunities
    const bundleProds = identifyBundleOpportunities(
      selectedItems.map((i) => candidateMap.get(i.productId)!).filter(Boolean),
      allActiveProducts
    );
    const bundleItems: MerchantOfferItem[] = bundleProds.map((p) => ({
      productId: p.id,
      productName: p.name,
      quantity: 1,
      unitPrice: p.price,
      lineTotal: p.price,
    }));

    if (bundleItems.length > 0) {
      await recordAuditEvent(
        "MERCHANT_OPPORTUNITY_DETECTED",
        "MERCHANT_AGENT",
        `Identified ${bundleItems.length} complementary bundle opportunities: ${bundleItems.map((b) => b.productName).join(", ")}.`,
        { bundleProducts: bundleItems.map((b) => b.productName) }
      );
    }

    let buyerFit = aiProposal.buyerFitExplanation || "Selected items fulfill requested ergonomic use-case.";
    let reasoning = aiProposal.reasoningSummary || "Commercial offer composed using authoritative Firestore prices.";

    if (offerStatus === "BUDGET_CONSTRAINT_FAILED") {
      const excess = totals.estimatedFinalAmount - (buyerIntent.budget || 0);
      buyerFit = `BUDGET EXCEEDED: Calculated deal total (₹${totals.estimatedFinalAmount.toLocaleString("en-IN")}) exceeds buyer's requested budget cap (₹${(buyerIntent.budget || 0).toLocaleString("en-IN")}) by ₹${excess.toLocaleString("en-IN")}, even after applying max policy discount (${totals.discount.percentage}%).`;
      reasoning = `Offer composed but flagged BUDGET_CONSTRAINT_FAILED due to ₹${excess.toLocaleString("en-IN")} budget overrun.`;
    }

    // 9. Construct & Validate Final Merchant Offer
    const offerId = `offer_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const rawMerchantOffer = {
      id: offerId,
      buyerIntentId,
      merchantId: DEMO_MERCHANT_ID,
      status: offerStatus,
      selectedItems: totals.items,
      alternativeItems,
      bundleItems,
      subtotal: totals.subtotal,
      proposedDiscount: {
        percentage: totals.discount.percentage,
        amount: totals.discount.amount,
        reasoning: aiProposal.discountReasoning || `Proposed ${totals.discount.percentage}% discount within policy.`,
      },
      estimatedFinalAmount: totals.estimatedFinalAmount,
      deliveryDays: maxDeliveryDays || 3,
      buyerFitExplanation: buyerFit,
      merchantOpportunityExplanation: aiProposal.merchantOpportunityExplanation || "High available stock optimizes inventory utilization.",
      reasoningSummary: reasoning,
      aiProvider,
      aiModel: currentModel,
      createdAt: new Date().toISOString(),
    };


    const validatedMerchantOffer: MerchantOffer = MerchantOfferSchema.parse(rawMerchantOffer);

    // 10. Persist to Firestore & Audit Event
    if (adminDb) {
      try {
        await adminDb.collection(MERCHANT_OFFERS_COLLECTION).doc(offerId).set(validatedMerchantOffer);
      } catch (dbErr) {
        console.warn("Failed to write merchant offer to Firestore:", dbErr);
      }
    }

    // Record Audit Event: MERCHANT_OFFER_GENERATED & VALIDATED
    await recordAuditEvent(
      "MERCHANT_OFFER_GENERATED",
      "MERCHANT_AGENT",
      `Merchant offer generated: ${selectedItems.length} items, subtotal ₹${totals.subtotal.toLocaleString("en-IN")}, final ₹${totals.estimatedFinalAmount.toLocaleString("en-IN")}.`,
      { status: offerStatus, finalAmount: totals.estimatedFinalAmount }
    );

    await recordAuditEvent(
      "MERCHANT_OFFER_VALIDATED",
      "MERCHANT_AGENT",
      `Merchant offer verified against ErgoSpace max discount policy (${merchant.maxDiscountPercent}% cap).`,
      { maxDiscountCap: merchant.maxDiscountPercent }
    );

    return NextResponse.json({
      success: true,
      offer: validatedMerchantOffer,
    });
  } catch (err: unknown) {
    console.error("Error in /api/merchant-offer:", err);
    const errorMessage = err instanceof Error ? err.message : "Failed to generate merchant offer.";
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: errorMessage } },
      { status: 500 }
    );
  }
}
