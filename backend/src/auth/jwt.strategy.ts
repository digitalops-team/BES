import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      // Extrae el JWT desde la cookie httpOnly O desde el header Authorization Bearer
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.['auth_token'] ?? null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || process.env.ENCRYPTION_KEY || '',
    });
  }

  async validate(payload: any) {
    return { id: payload.sub, email: payload.email, nombre: payload.nombre, rol: payload.rol };
  }
}

