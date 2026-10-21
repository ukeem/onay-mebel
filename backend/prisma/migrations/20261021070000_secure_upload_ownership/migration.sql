ALTER TABLE "User" ADD COLUMN "uploadBytes" BIGINT NOT NULL DEFAULT 0;

CREATE TABLE "Upload" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Upload_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UploadStorage" (
    "id" INTEGER NOT NULL,
    "usedBytes" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "UploadStorage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Upload_filename_key" ON "Upload"("filename");
CREATE UNIQUE INDEX "Upload_url_key" ON "Upload"("url");
CREATE INDEX "Upload_userId_idx" ON "Upload"("userId");

ALTER TABLE "Upload" ADD CONSTRAINT "Upload_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
