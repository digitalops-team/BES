import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { EncryptionService } from '../encryption/encryption.service';

@Injectable()
export class EmpresasService {
  constructor(
    private prisma: PrismaService,
    private encryptionService: EncryptionService,
  ) {}

  async create(createEmpresaDto: any, usuarioId: string) {
    const ruc = String(createEmpresaDto.ruc || '').trim();
    const razonSocial = String(createEmpresaDto.razonSocial || '').trim();
    const usuarioSol = String(createEmpresaDto.usuarioSol || '').trim();
    const claveSol = String(createEmpresaDto.claveSol || '').trim();

    if (!ruc || !razonSocial || !usuarioSol || !claveSol) {
      throw new BadRequestException(
        'Todos los campos (RUC, Razón Social, Usuario SOL y Clave SOL) son obligatorios.',
      );
    }

    const existing = await this.prisma.empresa.findFirst({
      where: { ruc, usuarioId },
    });

    if (existing) {
      throw new ConflictException(
        `La empresa con RUC ${ruc} ya está registrada.`,
      );
    }

    const claveEncriptada = this.encryptionService.encrypt(claveSol);
    return this.prisma.empresa.create({
      data: {
        ruc,
        razonSocial,
        usuarioSol,
        claveSol: claveEncriptada,
        usuarioId: usuarioId,
      },
    });
  }

  async findAllByUser(usuarioId: string, userRol: string) {
    const anoActual = new Date().getFullYear();
    const inicioAnio = new Date(`${anoActual}-01-01T00:00:00.000Z`);
    const finAnio = new Date(`${anoActual}-12-31T23:59:59.999Z`);

    // ADMIN y SUPER_ADMIN ven TODAS las empresas con asignaciones completas
    if (userRol === 'SUPER_ADMIN' || userRol === 'ADMIN') {
      const whereClause = userRol === 'SUPER_ADMIN' ? { usuarioId } : {};

      const empresas = await this.prisma.empresa.findMany({
        where: whereClause,
        select: {
          id: true,
          ruc: true,
          razonSocial: true,
          usuarioSol: true,
          claveSol: true,
          estadoConexion: true,
          estadoSincro: true,
          ultimaSincronizacion: true,
          createdAt: true,
          _count: {
            select: {
              notificaciones: {
                where: { fechaMensaje: { gte: inicioAnio, lte: finAnio } },
              },
            },
          },
          asignaciones: {
            include: {
              usuario: {
                select: { id: true, nombre: true, email: true },
              },
            },
          },
        },
        orderBy: { razonSocial: 'asc' },
      });

      return empresas.map((emp) => {
        let claveSolDecrypted = '';
        try {
          claveSolDecrypted = this.encryptionService.decrypt(emp.claveSol);
        } catch (e) {
          claveSolDecrypted = '[Error al desencriptar]';
        }
        return {
          ...emp,
          claveSol: claveSolDecrypted,
        };
      });
    }

    // Usuarios secundarios: solo ven sus empresas asignadas
    const asignaciones = await this.prisma.empresaAsignacion.findMany({
      where: { usuarioId },
      select: { empresaId: true },
    });
    const empresaIds = asignaciones.map((a) => a.empresaId);
    if (empresaIds.length === 0) return [];

    return this.prisma.empresa.findMany({
      where: { id: { in: empresaIds } },
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
              where: { fechaMensaje: { gte: inicioAnio, lte: finAnio } },
            },
          },
        },
      },
      orderBy: { razonSocial: 'asc' },
    });
  }

  findOne(id: string, usuarioId: string) {
    return this.prisma.empresa.findFirst({
      where: { id, usuarioId },
    });
  }

  async update(id: string, updateEmpresaDto: any, usuarioId: string) {
    const dataToUpdate: any = { ...updateEmpresaDto };
    if (updateEmpresaDto.claveSol) {
      dataToUpdate.claveSol = this.encryptionService.encrypt(
        updateEmpresaDto.claveSol,
      );
    }
    return this.prisma.empresa.updateMany({
      where: { id, usuarioId },
      data: dataToUpdate,
    });
  }

  async remove(id: string, usuarioId: string) {
    await this.prisma.notificacion.deleteMany({ where: { empresaId: id } });
    await this.prisma.empresaAsignacion.deleteMany({
      where: { empresaId: id },
    });
    return this.prisma.empresa.deleteMany({ where: { id, usuarioId } });
  }

  /**
   * Resetea empresas atascadas en SYNCING por más de 10 minutos.
   * Necesario cuando Render se duerme y los jobs de BullMQ quedan huérfanos.
   */
  async resetStuckSync() {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const result = await this.prisma.empresa.updateMany({
      where: {
        estadoSincro: 'SYNCING',
        updatedAt: { lt: tenMinutesAgo },
      },
      data: { estadoSincro: 'IDLE' },
    });
    return { reset: result.count };
  }
}
