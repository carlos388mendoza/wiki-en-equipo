-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PageShareLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pageId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "permission" TEXT NOT NULL,
    "expiresAt" DATETIME,
    "revokedAt" DATETIME,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PageShareLink_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PageShareLink_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PageShareLink" ("createdAt", "expiresAt", "id", "pageId", "permission", "revokedAt", "tokenHash") SELECT "createdAt", "expiresAt", "id", "pageId", "permission", "revokedAt", "tokenHash" FROM "PageShareLink";
DROP TABLE "PageShareLink";
ALTER TABLE "new_PageShareLink" RENAME TO "PageShareLink";
CREATE UNIQUE INDEX "PageShareLink_tokenHash_key" ON "PageShareLink"("tokenHash");
CREATE INDEX "PageShareLink_pageId_revokedAt_idx" ON "PageShareLink"("pageId", "revokedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
