-- AlterTable
ALTER TABLE "Hardware" ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "Material" ADD COLUMN     "userId" TEXT;

-- CreateIndex
CREATE INDEX "Hardware_userId_idx" ON "Hardware"("userId");

-- CreateIndex
CREATE INDEX "Material_userId_idx" ON "Material"("userId");

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hardware" ADD CONSTRAINT "Hardware_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
