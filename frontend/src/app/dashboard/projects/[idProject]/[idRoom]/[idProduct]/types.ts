/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Re-export product editor types from shared @/types module.
 */
export type {
  CountertopData,
  ExtraItem,
  ExtraType,
  FalseFacadeItem,
  HwOption,
  MatOption,
  ProductData,
  SubItem,
} from "@/types";

export type TFunc = any;

/** Resolved user defaults from GET /settings/defaults */
export interface UserDefaults {
  sectionMaterialId: string | null;
  backWallMaterialId: string | null;
  facadeMaterialId: string | null;
  falseFacadeMaterialId: string | null;
  countertopMaterialId: string | null;
  hingeHardwareId: string | null;
  handleHardwareId: string | null;
  tipOnHardwareId: string | null;
  slideHardwareId: string | null;
  tandemHardwareId: string | null;
  holderHardwareId: string | null;
  legsHardwareId: string | null;
}

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
