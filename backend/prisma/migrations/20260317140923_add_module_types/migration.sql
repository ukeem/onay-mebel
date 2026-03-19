-- CreateEnum
CREATE TYPE "ModuleType" AS ENUM ('SECTION', 'BACK_WALL', 'PARTITION', 'SHELF', 'FACADE', 'DRAWER', 'FALSE_FACADE', 'COUNTERTOP');

-- AlterTable
ALTER TABLE "Material" ADD COLUMN     "moduleTypes" "ModuleType"[] DEFAULT ARRAY[]::"ModuleType"[];

-- AlterTable
ALTER TABLE "UserMaterial" ADD COLUMN     "moduleTypes" "ModuleType"[] DEFAULT ARRAY[]::"ModuleType"[];
