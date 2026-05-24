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
        select: { id: true, ruc: true }
      });

      this.logger.log(`Se encontraron ${empresas.length} empresas para procesar.`);

      for (const empresa of empresas) {
        await this.scraperQueue.add('scrapeBuzon', { empresaId: empresa.id }, {
          jobId: `daily-${empresa.id}-${new Date().toISOString().split('T')[0]}`,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000 * 60 * 5, // 5 minutos entre reintentos
          }
        });
        this.logger.log(`Tarea encolada para la empresa RUC: ${empresa.ruc}`);
      }
    } catch (error) {
      this.logger.error('Error al encolar tareas diarias:', error);
    }
  }
}
