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
    const { id: usuarioId, rol } = req.user;
    let empresa: any = null;

    if (rol === 'SUPER_ADMIN') {
      // SUPER_ADMIN puede sincronizar cualquier empresa propia
      empresa = await this.prisma.empresa.findFirst({
        where: { id: empresaId, usuarioId }
      });
    } else {
      // Usuarios secundarios: verificar que la empresa esté asignada a ellos
      const asignacion = await this.prisma.empresaAsignacion.findFirst({
        where: { usuarioId, empresaId },
        include: { empresa: true }
      });
      if (asignacion) empresa = asignacion.empresa;
    }

    if (!empresa) {
      throw new ForbiddenException('Empresa no encontrada o no tienes permiso para sincronizarla');
    }

    // La tarea siempre corre con el ID del SUPER_ADMIN dueño de la empresa
    await this.scraperQueue.add('scrape-sunat', { empresaId, usuarioId: empresa.usuarioId }, {
      priority: 1
    });

    return { message: 'Sincronización encolada', status: 'pending' };
  }
}
