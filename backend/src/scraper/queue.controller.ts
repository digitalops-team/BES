import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('queues')
export class QueueController {
  constructor(
    @InjectQueue('sunat-scraper-queue')
    private readonly scraperQueue: Queue,
  ) {}

  @Get('metrics')
  async getMetrics() {
    const [counts, isPaused] = await Promise.all([
      this.scraperQueue.getJobCounts('active', 'completed', 'failed', 'delayed', 'waiting', 'paused'),
      this.scraperQueue.isPaused(),
    ]);

    const activeJobs = await this.scraperQueue.getActive(0, 10);
    const activeDetails = activeJobs.map((j) => ({
      id: j.id,
      name: j.name,
      empresaId: j.data?.empresaId,
      timestamp: j.timestamp,
    }));

    return {
      counts,
      isPaused,
      activeJobs: activeDetails,
    };
  }

  @Post('pause')
  async pauseQueue() {
    await this.scraperQueue.pause();
    return { status: 'paused' };
  }

  @Post('resume')
  async resumeQueue() {
    await this.scraperQueue.resume();
    return { status: 'resumed' };
  }

  @Post('clean-failed')
  async cleanFailed() {
    await this.scraperQueue.clean(0, 100, 'failed');
    return { status: 'cleaned' };
  }
}
