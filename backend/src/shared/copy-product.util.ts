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
  width: number;
  height: number;
  depth: number;
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
  mezzanineEnabled: boolean;
  countertopEnabled: boolean;
  extrasEnabled: boolean;

  sections: Array<{ qty: number; mezzanineId: string | null }>;
  partitions: Array<{
    height: number;
    qty: number;
    mezzanineId: string | null;
  }>;
  shelves: Array<{ width: number; qty: number; mezzanineId: string | null }>;
  facades: Array<{
    materialId: string | null;
    isLdsp: boolean;
    width: number;
    height: number;
    qty: number;
    handleQty: number;
    openType: FacadeOpenType | null;
    mezzanineId: string | null;
  }>;
  drawers: Array<{
    width: number;
    height: number;
    qty: number;
    handleQty: number;
    slideType: DrawerSlideType | null;
    mezzanineId: string | null;
  }>;
  extras: Array<{ name: string; price: any }>;
  mezzanine: {
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
    sections: Array<{ qty: number; mezzanineId: string | null }>;
    partitions: Array<{
      height: number;
      qty: number;
      mezzanineId: string | null;
    }>;
    shelves: Array<{ width: number; qty: number; mezzanineId: string | null }>;
    facades: Array<{
      materialId: string | null;
      isLdsp: boolean;
      width: number;
      height: number;
      qty: number;
      handleQty: number;
      openType: FacadeOpenType | null;
      mezzanineId: string | null;
    }>;
    drawers: Array<{
      width: number;
      height: number;
      qty: number;
      handleQty: number;
      slideType: DrawerSlideType | null;
      mezzanineId: string | null;
    }>;
  } | null;
  countertop: {
    materialId: string;
    isLdsp: boolean;
    width: number;
    depth: number;
    apronEnabled: boolean;
    apronMaterialId: string | null;
    apronIsLdsp: boolean;
    apronWidth: number | null;
    apronHeight: number | null;
  } | null;
}

/** Prisma include for fetching a product with all sub-components needed for copy */
export const PRODUCT_COPY_INCLUDE = {
  sections: true,
  partitions: true,
  shelves: true,
  facades: true,
  drawers: true,
  extras: true,
  mezzanine: {
    include: {
      sections: true,
      partitions: true,
      shelves: true,
      facades: true,
      drawers: true,
    },
  },
  countertop: true,
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
      width: src.width,
      height: src.height,
      depth: src.depth,
      bodyMaterialId: src.bodyMaterialId,
      sectionsEnabled: src.sectionsEnabled,
      backWallEnabled: src.backWallEnabled,
      backWallMaterialId: src.backWallMaterialId,
      partitionsEnabled: src.partitionsEnabled,
      shelvesEnabled: src.shelvesEnabled,
      facadesEnabled: src.facadesEnabled,
      falseFacadesEnabled: src.falseFacadesEnabled,
      falseFacadeQty: src.falseFacadeQty,
      falseFacadeMaterialId: src.falseFacadeMaterialId,
      drawersEnabled: src.drawersEnabled,
      mezzanineEnabled: src.mezzanineEnabled,
      countertopEnabled: src.countertopEnabled,
      extrasEnabled: src.extrasEnabled,
    },
  });

  // 2. Mezzanine (first — needed for mezzanineId mapping)
  const mezzanineIdMap: Record<string, string> = {};
  if (src.mezzanine) {
    const mez = src.mezzanine;
    const newMez = await tx.productMezzanine.create({
      data: {
        productId: newProduct.id,
        height: mez.height,
        bodyMaterialId: mez.bodyMaterialId,
        sectionsEnabled: mez.sectionsEnabled,
        backWallEnabled: mez.backWallEnabled,
        backWallMaterialId: mez.backWallMaterialId,
        partitionsEnabled: mez.partitionsEnabled,
        shelvesEnabled: mez.shelvesEnabled,
        facadesEnabled: mez.facadesEnabled,
        falseFacadesEnabled: mez.falseFacadesEnabled,
        falseFacadeQty: mez.falseFacadeQty,
        falseFacadeMaterialId: mez.falseFacadeMaterialId,
        drawersEnabled: mez.drawersEnabled,
      },
    });
    mezzanineIdMap[mez.id] = newMez.id;
  }

  // 3. Sections
  for (const s of src.sections) {
    await tx.productSection.create({
      data: {
        productId: newProduct.id,
        mezzanineId: s.mezzanineId ? mezzanineIdMap[s.mezzanineId] : null,
        qty: s.qty,
      },
    });
  }

  // 4. Partitions
  for (const p of src.partitions) {
    await tx.productPartition.create({
      data: {
        productId: newProduct.id,
        mezzanineId: p.mezzanineId ? mezzanineIdMap[p.mezzanineId] : null,
        height: p.height,
        qty: p.qty,
      },
    });
  }

  // 5. Shelves
  for (const sh of src.shelves) {
    await tx.productShelf.create({
      data: {
        productId: newProduct.id,
        mezzanineId: sh.mezzanineId ? mezzanineIdMap[sh.mezzanineId] : null,
        width: sh.width,
        qty: sh.qty,
      },
    });
  }

  // 6. Facades
  for (const f of src.facades) {
    await tx.productFacade.create({
      data: {
        productId: newProduct.id,
        mezzanineId: f.mezzanineId ? mezzanineIdMap[f.mezzanineId] : null,
        materialId: f.materialId,
        isLdsp: f.isLdsp,
        width: f.width,
        height: f.height,
        qty: f.qty,
        handleQty: f.handleQty,
        openType: f.openType ?? undefined,
      },
    });
  }

  // 7. Drawers
  for (const d of src.drawers) {
    await tx.productDrawer.create({
      data: {
        productId: newProduct.id,
        mezzanineId: d.mezzanineId ? mezzanineIdMap[d.mezzanineId] : null,
        width: d.width,
        height: d.height,
        qty: d.qty,
        handleQty: d.handleQty,
        slideType: d.slideType ?? undefined,
      },
    });
  }

  // 8. Countertop
  if (src.countertop) {
    const ct = src.countertop;
    await tx.productCountertop.create({
      data: {
        productId: newProduct.id,
        materialId: ct.materialId,
        isLdsp: ct.isLdsp,
        width: ct.width,
        depth: ct.depth,
        apronEnabled: ct.apronEnabled,
        apronMaterialId: ct.apronMaterialId,
        apronIsLdsp: ct.apronIsLdsp,
        apronWidth: ct.apronWidth,
        apronHeight: ct.apronHeight,
      },
    });
  }

  // 9. Extras
  for (const e of src.extras) {
    await tx.productExtra.create({
      data: {
        productId: newProduct.id,
        name: e.name,
        price: e.price,
      },
    });
  }

  return newProduct.id;
}
