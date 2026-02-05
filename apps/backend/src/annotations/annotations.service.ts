import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { ImagesService } from '../images/images.service';
import { CreateAnnotationDto } from './dto/create-annotation.dto';
import { UpdateAnnotationDto } from './dto/update-annotation.dto';
import { BulkUpdateAnnotationsDto } from './dto/bulk-update-annotations.dto';

@Injectable()
export class AnnotationsService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private imagesService: ImagesService
  ) {}

  async create(imageId: string, userId: string, dto: CreateAnnotationDto) {
    // Verify image ownership and get image details
    const { image, datasetId, projectId } = await this.imagesService.verifyOwnership(imageId, userId);

    // Verify label class belongs to the project
    const labelClass = await this.prisma.labelClass.findFirst({
      where: {
        id: dto.labelClassId,
        projectId,
      },
    });

    if (!labelClass) {
      throw new BadRequestException('Label class not found or does not belong to this project');
    }

    // Validate bounding box dimensions
    this.validateBoundingBox(dto, image.width, image.height);

    // Create annotation
    const annotation = await this.prisma.annotation.create({
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

    // Invalidate cache
    await this.redisService.del(`dataset:${datasetId}:summary`);

    return { annotationId: annotation.id };
  }

  async update(annotationId: string, userId: string, dto: UpdateAnnotationDto) {
    // Get annotation with ownership check
    const annotation = await this.getAnnotationWithOwnershipCheck(annotationId, userId);

    // Validate bounding box if coordinates are being updated
    if (dto.x !== undefined || dto.y !== undefined || dto.width !== undefined || dto.height !== undefined) {
      const image = await this.prisma.image.findUnique({
        where: { id: annotation.imageId },
      });

      if (image) {
        const updatedBox = {
          x: dto.x ?? annotation.x,
          y: dto.y ?? annotation.y,
          width: dto.width ?? annotation.width,
          height: dto.height ?? annotation.height,
        };
        this.validateBoundingBox(updatedBox, image.width, image.height);
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (dto.x !== undefined) updateData.x = dto.x;
    if (dto.y !== undefined) updateData.y = dto.y;
    if (dto.width !== undefined) updateData.width = dto.width;
    if (dto.height !== undefined) updateData.height = dto.height;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.labelClassId !== undefined) {
      // Verify new label class belongs to project
      const image = await this.prisma.image.findUnique({
        where: { id: annotation.imageId },
        include: {
          dataset: {
            include: { project: true },
          },
        },
      });

      const labelClass = await this.prisma.labelClass.findFirst({
        where: {
          id: dto.labelClassId,
          projectId: image?.dataset.projectId,
        },
      });

      if (!labelClass) {
        throw new BadRequestException('Label class not found or does not belong to this project');
      }

      updateData.labelClassId = dto.labelClassId;
    }

    const updated = await this.prisma.annotation.update({
      where: { id: annotationId },
      data: updateData,
      include: {
        labelClass: true,
      },
    });

    return updated;
  }

  async bulkUpdateStatus(userId: string, dto: BulkUpdateAnnotationsDto) {
    // Verify ownership of all annotations
    const annotations = await this.prisma.annotation.findMany({
      where: {
        id: { in: dto.annotationIds },
      },
      include: {
        image: {
          include: {
            dataset: {
              include: {
                project: {
                  select: { userId: true },
                },
              },
            },
          },
        },
      },
    });

    // Check all belong to user
    for (const ann of annotations) {
      if (ann.image.dataset.project.userId !== userId) {
        throw new ForbiddenException('Access denied to one or more annotations');
      }
    }

    // Update all
    await this.prisma.annotation.updateMany({
      where: {
        id: { in: dto.annotationIds },
      },
      data: {
        status: dto.status,
      },
    });

    return { updated: dto.annotationIds.length };
  }

  async delete(annotationId: string, userId: string) {
    const annotation = await this.getAnnotationWithOwnershipCheck(annotationId, userId);

    await this.prisma.annotation.delete({
      where: { id: annotationId },
    });

    // Get datasetId for cache invalidation
    const image = await this.prisma.image.findUnique({
      where: { id: annotation.imageId },
    });

    if (image) {
      await this.redisService.del(`dataset:${image.datasetId}:summary`);
    }

    return { success: true };
  }

  async findByImage(imageId: string, userId: string) {
    // Verify ownership
    await this.imagesService.verifyOwnership(imageId, userId);

    const annotations = await this.prisma.annotation.findMany({
      where: { imageId },
      include: {
        labelClass: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return { annotations };
  }

  private async getAnnotationWithOwnershipCheck(annotationId: string, userId: string) {
    const annotation = await this.prisma.annotation.findUnique({
      where: { id: annotationId },
      include: {
        image: {
          include: {
            dataset: {
              include: {
                project: {
                  select: { userId: true },
                },
              },
            },
          },
        },
      },
    });

    if (!annotation) {
      throw new NotFoundException('Annotation not found');
    }

    if (annotation.image.dataset.project.userId !== userId) {
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
}
