-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Department" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "icon" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "wallPageId" TEXT,
    CONSTRAINT "Department_wallPageId_fkey" FOREIGN KEY ("wallPageId") REFERENCES "Page" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Department" ("createdAt", "id", "name", "slug", "wallPageId") SELECT "createdAt", "id", "name", "slug", "wallPageId" FROM "Department";
DROP TABLE "Department";
ALTER TABLE "new_Department" RENAME TO "Department";
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");
CREATE UNIQUE INDEX "Department_slug_key" ON "Department"("slug");
CREATE UNIQUE INDEX "Department_wallPageId_key" ON "Department"("wallPageId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
