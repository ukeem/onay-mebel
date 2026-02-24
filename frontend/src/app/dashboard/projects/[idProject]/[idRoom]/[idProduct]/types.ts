/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Re-export product editor types from shared @/types module.
 */
export type {
  CountertopData,
  ExtraItem,
  FalseFacadeItem,
  HwOption,
  MatOption,
  ProductData,
  SubItem,
} from "@/types";

export type TFunc = any;

/* ── helpers ── */
export function num(v: string) {
  return parseInt(String(v).replace(",", ".")) || 0;
}

export function dec(v: string) {
  return parseFloat(String(v).replace(",", ".")) || 0;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
