-- DropForeignKey
ALTER TABLE "ProductDrawer" DROP CONSTRAINT IF EXISTS "ProductDrawer_mezzanineId_fkey";
ALTER TABLE "ProductFacade" DROP CONSTRAINT IF EXISTS "ProductFacade_mezzanineId_fkey";
ALTER TABLE "ProductPartition" DROP CONSTRAINT IF EXISTS "ProductPartition_mezzanineId_fkey";
ALTER TABLE "ProductSection" DROP CONSTRAINT IF EXISTS "ProductSection_mezzanineId_fkey";
ALTER TABLE "ProductShelf" DROP CONSTRAINT IF EXISTS "ProductShelf_mezzanineId_fkey";
ALTER TABLE "ProductMezzanine" DROP CONSTRAINT IF EXISTS "ProductMezzanine_productId_fkey";
ALTER TABLE "ProductMezzanine" DROP CONSTRAINT IF EXISTS "ProductMezzanine_bodyMaterialId_fkey";
ALTER TABLE "ProductMezzanine" DROP CONSTRAINT IF EXISTS "ProductMezzanine_backWallMaterialId_fkey";
ALTER TABLE "ProductMezzanine" DROP CONSTRAINT IF EXISTS "ProductMezzanine_falseFacadeMaterialId_fkey";
ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS "Product_bodyMaterialId_fkey";
ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS "Product_backWallMaterialId_fkey";
ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS "Product_falseFacadeMaterialId_fkey";
ALTER TABLE "ProductCountertop" DROP CONSTRAINT IF EXISTS "ProductCountertop_productId_fkey";
ALTER TABLE "ProductCountertop" DROP CONSTRAINT IF EXISTS "ProductCountertop_materialId_fkey";
ALTER TABLE "ProductCountertop" DROP CONSTRAINT IF EXISTS "ProductCountertop_apronMaterialId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "ProductCountertop_productId_key";
DROP INDEX IF EXISTS "ProductMezzanine_productId_key";
DROP INDEX IF EXISTS "ProductDrawer_mezzanineId_idx";
DROP INDEX IF EXISTS "ProductFacade_mezzanineId_idx";
DROP INDEX IF EXISTS "ProductPartition_mezzanineId_idx";
DROP INDEX IF EXISTS "ProductSection_mezzanineId_idx";
DROP INDEX IF EXISTS "ProductShelf_mezzanineId_idx";

-- DropTable
DROP TABLE IF EXISTS "ProductMezzanine";

-- AlterTable: Product — drop removed columns
ALTER TABLE "Product" DROP COLUMN IF EXISTS "width",
DROP COLUMN IF EXISTS "height",
DROP COLUMN IF EXISTS "depth",
DROP COLUMN IF EXISTS "bodyMaterialId",
DROP COLUMN IF EXISTS "backWallEnabled",
DROP COLUMN IF EXISTS "backWallMaterialId",
DROP COLUMN IF EXISTS "falseFacadeQty",
DROP COLUMN IF EXISTS "falseFacadeMaterialId",
DROP COLUMN IF EXISTS "mezzanineEnabled";

-- AlterTable: ProductSection — add new fields, drop mezzanineId
ALTER TABLE "ProductSection" DROP COLUMN IF EXISTS "mezzanineId";
ALTER TABLE "ProductSection" ADD COLUMN IF NOT EXISTS "width" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ProductSection" ADD COLUMN IF NOT EXISTS "height" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ProductSection" ADD COLUMN IF NOT EXISTS "depth" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ProductSection" ADD COLUMN IF NOT EXISTS "materialId" TEXT;
ALTER TABLE "ProductSection" ADD COLUMN IF NOT EXISTS "backWallEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ProductSection" ADD COLUMN IF NOT EXISTS "backWallMaterialId" TEXT;
ALTER TABLE "ProductSection" ALTER COLUMN "qty" SET DEFAULT 1;

