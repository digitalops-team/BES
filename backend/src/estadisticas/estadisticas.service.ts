import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class EstadisticasService {
  constructor(private prisma: PrismaService) {}

  private isUrgentAsunto(asunto: string): boolean {
    const a = asunto.toLowerCase();
    return (
      a.includes('orden de pago') ||
      a.includes('coactiv') ||
      a.includes('esquela') ||
      a.includes('embargo') ||
      a.includes('conclusi')
    );
  }

  async getStats(usuarioId: string, userRol: string) {
    let empresaIds: string[];

    if (userRol === 'SUPER_ADMIN' || userRol === 'ADMIN') {
      const empresas = await this.prisma.empresa.findMany({
        select: { id: true },
      });
      empresaIds = empresas.map((e) => e.id);
    } else {
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
        totalPeligrosas: 0,
        totalNormales: 0,
        rankingEmpresas: [],
        sincroPorDia: [],
        historicoMensual: [],
      };
    }

    const [totalEmpresas, notificacionesAll, sinPdf, rankingRaw] =
      await Promise.all([
        this.prisma.empresa.count({ where: { id: { in: empresaIds } } }),
        this.prisma.notificacion.findMany({
          where: { empresaId: { in: empresaIds } },
          select: { id: true, asunto: true, createdAt: true, fechaMensaje: true },
        }),
        this.prisma.notificacion.count({
          where: { empresaId: { in: empresaIds }, estado: 'SIN_PDF' },
        }),
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

    const totalNotificaciones = notificacionesAll.length;
    let totalPeligrosas = 0;
    let totalNormales = 0;

    for (const n of notificacionesAll) {
      if (this.isUrgentAsunto(n.asunto)) {
        totalPeligrosas++;
      } else {
        totalNormales++;
      }
    }

    const sinLeer = await this.prisma.notificacion.count({
      where: {
        empresaId: { in: empresaIds },
        lecturas: { none: { usuarioId } },
      },
    });

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

    // Actividad últimos 7 días con desglose Peligrosas vs Normales
    const hace7dias = new Date();
    hace7dias.setDate(hace7dias.getDate() - 6);
    hace7dias.setHours(0, 0, 0, 0);

    const sincroPorDia: {
      fecha: string;
      cantidad: number;
      peligrosas: number;
      normales: number;
    }[] = [];

    for (let i = 6; i >= 0; i--) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - i);
      const fechaStr = fecha.toISOString().split('T')[0];

      const notifsDia = notificacionesAll.filter((n) => {
        const dStr = (n.fechaMensaje || n.createdAt).toISOString().split('T')[0];
        return dStr === fechaStr;
      });

      let peligrosas = 0;
      let normales = 0;

      for (const nd of notifsDia) {
        if (this.isUrgentAsunto(nd.asunto)) peligrosas++;
        else normales++;
      }

      sincroPorDia.push({
        fecha: fechaStr,
        cantidad: notifsDia.length,
        peligrosas,
        normales,
      });
    }

    // Histórico Mensual completo (agrupado por YYYY-MM)
    const mesNombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];
    const mapMeses = new Map<string, { mesKey: string; mesNombre: string; cantidad: number; peligrosas: number; normales: number }>();

    for (const n of notificacionesAll) {
      const d = n.fechaMensaje || n.createdAt;
      const year = d.getFullYear();
      const monthIdx = d.getMonth();
      const mesKey = `${year}-${String(monthIdx + 1).padStart(2, '0')}`;
      const mesNombre = `${mesNombres[monthIdx]} ${year}`;

      if (!mapMeses.has(mesKey)) {
        mapMeses.set(mesKey, { mesKey, mesNombre, cantidad: 0, peligrosas: 0, normales: 0 });
      }

      const item = mapMeses.get(mesKey)!;
      item.cantidad++;
      if (this.isUrgentAsunto(n.asunto)) {
        item.peligrosas++;
      } else {
        item.normales++;
      }
    }

    const historicoMensual = Array.from(mapMeses.values()).sort((a, b) => a.mesKey.localeCompare(b.mesKey));

    return {
      totalEmpresas,
      totalNotificaciones,
      sinLeer,
      sinPdf,
      totalPeligrosas,
      totalNormales,
      rankingEmpresas,
      sincroPorDia,
      historicoMensual,
    };
  }
}
