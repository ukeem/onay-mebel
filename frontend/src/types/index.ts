/**
 * Shared TypeScript types for the Onay Mebel frontend.
 * Single source of truth — import from "@/types" everywhere.
 */

/* ═══════════════ Enums ═══════════════ */

export type Role = "SUPER" | "ADMIN" | "USER";
export type UserStatus = "ACTIVE" | "INACTIVE" | "BLOCKED";
export type CalcType = "SHEET" | "SQM" | "LM";
export type ProfitType = "COEF" | "FIXED";
export type FacadeOpenType = "HANDLE" | "TIP_ON";
export type DrawerSlideType = "GUIDE" | "TANDEM";
export type ContactType =
  | "WHATSAPP"
  | "TELEGRAM"
  | "EMAIL"
  | "INSTAGRAM"
  | "TIKTOK";
export type Tier = "standard" | "comfort" | "premium";

/* ═══════════════ User ═══════════════ */

export interface User {
  id: string;
  phone: string;
  role: Role;
  status: UserStatus;
  activeUntil: string | null;
  createdAt: string;
}

/* ═══════════════ Catalog (admin) ═══════════════ */

export interface MaterialType {
  id: string;
  name: string;
}

export interface Material {
  id: string;
  brand: string | null;
  calcType: CalcType;
  length: number;
  width: number;
  price: string;
  image: string | null;
  materialType: MaterialType;
}

export interface HardwareType {
  id: string;
  name: string;
}

export interface Hardware {
  id: string;
  brand: string | null;
  price: string;
  image: string | null;
  hardwareType: HardwareType;
}

export interface ServiceTemplate {
  id: string;
  sawingPrice: string;
  drillingPrice: string;
  edgeBandingPrice: string;
  technologistPercent: string;
  designerPercent: string;
  assemblyPercent: string;
  deliveryPrice: string;
  profitType: ProfitType;
  profitValue: string;
}

/* ═══════════════ User settings ═══════════════ */

export interface UserMaterial {
  id: string;
  price: string;
  enabled: boolean;
  material: {
    id: string;
    brand: string | null;
    calcType: CalcType;
    length: number;
    width: number;
    image: string | null;
    materialType: { name: string };
  };
}

export interface UserHardware {
  id: string;
  price: string;
  enabled: boolean;
  hardware: {
    id: string;
    brand: string | null;
    image: string | null;
    hardwareType: { name: string };
  };
}

export interface UserService {
  id: string;
  sawingPrice: string;
  drillingPrice: string;
  edgeBandingPrice: string;
  technologistPercent: string;
  designerPercent: string;
  assemblyPercent: string;
  deliveryPrice: string;
  profitType: ProfitType;
  profitValue: string;
}

export interface CompanyInfo {
  id?: string;
  logo?: string | null;
  name: string;
  description?: string | null;
  descriptionKz?: string | null;
}

export interface UserContact {
  id: string;
  type: ContactType;
  value: string;
}

/* ═══════════════ Projects ═══════════════ */

export interface RoomType {
  id: string;
  name: string;
}

export interface ProductType {
  id: string;
  name: string;
}

/** Lightweight product (list views) */
export interface ProductSummary {
  id: string;
  name: string;
  productType: ProductType;
}

/** Room in project list */
export interface RoomSummary {
  id: string;
  roomType: RoomType;
  _count?: { products: number };
  products?: ProductSummary[];
  createdAt?: string;
}

/** Project in project list */
export interface ProjectSummary {
  id: string;
  name: string;
  clientData: string | null;
  rooms: RoomSummary[];
  _count?: { calculations: number };
  createdAt: string;
}

/** Room detail (with project ref) */
export interface RoomDetail {
  id: string;
  roomType: RoomType;
  project: { id: string; name: string };
  products: ProductSummary[];
}

/* ═══════════════ Product editor ═══════════════ */

export interface MatOption {
  id: string;
  brand: string | null;
  calcType: CalcType;
  materialType: { name: string };
}

export interface HwOption {
  id: string;
  brand: string | null;
  hardwareType: { name: string };
}

export interface SubItem {
  id?: string;
  qty: number;
  width?: number;
  height?: number;
  depth?: number;
  materialId?: string;
  backWallEnabled?: boolean;
  backWallMaterialId?: string;
  handleQty?: number;
  openType?: FacadeOpenType;
  slideType?: DrawerSlideType;
  // hardware references
  legsEnabled?: boolean;
  legsHardwareId?: string;
  hingeHardwareId?: string;
  handleHardwareId?: string;
  tipOnHardwareId?: string;
  holderHardwareId?: string;
  slideHardwareId?: string;
}

export interface FalseFacadeItem {
  id?: string;
  qty: number;
  height: number;
  depth: number;
  materialId?: string;
}

export interface CountertopData {
  id?: string;
  materialId?: string;
  width: number;
  depth: number;
  apronEnabled: boolean;
  apronMaterialId?: string | null;
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
  productType: ProductType;
  sectionsEnabled: boolean;
  partitionsEnabled: boolean;
  shelvesEnabled: boolean;
  facadesEnabled: boolean;
  falseFacadesEnabled: boolean;
  drawersEnabled: boolean;
  countertopEnabled: boolean;
  extrasEnabled: boolean;
  sections: SubItem[];
  partitions: SubItem[];
  shelves: SubItem[];
  facades: SubItem[];
  falseFacades: FalseFacadeItem[];
  drawers: SubItem[];
  countertops: CountertopData[];
  extras: ExtraItem[];
  room: {
    project: { id: string; name: string };
    id: string;
    roomType?: { name: string };
  };
}
