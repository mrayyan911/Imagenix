import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { StorageService } from '../storage/storage.service';
import { LabelClassesService } from '../label-classes/label-classes.service';

interface GroundingDINODetection {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  label: string;
}

/**
 * AutoAnnotationService — Grounding DINO via Replicate
 *
 * Uses the adirik/grounding-dino model on Replicate to perform
 * open-vocabulary object detection. Detects objects by text prompt
 * (e.g., "car", "person", "dog") with high accuracy.
 *
 * Cost: ~$0.001 per image (~1000 images per $1)
 * Speed: ~1-3 seconds per image
 */
@Injectable()
export class AutoAnnotationService {
  private readonly logger = new Logger(AutoAnnotationService.name);
  private readonly replicateToken: string | undefined;
  private replicate: any = null;

  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private storageService: StorageService,
    private labelClassesService: LabelClassesService,
    private configService: ConfigService,
  ) {
    this.replicateToken = this.configService.get<string>('REPLICATE_API_TOKEN');
    if (this.replicateToken) {
      this.logger.log('AutoAnnotation: Replicate token configured (Grounding DINO)');
    } else {
      this.logger.warn('AutoAnnotation: No REPLICATE_API_TOKEN — auto-annotation will not work');
    }
  }

  private async getClient(): Promise<any> {
    if (!this.replicateToken) {
      throw new Error('REPLICATE_API_TOKEN not configured for auto-annotation');
    }
    if (!this.replicate) {
      const mod = await import('replicate');
      const Replicate: any = typeof mod.default === 'function' ? mod.default : mod;
      this.replicate = new Replicate({ auth: this.replicateToken });
    }
    return this.replicate;
  }

  /**
   * Sleep helper for retry backoff.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Call Replicate with automatic retry on 429 rate-limit errors.
   * Uses the retry_after hint from the API when available.
   */
  private async runWithRetry(client: any, model: string, input: any, maxRetries = 5): Promise<any> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await client.run(model, { input });
      } catch (err: any) {
        const is429 = err?.status === 429 || err?.response?.status === 429 ||
          (err?.message && err.message.includes('429'));

        if (!is429 || attempt === maxRetries) {
          throw err;
        }

        // Extract retry_after from error message or default to exponential backoff
        let waitSec = Math.min(2 ** attempt * 2, 30); // 2, 4, 8, 16, 30
        const retryMatch = err.message?.match(/retry_after.*?(\d+)/i);
        if (retryMatch) {
          waitSec = Math.max(parseInt(retryMatch[1], 10) + 1, waitSec);
        }

        this.logger.warn(`[AutoAnnotation] Rate limited (429), retrying in ${waitSec}s (attempt ${attempt + 1}/${maxRetries})`);
        await this.sleep(waitSec * 1000);
      }
    }
  }

  async processDataset(
    jobId: string,
    datasetId: string,
    className: string,
    confidenceThreshold: number,
    imageIds?: string[] | null,
  ) {
    this.logger.log(`[AutoAnnotation] Starting job ${jobId}`);
    this.logger.log(`[AutoAnnotation] Dataset: ${datasetId}, Class: "${className}", Threshold: ${confidenceThreshold}`);

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
      (lc) => lc.name.toLowerCase() === className.toLowerCase(),
    );

    if (!labelClass) {
      labelClass = await this.prisma.labelClass.create({
        data: {
          projectId: dataset.projectId,
          name: className,
          colorHex: this.generateRandomColor(),
        },
      });
      this.logger.log(`[AutoAnnotation] Created new label class: ${className}`);
    }

    // Get images to process
    const whereClause: any = { datasetId };
    if (imageIds && imageIds.length > 0) {
      whereClause.id = { in: imageIds };
    }

    const images = await this.prisma.image.findMany({
      where: whereClause,
      select: {
        id: true,
        fileKey: true,
        width: true,
        height: true,
      },
    });

    this.logger.log(`[AutoAnnotation] Processing ${images.length} images`);

    let totalAnnotations = 0;

    for (let i = 0; i < images.length; i++) {
      const image = images[i];

      // Check if job was canceled (every 5 images to reduce DB calls)
      if (i % 5 === 0) {
        const job = await this.prisma.job.findUnique({
          where: { id: jobId },
          select: { status: true },
        });
        if (job?.status === 'canceled') {
          this.logger.log(`[AutoAnnotation] Job ${jobId} was canceled`);
          return;
        }
      }

      try {
        // Download image from storage
        const imageBuffer = await this.storageService.downloadFile(image.fileKey);

        // Run Grounding DINO detection
        const detections = await this.detectObjects(
          imageBuffer,
          className,
          confidenceThreshold,
          image.width,
          image.height,
        );

        this.logger.log(
          `[AutoAnnotation] Image ${i + 1}/${images.length}: ${detections.length} detections`,
        );

        // Batch insert all annotations for this image (faster than individual inserts)
        if (detections.length > 0) {
          await this.prisma.annotation.createMany({
            data: detections.map((detection) => ({
              imageId: image.id,
              labelClassId: labelClass.id,
              x: detection.x,
              y: detection.y,
              width: detection.width,
              height: detection.height,
              source: 'auto',
              status: 'draft',
              confidence: detection.confidence,
            })),
          });
          totalAnnotations += detections.length;
        }

        // Update progress
        const progress = Math.round(((i + 1) / images.length) * 100);
        await this.redisService.setJobProgress(jobId, progress);
      } catch (err) {
        this.logger.error(
          `[AutoAnnotation] Failed on image ${image.id}: ${err instanceof Error ? err.message : err}`,
        );
      }
    }

    this.logger.log(`[AutoAnnotation] Job ${jobId} completed — ${totalAnnotations} annotations created`);
  }

  /**
   * Run Grounding DINO on a single image via Replicate.
   *
   * Grounding DINO returns bounding boxes in absolute pixel coordinates
   * matching the image dimensions it processes.
   */
  private async detectObjects(
    imageData: Buffer,
    query: string,
    confidenceThreshold: number,
    imageWidth: number,
    imageHeight: number,
  ): Promise<GroundingDINODetection[]> {
    const client = await this.getClient();

    const output: any = await this.runWithRetry(
      client,
      'adirik/grounding-dino:efd10a8ddc57ea28773327e881ce95e20cc1d734c589f7dd01d2036921ed78aa',
      {
        image: imageData,
        query: query,
        box_threshold: confidenceThreshold,
        text_threshold: 0.25,
      },
    );

    const result = typeof output === 'string' ? JSON.parse(output) : output;

    if (!result || !result.detections || !Array.isArray(result.detections)) {
      if (result?.boxes && Array.isArray(result.boxes)) {
        return this.parseBoxesFormat(result, imageWidth, imageHeight, confidenceThreshold);
      }
      this.logger.warn('[AutoAnnotation] Unexpected output format from Grounding DINO');
      return [];
    }

    return this.parseDetectionsFormat(result.detections, confidenceThreshold);
  }

  /**
   * Parse { boxes: [[x1,y1,x2,y2],...], labels: [...], scores: [...] } format
   * Boxes are normalized (0-1) coordinates.
   */
  private parseBoxesFormat(
    result: { boxes: number[][]; labels: string[]; scores: number[] },
    imageWidth: number,
    imageHeight: number,
    confidenceThreshold: number,
  ): GroundingDINODetection[] {
    const detections: GroundingDINODetection[] = [];

    for (let i = 0; i < result.boxes.length; i++) {
      const score = result.scores?.[i] ?? 0;
      if (score < confidenceThreshold) continue;

      const [x1, y1, x2, y2] = result.boxes[i];

      // Normalized coordinates (0-1) → pixel coordinates
      const px1 = Math.round(x1 * imageWidth);
      const py1 = Math.round(y1 * imageHeight);
      const px2 = Math.round(x2 * imageWidth);
      const py2 = Math.round(y2 * imageHeight);

      detections.push({
        x: Math.max(0, px1),
        y: Math.max(0, py1),
        width: Math.max(1, px2 - px1),
        height: Math.max(1, py2 - py1),
        confidence: Math.round(score * 1000) / 1000,
        label: result.labels?.[i] || '',
      });
    }

    return detections;
  }

  /**
   * Parse detections array format: [{ bbox: [x1,y1,x2,y2], label, confidence }, ...]
   *
   * Grounding DINO returns bbox in absolute pixel coordinates.
   * We use them directly — no clamping against DB dimensions which may differ.
   */
  private parseDetectionsFormat(
    detections: Array<{ bbox?: number[]; box?: number[]; label?: string; score?: number; confidence?: number }>,
    confidenceThreshold: number,
  ): GroundingDINODetection[] {
    const results: GroundingDINODetection[] = [];

    for (const det of detections) {
      const score = det.score ?? det.confidence ?? 0;
      if (score < confidenceThreshold) continue;

      const box = det.bbox || det.box || [];
      if (box.length < 4) continue;

      const [x1, y1, x2, y2] = box;

      // Grounding DINO returns absolute pixel coordinates — use directly
      results.push({
        x: Math.max(0, Math.round(x1)),
        y: Math.max(0, Math.round(y1)),
        width: Math.max(1, Math.round(x2 - x1)),
        height: Math.max(1, Math.round(y2 - y1)),
        confidence: Math.round(score * 1000) / 1000,
        label: det.label || '',
      });
    }

    return results;
  }

  private generateRandomColor(): string {
    const colors = [
      '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
      '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }
}
