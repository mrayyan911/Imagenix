import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService
  ) {}

  async create(userId: string, dto: CreateProjectDto) {
    // Check for duplicate name
    const existing = await this.prisma.project.findFirst({
      where: {
        userId,
        name: dto.name,
      },
    });

    if (existing) {
      throw new ConflictException('Project name already exists');
    }

    const project = await this.prisma.project.create({
      data: {
        userId,
        name: dto.name,
        description: dto.description,
        domainPolicy: dto.domainPolicy || 'standard',
      },
    });

    // Invalidate cache
    await this.redisService.del(`user:${userId}:projects`);

    return { projectId: project.id };
  }

  async findAllByUser(userId: string) {
    // Try cache first
    const cacheKey = `user:${userId}:projects`;
    const cached = await this.redisService.get<unknown[]>(cacheKey);
    if (cached) {
      return { projects: cached };
    }

    const projects = await this.prisma.project.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: {
            datasets: true,
            labelClasses: true,
          },
        },
        datasets: {
          include: {
            _count: {
              select: {
                images: true,
              },
            },
          },
        },
      },
    });

    // Transform to include stats
    const projectsWithStats = projects.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      domainPolicy: p.domainPolicy,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      datasetCount: p._count.datasets,
      imageCount: p.datasets.reduce((sum, d) => sum + d._count.images, 0),
      labelClassCount: p._count.labelClasses,
    }));

    // Cache for 60 seconds
    await this.redisService.set(cacheKey, projectsWithStats, 60);

    return { projects: projectsWithStats };
  }

  async findOne(projectId: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        labelClasses: {
          orderBy: { name: 'asc' },
        },
        datasets: {
          include: {
            _count: {
              select: {
                images: true,
              },
            },
            images: {
              select: {
                id: true,
                _count: {
                  select: { annotations: true },
                },
              },
            },
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    // Transform datasets with stats
    const datasetsWithStats = project.datasets.map((d) => ({
      id: d.id,
      name: d.name,
      status: d.status,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
      imageCount: d._count.images,
      annotatedImageCount: d.images.filter((i) => i._count.annotations > 0).length,
      annotationCount: d.images.reduce((sum, i) => sum + i._count.annotations, 0),
    }));

    return {
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        domainPolicy: project.domainPolicy,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      },
      labelClasses: project.labelClasses,
      datasets: datasetsWithStats,
    };
  }

  async update(projectId: string, userId: string, dto: UpdateProjectDto) {
    // Verify ownership
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    // Check for duplicate name if changing
    if (dto.name && dto.name !== project.name) {
      const existing = await this.prisma.project.findFirst({
        where: {
          userId,
          name: dto.name,
        },
      });

      if (existing) {
        throw new ConflictException('Project name already exists');
      }
    }

    const updated = await this.prisma.project.update({
      where: { id: projectId },
      data: dto,
    });

    // Invalidate cache
    await this.redisService.del(`user:${userId}:projects`);

    return updated;
  }

  async delete(projectId: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    await this.prisma.project.delete({
      where: { id: projectId },
    });

    // Invalidate cache
    await this.redisService.del(`user:${userId}:projects`);

    return { success: true };
  }

  async verifyOwnership(projectId: string, userId: string): Promise<boolean> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { userId: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return true;
  }
}
