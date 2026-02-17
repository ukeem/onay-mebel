-- CreateEnum
CREATE TYPE "FacadeOpenType" AS ENUM ('HANDLE', 'TIP_ON');

-- AlterTable
ALTER TABLE "ProductMezzanine" ADD COLUMN     "facadeOpenType" "FacadeOpenType" NOT NULL DEFAULT 'HANDLE';
