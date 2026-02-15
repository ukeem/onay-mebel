-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER', 'ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "CalcType" AS ENUM ('SHEET', 'SQM', 'LM');

-- CreateEnum
CREATE TYPE "ProfitType" AS ENUM ('COEF', 'FIXED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "phone" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'INACTIVE',
    "activeUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmsCode" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmsCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoomType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HardwareType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HardwareType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Material" (
    "id" TEXT NOT NULL,
    "materialTypeId" TEXT NOT NULL,
    "brand" TEXT,
    "calcType" "CalcType" NOT NULL DEFAULT 'SHEET',
    "length" INTEGER NOT NULL DEFAULT 1,
    "width" INTEGER NOT NULL DEFAULT 1,
    "price" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hardware" (
    "id" TEXT NOT NULL,
    "hardwareTypeId" TEXT NOT NULL,
    "brand" TEXT,
    "price" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hardware_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceTemplate" (
    "id" TEXT NOT NULL,
    "sawingPrice" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "drillingPrice" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "edgeBandingPrice" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "technologistPercent" DECIMAL(65,30) NOT NULL DEFAULT 5,
    "designerPercent" DECIMAL(65,30) NOT NULL DEFAULT 5,
    "assemblyPercent" DECIMAL(65,30) NOT NULL DEFAULT 10,
    "deliveryPrice" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "profitType" "ProfitType" NOT NULL DEFAULT 'COEF',
    "profitValue" DECIMAL(65,30) NOT NULL DEFAULT 1.5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserMaterial" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "price" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserHardware" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hardwareId" TEXT NOT NULL,
    "price" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserHardware_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserService" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sawingPrice" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "drillingPrice" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "edgeBandingPrice" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "technologistPercent" DECIMAL(65,30) NOT NULL DEFAULT 5,
    "designerPercent" DECIMAL(65,30) NOT NULL DEFAULT 5,
    "assemblyPercent" DECIMAL(65,30) NOT NULL DEFAULT 10,
    "deliveryPrice" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "profitType" "ProfitType" NOT NULL DEFAULT 'COEF',
    "profitValue" DECIMAL(65,30) NOT NULL DEFAULT 1.5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "clientData" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "roomTypeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "productTypeId" TEXT NOT NULL,
    "width" INTEGER NOT NULL DEFAULT 0,
    "height" INTEGER NOT NULL DEFAULT 0,
    "depth" INTEGER NOT NULL DEFAULT 600,
    "bodyMaterialId" TEXT,
    "sectionsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "backWallEnabled" BOOLEAN NOT NULL DEFAULT false,
    "backWallMaterialId" TEXT,
    "partitionsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "shelvesEnabled" BOOLEAN NOT NULL DEFAULT false,
    "facadesEnabled" BOOLEAN NOT NULL DEFAULT false,
    "falseFacadesEnabled" BOOLEAN NOT NULL DEFAULT false,
    "falseFacadeQty" INTEGER NOT NULL DEFAULT 0,
    "falseFacadeMaterialId" TEXT,
    "drawersEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mezzanineEnabled" BOOLEAN NOT NULL DEFAULT false,
    "countertopEnabled" BOOLEAN NOT NULL DEFAULT false,
    "extrasEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSection" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "mezzanineId" TEXT,
    "qty" INTEGER NOT NULL DEFAULT 2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductPartition" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "mezzanineId" TEXT,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "height" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductPartition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductShelf" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "mezzanineId" TEXT,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "width" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductShelf_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductFacade" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "mezzanineId" TEXT,
    "materialId" TEXT NOT NULL,
    "isLdsp" BOOLEAN NOT NULL DEFAULT false,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "handleQty" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductFacade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductDrawer" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "mezzanineId" TEXT,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "handleQty" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductDrawer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductMezzanine" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "height" INTEGER NOT NULL,
    "sectionsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "backWallEnabled" BOOLEAN NOT NULL DEFAULT false,
    "backWallMaterialId" TEXT,
    "partitionsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "shelvesEnabled" BOOLEAN NOT NULL DEFAULT false,
    "facadesEnabled" BOOLEAN NOT NULL DEFAULT false,
    "falseFacadesEnabled" BOOLEAN NOT NULL DEFAULT false,
    "falseFacadeQty" INTEGER NOT NULL DEFAULT 0,
    "falseFacadeMaterialId" TEXT,
    "drawersEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductMezzanine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCountertop" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "isLdsp" BOOLEAN NOT NULL DEFAULT false,
    "width" INTEGER NOT NULL,
    "depth" INTEGER NOT NULL DEFAULT 600,
    "apronEnabled" BOOLEAN NOT NULL DEFAULT false,
    "apronMaterialId" TEXT,
    "apronIsLdsp" BOOLEAN NOT NULL DEFAULT false,
    "apronWidth" INTEGER,
    "apronHeight" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductCountertop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductExtra" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductExtra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Calculation" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Calculation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "UserMaterial_userId_materialId_key" ON "UserMaterial"("userId", "materialId");

-- CreateIndex
CREATE UNIQUE INDEX "UserHardware_userId_hardwareId_key" ON "UserHardware"("userId", "hardwareId");

-- CreateIndex
CREATE UNIQUE INDEX "UserService_userId_key" ON "UserService"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductMezzanine_productId_key" ON "ProductMezzanine"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCountertop_productId_key" ON "ProductCountertop"("productId");

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_materialTypeId_fkey" FOREIGN KEY ("materialTypeId") REFERENCES "MaterialType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hardware" ADD CONSTRAINT "Hardware_hardwareTypeId_fkey" FOREIGN KEY ("hardwareTypeId") REFERENCES "HardwareType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMaterial" ADD CONSTRAINT "UserMaterial_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMaterial" ADD CONSTRAINT "UserMaterial_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserHardware" ADD CONSTRAINT "UserHardware_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserHardware" ADD CONSTRAINT "UserHardware_hardwareId_fkey" FOREIGN KEY ("hardwareId") REFERENCES "Hardware"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserService" ADD CONSTRAINT "UserService_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "RoomType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_productTypeId_fkey" FOREIGN KEY ("productTypeId") REFERENCES "ProductType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_bodyMaterialId_fkey" FOREIGN KEY ("bodyMaterialId") REFERENCES "Material"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_backWallMaterialId_fkey" FOREIGN KEY ("backWallMaterialId") REFERENCES "Material"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_falseFacadeMaterialId_fkey" FOREIGN KEY ("falseFacadeMaterialId") REFERENCES "Material"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSection" ADD CONSTRAINT "ProductSection_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSection" ADD CONSTRAINT "ProductSection_mezzanineId_fkey" FOREIGN KEY ("mezzanineId") REFERENCES "ProductMezzanine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductPartition" ADD CONSTRAINT "ProductPartition_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductPartition" ADD CONSTRAINT "ProductPartition_mezzanineId_fkey" FOREIGN KEY ("mezzanineId") REFERENCES "ProductMezzanine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductShelf" ADD CONSTRAINT "ProductShelf_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductShelf" ADD CONSTRAINT "ProductShelf_mezzanineId_fkey" FOREIGN KEY ("mezzanineId") REFERENCES "ProductMezzanine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductFacade" ADD CONSTRAINT "ProductFacade_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductFacade" ADD CONSTRAINT "ProductFacade_mezzanineId_fkey" FOREIGN KEY ("mezzanineId") REFERENCES "ProductMezzanine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductFacade" ADD CONSTRAINT "ProductFacade_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductDrawer" ADD CONSTRAINT "ProductDrawer_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductDrawer" ADD CONSTRAINT "ProductDrawer_mezzanineId_fkey" FOREIGN KEY ("mezzanineId") REFERENCES "ProductMezzanine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductMezzanine" ADD CONSTRAINT "ProductMezzanine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductMezzanine" ADD CONSTRAINT "ProductMezzanine_backWallMaterialId_fkey" FOREIGN KEY ("backWallMaterialId") REFERENCES "Material"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductMezzanine" ADD CONSTRAINT "ProductMezzanine_falseFacadeMaterialId_fkey" FOREIGN KEY ("falseFacadeMaterialId") REFERENCES "Material"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCountertop" ADD CONSTRAINT "ProductCountertop_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCountertop" ADD CONSTRAINT "ProductCountertop_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCountertop" ADD CONSTRAINT "ProductCountertop_apronMaterialId_fkey" FOREIGN KEY ("apronMaterialId") REFERENCES "Material"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductExtra" ADD CONSTRAINT "ProductExtra_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Calculation" ADD CONSTRAINT "Calculation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
