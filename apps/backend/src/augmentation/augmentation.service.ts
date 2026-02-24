import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { StorageService } from '../storage/storage.service';
import { DatasetsService } from '../datasets/datasets.service';
import { ClassicalAugmentationService } from './classical-augmentation.service';
import { GenerativeAugmentationService } from './generative-augmentation.service';
import { CreateClassicalAugmentationDto, CreateGenerativeAugmentationDto } from './dto/create-augmentation-job.dto';

@Injectable()
export class AugmentationService {
  private readonly classicalEnabled: boolean;
  private readonly generativeEnabled: boolean;

  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private storageService: StorageService,
    private datasetsService: DatasetsService,
    private classicalAugmentation: ClassicalAugmentationService,
    private generativeAugmentation: GenerativeAugmentationService,
    private configService: ConfigService
  ) {
    this.classicalEnabled = this.configService.get<string>('FEATURE_AUGMENTATION') === 'true';
    this.generativeEnabled = this.configService.get<string>('FEATURE_GENERATIVE_AUGMENTATION') === 'true';
  }

  /**
   * Get augmentation capabilities
   */
  getCapabilities() {
    return {
      classical: {
        enabled: this.classicalEnabled,
        transforms: [
          { type: 'flip_horizontal', name: 'Horizontal Flip', requiresValue: false },
          { type: 'flip_vertical', name: 'Vertical Flip', requiresValue: false },
          { type: 'rotate', name: 'Rotate', requiresValue: true, valueRange: { min: -180, max: 180, default: 90 } },
          { type: 'brightness', name: 'Brightness', requiresValue: true, valueRange: { min: 0.5, max: 2.0, default: 1.2 } },
          { type: 'contrast', name: 'Contrast', requiresValue: true, valueRange: { min: 0.5, max: 2.0, default: 1.2 } },
          { type: 'saturation', name: 'Saturation', requiresValue: true, valueRange: { min: 0, max: 3.0, default: 1.3 } },
          { type: 'blur', name: 'Blur', requiresValue: true, valueRange: { min: 0.5, max: 10, default: 2 } },
          { type: 'noise', name: 'Add Noise', requiresValue: true, valueRange: { min: 0.5, max: 3, default: 1 } },
          { type: 'scale', name: 'Scale', requiresValue: true, valueRange: { min: 0.5, max: 1.5, default: 0.8 } },
          { type: 'crop', name: 'Random Crop', requiresValue: true, valueRange: { min: 0.5, max: 0.95, default: 0.8 } },
        ],
      },
      generative: {
        enabled: this.generativeEnabled,
        available: this.generativeAugmentation.isAvailable(),
        variations: this.generativeAugmentation.getAvailableVariations(),
      },
    };
  }

  /**
   * Create classical augmentation job
   */
  async createClassicalAugmentationJob(
    datasetId: string,
    userId: string,
    dto: CreateClassicalAugmentationDto
  ) {
    if (!this.classicalEnabled) {
      throw new BadRequestException('Classical augmentation is not enabled');
    }

    // Verify dataset ownership
    await this.datasetsService.verifyOwnership(datasetId, userId);

    // Create job record
    const job = await this.prisma.job.create({
      data: {
        userId,
        datasetId,
        jobType: 'classical_augmentation',
        status: 'queued',
        progress: 0,
        metadata: {
          transforms: dto.transforms.map((t) => ({ type: t.type, value: t.value })),
          multiplier: dto.multiplier || 1,
          imageIds: dto.imageIds || [],
          preserveOriginals: dto.preserveOriginals ?? true,
        } as object,
      },
    });

    // Process asynchronously
    this.processClassicalAugmentation(job.id).catch((err) => {
      console.error(`[Augmentation] Job ${job.id} failed:`, err);
    });

    return { jobId: job.id, status: 'queued' };
  }

  /**
   * Create generative augmentation job
   */
  async createGenerativeAugmentationJob(
    datasetId: string,
    userId: string,
    dto: CreateGenerativeAugmentationDto
  ) {
    if (!this.generativeEnabled) {
      throw new BadRequestException('Generative augmentation is not enabled');
    }

    if (!this.generativeAugmentation.isAvailable()) {
      throw new BadRequestException(
        'Generative augmentation is enabled but no provider is configured. ' +
        'Please configure GENERATIVE_PROVIDER and the corresponding API key.'
      );
    }

    // Verify dataset ownership
    await this.datasetsService.verifyOwnership(datasetId, userId);

    // Get cost estimate
    const imageCount = dto.imageIds?.length || await this.prisma.image.count({ where: { datasetId } });
    const estimate = this.generativeAugmentation.estimateCost(imageCount, dto.quantity || 1);

    // Create job record
    const job = await this.prisma.job.create({
      data: {
        userId,
        datasetId,
        jobType: 'generative_augmentation',
        status: 'queued',
        progress: 0,
        metadata: {
          variationType: dto.variationType,
          prompt: dto.prompt || null,
          quantity: dto.quantity || 1,
          imageIds: dto.imageIds || [],
          estimatedCredits: estimate.credits,
          estimatedCost: estimate.estimatedUSD,
        } as object,
      },
    });

    // Process asynchronously
    this.processGenerativeAugmentation(job.id).catch((err) => {
      console.error(`[Augmentation] Generative job ${job.id} failed:`, err);
    });

    return { 
      jobId: job.id, 
      status: 'queued',
      estimate,
    };
  }

  /**
   * Preview classical augmentation on a single image
   */
  async previewClassicalAugmentation(
    imageId: string,
    userId: string,
    transforms: { type: string; value?: number }[]
  ) {
    // Get image with ownership check
    const image = await this.prisma.image.findUnique({
      where: { id: imageId },
      include: {
        dataset: {
          include: {
            project: { select: { userId: true } },
          },
        },
        annotations: {
          include: { labelClass: true },
        },
      },
    });

    if (!image) {
      throw new NotFoundException('Image not found');
    }

    if (image.dataset.project.userId !== userId) {
      throw new BadRequestException('Access denied');
    }

    // Download original image
    const imageBuffer = await this.storageService.downloadFile(image.fileKey);

    // Generate preview
    const preview = await this.classicalAugmentation.generatePreview(
      imageBuffer,
      transforms,
      image.width,
      image.height
    );

    // Transform annotations for preview using actual transformed dimensions
    const transformedAnnotations = this.classicalAugmentation.transformAnnotations(
      image.annotations.map((a) => ({
        id: a.id,
        labelClassId: a.labelClassId,
        x: a.x,
        y: a.y,
        width: a.width,
        height: a.height,
      })),
      transforms,
      image.width,
      image.height,
      preview.actualWidth,
      preview.actualHeight
    );

    // Scale annotations to preview size
    const scaleX = preview.previewWidth / preview.actualWidth;
    const scaleY = preview.previewHeight / preview.actualHeight;
    const scaledAnnotations = transformedAnnotations.map((a) => ({
      ...a,
      x: Math.round(a.x * scaleX),
      y: Math.round(a.y * scaleY),
      width: Math.round(a.width * scaleX),
      height: Math.round(a.height * scaleY),
    }));

    return {
      preview: preview.previewBuffer.toString('base64'),
      previewWidth: preview.previewWidth,
      previewHeight: preview.previewHeight,
      originalWidth: image.width,
      originalHeight: image.height,
      annotations: scaledAnnotations,
      validAnnotationCount: scaledAnnotations.filter((a) => a.isValid).length,
      invalidAnnotationCount: scaledAnnotations.filter((a) => !a.isValid).length,
    };
  }

  /**
   * Process classical augmentation job
   */
  private async processClassicalAugmentation(jobId: string) {
    // Update job to running
    await this.prisma.job.update({
      where: { id: jobId },
      data: { status: 'running', startedAt: new Date() },
    });

    try {
      const job = await this.prisma.job.findUnique({ where: { id: jobId } });
      if (!job) return;

      const metadata = job.metadata as {
        transforms: { type: string; value?: number }[];
        multiplier: number;
        imageIds: string[];
        preserveOriginals: boolean;
      };

      // Get images to augment
      const whereClause: any = { datasetId: job.datasetId };
      if (metadata.imageIds.length > 0) {
        whereClause.id = { in: metadata.imageIds };
      }

      const images = await this.prisma.image.findMany({
        where: whereClause,
        include: {
          annotations: true,
        },
      });

      const totalOperations = images.length * metadata.multiplier;
      let completed = 0;

      for (const image of images) {
        // Download original image
        const imageBuffer = await this.storageService.downloadFile(image.fileKey);

        for (let i = 0; i < metadata.multiplier; i++) {
          // Apply augmentation
          const result = await this.classicalAugmentation.augmentImage(
            imageBuffer,
            metadata.transforms,
            image.width,
            image.height
          );

          // Upload augmented image
          const fileKey = this.storageService.generateFileKey(
            job.datasetId,
            `aug_${i}_${image.fileName}`
          );
          await this.storageService.uploadFile(fileKey, result.buffer, image.mimeType);

          // Create image record
          const newImage = await this.prisma.image.create({
            data: {
              datasetId: job.datasetId,
              fileKey,
              fileName: `aug_${i}_${image.fileName}`,
              mimeType: image.mimeType,
              width: result.width,
              height: result.height,
              sha256: result.sha256,
              isSynthetic: true,
              syntheticSource: 'classical_augmentation',
            },
          });

          // Transform and create annotations
          const transformedAnnotations = this.classicalAugmentation.transformAnnotations(
            image.annotations.map((a) => ({
              id: a.id,
              labelClassId: a.labelClassId,
              x: a.x,
              y: a.y,
              width: a.width,
              height: a.height,
            })),
            metadata.transforms,
            image.width,
            image.height,
            result.width,
            result.height
          );

          // Save valid annotations
          for (const ann of transformedAnnotations.filter((a) => a.isValid)) {
            await this.prisma.annotation.create({
              data: {
                imageId: newImage.id,
                labelClassId: ann.labelClassId,
                x: ann.x,
                y: ann.y,
                width: ann.width,
                height: ann.height,
                source: 'augmentation',
                status: 'approved',
              },
            });
          }

          completed++;
          const progress = Math.round((completed / totalOperations) * 100);
          await this.prisma.job.update({
            where: { id: jobId },
            data: { progress },
          });
        }
      }

      // Mark job as succeeded
      await this.prisma.job.update({
        where: { id: jobId },
        data: {
          status: 'succeeded',
          progress: 100,
          finishedAt: new Date(),
        },
      });

      console.log(`[Augmentation] Job ${jobId} completed: ${totalOperations} images created`);
    } catch (error) {
      await this.prisma.job.update({
        where: { id: jobId },
        data: {
          status: 'failed',
          errorCode: 'AUGMENTATION_ERROR',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          finishedAt: new Date(),
        },
      });
      console.error(`[Augmentation] Job ${jobId} failed:`, error);
    }
  }

  /**
   * Process generative augmentation job.
   *
   * For each source image × quantity, calls the GenerativeAugmentationService
   * which in turn contacts the ML microservice (RunPod) or Replicate.
   * Each result is validated for hallucination; retries happen automatically
   * inside the service layer.
   */
  private async processGenerativeAugmentation(jobId: string) {
    await this.prisma.job.update({
      where: { id: jobId },
      data: { status: 'running', startedAt: new Date() },
    });

    try {
      const job = await this.prisma.job.findUnique({ where: { id: jobId } });
      if (!job) return;

      const metadata = job.metadata as {
        variationType: string;
        prompt?: string;
        quantity: number;
        imageIds: string[];
      };

      // Get images to augment
      const whereClause: any = { datasetId: job.datasetId };
      if (metadata.imageIds.length > 0) {
        whereClause.id = { in: metadata.imageIds };
      }

      const images = await this.prisma.image.findMany({ where: whereClause });
      const totalOperations = images.length * metadata.quantity;
      let completed = 0;

      for (const image of images) {
        const imageBuffer = await this.storageService.downloadFile(image.fileKey);

        for (let i = 0; i < metadata.quantity; i++) {
          const result = await this.generativeAugmentation.generateVariation(
            imageBuffer,
            metadata.variationType,
            metadata.prompt,
            image.width,
            image.height,
          );

          // Upload generated image to storage
          const fileKey = this.storageService.generateFileKey(
            job.datasetId,
            `gen_${metadata.variationType}_${i}_${image.fileName}`,
          );
          await this.storageService.uploadFile(fileKey, result.buffer, 'image/png');

          // Create image record — mark as synthetic with generation metadata
          try {
            await this.prisma.image.create({
              data: {
                datasetId: job.datasetId,
                fileKey,
                fileName: `gen_${metadata.variationType}_${i}_${image.fileName}`,
                mimeType: 'image/png',
                width: result.width,
                height: result.height,
                sha256: result.sha256,
                isSynthetic: true,
                syntheticSource: `generative_${metadata.variationType}`,
              },
            });
          } catch (dbErr: any) {
            if (dbErr?.code === 'P2002') {
              // Duplicate sha256 — skip this image (Replicate returned an identical result)
              console.warn(
                `[Augmentation] Skipping duplicate image (same sha256 already exists in dataset): iteration=${i}`,
              );
              continue;
            }
            throw dbErr;
          }

          completed++;
          const progress = Math.round((completed / totalOperations) * 100);
          await this.prisma.job.update({
            where: { id: jobId },
            data: { progress },
          });

          console.log(
            `[Augmentation] Generative job ${jobId}: ${completed}/${totalOperations} — ` +
            `validated=${result.validated}, similarity=${result.similarityScore}, ` +
            `attempts=${result.attempts}`,
          );
        }
      }

      await this.prisma.job.update({
        where: { id: jobId },
        data: { status: 'succeeded', progress: 100, finishedAt: new Date() },
      });

      console.log(
        `[Augmentation] Generative job ${jobId} completed: ` +
        `${totalOperations} images generated`,
      );
    } catch (error) {
      await this.prisma.job.update({
        where: { id: jobId },
        data: {
          status: 'failed',
          errorCode: 'GENERATIVE_ERROR',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          finishedAt: new Date(),
        },
      });
      console.error(`[Augmentation] Generative job ${jobId} failed:`, error);
    }
  }
}
