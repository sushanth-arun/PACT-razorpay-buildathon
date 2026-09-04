import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { BUYER_INTENTS_COLLECTION, recordAuditEvent } from "@/services/buyer-intent-service";
import { BuyerIntent, BuyerIntentSchema } from "@/lib/ai/schemas";
import { Merchant, Product } from "@/types";
import { DEMO_MERCHANT_ID, DEMO_MERCHANTS } from "@/services/seed";
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

    let requestedMerchantId = body?.merchantId || (buyerIntent as unknown as { targetMerchantId?: string }).targetMerchantId || "all";

    // If 'all' (Multi-Store Auto-Discovery), search across all available merchants to find the single best-matching store
    if (!requestedMerchantId || requestedMerchantId === "all") {
      let bestStoreId = DEMO_MERCHANT_ID;
      const intentLower = (buyerIntent.productIntent || buyerIntent.rawRequest || "").toLowerCase();

      // Check keywords across known merchants
      const matchedScores: Record<string, number> = {};
      for (const m of DEMO_MERCHANTS) {
        matchedScores[m.id] = 0;
        const products = await searchProducts(m.id, { query: buyerIntent.productIntent });
        if (products.length > 0) {
          matchedScores[m.id] += products.length * 2;
        }
        for (const prod of m.initialProducts) {
          if (intentLower.includes(prod.name.toLowerCase()) || intentLower.includes(prod.category.toLowerCase())) {
            matchedScores[m.id] += 3;
          }
        }
      }

      let maxScore = -1;
      for (const [sId, score] of Object.entries(matchedScores)) {
        if (score > maxScore) {
          maxScore = score;
          bestStoreId = sId;
        }
      }
      requestedMerchantId = bestStoreId;
    }

    // 2. Retrieve Merchant Data & Governance Policies
    const merchant: Merchant | null = await getMerchantPolicies(requestedMerchantId);
    if (!merchant) {
      return NextResponse.json(
        { success: false, error: { code: "MERCHANT_NOT_FOUND", message: `Merchant profile '${requestedMerchantId}' not found in Firestore.` } },
        { status: 500 }
      );
    }

    // Record Audit Event 2: MERCHANT_POLICIES_RETRIEVED
    await recordAuditEvent(
      "MERCHANT_POLICIES_RETRIEVED",
      "MERCHANT_AGENT",
      `Loaded ${merchant.name} governance policies: Max Discount ${merchant.maxDiscountPercent}%, Min Margin ${merchant.minimumMarginPercent}%.`,
      { merchantId: merchant.id, maxDiscountCap: merchant.maxDiscountPercent }
    );

    // 3. Retrieve Candidate Products from Firestore
    const candidateProducts: Product[] = await searchProducts(merchant.id, {
      query: buyerIntent.productIntent,
    });

    // Fallback search if query filter was too strict
    const allActiveProducts: Product[] = candidateProducts.length > 0
      ? candidateProducts
      : await searchProducts(merchant.id);

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
      if (dbProd && dbProd.active !== false) {
        const qtyToOffer = sel.quantity || requestedQty;
        // Verify inventory
        const invCheck = await checkInventory(dbProd.id, qtyToOffer, merchant.id);
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
      if (dbProd && dbProd.active !== false && !selectedItems.some((s) => s.productId === dbProd.id)) {
        alternativeItems.push({
          productId: dbProd.id,
          productName: dbProd.name,
          quantity: alt.quantity || requestedQty,
          unitPrice: dbProd.price,
          lineTotal: (alt.quantity || requestedQty) * dbProd.price,
        });
      }
    }

    // Check if buyer intent is completely outside ErgoSpace catalog domain (e.g., cars, food, vehicles)
    const reqNeedTokens = buyerIntent.productIntent
      .toLowerCase()
      .split(/\W+/)
      .filter((t) => t.length > 2);

    const isOutOfDomain = reqNeedTokens.length > 0 && !allActiveProducts.some((p) => {
      const prodText = `${p.name} ${p.category} ${p.description || ""}`.toLowerCase();
      return reqNeedTokens.some((tok) => {
        const singular = tok.endsWith("s") ? tok.slice(0, -1) : tok;
        return prodText.includes(tok) || prodText.includes(singular);
      });
    }) && selectedItems.length === 0;

    // If AI proposed no selected items and no alternative items, but active catalog items matching category exist, populate alternatives automatically
    if (selectedItems.length === 0 && alternativeItems.length === 0 && !isOutOfDomain) {
      for (const prod of allActiveProducts.slice(0, 3)) {
        if (prod.active !== false) {
          alternativeItems.push({
            productId: prod.id,
            productName: prod.name,
            quantity: requestedQty,
            unitPrice: prod.price,
            lineTotal: requestedQty * prod.price,
          });
        }
      }
    }

    // Determine Merchant Offer Status & Fallbacks
    let offerStatus: MerchantOfferStatus = "OFFER_GENERATED";

    if (isOutOfDomain) {
      offerStatus = "NO_VALID_OFFER";
      selectedItems.length = 0;
      alternativeItems.length = 0;
    } else if (selectedItems.length === 0) {
      if (alternativeItems.length > 0) {
        offerStatus = "ALTERNATIVE_FOUND";
      } else {
        offerStatus = "INSUFFICIENT_INVENTORY";
      }
    }

    // Items to use for arithmetic calculations (selected items, or top alternative if alternative found)
    const itemsForCalculation = selectedItems.length > 0
      ? selectedItems
      : alternativeItems.length > 0
      ? [alternativeItems[0]]
      : [];

    // Determine if the buyer explicitly requested a discount or budget negotiation
    const buyerRequestedDiscount = Boolean(
      (buyerIntent.requestedDiscount !== null && Number(buyerIntent.requestedDiscount) > 0) ||
      (buyerIntent.negotiableConstraints && buyerIntent.negotiableConstraints.some(c => c.toLowerCase().includes("discount") || c.toLowerCase().includes("price") || c.toLowerCase().includes("budget"))) ||
      (buyerIntent.rawRequest && /discount|deal|offer|off|concession|cheaper|bargain/i.test(buyerIntent.rawRequest))
    );

    const effectiveDiscountPercent = buyerRequestedDiscount ? (aiProposal.proposedDiscountPercent || 0) : 0;

    // 6. Deterministic Arithmetic Calculations (Line Total, Subtotal, Discount, Final Amount)
    const totals = calculateOfferTotals(
      itemsForCalculation,
      effectiveDiscountPercent,
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

    if (offerStatus === "INSUFFICIENT_INVENTORY") {
      buyerFit = `INSUFFICIENT STOCK: Buyer requested ${buyerIntent.quantity || 1} units of '${buyerIntent.productIntent}', but current ErgoSpace warehouse inventory cannot fulfill this quantity. Please consider reducing requested quantity.`;
      reasoning = `Offer status set to INSUFFICIENT_INVENTORY due to catalog stock limits.`;
    } else if (offerStatus === "NO_VALID_OFFER") {
      buyerFit = `PRODUCT NOT CARRIED: ErgoSpace specializes in ergonomic office furniture and accessories. We do not carry or offer '${buyerIntent.productIntent}'.`;
      reasoning = `No matching active products found in merchant catalog.`;
    } else if (offerStatus === "BUDGET_CONSTRAINT_FAILED") {
      const excess = totals.estimatedFinalAmount - (buyerIntent.budget || 0);
      buyerFit = `BUDGET EXCEEDED: Calculated deal total (₹${totals.estimatedFinalAmount.toLocaleString("en-IN")}) exceeds buyer's budget cap (₹${(buyerIntent.budget || 0).toLocaleString("en-IN")}) by ₹${excess.toLocaleString("en-IN")}, even after applying max policy discount (${totals.discount.percentage}%). We recommend revising the requested quantity or budget.`;
      reasoning = `Offer composed but flagged BUDGET_CONSTRAINT_FAILED due to ₹${excess.toLocaleString("en-IN")} budget overrun.`;
    }


    // 9. Construct & Validate Final Merchant Offer
    const offerId = `offer_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    // Ensure alternative items never duplicate what is already in selectedItems
    const deduplicatedAlternatives = alternativeItems.filter(
      (alt) => !selectedItems.some((s) => s.productId === alt.productId)
    );

    const rawMerchantOffer = {
      id: offerId,
      buyerIntentId,
      merchantId: requestedMerchantId,
      status: offerStatus,
      selectedItems: selectedItems, // Strictly only selected items (empty if ALTERNATIVE_FOUND awaiting adoption)
      alternativeItems: deduplicatedAlternatives,
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

    // 10. Persist to Firestore with Dual-Level Relational Containment
    if (adminDb) {
      try {
        // 1. Root collection persistence
        await adminDb.collection(MERCHANT_OFFERS_COLLECTION).doc(offerId).set(validatedMerchantOffer);

        // 2. Hierarchical containment: buyer_intents/{buyerIntentId}/merchant_offers/{offerId}
        await adminDb
          .collection(BUYER_INTENTS_COLLECTION)
          .doc(buyerIntentId)
          .collection(MERCHANT_OFFERS_COLLECTION)
          .doc(offerId)
          .set(validatedMerchantOffer);

        // 3. Hierarchical Deal containment & Deal Document Sync: deals/{dealId}
        if (buyerIntent.dealId) {
          const offerItems = validatedMerchantOffer.selectedItems.length > 0
            ? validatedMerchantOffer.selectedItems
            : validatedMerchantOffer.alternativeItems;

          // Update root deal document with latest active offer
          await adminDb
            .collection("deals")
            .doc(buyerIntent.dealId)
            .set(
              {
                merchantOfferId: offerId,
                status: validatedMerchantOffer.status, // "OFFER_GENERATED" or "ALTERNATIVE_FOUND"
                merchantId: requestedMerchantId,
                merchantName: merchant.name,
                items: offerItems,
                subtotal: validatedMerchantOffer.subtotal,
                discount: validatedMerchantOffer.proposedDiscount,
                finalAmount: validatedMerchantOffer.estimatedFinalAmount,
                deliveryDays: validatedMerchantOffer.deliveryDays,
                merchantOffer: validatedMerchantOffer,
                updatedAt: new Date().toISOString(),
              },
              { merge: true }
            );

          // deals -> buyer_intents -> merchant_offers
          await adminDb
            .collection("deals")
            .doc(buyerIntent.dealId)
            .collection(BUYER_INTENTS_COLLECTION)
            .doc(buyerIntentId)
            .collection(MERCHANT_OFFERS_COLLECTION)
            .doc(offerId)
            .set(validatedMerchantOffer);

          // Update parent subcollection intent doc
          await adminDb
            .collection("deals")
            .doc(buyerIntent.dealId)
            .collection(BUYER_INTENTS_COLLECTION)
            .doc(buyerIntentId)
            .update({
              lastOfferId: offerId,
              offerStatus: offerStatus,
              merchantId: requestedMerchantId,
              updatedAt: new Date().toISOString(),
            });

          // Also keep deals/{dealId}/merchant_offers/{offerId}
          await adminDb
            .collection("deals")
            .doc(buyerIntent.dealId)
            .collection(MERCHANT_OFFERS_COLLECTION)
            .doc(offerId)
            .set(validatedMerchantOffer);
        }

        // 4. Link Foreign Keys back to parent buyer_intent
        await adminDb
          .collection(BUYER_INTENTS_COLLECTION)
          .doc(buyerIntentId)
          .update({
            lastOfferId: offerId,
            offerStatus: offerStatus,
            merchantId: requestedMerchantId,
            updatedAt: new Date().toISOString(),
          });
      } catch (dbErr) {
        console.warn("Failed to write merchant offer to Firestore:", dbErr);
      }
    }

    // Record Audit Event: MERCHANT_OFFER_GENERATED & VALIDATED
    await recordAuditEvent(
      "MERCHANT_OFFER_GENERATED",
      "MERCHANT_AGENT",
      `Merchant offer generated for ${merchant.name}: ${selectedItems.length} items, subtotal ₹${totals.subtotal.toLocaleString("en-IN")}, final ₹${totals.estimatedFinalAmount.toLocaleString("en-IN")}.`,
      { merchantId: requestedMerchantId, status: offerStatus, finalAmount: totals.estimatedFinalAmount }
    );

    await recordAuditEvent(
      "MERCHANT_OFFER_VALIDATED",
      "MERCHANT_AGENT",
      `Merchant offer verified against ${merchant.name} max discount policy (${merchant.maxDiscountPercent}% cap).`,
      { merchantId: requestedMerchantId, maxDiscountCap: merchant.maxDiscountPercent }
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
