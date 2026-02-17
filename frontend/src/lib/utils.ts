import { clsx, type ClassValue } from "clsx";
import React from "react";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** onFocus handler: selects the entire value so typing immediately replaces it */
export function selectOnFocus(e: React.FocusEvent<HTMLInputElement>) {
  e.target.select();
}

/* ── Numeric input helpers ── */

/**
 * Parse a user-typed string (with comma or dot) into a number.
 * Returns 0 for empty/invalid strings when used in calculations.
 */
export function parseNum(str: string): number {
  if (str === "" || str === "-") return 0;
  return Number(str.replace(",", ".")) || 0;
}

/**
 * Normalize numeric input value: replace dots with commas,
 * strip invalid chars, allow empty string.
 */
export function normalizeNumInput(raw: string): string {
  // Allow empty
  if (raw === "") return "";
  // Replace dot with comma (visual decimal separator)
  let s = raw.replace(".", ",");
  // Allow only digits, comma, minus
  s = s.replace(/[^\d,\-]/g, "");
  // Only one comma
  const parts = s.split(",");
  if (parts.length > 2) s = parts[0] + "," + parts.slice(1).join("");
  // Only leading minus
  if (s.indexOf("-") > 0) s = s.replace(/-/g, "");
  return s;
}

/**
 * Convert a stored number to a display string (comma as decimal separator).
 * Returns "" for 0 if allowEmpty is true (used during editing).
 */
export function numToDisplay(val: number | string): string {
  if (val === "" || val === null || val === undefined) return "";
  const n = typeof val === "string" ? val : String(val);
  return n.replace(".", ",");
}
