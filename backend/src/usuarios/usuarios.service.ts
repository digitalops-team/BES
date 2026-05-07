import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsuariosService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.usuario.findMany({
      select: { id: true, email: true, nombre: true, rol: true, createdAt: true },
      orderBy: { createdAt: 'asc' }
    });
  }

  async create(data: { email: string; password: string; nombre: string; rol: string }) {
    const exists = await this.prisma.usuario.findUnique({ where: { email: data.email } });
    if (exists) throw new ConflictException('El correo ya está registrado');

    const hashedPassword = await bcrypt.hash(data.password, 10);
    return this.prisma.usuario.create({
      data: { email: data.email, password: hashedPassword, nombre: data.nombre, rol: data.rol as any },
      select: { id: true, email: true, nombre: true, rol: true, createdAt: true }
    });
  }

  async update(id: string, data: { nombre?: string; email?: string; password?: string }) {
    const updateData: any = {};
    if (data.nombre)  updateData.nombre = data.nombre;
    if (data.email)   updateData.email  = data.email;
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
    if (user.rol === 'SUPER_ADMIN') throw new ConflictException('No se puede eliminar al Super Admin');
    return this.prisma.usuario.delete({ where: { id } });
  }
}
