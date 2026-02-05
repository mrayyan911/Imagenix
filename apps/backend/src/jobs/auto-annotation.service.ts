import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { LabelClassesService } from '../label-classes/label-classes.service';

/**
 * AutoAnnotationService - Mock AI Service
 * 
 * TODO: Integrate with actual AI detection model (e.g., YOLO, Grounding DINO, etc.)
 * 
 * Current implementation generates simulated bounding boxes for demonstration purposes.
 * In production, this would:
 * 1. Download images from storage
 * 2. Run inference using an AI model
 * 3. Convert predictions to bounding box format
 * 4. Store annotations with source='auto' and status='draft'
 */
@Injectable()
export class AutoAnnotationService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private labelClassesService: LabelClassesService
  ) {}

  async processDataset(
    jobId: string,
    datasetId: string,
    className: string,
    confidenceThreshold: number,
    imageIds?: string[] | null
  ) {
    console.log(`[AutoAnnotation] Starting job ${jobId}`);
    console.log(`[AutoAnnotation] Dataset: ${datasetId}, Class: ${className}`);

    // Get the dataset and project to find/create label class
    const dataset = await this.prisma.dataset.findUnique({
      where: { id: datasetId },
      include: {
        project: {
          include: {
            labelClasses: true,
          },
        },
      },
    });

    if (!dataset) {
      throw new Error('Dataset not found');
    }

    // Find or create label class
    let labelClass = dataset.project.labelClasses.find(
      (lc) => lc.name.toLowerCase() === className.toLowerCase()
    );

    if (!labelClass) {
      // Create new label class
      labelClass = await this.prisma.labelClass.create({
        data: {
          projectId: dataset.projectId,
          name: className,
          colorHex: this.generateRandomColor(),
        },
      });
      console.log(`[AutoAnnotation] Created new label class: ${className}`);
    }

    // Get images to process
    const whereClause: { datasetId: string; id?: { in: string[] } } = { datasetId };
    if (imageIds && imageIds.length > 0) {
      whereClause.id = { in: imageIds };
    }

    const images = await this.prisma.image.findMany({
      where: whereClause,
      select: {
        id: true,
        width: true,
        height: true,
      },
    });

    console.log(`[AutoAnnotation] Processing ${images.length} images`);

    // Process each image
    for (let i = 0; i < images.length; i++) {
      const image = images[i];

      // Check if job was canceled
      const job = await this.prisma.job.findUnique({
        where: { id: jobId },
        select: { status: true },
      });

      if (job?.status === 'canceled') {
        console.log(`[AutoAnnotation] Job ${jobId} was canceled`);
        return;
      }

      // Update progress
      const progress = Math.round(((i + 1) / images.length) * 100);
      await this.redisService.setJobProgress(jobId, progress);

      // Generate mock detections
      // TODO: Replace with actual AI model inference
      const detections = this.generateMockDetections(
        image.width,
        image.height,
        confidenceThreshold
      );

      // Create annotations for each detection
      for (const detection of detections) {
        await this.prisma.annotation.create({
          data: {
            imageId: image.id,
            labelClassId: labelClass.id,
            x: detection.x,
            y: detection.y,
            width: detection.width,
            height: detection.height,
            source: 'auto',
            status: 'draft',
            confidence: detection.confidence,
          },
        });
      }

      // Simulate processing time (remove in production)
      await this.sleep(100);
    }

    console.log(`[AutoAnnotation] Job ${jobId} completed`);
  }

  /**
   * Generate mock bounding box detections
   * 
   * TODO: Replace with actual AI model inference
   * This is a placeholder that generates random bounding boxes
   */
  private generateMockDetections(
    imageWidth: number,
    imageHeight: number,
    confidenceThreshold: number
  ): { x: number; y: number; width: number; height: number; confidence: number }[] {
    const detections: { x: number; y: number; width: number; height: number; confidence: number }[] = [];

    // Generate 0-3 random detections per image
    const numDetections = Math.floor(Math.random() * 4);

    for (let i = 0; i < numDetections; i++) {
      const confidence = 0.3 + Math.random() * 0.7; // 0.3 to 1.0

      // Only include if above threshold
      if (confidence >= confidenceThreshold) {
        // Generate reasonable bounding box (10-40% of image size)
        const boxWidth = Math.floor(imageWidth * (0.1 + Math.random() * 0.3));
        const boxHeight = Math.floor(imageHeight * (0.1 + Math.random() * 0.3));
        
        // Random position ensuring box stays within image
        const x = Math.floor(Math.random() * (imageWidth - boxWidth));
        const y = Math.floor(Math.random() * (imageHeight - boxHeight));

        detections.push({
          x,
          y,
          width: boxWidth,
          height: boxHeight,
          confidence: Math.round(confidence * 1000) / 1000,
        });
      }
    }

    return detections;
  }

  private generateRandomColor(): string {
    const colors = [
      '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
      '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
