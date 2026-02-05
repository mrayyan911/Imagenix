import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from '../projects/projects.service';
import { CreateLabelClassDto } from './dto/create-label-class.dto';

@Injectable()
export class LabelClassesService {
  constructor(
    private prisma: PrismaService,
    private projectsService: ProjectsService
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

  async findById(classId: string) {
    return this.prisma.labelClass.findUnique({
      where: { id: classId },
    });
  }
}
