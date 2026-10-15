-- CreateIndex
CREATE INDEX "PageVisit_pageId_userId_visitedAt_idx" ON "PageVisit"("pageId", "userId", "visitedAt");
