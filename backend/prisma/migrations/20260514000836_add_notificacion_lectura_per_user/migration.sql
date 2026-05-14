-- CreateTable
CREATE TABLE "NotificacionLectura" (
    "id" TEXT NOT NULL,
    "notificacionId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "creadoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificacionLectura_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NotificacionLectura_notificacionId_usuarioId_key" ON "NotificacionLectura"("notificacionId", "usuarioId");

-- AddForeignKey
ALTER TABLE "NotificacionLectura" ADD CONSTRAINT "NotificacionLectura_notificacionId_fkey" FOREIGN KEY ("notificacionId") REFERENCES "Notificacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificacionLectura" ADD CONSTRAINT "NotificacionLectura_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
