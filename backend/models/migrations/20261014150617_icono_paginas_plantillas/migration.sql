-- AlterTable
ALTER TABLE "Page" ADD COLUMN "icon" TEXT;

-- AlterTable
ALTER TABLE "Template" ADD COLUMN "icon" TEXT;

-- El frontend guardaba el icono dentro de backgroundJson ({ ..., "icon": "..." }): se copia a la columna nueva.
UPDATE "Page" SET "icon" = json_extract("backgroundJson", '$.icon')
WHERE "backgroundJson" IS NOT NULL AND json_valid("backgroundJson") AND json_type("backgroundJson", '$.icon') = 'text'
  AND length(json_extract("backgroundJson", '$.icon')) BETWEEN 1 AND 48;

UPDATE "Template" SET "icon" = json_extract("backgroundJson", '$.icon')
WHERE "backgroundJson" IS NOT NULL AND json_valid("backgroundJson") AND json_type("backgroundJson", '$.icon') = 'text'
  AND length(json_extract("backgroundJson", '$.icon')) BETWEEN 1 AND 48;