-- AlterTable: ProductPartition — add depth + materialId, drop mezzanineId
ALTER TABLE "ProductPartition" DROP COLUMN IF EXISTS "mezzanineId";
ALTER TABLE "ProductPartition" ADD COLUMN IF NOT EXISTS "depth" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ProductPartition" ADD COLUMN IF NOT EXISTS "materialId" TEXT;
ALTER TABLE "ProductPartition" ALTER COLUMN "height" SET DEFAULT 0;

-- AlterTable: ProductShelf — add depth + materialId, drop mezzanineId
ALTER TABLE "ProductShelf" DROP COLUMN IF EXISTS "mezzanineId";
ALTER TABLE "ProductShelf" ADD COLUMN IF NOT EXISTS "depth" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ProductShelf" ADD COLUMN IF NOT EXISTS "materialId" TEXT;
ALTER TABLE "ProductShelf" ALTER COLUMN "width" SET DEFAULT 0;

-- AlterTable: ProductFacade — drop isLdsp + mezzanineId
ALTER TABLE "ProductFacade" DROP COLUMN IF EXISTS "isLdsp";
ALTER TABLE "ProductFacade" DROP COLUMN IF EXISTS "mezzanineId";
ALTER TABLE "ProductFacade" ALTER COLUMN "width" SET DEFAULT 0;
ALTER TABLE "ProductFacade" ALTER COLUMN "height" SET DEFAULT 0;

-- AlterTable: ProductDrawer — add depth + materialId, drop mezzanineId
ALTER TABLE "ProductDrawer" DROP COLUMN IF EXISTS "mezzanineId";
ALTER TABLE "ProductDrawer" ADD COLUMN IF NOT EXISTS "depth" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ProductDrawer" ADD COLUMN IF NOT EXISTS "materialId" TEXT;
ALTER TABLE "ProductDrawer" ALTER COLUMN "width" SET DEFAULT 0;
ALTER TABLE "ProductDrawer" ALTER COLUMN "height" SET DEFAULT 0;

-- AlterTable: ProductCountertop — 1:1 → 1:N, drop isLdsp + apronIsLdsp, materialId optional
ALTER TABLE "ProductCountertop" DROP COLUMN IF EXISTS "isLdsp";
ALTER TABLE "ProductCountertop" DROP COLUMN IF EXISTS "apronIsLdsp";
ALTER TABLE "ProductCountertop" ALTER COLUMN "materialId" DROP NOT NULL;

-- CreateTable: ProductFalseFacade
CREATE TABLE "ProductFalseFacade" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "height" INTEGER NOT NULL DEFAULT 0,
    "depth" INTEGER NOT NULL DEFAULT 0,
    "materialId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProductFalseFacade_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductFalseFacade_productId_idx" ON "ProductFalseFacade"("productId");
CREATE INDEX "ProductCountertop_productId_idx" ON "ProductCountertop"("productId");

-- AddForeignKey
ALTER TABLE "ProductSection" ADD CONSTRAINT "ProductSection_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProductSection" ADD CONSTRAINT "ProductSection_backWallMaterialId_fkey" FOREIGN KEY ("backWallMaterialId") REFERENCES "Material"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProductPartition" ADD CONSTRAINT "ProductPartition_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProductShelf" ADD CONSTRAINT "ProductShelf_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProductDrawer" ADD CONSTRAINT "ProductDrawer_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProductFalseFacade" ADD CONSTRAINT "ProductFalseFacade_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductFalseFacade" ADD CONSTRAINT "ProductFalseFacade_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProductCountertop" ADD CONSTRAINT "ProductCountertop_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductCountertop" ADD CONSTRAINT "ProductCountertop_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProductCountertop" ADD CONSTRAINT "ProductCountertop_apronMaterialId_fkey" FOREIGN KEY ("apronMaterialId") REFERENCES "Material"("id") ON DELETE SET NULL ON UPDATE CASCADE;


