import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class NotificacionesService {
  constructor(private prisma: PrismaService) {}

  /** Obtiene los IDs de empresas visibles para el usuario según su rol */
  private async getEmpresaIds(usuarioId: string, rol: string): Promise<string[]> {
    if (rol === 'SUPER_ADMIN' || rol === 'ADMIN') {
      // SUPER_ADMIN y ADMIN ven notificaciones de TODAS las empresas del sistema
      const empresas = await this.prisma.empresa.findMany({ select: { id: true } });
      return empresas.map(e => e.id);
    }
    // USUARIO_LOCAL: solo las empresas asignadas a él
    const asignaciones = await this.prisma.empresaAsignacion.findMany({
      where: { usuarioId },
      select: { empresaId: true }
    });
    return asignaciones.map(a => a.empresaId);
  }

  /** BANDEJA: notificaciones que este usuario AÚN NO ha leído */
  async findBandejaByUser(usuarioId: string, rol: string) {
    const empresaIds = await this.getEmpresaIds(usuarioId, rol);
    if (empresaIds.length === 0) return [];

    return this.prisma.notificacion.findMany({
      where: {
        empresaId: { in: empresaIds },
        lecturas: { none: { usuarioId } }  // Sin lectura para este usuario
      },
      include: {
        empresa: { select: { id: true, razonSocial: true, ruc: true } }
      },
      orderBy: { fechaMensaje: 'desc' }
    });
  }

  /** ARCHIVO: notificaciones que este usuario YA leyó */
  async findArchivoByUser(usuarioId: string, rol: string) {
    const empresaIds = await this.getEmpresaIds(usuarioId, rol);
    if (empresaIds.length === 0) return [];

    return this.prisma.notificacion.findMany({
      where: {
        empresaId: { in: empresaIds },
        lecturas: { some: { usuarioId } }  // Con lectura de este usuario
      },
      include: {
        empresa: { select: { id: true, razonSocial: true, ruc: true } }
      },
      orderBy: { fechaMensaje: 'desc' }
    });
  }

  /** Marca una notificación como leída SOLO para este usuario (no afecta a otros) */
  async markAsRead(notificacionId: string, usuarioId: string) {
    return this.prisma.notificacionLectura.upsert({
      where: { notificacionId_usuarioId: { notificacionId, usuarioId } },
      create: { notificacionId, usuarioId },
      update: {}  // Si ya existe, no hacer nada
    });
  }

  /** Marca TODAS las notificaciones de bandeja como leídas para este usuario */
  async markAllAsRead(usuarioId: string, rol: string) {
    const empresaIds = await this.getEmpresaIds(usuarioId, rol);
    if (empresaIds.length === 0) return { count: 0 };

    // Obtener todas las notificaciones sin leer por este usuario
    const sinLeer = await this.prisma.notificacion.findMany({
      where: {
        empresaId: { in: empresaIds },
        lecturas: { none: { usuarioId } }
      },
      select: { id: true }
    });

    // Crear lecturas para todas
    const lecturas = sinLeer.map(n => ({ notificacionId: n.id, usuarioId }));
    await this.prisma.notificacionLectura.createMany({
      data: lecturas,
      skipDuplicates: true
    });

    return { count: lecturas.length };
  }

  /** Solo SUPER_ADMIN/ADMIN pueden eliminar notificaciones permanentemente */
  async removeAllByUser(usuarioId: string, rol: string) {
    const empresaIds = await this.getEmpresaIds(usuarioId, rol);
    if (empresaIds.length === 0) return { count: 0 };

    return this.prisma.notificacion.deleteMany({
      where: { empresaId: { in: empresaIds } }
    });
  }
}

