import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const MERCHANT_PROPER_CASES: Record<string, string> = {
  ergospace: "ErgoSpace",
  deskforge: "DeskForge",
  cybertech: "CyberTech",
  officepro: "OfficePro",
  nordicliving: "NordicLiving",
};

export function formatMerchantName(rawIdOrName?: string | null): string {
  if (!rawIdOrName) return "ErgoSpace";
  const clean = rawIdOrName.trim();
  const lower = clean.toLowerCase();

  if (MERCHANT_PROPER_CASES[lower]) {
    return MERCHANT_PROPER_CASES[lower];
  }

  // Capitalize words properly
  return clean.replace(/\b\w/g, (char) => char.toUpperCase());
}
