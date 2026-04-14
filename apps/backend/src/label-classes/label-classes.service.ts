import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from '../projects/projects.service';
import { RedisService } from '../redis/redis.service';
import { CreateLabelClassDto } from './dto/create-label-class.dto';

export interface LabelClassWithCount {
  id: string;
  projectId: string;
  name: string;
  colorHex: string;
  createdAt: Date;
  updatedAt: Date;
  annotationCount: number;
}

@Injectable()
export class LabelClassesService {
  constructor(
    private prisma: PrismaService,
    private projectsService: ProjectsService,
    private redisService: RedisService
  ) {}

  async create(projectId: string, userId: string, dto: CreateLabelClassDto) {
    // Verify project ownership
    await this.projectsService.verifyOwnership(projectId, userId);

    // Check for duplicate name
    const existing = await this.prisma.labelClass.findFirst({
      where: {
        projectId,
        name: dto.name,
      },
    });

    if (existing) {
      throw new ConflictException('Label class name already exists in this project');
    }

    const labelClass = await this.prisma.labelClass.create({
      data: {
        projectId,
        name: dto.name,
        colorHex: dto.colorHex || '#3B82F6',
      },
    });

    return { classId: labelClass.id };
  }

  async findAllByProject(projectId: string, userId: string) {
    // Verify project ownership
    await this.projectsService.verifyOwnership(projectId, userId);

    const classes = await this.prisma.labelClass.findMany({
      where: { projectId },
      orderBy: { name: 'asc' },
    });

    return { classes };
  }

