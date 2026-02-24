import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { StorageService } from '../storage/storage.service';
import { DatasetsService } from '../datasets/datasets.service';
import { GetUploadUrlDto } from './dto/get-upload-url.dto';
import { CommitImageDto } from './dto/commit-image.dto';
import { ImageListQueryDto } from './dto/image-list-query.dto';

@Injectable()
export class ImagesService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private storageService: StorageService,
    private datasetsService: DatasetsService
  ) {}

  async getUploadUrl(datasetId: string, userId: string, dto: GetUploadUrlDto) {
    // Verify dataset ownership
    await this.datasetsService.verifyOwnership(datasetId, userId);

    // Validate mime type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(dto.mimeType)) {
      throw new ConflictException('Unsupported file type. Allowed: jpg, jpeg, png');
    }

    // Generate file key
    const fileKey = this.storageService.generateFileKey(datasetId, dto.fileName);

    // Get presigned upload URL
    const uploadUrl = await this.storageService.getUploadUrl(fileKey, dto.mimeType);

    return {
      uploadUrl,
      fileKey,
    };
  }

  async commitImage(datasetId: string, userId: string, dto: CommitImageDto) {
    // Verify dataset ownership
    await this.datasetsService.verifyOwnership(datasetId, userId);

    // Check for duplicate (same SHA256 in same dataset)
    const existing = await this.prisma.image.findFirst({
      where: {
        datasetId,
        sha256: dto.sha256,
      },
    });

    if (existing) {
      return {
        imageId: existing.id,
        isDuplicate: true,
      };
    }

    // Validate dimensions
    if (dto.width <= 0 || dto.height <= 0) {
      throw new ConflictException('Invalid image dimensions');
    }

    if (dto.width > 12000 || dto.height > 12000) {
      throw new ConflictException('Image dimensions exceed maximum (12000px)');
    }

    // Create image record
    const image = await this.prisma.image.create({
      data: {
        datasetId,
        fileKey: dto.fileKey,
        fileName: dto.fileName,
        mimeType: dto.mimeType,
        width: dto.width,
        height: dto.height,
        sha256: dto.sha256,
        phash: dto.phash || null,
        isSynthetic: false,
      },
    });

    // Invalidate dataset summary cache
    await this.redisService.del(`dataset:${datasetId}:summary`);

    return {
      imageId: image.id,
      isDuplicate: false,
    };
  }

  async findAllByDataset(datasetId: string, userId: string, query: ImageListQueryDto) {
    // Verify dataset ownership
    await this.datasetsService.verifyOwnership(datasetId, userId);

    const page = query.page || 1;
    const pageSize = Math.min(query.pageSize || 50, 200);
    const skip = (page - 1) * pageSize;

    // Build where clause
    const where: Record<string, unknown> = { datasetId };

    if (query.isSynthetic !== undefined) {
      where.isSynthetic = query.isSynthetic;
    }

    // Get total count
    const total = await this.prisma.image.count({ where });

    // Get images with annotations
    const images = await this.prisma.image.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        annotations: {
          include: {
            labelClass: true,
          },
          where: query.hasAnnotations ? { status: { not: 'rejected' } } : undefined,
        },
      },
    });

    // Filter by hasAnnotations if specified
    let filteredImages = images;
    if (query.hasAnnotations === true) {
      filteredImages = images.filter((i) => i.annotations.length > 0);
    } else if (query.hasAnnotations === false) {
      filteredImages = images.filter((i) => i.annotations.length === 0);
    }

    // Add URLs to images
    const imagesWithUrls = await Promise.all(
      filteredImages.map(async (image) => ({
        ...image,
        url: await this.storageService.getDownloadUrl(image.fileKey),
        annotationCount: image.annotations.length,
      }))
    );

    return {
      items: imagesWithUrls,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(imageId: string, userId: string) {
    const image = await this.prisma.image.findUnique({
      where: { id: imageId },
      include: {
        dataset: {
          include: {
            project: {
              select: { userId: true },
            },
          },
        },
        annotations: {
          include: {
            labelClass: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!image) {
      throw new NotFoundException('Image not found');
    }

    if (image.dataset.project.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const url = await this.storageService.getDownloadUrl(image.fileKey);

    return {
      image: {
        id: image.id,
        datasetId: image.datasetId,
        fileName: image.fileName,
        mimeType: image.mimeType,
        width: image.width,
        height: image.height,
        isSynthetic: image.isSynthetic,
        createdAt: image.createdAt,
        annotations: image.annotations,
        annotationCount: image.annotations.length,
      },
      url,
    };
  }

  async delete(imageId: string, userId: string) {
    const image = await this.prisma.image.findUnique({
      where: { id: imageId },
      include: {
        dataset: {
          include: {
            project: {
              select: { userId: true },
            },
          },
        },
      },
    });

    if (!image) {
      throw new NotFoundException('Image not found');
    }

    if (image.dataset.project.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    // Delete from storage
    await this.storageService.deleteFile(image.fileKey);

    // Delete from database (cascades to annotations)
    await this.prisma.image.delete({
      where: { id: imageId },
    });

    // Invalidate cache
    await this.redisService.del(`dataset:${image.datasetId}:summary`);

    return { success: true };
  }

  async bulkDelete(datasetId: string, userId: string, imageIds: string[]) {
    // Verify dataset ownership
    await this.datasetsService.verifyOwnership(datasetId, userId);

    if (!imageIds || imageIds.length === 0) {
      return { deleted: 0 };
    }

    // Get all images to delete (verify they belong to this dataset)
    const images = await this.prisma.image.findMany({
      where: {
        id: { in: imageIds },
        datasetId,
      },
      select: { id: true, fileKey: true },
    });

    if (images.length === 0) {
      return { deleted: 0 };
    }

    // Delete from storage
    for (const image of images) {
      try {
        await this.storageService.deleteFile(image.fileKey);
      } catch (err) {
        console.error(`Failed to delete file ${image.fileKey}:`, err);
      }
    }

    // Delete from database (cascades to annotations)
    const result = await this.prisma.image.deleteMany({
      where: {
        id: { in: images.map((i) => i.id) },
      },
    });

    // Invalidate cache
    await this.redisService.del(`dataset:${datasetId}:summary`);

    return { deleted: result.count };
  }

  async verifyOwnership(imageId: string, userId: string) {
    const image = await this.prisma.image.findUnique({
      where: { id: imageId },
      include: {
        dataset: {
          include: {
            project: {
              select: { userId: true, id: true },
            },
          },
        },
      },
    });

    if (!image) {
      throw new NotFoundException('Image not found');
    }

    if (image.dataset.project.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return {
      image,
      projectId: image.dataset.project.id,
      datasetId: image.datasetId,
    };
  }
}
