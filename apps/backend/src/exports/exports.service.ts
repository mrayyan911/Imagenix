import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { StorageService } from '../storage/storage.service';
import { DatasetsService } from '../datasets/datasets.service';
import { ExportGeneratorService } from './export-generator.service';
import { CreateExportDto } from './dto/create-export.dto';

@Injectable()
export class ExportsService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private storageService: StorageService,
    private datasetsService: DatasetsService,
    private exportGenerator: ExportGeneratorService
  ) {}

  async createExport(datasetId: string, userId: string, dto: CreateExportDto) {
    // Verify dataset ownership
    await this.datasetsService.verifyOwnership(datasetId, userId);

    // Validate format
    const validFormats = ['coco', 'yolo', 'voc', 'labeled_png', 'labeled_jpg'];
    if (!validFormats.includes(dto.format)) {
      throw new BadRequestException(`Invalid format. Must be one of: ${validFormats.join(', ')}`);
    }

    // Create job record
    const job = await this.prisma.job.create({
      data: {
        userId,
        datasetId,
        jobType: 'export',
        status: 'queued',
        progress: 0,
        metadata: {
          format: dto.format,
          includeImages: dto.includeImages ?? true,
          annotationStatus: dto.annotationStatus || ['approved'],
        },
      },
    });

    // Start export processing asynchronously
    this.processExportJob(job.id).catch((err) => {
      console.error(`Export job ${job.id} failed:`, err);
    });

    return { jobId: job.id };
  }

  async getExportDownload(exportId: string, userId: string) {
    const exportRecord = await this.prisma.export.findUnique({
      where: { id: exportId },
      include: {
        job: true,
      },
    });

    if (!exportRecord) {
      throw new NotFoundException('Export not found');
    }

    if (exportRecord.job.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    // Check if export has expired
    if (exportRecord.expiresAt < new Date()) {
      throw new BadRequestException('Export has expired. Please create a new export.');
    }

    // Get signed download URL
    const downloadUrl = await this.storageService.getExportDownloadUrl(
      exportRecord.fileKey,
      86400 // 24 hours
    );

    return {
      downloadUrl,
      expiresAt: exportRecord.expiresAt.toISOString(),
      fileSizeBytes: Number(exportRecord.fileSizeBytes),
    };
  }

  async getExportsByDataset(datasetId: string, userId: string) {
    // Verify ownership
    await this.datasetsService.verifyOwnership(datasetId, userId);

    const exports = await this.prisma.export.findMany({
      where: { datasetId },
      orderBy: { createdAt: 'desc' },
      include: {
        job: {
          select: {
            status: true,
            progress: true,
            createdAt: true,
          },
        },
      },
    });

    // Convert BigInt to Number for JSON serialization
    const serializedExports = exports.map((exp) => ({
      ...exp,
      fileSizeBytes: Number(exp.fileSizeBytes),
    }));

    return { exports: serializedExports };
  }

  private async processExportJob(jobId: string) {
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
        format: string;
        includeImages: boolean;
        annotationStatus: string[];
      };

      // Progress callback for labeled image exports
      const progressCallback = async (progress: number) => {
        await this.prisma.job.update({
          where: { id: jobId },
          data: { progress },
        });
      };

      // Generate export
      const exportData = await this.exportGenerator.generate(
        jobId,
        job.datasetId,
        metadata.format as 'coco' | 'yolo' | 'voc' | 'labeled_png' | 'labeled_jpg',
        metadata.includeImages,
        metadata.annotationStatus,
        progressCallback
      );

      // Upload to storage
      const fileKey = this.storageService.generateExportKey(job.datasetId, metadata.format);
      await this.storageService.uploadExport(fileKey, exportData);

      // Get file size
      const fileSizeBytes = exportData.length;

      // Set expiry (7 days)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Create export record
      await this.prisma.export.create({
        data: {
          jobId,
          datasetId: job.datasetId,
          format: metadata.format,
          fileKey,
          fileSizeBytes,
          expiresAt,
        },
      });

      // Mark job as succeeded
      await this.prisma.job.update({
        where: { id: jobId },
        data: {
          status: 'succeeded',
          progress: 100,
          finishedAt: new Date(),
        },
      });

      console.log(`[Export] Job ${jobId} completed successfully`);
    } catch (error) {
      // Mark job as failed
      await this.prisma.job.update({
        where: { id: jobId },
        data: {
          status: 'failed',
          errorCode: 'EXPORT_ERROR',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          finishedAt: new Date(),
        },
      });

      console.error(`[Export] Job ${jobId} failed:`, error);
    }
  }
}
