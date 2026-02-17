/*
  Warnings:

  - You are about to drop the column `facadeOpenType` on the `ProductMezzanine` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "DrawerSlideType" AS ENUM ('GUIDE', 'TANDEM');

-- AlterTable
ALTER TABLE "ProductDrawer" ADD COLUMN     "slideType" "DrawerSlideType" NOT NULL DEFAULT 'GUIDE';

-- AlterTable
ALTER TABLE "ProductFacade" ADD COLUMN     "openType" "FacadeOpenType" NOT NULL DEFAULT 'HANDLE';

-- AlterTable
ALTER TABLE "ProductMezzanine" DROP COLUMN "facadeOpenType";
