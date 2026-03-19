/**
 * Shared utility — deep-copies a product with ALL sub-components
 * inside an existing Prisma interactive transaction.
 *
 * Used by projects.service (duplicate), rooms.service (copy),
 * products.service (copy).
 */
import type { DrawerSlideType, FacadeOpenType, Prisma } from '@prisma/client';

/** Minimal Prisma TX client with the methods we need */
type PrismaTx = Prisma.TransactionClient;

/** Product shape returned by findUnique with full sub-component includes */
export interface ProductWithSubComponents {
  productTypeId: string;
  sectionsEnabled: boolean;
  partitionsEnabled: boolean;
  shelvesEnabled: boolean;
  facadesEnabled: boolean;
  falseFacadesEnabled: boolean;
  drawersEnabled: boolean;
  countertopEnabled: boolean;
  extrasEnabled: boolean;

  sections: Array<{
    label: string | null;
    qty: number;
    width: number;
    height: number;
    depth: number;
    materialId: string | null;
    backWallEnabled: boolean;
    backWallMaterialId: string | null;
    legsEnabled: boolean;
    legsHardwareId: string | null;
  }>;
  partitions: Array<{
    label: string | null;
    height: number;
    depth: number;
    qty: number;
    materialId: string | null;
  }>;
  shelves: Array<{
    label: string | null;
    width: number;
    depth: number;
    qty: number;
    materialId: string | null;
    holderHardwareId: string | null;
  }>;
  facades: Array<{
    label: string | null;
    materialId: string | null;
    width: number;
    height: number;
    qty: number;
    handleQty: number;
    openType: FacadeOpenType | null;
    hingesEnabled: boolean;
    hingeHardwareId: string | null;
    handleHardwareId: string | null;
    tipOnHardwareId: string | null;
  }>;
  drawers: Array<{
    label: string | null;
    width: number;
    height: number;
    depth: number;
    qty: number;
    handleQty: number;
    slideType: DrawerSlideType | null;
    materialId: string | null;
    slideHardwareId: string | null;
  }>;
  falseFacades: Array<{
    label: string | null;
    qty: number;
    height: number;
    depth: number;
    materialId: string | null;
  }>;
  countertops: Array<{
    label: string | null;
    materialId: string | null;
    width: number;
    depth: number;
    apronEnabled: boolean;
    apronMaterialId: string | null;
    apronWidth: number | null;
    apronHeight: number | null;
  }>;
  extras: Array<{ label: string | null; name: string; price: any }>;
}

/** Prisma include for fetching a product with all sub-components needed for copy */
export const PRODUCT_COPY_INCLUDE = {
  sections: true,
  partitions: true,
  shelves: true,
  facades: true,
  drawers: true,
  falseFacades: true,
  countertops: true,
  extras: true,
} as const;

/**
 * Deep-copy a single product (with all sub-components) into a new room.
 * Returns the new product id.
 */
export async function copyProductData(
  tx: PrismaTx,
  src: ProductWithSubComponents,
  newRoomId: string,
): Promise<string> {
  // 1. Product
  const newProduct = await tx.product.create({
    data: {
      roomId: newRoomId,
      productTypeId: src.productTypeId,
      sectionsEnabled: src.sectionsEnabled,
      partitionsEnabled: src.partitionsEnabled,
      shelvesEnabled: src.shelvesEnabled,
      facadesEnabled: src.facadesEnabled,
      falseFacadesEnabled: src.falseFacadesEnabled,
      drawersEnabled: src.drawersEnabled,
      countertopEnabled: src.countertopEnabled,
      extrasEnabled: src.extrasEnabled,
    },
  });

  // 2. Sections
  for (const s of src.sections ?? []) {
    await tx.productSection.create({
      data: {
        productId: newProduct.id,
        label: s.label,
        qty: s.qty,
        width: s.width,
        height: s.height,
        depth: s.depth,
        materialId: s.materialId,
        backWallEnabled: s.backWallEnabled,
        backWallMaterialId: s.backWallMaterialId,
        legsEnabled: s.legsEnabled,
        legsHardwareId: s.legsHardwareId,
      },
    });
  }

  // 3. Partitions
  for (const p of src.partitions ?? []) {
    await tx.productPartition.create({
      data: {
        productId: newProduct.id,
        label: p.label,
        height: p.height,
        depth: p.depth,
        qty: p.qty,
        materialId: p.materialId,
      },
    });
  }

  // 4. Shelves
  for (const sh of src.shelves ?? []) {
    await tx.productShelf.create({
      data: {
        productId: newProduct.id,
        label: sh.label,
        width: sh.width,
        depth: sh.depth,
        qty: sh.qty,
        materialId: sh.materialId,
        holderHardwareId: sh.holderHardwareId,
      },
    });
  }

  // 5. Facades
  for (const f of src.facades ?? []) {
    await tx.productFacade.create({
      data: {
        productId: newProduct.id,
        label: f.label,
        materialId: f.materialId,
        width: f.width,
        height: f.height,
        qty: f.qty,
        handleQty: f.handleQty,
        openType: f.openType ?? undefined,
        hingesEnabled: f.hingesEnabled,
        hingeHardwareId: f.hingeHardwareId,
        handleHardwareId: f.handleHardwareId,
        tipOnHardwareId: f.tipOnHardwareId,
      },
    });
  }

  // 6. Drawers
  for (const d of src.drawers ?? []) {
    await tx.productDrawer.create({
      data: {
        productId: newProduct.id,
        label: d.label,
        width: d.width,
        height: d.height,
        depth: d.depth,
        qty: d.qty,
        handleQty: d.handleQty,
        slideType: d.slideType ?? undefined,
        materialId: d.materialId,
        slideHardwareId: d.slideHardwareId,
      },
    });
  }

  // 7. False Facades
  for (const ff of src.falseFacades ?? []) {
    await tx.productFalseFacade.create({
      data: {
        productId: newProduct.id,
        label: ff.label,
        qty: ff.qty,
        height: ff.height,
        depth: ff.depth,
        materialId: ff.materialId,
      },
    });
  }

  // 8. Countertops
  for (const ct of src.countertops ?? []) {
    await tx.productCountertop.create({
      data: {
        productId: newProduct.id,
        label: ct.label,
        materialId: ct.materialId,
        width: ct.width,
        depth: ct.depth,
        apronEnabled: ct.apronEnabled,
        apronMaterialId: ct.apronMaterialId,
        apronWidth: ct.apronWidth,
        apronHeight: ct.apronHeight,
      },
    });
  }

  // 9. Extras
  for (const e of src.extras ?? []) {
    await tx.productExtra.create({
      data: {
        productId: newProduct.id,
        label: e.label,
        name: e.name,
        price: e.price,
      },
    });
  }

  return newProduct.id;
}
