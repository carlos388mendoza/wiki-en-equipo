-- CreateTable
CREATE TABLE "TemplateShare" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "permission" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TemplateShare_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TemplateShare_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TemplateShareLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "permission" TEXT NOT NULL,
    "expiresAt" DATETIME,
    "revokedAt" DATETIME,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TemplateShareLink_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TemplateShareLink_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_FileAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storageName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "ownerId" TEXT NOT NULL,
    "pageId" TEXT,
    "templateId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FileAsset_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "FileAsset_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "FileAsset_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_FileAsset" ("createdAt", "id", "mimeType", "originalName", "ownerId", "pageId", "sizeBytes", "storageName") SELECT "createdAt", "id", "mimeType", "originalName", "ownerId", "pageId", "sizeBytes", "storageName" FROM "FileAsset";
DROP TABLE "FileAsset";
ALTER TABLE "new_FileAsset" RENAME TO "FileAsset";
CREATE UNIQUE INDEX "FileAsset_storageName_key" ON "FileAsset"("storageName");
CREATE INDEX "FileAsset_ownerId_createdAt_idx" ON "FileAsset"("ownerId", "createdAt");
CREATE INDEX "FileAsset_templateId_idx" ON "FileAsset"("templateId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "TemplateShare_userId_idx" ON "TemplateShare"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TemplateShare_templateId_userId_key" ON "TemplateShare"("templateId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "TemplateShareLink_tokenHash_key" ON "TemplateShareLink"("tokenHash");

-- CreateIndex
CREATE INDEX "TemplateShareLink_templateId_revokedAt_idx" ON "TemplateShareLink"("templateId", "revokedAt");