  async findAllByProjectWithCounts(projectId: string, userId: string): Promise<{ classes: LabelClassWithCount[] }> {
    // Verify project ownership
    await this.projectsService.verifyOwnership(projectId, userId);

    const classes = await this.prisma.labelClass.findMany({
      where: { projectId },
      include: {
        _count: {
          select: { annotations: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    const classesWithCounts: LabelClassWithCount[] = classes.map((c) => ({
      id: c.id,
      projectId: c.projectId,
      name: c.name,
      colorHex: c.colorHex,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      annotationCount: c._count.annotations,
    }));

    return { classes: classesWithCounts };
  }

  async delete(classId: string, projectId: string, userId: string) {
    // Verify project ownership
    await this.projectsService.verifyOwnership(projectId, userId);

    // Check if class exists and belongs to project
    const labelClass = await this.prisma.labelClass.findFirst({
      where: {
        id: classId,
        projectId,
      },
      include: {
        _count: {
          select: { annotations: true },
        },
      },
    });

    if (!labelClass) {
      throw new NotFoundException('Label class not found');
    }

    // Check if class is in use
    if (labelClass._count.annotations > 0) {
      throw new ConflictException(
        `Cannot delete label class: ${labelClass._count.annotations} annotations are using this class`
      );
    }

    await this.prisma.labelClass.delete({
      where: { id: classId },
    });

    return { success: true };
  }

  async deleteAll(projectId: string, userId: string) {
    // Verify project ownership
    await this.projectsService.verifyOwnership(projectId, userId);

    // Get all label classes for this project
    const labelClasses = await this.prisma.labelClass.findMany({
      where: { projectId },
      select: { id: true },
    });

    if (labelClasses.length === 0) {
      return { deleted: 0 };
    }

    const classIds = labelClasses.map((c) => c.id);

    // Get affected datasets for cache invalidation
    const affectedDatasets = await this.prisma.annotation.findMany({
      where: { labelClassId: { in: classIds } },
      select: {
        image: {
          select: { datasetId: true },
        },
      },
      distinct: ['imageId'],
    });

    const datasetIds = [...new Set(affectedDatasets.map((a) => a.image.datasetId))];

    // Delete all annotations using these label classes first
    await this.prisma.annotation.deleteMany({
      where: { labelClassId: { in: classIds } },
    });

    // Delete all label classes
    const result = await this.prisma.labelClass.deleteMany({
      where: { projectId },
    });

    // Invalidate cache for affected datasets
    for (const datasetId of datasetIds) {
      await this.redisService.del(`dataset:${datasetId}:summary`);
    }

    return { deleted: result.count };
  }

  async deleteAnnotationsFromSelectedImages(
    projectId: string,
    userId: string,
    imageIds: string[],
    labelClassIds?: string[]
  ) {
    // Verify project ownership
    await this.projectsService.verifyOwnership(projectId, userId);

    if (!imageIds || imageIds.length === 0) {
      throw new BadRequestException('No images selected');
    }

    // Verify all images belong to datasets in this project
    const images = await this.prisma.image.findMany({
      where: { id: { in: imageIds } },
      include: {
        dataset: {
          select: { projectId: true, id: true },
        },
      },
    });

    if (images.length !== imageIds.length) {
      throw new NotFoundException('One or more images not found');
    }

    const invalidImages = images.filter((img) => img.dataset.projectId !== projectId);
    if (invalidImages.length > 0) {
      throw new BadRequestException('One or more images do not belong to this project');
    }

    // Build the where clause for annotations
    const whereClause: {
      imageId: { in: string[] };
      labelClassId?: { in: string[] };
    } = {
      imageId: { in: imageIds },
    };

    // Track which label classes we're targeting for cleanup
    let targetedClassIds: string[] = [];

    // If specific label class IDs are provided, filter by them
    if (labelClassIds && labelClassIds.length > 0) {
      // Verify label classes belong to this project
      const validClasses = await this.prisma.labelClass.findMany({
        where: {
          id: { in: labelClassIds },
          projectId,
        },
        select: { id: true },
      });

      if (validClasses.length !== labelClassIds.length) {
        throw new BadRequestException('One or more label classes do not belong to this project');
      }

      whereClause.labelClassId = { in: labelClassIds };
      targetedClassIds = labelClassIds;
    } else {
      // If no specific classes selected, get all classes that have annotations on selected images
      const affectedAnnotations = await this.prisma.annotation.findMany({
        where: { imageId: { in: imageIds } },
        select: { labelClassId: true },
        distinct: ['labelClassId'],
      });
      targetedClassIds = affectedAnnotations.map((a) => a.labelClassId);
    }

    // Delete annotations
    const result = await this.prisma.annotation.deleteMany({
      where: whereClause,
    });

    // Only clean up label classes that were targeted AND now have zero annotations
    let deletedClasses = 0;
    if (targetedClassIds.length > 0) {
      const emptyTargetedClasses = await this.prisma.labelClass.findMany({
        where: {
          id: { in: targetedClassIds },
          annotations: {
            none: {},
          },
        },
        select: { id: true },
      });

      if (emptyTargetedClasses.length > 0) {
        const deleteResult = await this.prisma.labelClass.deleteMany({
          where: {
            id: { in: emptyTargetedClasses.map((c) => c.id) },
          },
        });
        deletedClasses = deleteResult.count;
      }
    }

    // Invalidate cache for affected datasets
    const datasetIds = [...new Set(images.map((img) => img.dataset.id))];
    for (const datasetId of datasetIds) {
      await this.redisService.del(`dataset:${datasetId}:summary`);
    }

    return { deleted: result.count, deletedClasses };
  }

  async deleteWithAnnotations(classId: string, projectId: string, userId: string) {
    // Verify project ownership
    await this.projectsService.verifyOwnership(projectId, userId);

    // Check if class exists and belongs to project
    const labelClass = await this.prisma.labelClass.findFirst({
      where: {
        id: classId,
        projectId,
      },
      include: {
        _count: {
          select: { annotations: true },
        },
      },
    });

    if (!labelClass) {
      throw new NotFoundException('Label class not found');
    }

    // Get affected datasets for cache invalidation
    const affectedDatasets = await this.prisma.annotation.findMany({
      where: { labelClassId: classId },
      select: {
        image: {
          select: { datasetId: true },
        },
      },
      distinct: ['imageId'],
    });

    const datasetIds = [...new Set(affectedDatasets.map((a) => a.image.datasetId))];
    const deletedAnnotations = labelClass._count.annotations;

    // Delete all annotations for this class first
    await this.prisma.annotation.deleteMany({
      where: { labelClassId: classId },
    });

    // Delete the label class
    await this.prisma.labelClass.delete({
      where: { id: classId },
    });

    // Invalidate cache for affected datasets
    for (const datasetId of datasetIds) {
      await this.redisService.del(`dataset:${datasetId}:summary`);
    }

    return { success: true, deletedAnnotations };
  }

  async findById(classId: string) {
    return this.prisma.labelClass.findUnique({
      where: { id: classId },
    });
  }
}
