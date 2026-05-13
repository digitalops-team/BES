import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { ScraperService } from './scraper.service';
import { EventsGateway } from '../events/events.gateway';

@Processor('sunat-scraper-queue', { concurrency: 5 })
export class ScraperProcessor extends WorkerHost {
  private readonly logger = new Logger(ScraperProcessor.name);

  constructor(
    private readonly scraperService: ScraperService,
    private readonly eventsGateway: EventsGateway
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { empresaId, usuarioId } = job.data;
    this.logger.log(`Procesando tarea de scraping para la empresa ${empresaId}...`);
    
    // 1. Marcar como Sincronizando
    await this.scraperService.updateSyncStatus(empresaId, 'SYNCING');

    try {
      await this.scraperService.checkBuzonForEmpresa(empresaId);
      
      // 2. Marcar como éxito
      await this.scraperService.updateSyncStatus(empresaId, 'SUCCESS');
      this.logger.log(`Tarea completada exitosamente para la empresa ${empresaId}.`);
      
      // Emitir éxito si hay un usuarioId asociado
      if (usuarioId) {
        this.eventsGateway.emitToUser(usuarioId, 'sync-finished', { empresaId, status: 'success' });
      }
    } catch (error: any) {
      // 3. Marcar como error
      await this.scraperService.updateSyncStatus(empresaId, 'ERROR');
      this.logger.error(`Falló la tarea de scraping para la empresa ${empresaId}`, error.stack);
      
      if (usuarioId) {
        this.eventsGateway.emitToUser(usuarioId, 'sync-error', { empresaId, status: 'error', message: error.message });
      }
      throw error;
    }
  }
}
