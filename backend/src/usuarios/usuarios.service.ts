import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsuariosService {
  constructor(private prisma: PrismaService) {}

  async findAll(callerRol: string) {
    const where = callerRol === 'SUPER_ADMIN'
      ? {} // SUPER_ADMIN ve todos excepto él mismo (se filtra en frontend)
      : { rol: { not: 'SUPER_ADMIN' as any } }; // ADMIN no ve al SUPER_ADMIN

    return this.prisma.usuario.findMany({
      where,
      select: { id: true, email: true, nombre: true, rol: true, createdAt: true },
      orderBy: { createdAt: 'asc' }
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.usuario.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        nombre: true,
        rol: true,
        createdAt: true,
        asignaciones: {
          include: {
            empresa: {
              select: {
                id: true,
                ruc: true,
                razonSocial: true,
                estadoConexion: true,
                estadoSincro: true,
                ultimaSincronizacion: true
              }
            }
          }
        }
      }
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async create(data: { email: string; password: string; nombre: string; rol: string }, callerRol: string) {
    // Nadie (ni ADMIN) puede crear un SUPER_ADMIN
    if (data.rol === 'SUPER_ADMIN') {
      throw new ForbiddenException('No se puede crear un usuario con rol Super Admin');
    }

    const exists = await this.prisma.usuario.findUnique({ where: { email: data.email } });
    if (exists) throw new ConflictException('El correo ya está registrado');

    const hashedPassword = await bcrypt.hash(data.password, 10);
    return this.prisma.usuario.create({
      data: { email: data.email, password: hashedPassword, nombre: data.nombre, rol: data.rol as any },
      select: { id: true, email: true, nombre: true, rol: true, createdAt: true }
    });
  }

  async update(id: string, data: { nombre?: string; email?: string; password?: string; rol?: string }) {
    const updateData: any = {};
    if (data.nombre)   updateData.nombre = data.nombre;
    if (data.email)    updateData.email  = data.email;
    if (data.rol)      updateData.rol    = data.rol;
    if (data.password) updateData.password = await bcrypt.hash(data.password, 10);

    return this.prisma.usuario.update({
      where: { id },
      data: updateData,
      select: { id: true, email: true, nombre: true, rol: true }
    });
  }

  async remove(id: string) {
    const user = await this.prisma.usuario.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (user.rol === 'SUPER_ADMIN') throw new ForbiddenException('No se puede eliminar al Super Admin');
    return this.prisma.usuario.delete({ where: { id } });
  }
}

