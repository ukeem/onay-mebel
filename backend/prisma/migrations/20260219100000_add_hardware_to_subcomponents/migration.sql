-- AlterTable: ProductSection — добавить ножки
ALTER TABLE "ProductSection" ADD COLUMN "legsEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ProductSection" ADD COLUMN "legsHardwareId" TEXT;

-- AlterTable: ProductFacade — добавить петли
ALTER TABLE "ProductFacade" ADD COLUMN "hingeHardwareId" TEXT;

-- AlterTable: ProductShelf — добавить полкодержатели
ALTER TABLE "ProductShelf" ADD COLUMN "holderHardwareId" TEXT;

-- AlterTable: ProductDrawer — добавить направляющие/тандем (фурнитура)
ALTER TABLE "ProductDrawer" ADD COLUMN "slideHardwareId" TEXT;

-- AddForeignKey
ALTER TABLE "ProductSection" ADD CONSTRAINT "ProductSection_legsHardwareId_fkey" FOREIGN KEY ("legsHardwareId") REFERENCES "Hardware"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductFacade" ADD CONSTRAINT "ProductFacade_hingeHardwareId_fkey" FOREIGN KEY ("hingeHardwareId") REFERENCES "Hardware"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductShelf" ADD CONSTRAINT "ProductShelf_holderHardwareId_fkey" FOREIGN KEY ("holderHardwareId") REFERENCES "Hardware"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductDrawer" ADD CONSTRAINT "ProductDrawer_slideHardwareId_fkey" FOREIGN KEY ("slideHardwareId") REFERENCES "Hardware"("id") ON DELETE SET NULL ON UPDATE CASCADE;
