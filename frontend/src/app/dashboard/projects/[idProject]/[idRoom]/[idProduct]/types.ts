/* eslint-disable @typescript-eslint/no-explicit-any */

export interface MatOption {
  id: string;
  brand: string | null;
  calcType: string;
  materialType: { name: string };
}

export interface SubItem {
  id?: string;
  qty: number;
  width?: number;
  height?: number;
  materialId?: string;
  isLdsp?: boolean;
  handleQty?: number;
  openType?: "HANDLE" | "TIP_ON";
  slideType?: "GUIDE" | "TANDEM";
  mezzanineId?: string;
}

export interface MezzanineData {
  id: string;
  height: number;
  bodyMaterialId: string | null;
  sectionsEnabled: boolean;
  backWallEnabled: boolean;
  backWallMaterialId: string | null;
  partitionsEnabled: boolean;
  shelvesEnabled: boolean;
  facadesEnabled: boolean;
  falseFacadesEnabled: boolean;
  falseFacadeQty: number;
  falseFacadeMaterialId: string | null;
  drawersEnabled: boolean;
  sections: SubItem[];
  partitions: SubItem[];
  shelves: SubItem[];
  facades: SubItem[];
  drawers: SubItem[];
}

export interface CountertopData {
  id?: string;
  materialId: string;
  width: number;
  depth: number;
  apronEnabled: boolean;
  apronMaterialId: string | null;
  apronWidth: number | null;
  apronHeight: number | null;
}

export interface ExtraItem {
  id?: string;
  name: string;
  price: number;
}

export interface ProductData {
  id: string;
  productType: { name: string };
  width: number;
  height: number;
  depth: number;
  sectionsEnabled: boolean;
  backWallEnabled: boolean;
  backWallMaterialId: string | null;
  partitionsEnabled: boolean;
  shelvesEnabled: boolean;
  facadesEnabled: boolean;
  falseFacadesEnabled: boolean;
  falseFacadeQty: number;
  falseFacadeMaterialId: string | null;
  drawersEnabled: boolean;
  mezzanineEnabled: boolean;
  countertopEnabled: boolean;
  extrasEnabled: boolean;
  sections: SubItem[];
  partitions: SubItem[];
  shelves: SubItem[];
  facades: SubItem[];
  drawers: SubItem[];
  mezzanine: MezzanineData | null;
  countertop: CountertopData | null;
  extras: ExtraItem[];
  room: {
    project: { id: string; name: string };
    id: string;
    roomType?: { name: string };
  };
}

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
