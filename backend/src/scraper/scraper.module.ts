import { Module } from '@nestjs/common';
import { ScraperService } from './scraper.service';
import { ScraperProcessor } from './scraper.processor';
import { BullModule } from '@nestjs/bullmq';
import { CronService } from './cron.service';
import { EncryptionModule } from '../encryption/encryption.module';

import { ScraperController } from './scraper.controller';

@Module({
  imports: [
    EncryptionModule,
    BullModule.registerQueue({
      name: 'sunat-scraper-queue',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 60000, // 60s → 120s → 240s (da tiempo a SUNAT de "olvidarnos")
        },
        removeOnComplete: true,
      }
    }),
  ],
  controllers: [ScraperController],
  providers: [ScraperService, ScraperProcessor, CronService]
})
export class ScraperModule {}
