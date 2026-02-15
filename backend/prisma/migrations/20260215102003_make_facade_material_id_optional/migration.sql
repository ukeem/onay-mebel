-- DropForeignKey
ALTER TABLE "ProductFacade" DROP CONSTRAINT "ProductFacade_materialId_fkey";

-- AlterTable
ALTER TABLE "ProductFacade" ALTER COLUMN "materialId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Calculation_projectId_idx" ON "Calculation"("projectId");

-- CreateIndex
CREATE INDEX "Product_roomId_idx" ON "Product"("roomId");

-- CreateIndex
CREATE INDEX "Project_userId_idx" ON "Project"("userId");

-- CreateIndex
CREATE INDEX "Room_projectId_idx" ON "Room"("projectId");

-- AddForeignKey
ALTER TABLE "ProductFacade" ADD CONSTRAINT "ProductFacade_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE SET NULL ON UPDATE CASCADE;
