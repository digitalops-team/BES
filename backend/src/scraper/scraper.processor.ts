import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { ScraperService } from './scraper.service';
import { EventsGateway } from '../events/events.gateway';

@Processor('sunat-scraper-queue', { 
  concurrency: 1,
  lockDuration: 300000, // 5 minutos (evita 'stalled' si Puppeteer es lento)
  maxStalledCount: 10   // Intentar retomar el job más veces si falla el proceso
})
export class ScraperProcessor extends WorkerHost {
  private readonly logger = new Logger(ScraperProcessor.name);

  constructor(
    private readonly scraperService: ScraperService,
    private readonly eventsGateway: EventsGateway
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { empresaId, usuarioId, callerUserId } = job.data;
    // El destinatario del WebSocket es quien disparó el sync (caller), no el dueño
    const notifyUserId = callerUserId || usuarioId;

    this.logger.log(`Procesando tarea de scraping para la empresa ${empresaId}...`);
    
    // 1. Marcar como Sincronizando
    await this.scraperService.updateSyncStatus(empresaId, 'SYNCING');

    try {
      await this.scraperService.checkBuzonForEmpresa(empresaId);
      
      // 2. Marcar como éxito
      await this.scraperService.updateSyncStatus(empresaId, 'SUCCESS');
      this.logger.log(`Tarea completada exitosamente para la empresa ${empresaId}.`);
      
      if (notifyUserId) {
        this.eventsGateway.emitToUser(notifyUserId, 'sync-finished', { empresaId, status: 'success' });
      }
    } catch (error: any) {
      // 3. Marcar como error
      await this.scraperService.updateSyncStatus(empresaId, 'ERROR');
      this.logger.error(`Falló la tarea de scraping para la empresa ${empresaId}`, error.stack);
      
      if (notifyUserId) {
        this.eventsGateway.emitToUser(notifyUserId, 'sync-error', { empresaId, status: 'error', message: error.message });
      }
      throw error;
    }
  }
}
