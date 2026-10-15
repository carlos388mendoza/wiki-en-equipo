-- CreateTable
CREATE TABLE "PageCollabState" (
    "pageId" TEXT NOT NULL PRIMARY KEY,
    "state" BLOB NOT NULL,
    "pageVersion" INTEGER NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PageCollabState_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
