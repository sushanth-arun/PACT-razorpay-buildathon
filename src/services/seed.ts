import { Merchant, Product } from "@/types";
import { saveMerchant, saveProduct } from "@/services/firestore";

export const DEMO_MERCHANT_ID = "ergospace";

export const DEMO_MERCHANT: Merchant = {
  id: DEMO_MERCHANT_ID,
  name: "ErgoSpace",
  description: "ErgoSpace sells ergonomic office furniture for modern teams and workspaces.",
  maxDiscountPercent: 15,
  minimumMarginPercent: 20,
  maxAutoTransactionAmount: 50000,
  approvalRequiredAbove: 50000,
  allowSlowMovingInventoryDiscount: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const DEMO_PRODUCTS: Product[] = [
  {
    id: "prod-101",
    merchantId: DEMO_MERCHANT_ID,
    name: "ErgoChair Lite",
    description: "Breathable mesh ergonomic task chair with dynamic lumbar support.",
    category: "Seating",
    price: 11999,
    stock: 25, // High inventory
    attributes: { color: "Black", weightCapacityKg: 110, warrantyYears: 2 },
    deliveryDays: 3,
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "prod-102",
    merchantId: DEMO_MERCHANT_ID,
    name: "ErgoChair Pro",
    description: "Advanced ergonomic office chair with 4D armrests and headrest.",
    category: "Seating",
    price: 24999,
    stock: 12,
    attributes: { color: "Slate Gray", weightCapacityKg: 136, warrantyYears: 5 },
    deliveryDays: 4,
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "prod-103",
    merchantId: DEMO_MERCHANT_ID,
    name: "ErgoChair Executive",
    description: "Premium leather ergonomic executive chair with adaptive synchro-tilt.",
    category: "Seating",
    price: 39999,
    stock: 2, // Low stock constraint scenario
    attributes: { color: "Midnight Leather", weightCapacityKg: 150, warrantyYears: 7 },
    deliveryDays: 5,
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "prod-104",
    merchantId: DEMO_MERCHANT_ID,
    name: "Standing Desk Basic",
    description: "Single-motor electric height adjustable desk with anti-collision sensor.",
    category: "Desks",
    price: 21999,
    stock: 15,
    attributes: { widthCm: 120, depthCm: 60, heightRangeCm: "71-118" },
    deliveryDays: 5,
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "prod-105",
    merchantId: DEMO_MERCHANT_ID,
    name: "Standing Desk Pro",
    description: "Dual-motor heavy-duty standing desk with 4 memory presets and solid oak top.",
    category: "Desks",
    price: 34999,
    stock: 8,
    attributes: { widthCm: 150, depthCm: 75, heightRangeCm: "62-127" },
    deliveryDays: 7,
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "prod-106",
    merchantId: DEMO_MERCHANT_ID,
    name: "Monitor Arm",
    description: "Gas spring single monitor arm supporting 17-32 inch screens.",
    category: "Accessories",
    price: 3499,
    stock: 40, // High inventory accessory
    attributes: { maxWeightKg: 9, VESA: "75x75/100x100" },
    deliveryDays: 2,
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "prod-107",
    merchantId: DEMO_MERCHANT_ID,
    name: "Lumbar Support",
    description: "Memory foam ergonomic back cushion with cooling gel layer.",
    category: "Accessories",
    price: 1499,
    stock: 50, // High inventory bundle opportunity
    attributes: { material: "Memory Foam", washableCover: true },
    deliveryDays: 2,
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "prod-108",
    merchantId: DEMO_MERCHANT_ID,
    name: "Foot Rest",
    description: "Adjustable angle ergonomic footrest with massage rollers.",
    category: "Accessories",
    price: 1999,
    stock: 18,
    attributes: { heightAdjustable: true, tiltDegrees: 30 },
    deliveryDays: 3,
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "prod-109",
    merchantId: DEMO_MERCHANT_ID,
    name: "Ergonomic Keyboard Tray",
    description: "Under-desk sliding keyboard platform with negative tilt adjustment.",
    category: "Accessories",
    price: 2999,
    stock: 1, // Limited stock constraint
    attributes: { widthCm: 65, tiltRangeDegrees: "-15 to +15" },
    deliveryDays: 4,
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "prod-110",
    merchantId: DEMO_MERCHANT_ID,
    name: "Cable Management Kit",
    description: "Under-desk wire tray, magnetic cable clips, and sleeve bundle.",
    category: "Accessories",
    price: 999,
    stock: 60,
    attributes: { lengthCm: 80, color: "Matte Black" },
    deliveryDays: 2,
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export async function seedDemoData(): Promise<{ merchant: Merchant; productsCount: number }> {
  await saveMerchant(DEMO_MERCHANT);
  for (const product of DEMO_PRODUCTS) {
    await saveProduct(product);
  }
  return { merchant: DEMO_MERCHANT, productsCount: DEMO_PRODUCTS.length };
}


