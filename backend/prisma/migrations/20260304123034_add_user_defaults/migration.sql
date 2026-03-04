-- CreateTable
CREATE TABLE "UserDefaults" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sectionMaterialId" TEXT,
    "backWallMaterialId" TEXT,
    "facadeMaterialId" TEXT,
    "falseFacadeMaterialId" TEXT,
    "countertopMaterialId" TEXT,
    "hingeHardwareId" TEXT,
    "handleHardwareId" TEXT,
    "tipOnHardwareId" TEXT,
    "slideHardwareId" TEXT,
    "tandemHardwareId" TEXT,
    "holderHardwareId" TEXT,
    "legsHardwareId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserDefaults_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserDefaults_userId_key" ON "UserDefaults"("userId");

-- AddForeignKey
ALTER TABLE "UserDefaults" ADD CONSTRAINT "UserDefaults_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
