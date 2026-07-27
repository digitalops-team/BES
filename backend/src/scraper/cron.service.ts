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

  // Se ejecuta todos los días a las 6:00 AM
  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async handleDailyScraping() {
    this.logger.log('Iniciando encolamiento diario de tareas de scraping...');

    try {
      const empresas = await this.prisma.empresa.findMany({
        select: { id: true, ruc: true },
      });

      this.logger.log(
        `Se encontraron ${empresas.length} empresas para procesar.`,
      );

      // Delay escalonado: 30 segundos entre cada empresa para no saturar internet
      const DELAY_ENTRE_EMPRESAS_MS = 30 * 1000; // 30 segundos

      for (let i = 0; i < empresas.length; i++) {
        const empresa = empresas[i];
        const delayMs = i * DELAY_ENTRE_EMPRESAS_MS;

        await this.scraperQueue.add(
          'scrapeBuzon',
          { empresaId: empresa.id },
          {
            jobId: `daily-${empresa.id}-${new Date().toISOString().split('T')[0]}`,
            delay: delayMs, // Empresa 0 arranca de inmediato, 1 a los 30s, 2 a los 60s...
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 1000 * 60 * 5, // 5 minutos entre reintentos
            },
          },
        );
        this.logger.log(`Tarea encolada para la empresa RUC: ${empresa.ruc} (arranca en ${delayMs / 1000}s)`);
      }
    } catch (error) {
      this.logger.error('Error al encolar tareas diarias:', error);
    }
  }
}
