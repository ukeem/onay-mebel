-- AlterTable
ALTER TABLE "ProductMezzanine" ADD COLUMN     "bodyMaterialId" TEXT;

-- AddForeignKey
ALTER TABLE "ProductMezzanine" ADD CONSTRAINT "ProductMezzanine_bodyMaterialId_fkey" FOREIGN KEY ("bodyMaterialId") REFERENCES "Material"("id") ON DELETE SET NULL ON UPDATE CASCADE;
