import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class NotificacionesService {
  constructor(private prisma: PrismaService) {}

  async findAllByUser(usuarioId: string, userRol: string) {
    let empresaIds: string[];

    if (userRol === 'SUPER_ADMIN') {
      // SUPER_ADMIN ve notificaciones de todas sus empresas
      const empresas = await this.prisma.empresa.findMany({
        where: { usuarioId },
        select: { id: true }
      });
      empresaIds = empresas.map(e => e.id);
    } else {
      // Usuarios secundarios ven solo sus empresas asignadas
      const asignaciones = await this.prisma.empresaAsignacion.findMany({
        where: { usuarioId },
        select: { empresaId: true }
      });
      empresaIds = asignaciones.map(a => a.empresaId);
    }

    if (empresaIds.length === 0) return [];

    return this.prisma.notificacion.findMany({
      where: { empresaId: { in: empresaIds } },
      include: {
        empresa: { select: { razonSocial: true, ruc: true } }
      },
      orderBy: { fechaMensaje: 'desc' }
    });
  }

  markAsRead(id: string) {
    return this.prisma.notificacion.update({
      where: { id },
      data: { estado: 'LEIDO' }
    });
  }

  async removeAllByUser(usuarioId: string, userRol: string) {
    let empresaIds: string[];

    if (userRol === 'SUPER_ADMIN') {
      const empresas = await this.prisma.empresa.findMany({
        where: { usuarioId },
        select: { id: true }
      });
      empresaIds = empresas.map(e => e.id);
    } else {
      const asignaciones = await this.prisma.empresaAsignacion.findMany({
        where: { usuarioId },
        select: { empresaId: true }
      });
      empresaIds = asignaciones.map(a => a.empresaId);
    }

    if (empresaIds.length === 0) return { count: 0 };

    return this.prisma.notificacion.deleteMany({
      where: { empresaId: { in: empresaIds } }
    });
  }
}
