import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { DatasetsService } from '../datasets/datasets.service';
import { AutoAnnotationService } from './auto-annotation.service';
import { CreateAutoAnnotationJobDto } from './dto/create-auto-annotation-job.dto';

@Injectable()
export class JobsService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private datasetsService: DatasetsService,
    private autoAnnotationService: AutoAnnotationService
  ) {}

  async createAutoAnnotationJob(
    datasetId: string,
    userId: string,
    dto: CreateAutoAnnotationJobDto
  ) {
    // Verify dataset ownership
    await this.datasetsService.verifyOwnership(datasetId, userId);

    // Create job record
    const job = await this.prisma.job.create({
      data: {
        userId,
        datasetId,
        jobType: 'auto_annotation',
        status: 'queued',
        progress: 0,
        metadata: {
          className: dto.className,
          confidenceThreshold: dto.confidenceThreshold || 0.35,
          imageIds: dto.imageIds || null,
        },
      },
    });

    // Start job processing asynchronously
    this.processAutoAnnotationJob(job.id).catch((err) => {
      console.error(`Job ${job.id} failed:`, err);
    });

    return {
      jobId: job.id,
      status: 'queued',
    };
  }

  async getJobStatus(jobId: string, userId: string) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (job.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    // Try to get progress from cache for running jobs
    let progress = job.progress;
    if (job.status === 'running') {
      const cachedProgress = await this.redisService.getJobProgress(jobId);
      if (cachedProgress !== null) {
        progress = cachedProgress;
      }
    }

    return {
      jobId: job.id,
      jobType: job.jobType,
      status: job.status,
      progress,
      errorCode: job.errorCode,
      errorMessage: job.errorMessage,
      startedAt: job.startedAt,
      finishedAt: job.finishedAt,
    };
  }

  async cancelJob(jobId: string, userId: string) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (job.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    if (job.status === 'succeeded' || job.status === 'failed') {
      throw new ConflictException('Cannot cancel completed job');
    }

    await this.prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'canceled',
        finishedAt: new Date(),
      },
    });

    return { success: true };
  }

  async getJobsByDataset(datasetId: string, userId: string) {
    // Verify ownership
    await this.datasetsService.verifyOwnership(datasetId, userId);

    const jobs = await this.prisma.job.findMany({
      where: { datasetId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return { jobs };
  }

  private async processAutoAnnotationJob(jobId: string) {
    // Update job status to running
    await this.prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'running',
        startedAt: new Date(),
      },
    });

    try {
      // Get job details
      const job = await this.prisma.job.findUnique({
        where: { id: jobId },
      });

      if (!job || job.status === 'canceled') {
        return;
      }

      const metadata = job.metadata as {
        className: string;
        confidenceThreshold: number;
        imageIds: string[] | null;
      };

      // Process auto annotation
      await this.autoAnnotationService.processDataset(
        jobId,
        job.datasetId,
        metadata.className,
        metadata.confidenceThreshold,
        metadata.imageIds
      );

      // Mark job as succeeded
      await this.prisma.job.update({
        where: { id: jobId },
        data: {
          status: 'succeeded',
          progress: 100,
          finishedAt: new Date(),
        },
      });

      // Invalidate dataset cache
      await this.redisService.del(`dataset:${job.datasetId}:summary`);
    } catch (error) {
      // Mark job as failed
      await this.prisma.job.update({
        where: { id: jobId },
        data: {
          status: 'failed',
          errorCode: 'PROCESSING_ERROR',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          finishedAt: new Date(),
        },
      });
    }
  }
}
