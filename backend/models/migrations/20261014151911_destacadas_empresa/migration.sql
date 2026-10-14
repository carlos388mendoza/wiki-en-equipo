-- CreateTable
CREATE TABLE "CompanyFeaturedPage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pageId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "CompanyFeaturedPage_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "CompanyFeaturedPage_pageId_key" ON "CompanyFeaturedPage"("pageId");

-- CreateIndex
CREATE INDEX "CompanyFeaturedPage_sortOrder_idx" ON "CompanyFeaturedPage"("sortOrder");
