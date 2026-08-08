import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { AuditService } from '../audit/audit.service';
import { generateAutoEmail } from '../usuarios/usuarios.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private auditService: AuditService,
  ) {}

  async register(data: any) {
    const nombres = data.nombres || data.nombre || '';
    const apellidos = data.apellidos || '';
    const dni = data.dni || '';

    const email = data.email || (nombres && apellidos && dni ? generateAutoEmail(nombres, apellidos, dni) : '');

    const existingUser = await this.prisma.usuario.findFirst({
      where: {
        OR: [
          { email },
          ...(dni ? [{ dni }] : []),
        ],
      },
    });

    if (existingUser) {
      throw new ConflictException('El correo o DNI ya está registrado');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await this.prisma.usuario.create({
      data: {
        email,
        password: hashedPassword,
        nombres: nombres.trim(),
        apellidos: apellidos.trim(),
        dni: dni.trim(),
        telegramChatId: data.telegramChatId ? data.telegramChatId.trim() : null,
      },
    });

    const fullName = `${user.nombres} ${user.apellidos}`.trim();

    await this.auditService.log({
      usuarioId: user.id,
      accion: 'REGISTRO_USUARIO',
      entidad: 'Usuario',
      entidadId: user.id,
      detalles: { email: user.email, nombre: fullName, dni: user.dni },
    });

    const payload = {
      sub: user.id,
      email: user.email,
      nombres: user.nombres,
      apellidos: user.apellidos,
      nombre: fullName,
      dni: user.dni,
      rol: user.rol,
      telegramChatId: user.telegramChatId,
    };
    return {
      access_token: await this.jwtService.signAsync(payload),
      usuario: {
        id: user.id,
        email: user.email,
        nombres: user.nombres,
        apellidos: user.apellidos,
        nombre: fullName,
        dni: user.dni,
        rol: user.rol,
        telegramChatId: user.telegramChatId,
      },
    };
  }

  async login(data: any) {
    const user = await this.prisma.usuario.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    const isPasswordValid = await bcrypt.compare(data.password, user.password);

    if (!isPasswordValid) {
      await this.auditService.log({
        accion: 'LOGIN_FALLIDO',
        entidad: 'Usuario',
        detalles: { email: data.email, motivo: 'Contraseña incorrecta' },
      });
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    await this.auditService.log({
      usuarioId: user.id,
      accion: 'INICIO_SESION',
      entidad: 'Usuario',
      entidadId: user.id,
      detalles: { email: user.email },
    });

    const fullName = `${user.nombres} ${user.apellidos}`.trim();

    const payload = {
      sub: user.id,
      email: user.email,
      nombres: user.nombres,
      apellidos: user.apellidos,
      nombre: fullName,
      dni: user.dni,
      rol: user.rol,
      telegramChatId: user.telegramChatId,
    };
    return {
      access_token: await this.jwtService.signAsync(payload),
      usuario: {
        id: user.id,
        email: user.email,
        nombres: user.nombres,
        apellidos: user.apellidos,
        nombre: fullName,
        dni: user.dni,
        rol: user.rol,
        telegramChatId: user.telegramChatId,
      },
    };
  }
}
