-- CreateTable
CREATE TABLE "FileBlob" (
    "storageName" TEXT NOT NULL PRIMARY KEY,
    "data" BLOB NOT NULL,
    CONSTRAINT "FileBlob_storageName_fkey" FOREIGN KEY ("storageName") REFERENCES "FileAsset" ("storageName") ON DELETE CASCADE ON UPDATE CASCADE
);

