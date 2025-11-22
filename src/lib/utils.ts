import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const brandPalette = {
  gold: "#C8A061",
  maroon: "#8E0E00",
  primary: "#1F1C18",
  darkText: "#1A1A1A",
  lightGold: "#D4AF6A",
  charcoal: "#1A1A1A",
  lightGray: "#E6E6E6",
  navy: "#182E5F",
};

export const brandGradients = {
  aurum: "linear-gradient(135deg, #1F1C18 0%, #8E0E00 45%, #C8A061 100%)",
  dusk: "linear-gradient(135deg, #182E5F 0%, #8E0E00 60%, #D4AF6A 100%)",
  slate: "linear-gradient(135deg, #0F0C08 0%, #1F1C18 50%, #705335 100%)",
};

export function formatNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1).replace(/\.0$/, "")}m`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  }
  return `${value}`;
}

export function getCategoryAccent(category?: string): string {
  const normalized = category?.toLowerCase();
  switch (normalized) {
    case "converter":
      return brandPalette.gold;
    case "download":
      return brandPalette.navy;
    case "utility":
      return brandPalette.lightGold;
    case "media":
      return "#F28F3B";
    default:
      return brandPalette.primary;
  }
}
