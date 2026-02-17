-- CreateIndex
CREATE INDEX "Hardware_hardwareTypeId_idx" ON "Hardware"("hardwareTypeId");

-- CreateIndex
CREATE INDEX "Material_materialTypeId_idx" ON "Material"("materialTypeId");

-- CreateIndex
CREATE INDEX "ProductDrawer_productId_idx" ON "ProductDrawer"("productId");

-- CreateIndex
CREATE INDEX "ProductDrawer_mezzanineId_idx" ON "ProductDrawer"("mezzanineId");

-- CreateIndex
CREATE INDEX "ProductExtra_productId_idx" ON "ProductExtra"("productId");

-- CreateIndex
CREATE INDEX "ProductFacade_productId_idx" ON "ProductFacade"("productId");

-- CreateIndex
CREATE INDEX "ProductFacade_mezzanineId_idx" ON "ProductFacade"("mezzanineId");

-- CreateIndex
CREATE INDEX "ProductPartition_productId_idx" ON "ProductPartition"("productId");

-- CreateIndex
CREATE INDEX "ProductPartition_mezzanineId_idx" ON "ProductPartition"("mezzanineId");

-- CreateIndex
CREATE INDEX "ProductSection_productId_idx" ON "ProductSection"("productId");

-- CreateIndex
CREATE INDEX "ProductSection_mezzanineId_idx" ON "ProductSection"("mezzanineId");

-- CreateIndex
CREATE INDEX "ProductShelf_productId_idx" ON "ProductShelf"("productId");

-- CreateIndex
CREATE INDEX "ProductShelf_mezzanineId_idx" ON "ProductShelf"("mezzanineId");
