import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { ProjectsService } from '../projects/projects.service';
import { CreateDatasetDto } from './dto/create-dataset.dto';

@Injectable()
export class DatasetsService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private projectsService: ProjectsService
  ) {}

  async create(projectId: string, userId: string, dto: CreateDatasetDto) {
    // Verify project ownership
    await this.projectsService.verifyOwnership(projectId, userId);

    // Check for duplicate name
    const existing = await this.prisma.dataset.findFirst({
      where: {
        projectId,
        name: dto.name,
      },
    });

    if (existing) {
      throw new ConflictException('Dataset name already exists in this project');
    }

    const dataset = await this.prisma.dataset.create({
      data: {
        projectId,
        name: dto.name,
        status: 'active',
      },
    });

    // Invalidate cache
    await this.redisService.del(`user:${userId}:projects`);

    return { datasetId: dataset.id };
  }

  async findOne(datasetId: string, userId: string) {
    const dataset = await this.prisma.dataset.findUnique({
      where: { id: datasetId },
      include: {
        project: {
          include: {
            labelClasses: true,
          },
        },
        _count: {
          select: {
            images: true,
          },
        },
        images: {
          select: {
            id: true,
            isSynthetic: true,
            _count: {
              select: { annotations: true },
            },
          },
        },
      },
    });

    if (!dataset) {
      throw new NotFoundException('Dataset not found');
    }

    if (dataset.project.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return {
      dataset: {
        id: dataset.id,
        name: dataset.name,
        status: dataset.status,
        projectId: dataset.projectId,
        createdAt: dataset.createdAt,
        updatedAt: dataset.updatedAt,
        imageCount: dataset._count.images,
        annotatedImageCount: dataset.images.filter((i) => i._count.annotations > 0).length,
        annotationCount: dataset.images.reduce((sum, i) => sum + i._count.annotations, 0),
        syntheticImageCount: dataset.images.filter((i) => i.isSynthetic).length,
      },
      labelClasses: dataset.project.labelClasses,
    };
  }

  async verifyOwnership(datasetId: string, userId: string): Promise<{ dataset: { id: string; projectId: string } }> {
    const dataset = await this.prisma.dataset.findUnique({
      where: { id: datasetId },
      include: {
        project: {
          select: { userId: true },
        },
      },
    });

    if (!dataset) {
      throw new NotFoundException('Dataset not found');
    }

    if (dataset.project.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return { dataset: { id: dataset.id, projectId: dataset.projectId } };
  }

  async getDatasetWithProject(datasetId: string) {
    return this.prisma.dataset.findUnique({
      where: { id: datasetId },
      include: {
        project: true,
      },
    });
  }
}
