import { Controller, Post, Param, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma.service';

@UseGuards(JwtAuthGuard)
@Controller('scraper')
export class ScraperController {
  constructor(
    @InjectQueue('sunat-scraper-queue') private scraperQueue: Queue,
    private prisma: PrismaService
  ) {}

  @Post('sync/:empresaId')
  async syncEmpresa(@Param('empresaId') empresaId: string, @Request() req: any) {
    const { id: callerId, rol } = req.user;
    let empresa: any = null;

    if (rol === 'SUPER_ADMIN' || rol === 'ADMIN') {
      // SUPER_ADMIN y ADMIN pueden sincronizar cualquier empresa del sistema
      empresa = await this.prisma.empresa.findFirst({
        where: { id: empresaId }
      });
    } else {
      // USUARIO_LOCAL: solo puede sincronizar las que tiene asignadas
      const asignacion = await this.prisma.empresaAsignacion.findFirst({
        where: { usuarioId: callerId, empresaId },
        include: { empresa: true }
      });
      if (asignacion) empresa = asignacion.empresa;
    }

    if (!empresa) {
      throw new ForbiddenException('Empresa no encontrada o no tienes permiso para sincronizarla');
    }

    // ownerUserId = quien recibe el email (SUPER_ADMIN dueño)
    // callerId    = quien recibe el WebSocket (el que hizo clic)
    await this.scraperQueue.add('scrape-sunat', {
      empresaId,
      usuarioId: empresa.usuarioId,  // para el email y logs
      callerUserId: callerId          // para el WebSocket de progreso
    }, { priority: 1 });

    return { message: 'Sincronización encolada', status: 'pending' };
  }

  @Post('sync-all')
  async syncAllEmpresas(@Request() req: any) {
    const { id: callerId, rol } = req.user;
    let empresas: any[] = [];

    if (rol === 'SUPER_ADMIN' || rol === 'ADMIN') {
      // SUPER_ADMIN y ADMIN sincronizan todas las empresas del sistema
      empresas = await this.prisma.empresa.findMany({
        select: { id: true, usuarioId: true }
      });
    } else {
      // USUARIO_LOCAL: solo las asignadas
      const asignaciones = await this.prisma.empresaAsignacion.findMany({
        where: { usuarioId: callerId },
        include: { empresa: { select: { id: true, usuarioId: true } } }
      });
      empresas = asignaciones.map(a => a.empresa);
    }

    if (!empresas || empresas.length === 0) {
      return { message: 'No hay empresas para sincronizar', count: 0 };
    }

    const jobs = empresas.map(empresa => ({
      name: 'scrape-sunat',
      data: {
        empresaId: empresa.id,
        usuarioId: empresa.usuarioId,   // para el email
        callerUserId: callerId           // para el WebSocket
      },
      opts: { priority: 2 }
    }));

    await this.scraperQueue.addBulk(jobs);

    return {
      message: 'Sincronización masiva encolada',
      count: empresas.length
    };
  }
}

