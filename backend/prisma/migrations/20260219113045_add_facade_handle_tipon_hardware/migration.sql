-- AlterTable
ALTER TABLE "ProductCountertop" ALTER COLUMN "width" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "ProductFacade" ADD COLUMN     "handleHardwareId" TEXT,
ADD COLUMN     "tipOnHardwareId" TEXT;

-- AddForeignKey
ALTER TABLE "ProductFacade" ADD CONSTRAINT "ProductFacade_handleHardwareId_fkey" FOREIGN KEY ("handleHardwareId") REFERENCES "Hardware"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductFacade" ADD CONSTRAINT "ProductFacade_tipOnHardwareId_fkey" FOREIGN KEY ("tipOnHardwareId") REFERENCES "Hardware"("id") ON DELETE SET NULL ON UPDATE CASCADE;
