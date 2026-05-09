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

  @Post('sync-all')
  async syncAllEmpresas(@Request() req: any) {
    const { id: usuarioId, rol } = req.user;
    let empresas: any[] = [];

    if (rol === 'SUPER_ADMIN') {
      // SUPER_ADMIN sincroniza todas sus empresas
      empresas = await this.prisma.empresa.findMany({
        where: { usuarioId },
        select: { id: true, usuarioId: true }
      });
    } else {
      // Usuarios secundarios: sincronizar solo las empresas asignadas
      const asignaciones = await this.prisma.empresaAsignacion.findMany({
        where: { usuarioId },
        include: { empresa: { select: { id: true, usuarioId: true } } }
      });
      empresas = asignaciones.map(a => a.empresa);
    }

    if (!empresas || empresas.length === 0) {
      return { message: 'No hay empresas para sincronizar', count: 0 };
    }

    // Encolar cada empresa en BullMQ
    const jobs = empresas.map(empresa => ({
      name: 'scrape-sunat',
      data: { empresaId: empresa.id, usuarioId: empresa.usuarioId },
      opts: { priority: 2 } // Prioridad normal para la sincronización masiva
    }));

    // Usamos addBulk para mayor eficiencia al encolar múltiples trabajos
    await this.scraperQueue.addBulk(jobs);

    return { 
      message: 'Sincronización masiva encolada', 
      count: empresas.length 
    };
  }
}
