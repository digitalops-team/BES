import { Module } from '@nestjs/common';
import { ScraperService } from './scraper.service';
import { ScraperProcessor } from './scraper.processor';
import { BullModule } from '@nestjs/bullmq';
import { CronService } from './cron.service';
import { EncryptionModule } from '../encryption/encryption.module';

import { ScraperController } from './scraper.controller';
import { QueueController } from './queue.controller';

@Module({
  imports: [
    EncryptionModule,
    BullModule.registerQueue({
      name: 'sunat-scraper-queue',
      streams: {
        events: {
          maxLen: 100,
        },
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 60000,
        },
        removeOnComplete: true,
      },
    }),
  ],
  controllers: [ScraperController, QueueController],
  providers: [ScraperService, ScraperProcessor, CronService],
})
export class ScraperModule {}
