/**
 * Deterministic Financial and Quantity Calculations for PACT Deal Compiler.
 * NO AI Reasoning. Pure, unit-testable TypeScript math.
 * All monetary amounts are handled strictly in integers (rounded to whole INR currency units) to avoid floating-point errors.
 */

import { CompiledDealItem } from "./schema";
import { Product } from "@/types";

/**
 * Calculates line total for a single product item.
 * lineTotal = quantity * unitPrice
 */
export function calculateLineTotal(quantity: number, unitPrice: number): number {
  if (quantity <= 0 || unitPrice < 0) return 0;
  return Math.round(quantity * unitPrice);
}

/**
 * Calculates subtotal across all compiled deal items.
 * subtotal = sum(lineTotals)
 */
export function calculateSubtotal(items: CompiledDealItem[]): number {
  return items.reduce((sum, item) => sum + item.lineTotal, 0);
}

/**
 * Calculates discount amount based on subtotal and discount percentage.
 * discountAmount = Math.round(subtotal * (discountPercentage / 100))
 */
export function calculateDiscount(subtotal: number, discountPercentage: number): number {
  if (subtotal <= 0 || discountPercentage <= 0) return 0;
  const validPercentage = Math.min(100, Math.max(0, discountPercentage));
  return Math.round(subtotal * (validPercentage / 100));
}

/**
 * Calculates final deal amount after discount.
 * finalAmount = subtotal - discountAmount
 */
export function calculateFinalAmount(subtotal: number, discountAmount: number): number {
  return Math.max(0, subtotal - discountAmount);
}

/**
 * Calculates the maximum allowed discount percentage according to merchant policy cap.
 */
export function calculateMaximumAllowedDiscount(proposedDiscount: number, maxDiscountCap: number): number {
  return Math.min(proposedDiscount, maxDiscountCap);
}

/**
 * Calculates overall deal delivery days (maximum delivery SLA among all selected products).
 */
export function calculateDeliveryDays(products: Product[]): number {
  if (products.length === 0) return 0;
  return Math.max(...products.map((p) => p.deliveryDays || 0));
}
