-- CreateTable
CREATE TABLE "EmpresaAsignacion" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmpresaAsignacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmpresaAsignacion_usuarioId_empresaId_key" ON "EmpresaAsignacion"("usuarioId", "empresaId");

-- AddForeignKey
ALTER TABLE "EmpresaAsignacion" ADD CONSTRAINT "EmpresaAsignacion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmpresaAsignacion" ADD CONSTRAINT "EmpresaAsignacion_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
