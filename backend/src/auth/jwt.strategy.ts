import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.['auth_token'] ?? null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || process.env.ENCRYPTION_KEY || '',
    });
  }

  async validate(payload: any) {
    const fullName = payload.nombres && payload.apellidos 
      ? `${payload.nombres} ${payload.apellidos}`.trim() 
      : payload.nombre || '';

    return {
      id: payload.sub,
      email: payload.email,
      nombres: payload.nombres,
      apellidos: payload.apellidos,
      nombre: fullName,
      dni: payload.dni,
      rol: payload.rol,
      telegramChatId: payload.telegramChatId,
    };
  }
}
