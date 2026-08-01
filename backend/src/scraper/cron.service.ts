import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('sunat-scraper-queue') private readonly scraperQueue: Queue,
  ) {}

  // Se ejecuta 4 veces al día (6:00 AM, 12:00 PM, 6:00 PM y 10:00 PM hora Perú)
  @Cron('0 6,12,18,22 * * *')
  async handleDailyScraping() {
    this.logger.log('Iniciando encolamiento programado de sincronización masiva...');

    try {
      const empresas = await this.prisma.empresa.findMany({
        where: { activo: true },
        select: { id: true, ruc: true, usuarioId: true },
      });

      this.logger.log(
        `Se encontraron ${empresas.length} empresas activas para procesar en el barrido programado.`,
      );

      if (empresas.length === 0) return;

      // Delay escalonado: 30 segundos entre cada empresa para no saturar la red ni SUNAT
      const DELAY_ENTRE_EMPRESAS_MS = 30 * 1000; // 30 segundos

      for (let i = 0; i < empresas.length; i++) {
        const empresa = empresas[i];
        const delayMs = i * DELAY_ENTRE_EMPRESAS_MS;

        await this.scraperQueue.add(
          'scrape-sunat',
          {
            empresaId: empresa.id,
            usuarioId: empresa.usuarioId,
          },
          {
            jobId: `scheduled-${empresa.id}-${Date.now()}`,
            delay: delayMs, // Escalonado: 0s, 30s, 60s...
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 1000 * 60 * 5, // 5 minutos entre reintentos
            },
          },
        );
        this.logger.log(`Tarea programada encolada para RUC: ${empresa.ruc} (inicia en ${delayMs / 1000}s)`);
      }
    } catch (error) {
      this.logger.error('Error al encolar tareas programadas:', error);
    }
  }
}
