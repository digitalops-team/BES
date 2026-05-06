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
        usuarioId: usuarioId, // Relacionar con el usuario
      },
    });
  }

  findAllByUser(usuarioId: string) {
    return this.prisma.empresa.findMany({
      where: { usuarioId },
      select: {
        id: true,
        ruc: true,
        razonSocial: true,
        usuarioSol: true,
        estadoConexion: true,
        estadoSincro: true,
        ultimaSincronizacion: true,
        createdAt: true,
      } // Excluimos claveSol por seguridad
    });
  }

  findOne(id: string, usuarioId: string) {
    return this.prisma.empresa.findFirst({
      where: { id, usuarioId }
    });
  }

  async update(id: string, updateEmpresaDto: any, usuarioId: string) {
    const dataToUpdate: any = { ...updateEmpresaDto };
    
    // Si se envía una nueva clave, la encriptamos
    if (updateEmpresaDto.claveSol) {
      dataToUpdate.claveSol = this.encryptionService.encrypt(updateEmpresaDto.claveSol);
    }

    return this.prisma.empresa.updateMany({
      where: { id, usuarioId },
      data: dataToUpdate,
    });
  }

  async remove(id: string, usuarioId: string) {
    // 1. Eliminar en cascada todas las notificaciones asociadas a esta empresa
    await this.prisma.notificacion.deleteMany({
      where: { empresaId: id }
    });

    // 2. Solo borrar la empresa si pertenece al usuario
    return this.prisma.empresa.deleteMany({
      where: { id, usuarioId }
    });
  }
}
