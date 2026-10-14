-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Page" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "icon" TEXT,
    "contentJson" TEXT NOT NULL DEFAULT '[]',
    "backgroundJson" TEXT,
    "searchText" TEXT NOT NULL DEFAULT '',
    "visibility" TEXT NOT NULL DEFAULT 'PRIVATE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "isWall" BOOLEAN NOT NULL DEFAULT false,
    "isCompanyWall" BOOLEAN NOT NULL DEFAULT false,
    "ownerId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Page_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Page_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Page_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Page" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Page" ("backgroundJson", "contentJson", "createdAt", "deletedAt", "departmentId", "icon", "id", "isCompanyWall", "isWall", "ownerId", "parentId", "title", "updatedAt", "version", "visibility") SELECT "backgroundJson", "contentJson", "createdAt", "deletedAt", "departmentId", "icon", "id", "isCompanyWall", "isWall", "ownerId", "parentId", "title", "updatedAt", "version", "visibility" FROM "Page";
DROP TABLE "Page";
ALTER TABLE "new_Page" RENAME TO "Page";
CREATE INDEX "Page_departmentId_visibility_deletedAt_idx" ON "Page"("departmentId", "visibility", "deletedAt");
CREATE INDEX "Page_ownerId_deletedAt_idx" ON "Page"("ownerId", "deletedAt");
CREATE INDEX "Page_parentId_idx" ON "Page"("parentId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
