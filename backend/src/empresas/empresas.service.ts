import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { EncryptionService } from '../encryption/encryption.service';

@Injectable()
export class EmpresasService {
  constructor(
    private prisma: PrismaService,
    private encryptionService: EncryptionService
  ) {}

  async create(createEmpresaDto: any, usuarioId: string) {
    const claveEncriptada = this.encryptionService.encrypt(createEmpresaDto.claveSol);
    return this.prisma.empresa.create({
      data: {
        ruc: createEmpresaDto.ruc,
        razonSocial: createEmpresaDto.razonSocial,
        usuarioSol: createEmpresaDto.usuarioSol,
        claveSol: claveEncriptada,
        usuarioId: usuarioId,
      },
    });
  }

  async findAllByUser(usuarioId: string, userRol: string) {
    const anoActual = new Date().getFullYear();
    const inicioAnio = new Date(`${anoActual}-01-01T00:00:00.000Z`);
    const finAnio    = new Date(`${anoActual}-12-31T23:59:59.999Z`);

    let whereClause: any;

    if (userRol === 'SUPER_ADMIN') {
      // SUPER_ADMIN ve todas las empresas que le pertenecen
      whereClause = { usuarioId };
    } else {
      // Usuarios secundarios ven solo sus asignadas
      const asignaciones = await this.prisma.empresaAsignacion.findMany({
        where: { usuarioId },
        select: { empresaId: true }
      });
      const empresaIds = asignaciones.map(a => a.empresaId);
      if (empresaIds.length === 0) return [];
      whereClause = { id: { in: empresaIds } };
    }

    return this.prisma.empresa.findMany({
      where: whereClause,
      select: {
        id: true,
        ruc: true,
        razonSocial: true,
        usuarioSol: true,
        estadoConexion: true,
        estadoSincro: true,
        ultimaSincronizacion: true,
        createdAt: true,
        _count: {
          select: {
            notificaciones: {
              where: { fechaMensaje: { gte: inicioAnio, lte: finAnio } }
            }
          }
        }
      },
      orderBy: { razonSocial: 'asc' }
    });
  }

  findOne(id: string, usuarioId: string) {
    return this.prisma.empresa.findFirst({
      where: { id, usuarioId }
    });
  }

  async update(id: string, updateEmpresaDto: any, usuarioId: string) {
    const dataToUpdate: any = { ...updateEmpresaDto };
    if (updateEmpresaDto.claveSol) {
      dataToUpdate.claveSol = this.encryptionService.encrypt(updateEmpresaDto.claveSol);
    }
    return this.prisma.empresa.updateMany({
      where: { id, usuarioId },
      data: dataToUpdate,
    });
  }

  async remove(id: string, usuarioId: string) {
    await this.prisma.notificacion.deleteMany({ where: { empresaId: id } });
    await this.prisma.empresaAsignacion.deleteMany({ where: { empresaId: id } });
    return this.prisma.empresa.deleteMany({ where: { id, usuarioId } });
  }
}
