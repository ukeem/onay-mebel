-- AlterTable
ALTER TABLE "UserHardware" ADD COLUMN     "enabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "UserMaterial" ADD COLUMN     "enabled" BOOLEAN NOT NULL DEFAULT true;
