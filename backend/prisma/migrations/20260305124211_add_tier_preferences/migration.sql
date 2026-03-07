-- CreateEnum
CREATE TYPE "TierLevel" AS ENUM ('STANDARD', 'PREMIUM');

-- CreateTable
CREATE TABLE "TierPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tier" "TierLevel" NOT NULL,
    "materialTypeId" TEXT,
    "materialId" TEXT,
    "hardwareTypeId" TEXT,
    "hardwareId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TierPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TierPreference_userId_idx" ON "TierPreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TierPreference_userId_tier_materialTypeId_key" ON "TierPreference"("userId", "tier", "materialTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "TierPreference_userId_tier_hardwareTypeId_key" ON "TierPreference"("userId", "tier", "hardwareTypeId");

-- AddForeignKey
ALTER TABLE "TierPreference" ADD CONSTRAINT "TierPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TierPreference" ADD CONSTRAINT "TierPreference_materialTypeId_fkey" FOREIGN KEY ("materialTypeId") REFERENCES "MaterialType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TierPreference" ADD CONSTRAINT "TierPreference_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TierPreference" ADD CONSTRAINT "TierPreference_hardwareTypeId_fkey" FOREIGN KEY ("hardwareTypeId") REFERENCES "HardwareType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TierPreference" ADD CONSTRAINT "TierPreference_hardwareId_fkey" FOREIGN KEY ("hardwareId") REFERENCES "Hardware"("id") ON DELETE CASCADE ON UPDATE CASCADE;
