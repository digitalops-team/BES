import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PdfParserService } from '../scraper/pdf-parser.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class NotificacionesService implements OnModuleInit {
  private readonly logger = new Logger(NotificacionesService.name);

  constructor(
    private prisma: PrismaService,
    private pdfParserService: PdfParserService,
  ) {}

  async onModuleInit() {
    // Escaneo y retro-extracción automática de información financiera en PDFs existentes
    setTimeout(() => {
      this.backfillPdfData().catch((err) =>
        this.logger.error(`Error en backfill de PDFs: ${err?.message || err}`),
      );
    }, 3000);
  }

  async backfillPdfData() {
    this.logger.log('🔍 Iniciando verificación y retro-extracción de montos exigibles en PDFs...');
    const notifs = await this.prisma.notificacion.findMany({
      where: {
        rutaArchivoPdf: { not: null },
        OR: [{ montoExigible: null }, { expedienteCoactivo: null }],
      },
      select: { id: true, rutaArchivoPdf: true, asunto: true },
    });

    if (notifs.length === 0) {
      this.logger.log('✅ Todos los PDFs ya cuentan con información extraída.');
      return;
    }

    this.logger.log(`📄 Procesando ${notifs.length} notificación(es) pendientes...`);
    let updatedCount = 0;

    for (const notif of notifs) {
      if (!notif.rutaArchivoPdf) continue;
      const fileName = notif.rutaArchivoPdf.split('/uploads/').pop();
      if (!fileName) continue;

      const filePath = path.join(process.cwd(), 'uploads', fileName);
      if (fs.existsSync(filePath)) {
        const extracted = await this.pdfParserService.parsePdfFile(filePath);
        if (extracted.montoExigible || extracted.expedienteCoactivo) {
          await this.prisma.notificacion.update({
            where: { id: notif.id },
            data: {
              montoExigible: extracted.montoExigible,
              expedienteCoactivo: extracted.expedienteCoactivo,
            },
          });
          updatedCount++;
        }
      }
    }

    this.logger.log(`✅ Retro-extracción completada: ${updatedCount} notificación(es) actualizadas con montos de deuda.`);
  }

  /** Obtiene los IDs de empresas visibles para el usuario según su rol */
  private async getEmpresaIds(
    usuarioId: string,
    rol: string,
  ): Promise<string[]> {
    if (rol === 'SUPER_ADMIN' || rol === 'ADMIN') {
      const empresas = await this.prisma.empresa.findMany({
        select: { id: true },
      });
      return empresas.map((e) => e.id);
    }
    const asignaciones = await this.prisma.empresaAsignacion.findMany({
      where: { usuarioId },
      select: { empresaId: true },
    });
    return asignaciones.map((a) => a.empresaId);
  }

  /** BANDEJA: notificaciones que este usuario AÚN NO ha leído */
  async findBandejaByUser(usuarioId: string, rol: string) {
    const empresaIds = await this.getEmpresaIds(usuarioId, rol);
    if (empresaIds.length === 0) return [];

    return this.prisma.notificacion.findMany({
      where: {
        empresaId: { in: empresaIds },
        lecturas: { none: { usuarioId } },
      },
      include: {
        empresa: { select: { id: true, razonSocial: true, ruc: true } },
      },
      orderBy: { fechaMensaje: 'desc' },
    });
  }

  /** ARCHIVO: notificaciones que este usuario YA leyó */
  async findArchivoByUser(usuarioId: string, rol: string) {
    const empresaIds = await this.getEmpresaIds(usuarioId, rol);
    if (empresaIds.length === 0) return [];

    return this.prisma.notificacion.findMany({
      where: {
        empresaId: { in: empresaIds },
        lecturas: { some: { usuarioId } },
      },
      include: {
        empresa: { select: { id: true, razonSocial: true, ruc: true } },
      },
      orderBy: { fechaMensaje: 'desc' },
    });
  }

  /** Marca una notificación como leída SOLO para este usuario */
  async markAsRead(notificacionId: string, usuarioId: string) {
    return this.prisma.notificacionLectura.upsert({
      where: { notificacionId_usuarioId: { notificacionId, usuarioId } },
      create: { notificacionId, usuarioId },
      update: {},
    });
  }

  /** Marca TODAS las notificaciones de bandeja como leídas para este usuario */
  async markAllAsRead(usuarioId: string, rol: string) {
    const empresaIds = await this.getEmpresaIds(usuarioId, rol);
    if (empresaIds.length === 0) return { count: 0 };

    const sinLeer = await this.prisma.notificacion.findMany({
      where: {
        empresaId: { in: empresaIds },
        lecturas: { none: { usuarioId } },
      },
      select: { id: true },
    });

    const lecturas = sinLeer.map((n) => ({ notificacionId: n.id, usuarioId }));
    await this.prisma.notificacionLectura.createMany({
      data: lecturas,
      skipDuplicates: true,
    });

    return { count: lecturas.length };
  }

  private deletePdfFile(rutaArchivoPdf: string | null) {
    if (!rutaArchivoPdf) return;
    try {
      const fileName = rutaArchivoPdf.split('/uploads/').pop();
      if (!fileName) return;
      const filePath = path.join(process.cwd(), 'uploads', fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.error('Error eliminando PDF del disco:', err);
    }
  }

  async removeOne(id: string, usuarioId: string, rol: string) {
    if (rol !== 'SUPER_ADMIN' && rol !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo administradores pueden eliminar notificaciones',
      );
    }

    const notif = await this.prisma.notificacion.findUnique({ where: { id } });
    if (!notif) throw new NotFoundException('Notificación no encontrada');

    this.deletePdfFile(notif.rutaArchivoPdf);

    await this.prisma.notificacion.delete({ where: { id } });
    return { success: true };
  }

  async removeAllByUser(usuarioId: string, rol: string) {
    const empresaIds = await this.getEmpresaIds(usuarioId, rol);
    if (empresaIds.length === 0) return { count: 0 };

    const notifs = await this.prisma.notificacion.findMany({
      where: { empresaId: { in: empresaIds } },
      select: { rutaArchivoPdf: true },
    });

    notifs.forEach((n) => this.deletePdfFile(n.rutaArchivoPdf));

    return this.prisma.notificacion.deleteMany({
      where: { empresaId: { in: empresaIds } },
    });
  }

  async removeMany(ids: string[], usuarioId: string, rol: string) {
    if (rol !== 'SUPER_ADMIN' && rol !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo administradores pueden eliminar notificaciones',
      );
    }

    if (!ids || ids.length === 0) return { count: 0 };

    const notifs = await this.prisma.notificacion.findMany({
      where: { id: { in: ids } },
      select: { rutaArchivoPdf: true },
    });

    notifs.forEach((n) => this.deletePdfFile(n.rutaArchivoPdf));

    return this.prisma.notificacion.deleteMany({
      where: { id: { in: ids } },
    });
  }
}
