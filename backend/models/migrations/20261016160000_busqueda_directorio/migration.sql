ALTER TABLE "User" ADD COLUMN "searchName" TEXT NOT NULL DEFAULT '';

UPDATE "User" SET "searchName" = lower("name");
UPDATE "User" SET "searchName" = replace("searchName", 'Á', 'a');
UPDATE "User" SET "searchName" = replace("searchName", 'á', 'a');
UPDATE "User" SET "searchName" = replace("searchName", 'É', 'e');
UPDATE "User" SET "searchName" = replace("searchName", 'é', 'e');
UPDATE "User" SET "searchName" = replace("searchName", 'Í', 'i');
UPDATE "User" SET "searchName" = replace("searchName", 'í', 'i');
UPDATE "User" SET "searchName" = replace("searchName", 'Ó', 'o');
UPDATE "User" SET "searchName" = replace("searchName", 'ó', 'o');
UPDATE "User" SET "searchName" = replace("searchName", 'Ú', 'u');
UPDATE "User" SET "searchName" = replace("searchName", 'ú', 'u');
UPDATE "User" SET "searchName" = replace("searchName", 'Ü', 'u');
UPDATE "User" SET "searchName" = replace("searchName", 'ü', 'u');
UPDATE "User" SET "searchName" = replace("searchName", 'Ñ', 'n');
UPDATE "User" SET "searchName" = replace("searchName", 'ñ', 'n');
