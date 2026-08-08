-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "nombres" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "apellidos" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "dni" TEXT NOT NULL DEFAULT '';

-- Populate default names if updating existing rows
UPDATE "Usuario" SET "nombres" = "nombre" WHERE "nombres" = '' AND "nombre" IS NOT NULL;
UPDATE "Usuario" SET "dni" = "id" WHERE "dni" = '';

-- Drop old column if exists
ALTER TABLE "Usuario" DROP COLUMN IF EXISTS "nombre";

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Usuario_dni_key" ON "Usuario"("dni");
