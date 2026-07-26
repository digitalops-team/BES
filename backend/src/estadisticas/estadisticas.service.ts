import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class EstadisticasService {
  constructor(private prisma: PrismaService) {}

  async getStats(usuarioId: string, userRol: string) {
    let empresaIds: string[];

    if (userRol === 'SUPER_ADMIN' || userRol === 'ADMIN') {
      // SUPER_ADMIN y ADMIN ven estadísticas de TODAS las empresas del sistema
      const empresas = await this.prisma.empresa.findMany({
        select: { id: true },
      });
      empresaIds = empresas.map((e) => e.id);
    } else {
      // USUARIO_LOCAL: solo las empresas asignadas a él
      const asignaciones = await this.prisma.empresaAsignacion.findMany({
        where: { usuarioId },
        select: { empresaId: true },
      });
      empresaIds = asignaciones.map((a) => a.empresaId);
    }

    if (empresaIds.length === 0) {
      return {
        totalEmpresas: 0,
        totalNotificaciones: 0,
        sinLeer: 0,
        sinPdf: 0,
        rankingEmpresas: [],
        sincroPorDia: [],
      };
    }

    const [totalEmpresas, totalNotificaciones, sinPdf, rankingRaw] =
      await Promise.all([
        this.prisma.empresa.count({ where: { id: { in: empresaIds } } }),
        this.prisma.notificacion.count({
          where: { empresaId: { in: empresaIds } },
        }),
        this.prisma.notificacion.count({
          where: { empresaId: { in: empresaIds }, estado: 'SIN_PDF' },
        }),
        // Ranking: empresas con más problemas (SIN_PDF)
        this.prisma.empresa.findMany({
          where: { id: { in: empresaIds } },
          select: {
            id: true,
            ruc: true,
            razonSocial: true,
            estadoConexion: true,
            _count: { select: { notificaciones: true } },
            notificaciones: {
              where: { estado: 'SIN_PDF' },
              select: { id: true },
            },
          },
        }),
      ]);

    // sinLeer = notificaciones SIN lectura para este usuario (per-user)
    const sinLeer = await this.prisma.notificacion.count({
      where: {
        empresaId: { in: empresaIds },
        lecturas: { none: { usuarioId } },
      },
    });

    // Build ranking sorted by sinPdf count
    const rankingEmpresas = rankingRaw
      .map((e) => ({
        id: e.id,
        ruc: e.ruc,
        razonSocial: e.razonSocial,
        estadoConexion: e.estadoConexion,
        totalNotificaciones: e._count.notificaciones,
        sinPdf: e.notificaciones.length,
      }))
      .sort((a, b) => b.sinPdf - a.sinPdf)
      .slice(0, 10);

    // Actividad últimos 7 días
    const hace7dias = new Date();
    hace7dias.setDate(hace7dias.getDate() - 7);

    const notifUltimos7 = await this.prisma.notificacion.findMany({
      where: { empresaId: { in: empresaIds }, createdAt: { gte: hace7dias } },
      select: { createdAt: true },
    });

    const sincroPorDia: { fecha: string; cantidad: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - i);
      const fechaStr = fecha.toISOString().split('T')[0];
      const cantidad = notifUltimos7.filter(
        (n) => n.createdAt.toISOString().split('T')[0] === fechaStr,
      ).length;
      sincroPorDia.push({ fecha: fechaStr, cantidad });
    }

    return {
      totalEmpresas,
      totalNotificaciones,
      sinLeer,
      sinPdf,
      rankingEmpresas,
      sincroPorDia,
    };
  }
}
