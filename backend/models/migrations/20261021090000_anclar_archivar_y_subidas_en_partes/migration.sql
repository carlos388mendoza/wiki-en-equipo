-- Anclar (por persona) y archivar páginas, y subidas de archivos en partes. Solo agrega: no borra ni cambia datos.
-- AlterTable
ALTER TABLE "Page" ADD COLUMN "archivedAt" DATETIME;

-- CreateTable
CREATE TABLE "FileBlobPart" (
    "storageName" TEXT NOT NULL,
    "part" INTEGER NOT NULL,
    "data" BLOB NOT NULL,

    PRIMARY KEY ("storageName", "part"),
    CONSTRAINT "FileBlobPart_storageName_fkey" FOREIGN KEY ("storageName") REFERENCES "FileAsset" ("storageName") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FileUpload" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "partCount" INTEGER NOT NULL,
    "pageId" TEXT,
    "templateId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "FileUploadPart" (
    "uploadId" TEXT NOT NULL,
    "part" INTEGER NOT NULL,
    "data" BLOB NOT NULL,

    PRIMARY KEY ("uploadId", "part"),
    CONSTRAINT "FileUploadPart_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "FileUpload" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PagePin" (
    "userId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("userId", "pageId"),
    CONSTRAINT "PagePin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PagePin_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "FileUpload_ownerId_idx" ON "FileUpload"("ownerId");

-- CreateIndex
CREATE INDEX "FileUpload_createdAt_idx" ON "FileUpload"("createdAt");

-- CreateIndex
CREATE INDEX "PagePin_pageId_idx" ON "PagePin"("pageId");

