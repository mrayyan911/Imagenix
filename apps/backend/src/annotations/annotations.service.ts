import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { ImagesService } from '../images/images.service';
import { CreateAnnotationDto } from './dto/create-annotation.dto';
import { UpdateAnnotationDto } from './dto/update-annotation.dto';
import { BulkUpdateAnnotationsDto } from './dto/bulk-update-annotations.dto';
import { FindAnnotationsQueryDto } from './dto/find-annotations-query.dto';

const DEFAULT_ANNOTATION_LIMIT = 500;
const MAX_ANNOTATION_LIMIT = 1000;

@Injectable()
export class AnnotationsService {
  private readonly logger = new Logger(AnnotationsService.name);

  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private imagesService: ImagesService
  ) {}

  async create(imageId: string, userId: string, dto: CreateAnnotationDto) {
    const start = Date.now();

    // Verify image ownership and get image details
    const { image, datasetId, projectId } = await this.imagesService.verifyOwnership(
      imageId,
      userId
    );

    // Verify label class belongs to the project
    const labelClass = await this.prisma.labelClass.findFirst({
      where: { id: dto.labelClassId, projectId },
    });

    if (!labelClass) {
      throw new BadRequestException('Label class not found or does not belong to this project');
    }

    // Validate bounding box dimensions
    this.validateBoundingBox(dto, image.width, image.height);

    // Create annotation in a transaction
    const annotation = await this.prisma.$transaction(async (tx) => {
      return tx.annotation.create({
        data: {
          imageId,
          labelClassId: dto.labelClassId,
          x: dto.x,
          y: dto.y,
          width: dto.width,
          height: dto.height,
          source: 'manual',
          status: 'approved',
        },
      });
    });

    // Invalidate cache after transaction succeeds
    await Promise.all([
      this.redisService.del(this.imageAnnotationsKey(imageId)),
      this.redisService.del(this.datasetSummaryKey(datasetId)),
    ]);

    const elapsed = Date.now() - start;
    this.logger.log(
      `annotation.create imageId=${imageId} userId=${userId} annotationId=${annotation.id} elapsed=${elapsed}ms`
    );
    if (elapsed > 1000) {
      this.logger.warn(`annotation.create slow operation elapsed=${elapsed}ms imageId=${imageId}`);
    }

    return { annotationId: annotation.id };
  }

  async update(annotationId: string, userId: string, dto: UpdateAnnotationDto) {
    const start = Date.now();

    // Get annotation with ownership check (also gives us imageId + datasetId)
    const annotation = await this.getAnnotationWithOwnershipCheck(annotationId, userId);

    // Validate bounding box if coordinates are being updated
    if (
      dto.x !== undefined ||
      dto.y !== undefined ||
      dto.width !== undefined ||
      dto.height !== undefined
    ) {
      const image = await this.prisma.image.findUnique({ where: { id: annotation.imageId } });
      if (image) {
        this.validateBoundingBox(
          {
            x: dto.x ?? annotation.x,
            y: dto.y ?? annotation.y,
            width: dto.width ?? annotation.width,
            height: dto.height ?? annotation.height,
          },
          image.width,
          image.height
        );
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = { version: { increment: 1 } };
    if (dto.x !== undefined) updateData.x = dto.x;
    if (dto.y !== undefined) updateData.y = dto.y;
    if (dto.width !== undefined) updateData.width = dto.width;
    if (dto.height !== undefined) updateData.height = dto.height;
    if (dto.status !== undefined) updateData.status = dto.status;

    if (dto.labelClassId !== undefined) {
      const image = await this.prisma.image.findUnique({
        where: { id: annotation.imageId },
        include: { dataset: { select: { projectId: true } } },
      });

      const newLabelClass = await this.prisma.labelClass.findFirst({
        where: { id: dto.labelClassId, projectId: image?.dataset.projectId },
      });

      if (!newLabelClass) {
        throw new BadRequestException('Label class not found or does not belong to this project');
      }

      updateData.labelClassId = dto.labelClassId;
    }

    const datasetId = annotation.image.datasetId;

    const updated = await this.prisma.$transaction(async (tx) => {
      return tx.annotation.update({
        where: { id: annotationId, deletedAt: null },
        data: updateData,
        include: { labelClass: true },
      });
    });

    // Invalidate cache after transaction
    await Promise.all([
      this.redisService.del(this.imageAnnotationsKey(annotation.imageId)),
      this.redisService.del(this.datasetSummaryKey(datasetId)),
    ]);

    const elapsed = Date.now() - start;
    this.logger.log(
      `annotation.update annotationId=${annotationId} userId=${userId} elapsed=${elapsed}ms`
    );
    if (elapsed > 1000) {
      this.logger.warn(
        `annotation.update slow operation elapsed=${elapsed}ms annotationId=${annotationId}`
      );
    }

    return updated;
  }

  async bulkUpdateStatus(userId: string, dto: BulkUpdateAnnotationsDto) {
    const start = Date.now();

    // Count how many of the requested annotations belong to this user
    const ownedCount = await this.prisma.annotation.count({
      where: {
        id: { in: dto.annotationIds },
        deletedAt: null,
        image: {
          dataset: {
            project: { userId },
          },
        },
      },
    });

    if (ownedCount !== dto.annotationIds.length) {
      this.logger.warn(
        `annotation.bulkUpdate ownership mismatch userId=${userId} requested=${dto.annotationIds.length} owned=${ownedCount}`
      );
      throw new ForbiddenException('Access denied to one or more annotations');
    }

    // Get distinct imageIds for cache invalidation (lightweight select)
    const rows = await this.prisma.annotation.findMany({
      where: { id: { in: dto.annotationIds }, deletedAt: null },
      select: { imageId: true, image: { select: { datasetId: true } } },
      distinct: ['imageId'],
    });

    // Update in transaction
    await this.prisma.$transaction(async (tx) => {
      await tx.annotation.updateMany({
        where: { id: { in: dto.annotationIds }, deletedAt: null },
        data: { status: dto.status, version: { increment: 1 } },
      });
    });

    // Invalidate cache after transaction
    const cacheDeletes = rows.flatMap((r) => [
      this.redisService.del(this.imageAnnotationsKey(r.imageId)),
      this.redisService.del(this.datasetSummaryKey(r.image.datasetId)),
    ]);
    await Promise.all(cacheDeletes);

    const elapsed = Date.now() - start;
    this.logger.log(
      `annotation.bulkUpdate userId=${userId} count=${dto.annotationIds.length} elapsed=${elapsed}ms`
    );

    return { updated: dto.annotationIds.length };
  }

  async delete(annotationId: string, userId: string) {
    const start = Date.now();

    const annotation = await this.getAnnotationWithOwnershipCheck(annotationId, userId, true);
    const datasetId = annotation.image.datasetId;

    // Already soft-deleted — return success (idempotent)
    if (annotation.deletedAt !== null) {
      return { success: true };
    }

    // Soft delete in a transaction
    await this.prisma.$transaction(async (tx) => {
      await tx.annotation.update({
        where: { id: annotationId },
        data: { deletedAt: new Date() },
      });
    });

    // Invalidate cache after transaction
    await Promise.all([
      this.redisService.del(this.imageAnnotationsKey(annotation.imageId)),
      this.redisService.del(this.datasetSummaryKey(datasetId)),
    ]);

    const elapsed = Date.now() - start;
    this.logger.log(
      `annotation.delete annotationId=${annotationId} userId=${userId} elapsed=${elapsed}ms`
    );

    return { success: true };
  }

  async findByImage(imageId: string, userId: string, query: FindAnnotationsQueryDto = {}) {
    // Verify ownership
    await this.imagesService.verifyOwnership(imageId, userId);

    const limit = Math.min(query.limit ?? DEFAULT_ANNOTATION_LIMIT, MAX_ANNOTATION_LIMIT);
    const cursor = query.cursor;

    const annotations = await this.prisma.annotation.findMany({
      where: {
        imageId,
        deletedAt: null,
        ...(cursor ? { id: { gt: cursor } } : {}),
      },
      include: { labelClass: true },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: limit + 1,
    });

    let nextCursor: string | null = null;
    if (annotations.length > limit) {
      const lastItem = annotations.pop();
      nextCursor = lastItem!.id;
    }

    return { annotations, nextCursor };
  }

  private async getAnnotationWithOwnershipCheck(
    annotationId: string,
    userId: string,
    allowDeleted = false
  ) {
    const annotation = await this.prisma.annotation.findUnique({
      where: { id: annotationId },
      include: {
        image: {
          include: {
            dataset: {
              include: {
                project: { select: { userId: true } },
              },
            },
          },
        },
      },
    });

    if (!annotation) {
      throw new NotFoundException('Annotation not found');
    }

    if (!allowDeleted && annotation.deletedAt !== null) {
      throw new NotFoundException('Annotation not found');
    }

    if (annotation.image.dataset.project.userId !== userId) {
      this.logger.warn(`annotation.ownership denied annotationId=${annotationId} userId=${userId}`);
      throw new ForbiddenException('Access denied');
    }

    return annotation;
  }

  private validateBoundingBox(
    box: { x: number; y: number; width: number; height: number },
    imageWidth: number,
    imageHeight: number
  ) {
    if (box.x < 0 || box.y < 0) {
      throw new BadRequestException('Bounding box coordinates must be non-negative');
    }

    if (box.width < 2 || box.height < 2) {
      throw new BadRequestException('Bounding box dimensions must be at least 2px');
    }

    if (box.x + box.width > imageWidth) {
      throw new BadRequestException('Bounding box exceeds image width');
    }

    if (box.y + box.height > imageHeight) {
      throw new BadRequestException('Bounding box exceeds image height');
    }
  }

  private imageAnnotationsKey(imageId: string): string {
    return `image:${imageId}:annotations`;
  }

  private datasetSummaryKey(datasetId: string): string {
    return `dataset:${datasetId}:summary`;
  }
}
