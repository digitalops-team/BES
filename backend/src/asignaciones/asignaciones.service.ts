import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AsignacionesService {
  constructor(private prisma: PrismaService) {}

  // Obtener todas las empresas del admin con flag de si están asignadas a un usuario
  async getEmpresasConAsignacion(adminId: string, usuarioId: string) {
    const todasEmpresas = await this.prisma.empresa.findMany({
      where: { usuarioId: adminId },
      select: { id: true, ruc: true, razonSocial: true, estadoSincro: true },
      orderBy: { razonSocial: 'asc' }
    });

    const asignadas = await this.prisma.empresaAsignacion.findMany({
      where: { usuarioId },
      select: { empresaId: true }
    });

    const asignadasSet = new Set(asignadas.map(a => a.empresaId));

    return todasEmpresas.map(emp => ({
      ...emp,
      asignada: asignadasSet.has(emp.id)
    }));
  }

  async asignar(usuarioId: string, empresaId: string) {
    return this.prisma.empresaAsignacion.create({
      data: { usuarioId, empresaId }
    });
  }

  async revocar(usuarioId: string, empresaId: string) {
    return this.prisma.empresaAsignacion.deleteMany({
      where: { usuarioId, empresaId }
    });
  }

  // Obtener IDs de empresas asignadas a un usuario (para filtros internos)
  async getEmpresaIdsAsignadas(usuarioId: string): Promise<string[]> {
    const asignaciones = await this.prisma.empresaAsignacion.findMany({
      where: { usuarioId },
      select: { empresaId: true }
    });
    return asignaciones.map(a => a.empresaId);
  }
}
