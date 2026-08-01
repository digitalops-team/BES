import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export interface CreateAuditDto {
  usuarioId?: string;
  accion: string;
  entidad?: string;
  entidadId?: string;
  detalles?: any;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(dto: CreateAuditDto) {
    try {
      const detallesString = dto.detalles
        ? typeof dto.detalles === 'string'
          ? dto.detalles
          : JSON.stringify(dto.detalles)
        : null;

      return await this.prisma.auditLog.create({
        data: {
          usuarioId: dto.usuarioId || null,
          accion: dto.accion,
          entidad: dto.entidad || null,
          entidadId: dto.entidadId || null,
          detalles: detallesString,
          ipAddress: dto.ipAddress || null,
          userAgent: dto.userAgent || null,
        },
      });
    } catch (error) {
      this.logger.error(`Error guardando log de auditoría: ${error.message}`);
    }
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    usuarioId?: string;
    accion?: string;
    entidad?: string;
    search?: string;
    desde?: string;
    hasta?: string;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.usuarioId) {
      where.usuarioId = query.usuarioId;
    }
    if (query.accion) {
      where.accion = { contains: query.accion, mode: 'insensitive' };
    }
    if (query.entidad) {
      where.entidad = query.entidad;
    }
    if (query.search) {
      where.OR = [
        { accion: { contains: query.search, mode: 'insensitive' } },
        { detalles: { contains: query.search, mode: 'insensitive' } },
        { entidad: { contains: query.search, mode: 'insensitive' } },
        { ipAddress: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.desde || query.hasta) {
      where.createdAt = {};
      if (query.desde) {
        where.createdAt.gte = new Date(query.desde);
      }
      if (query.hasta) {
        where.createdAt.lte = new Date(query.hasta);
      }
    }

    const [total, items] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          usuario: {
            select: {
              id: true,
              nombre: true,
              email: true,
              rol: true,
            },
          },
        },
      }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getAccionesUnicas() {
    const logs = await this.prisma.auditLog.findMany({
      distinct: ['accion'],
      select: { accion: true },
    });
    return logs.map((l) => l.accion);
  }
}
